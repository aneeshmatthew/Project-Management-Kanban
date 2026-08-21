import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { db } from "@repo/db";

/**
 * Context — built per-request in the Next.js route handler.
 * `session` comes from your auth provider (e.g. NextAuth/Auth.js).
 */
export interface CreateContextOptions {
  session: { userId: string } | null;
}

export function createTRPCContext(opts: CreateContextOptions) {
  return {
    db,
    session: opts.session,
  };
}

type Context = ReturnType<typeof createTRPCContext>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/** Requires a logged-in user. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { ...ctx, session: ctx.session },
  });
});

/**
 * Requires the caller to be a member of the project referenced by
 * `input.projectId`. Attach this after `protectedProcedure` in routers
 * that take a projectId — checks project-level override first, falls
 * back to org-level role.
 */
export const projectProcedure = protectedProcedure
  .input((raw) => raw as { projectId: string } & Record<string, unknown>)
  .use(async ({ ctx, input, next }) => {
    const membership = await ctx.db.query.projectMembers.findFirst({
      where: (pm, { and, eq }) =>
        and(eq(pm.projectId, input.projectId), eq(pm.userId, ctx.session.userId)),
    });

    if (!membership) {
      // Fall back to org-level access (OWNER/ADMIN implicitly see all projects)
      const project = await ctx.db.query.projects.findFirst({
        where: (p, { eq }) => eq(p.id, input.projectId),
      });

      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const orgMembership = await ctx.db.query.organizationMembers.findFirst({
        where: (om, { and, eq }) =>
          and(
            eq(om.organizationId, project.organizationId),
            eq(om.userId, ctx.session.userId)
          ),
      });

      if (!orgMembership || !["OWNER", "ADMIN"].includes(orgMembership.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
    }

    return next({ ctx });
  });
