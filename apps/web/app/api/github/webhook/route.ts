import { db } from "@repo/db";
import {
  verifyGithubSignature,
  handleIssueEvent,
  handleIssueCommentEvent,
} from "@repo/api/routers/github";

/**
 * GitHub webhook receiver. Bypasses tRPC entirely — GitHub isn't an
 * authenticated platform user, it authenticates via the HMAC signature
 * on the payload instead.
 *
 * Configure this URL (https://yourapp.com/api/github/webhook) in the
 * GitHub App's webhook settings, subscribed to: issues, issue_comment,
 * pull_request.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const event = req.headers.get("x-github-event");

  // In production, look up the correct webhookSecret per-installation
  // rather than a single global secret, since each org's GitHub App
  // installation has its own.
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET!;

  if (!verifyGithubSignature(rawBody, signature, webhookSecret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  switch (event) {
    case "issues": {
      const result = await handleIssueEvent(db, payload);
      return Response.json(result);
    }
    case "issue_comment": {
      const result = await handleIssueCommentEvent(db, payload);
      return Response.json(result);
    }
    default:
      // Acknowledge unhandled events with 200 so GitHub doesn't retry
      // and eventually disable the webhook for repeated failures.
      return Response.json({ skipped: true, event });
  }
}
