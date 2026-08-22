import { z } from "zod";
import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { tasks, comments, activityEvents, githubIntegrations, projects } from "@repo/db/schema";
import { router, protectedProcedure, projectProcedure } from "../trpc";
import { firstOrThrow } from "../lib/db-helpers";
import type { db as DbClient } from "@repo/db";

export const githubRouter = router({
  /**
   * Returns the GitHub App install URL. The org picks the repo during
   * GitHub's own install flow; GitHub redirects back with an
   * installation_id we store against the organization.
   */
  getInstallUrl: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(({ input }) => {
      const appSlug = process.env.GITHUB_APP_SLUG;
      return {
        url: `https://github.com/apps/${appSlug}/installations/new?state=${input.organizationId}`,
      };
    }),

  /** Manual re-sync button in the UI, in case a webhook was missed. */
  syncIssue: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        githubIssueId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In a full implementation: fetch the issue from GitHub's REST API
      // using the org's stored installation token, then upsert via the
      // same logic as handleIssueEvent below.
      return { queued: true, githubIssueId: input.githubIssueId };
    }),
});

/* -------------------------------------------------------------------------- */
/*  Webhook handling — invoked from the Next.js route handler, NOT via tRPC.  */
/*  GitHub posts here directly, so it needs raw signature verification        */
/*  rather than a tRPC procedure (which assumes an authenticated user).       */
/* -------------------------------------------------------------------------- */

/**
 * Verifies GitHub's HMAC signature on the raw request body.
 * MUST run against the raw, unparsed body — parsing to JSON first and
 * re-stringifying will produce a different byte sequence and fail
 * verification on some payloads (key ordering, whitespace).
 */
export function verifyGithubSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string
): boolean {
  if (!signatureHeader) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  // Timing-safe comparison — avoid leaking secret info via response-time
  // side channels.
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

interface GithubIssuePayload {
  action: string;
  issue: {
    id: number;
    number: number;
    title: string;
    body: string | null;
    html_url: string;
  };
  repository: { id: number; full_name: string };
  installation: { id: number };
}

interface GithubIssueCommentPayload {
  action: string;
  issue: { id: number; number: number };
  comment: { id: number; body: string; user: { login: string } };
  repository: { id: number };
  installation: { id: number };
}

/**
 * Core sync logic for `issues` webhook events (opened, edited, closed,
 * reopened). Upserts a Task row keyed on githubIssueId, scoped to the
 * project whose githubRepoId matches the incoming repo.
 */
export async function handleIssueEvent(
  db: typeof DbClient,
  payload: GithubIssuePayload
) {
  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.githubRepoId, String(payload.repository.id)),
  });

  if (!project) {
    // No project has linked this repo — ignore. This can happen if the
    // GitHub App is installed org-wide but only some repos are linked
    // in-app.
    return { skipped: true, reason: "no_linked_project" };
  }

  const githubIssueId = String(payload.issue.id);

  const existingTask = await db.query.tasks.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.projectId, project.id), eq(t.githubIssueId, githubIssueId)),
  });

  if (payload.action === "opened" && !existingTask) {
    // Land new issues in the project's default "Backlog" column.
    const defaultColumn = await db.query.columns.findFirst({
      where: (c, { eq, inArray }) => undefined, // resolved via board lookup in real impl
    });

    const task = firstOrThrow(
      await db
        .insert(tasks)
        .values({
          projectId: project.id,
          columnId: defaultColumn!.id,
          title: payload.issue.title,
          description: payload.issue.body ?? "",
          position: "a0",
          githubIssueId,
        })
        .returning(),
      "insert task from GitHub issue"
    );

    await db.insert(activityEvents).values({
      projectId: project.id,
      taskId: task.id,
      type: "GITHUB_LINKED",
      payload: { githubIssueId, url: payload.issue.html_url },
    });

    return { created: task.id };
  }

  if (existingTask && ["edited", "closed", "reopened"].includes(payload.action)) {
    const updated = firstOrThrow(
      await db
        .update(tasks)
        .set({
          title: payload.issue.title,
          description: payload.issue.body ?? "",
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, existingTask.id))
        .returning(),
      "update task from GitHub issue"
    );

    await db.insert(activityEvents).values({
      projectId: project.id,
      taskId: existingTask.id,
      type: "GITHUB_SYNCED",
      payload: { action: payload.action },
    });

    return { updated: updated.id };
  }

  return { skipped: true, reason: "no_matching_action" };
}

/** Mirrors a GitHub issue comment onto the linked task's comment thread. */
export async function handleIssueCommentEvent(
  db: typeof DbClient,
  payload: GithubIssueCommentPayload
) {
  if (payload.action !== "created") return { skipped: true };

  const githubIssueId = String(payload.issue.id);
  const task = await db.query.tasks.findFirst({
    where: (t, { eq }) => eq(t.githubIssueId, githubIssueId),
  });

  if (!task) return { skipped: true, reason: "no_matching_task" };

  // authorId is nullable at the schema level for exactly this case — a
  // GitHub commenter may not have a corresponding platform user. Store
  // the GitHub login in the body prefix or extend the schema with an
  // externalAuthorName column if you want cleaner attribution.
  const comment = firstOrThrow(
    await db
      .insert(comments)
      .values({
        taskId: task.id,
        authorId: task.assigneeId ?? task.id, // placeholder — replace with a
        // real "system/github" user row in production rather than reusing IDs
        body: `**@${payload.comment.user.login} (GitHub):** ${payload.comment.body}`,
        githubCommentId: String(payload.comment.id),
      })
      .returning(),
    "insert GitHub comment"
  );

  await db.insert(activityEvents).values({
    projectId: task.projectId,
    taskId: task.id,
    type: "COMMENT_ADDED",
    payload: { source: "github", githubCommentId: payload.comment.id },
  });

  return { created: comment.id };
}
