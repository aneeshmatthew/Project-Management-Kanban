import { z } from "zod";
import { eq } from "drizzle-orm";
import { projects, projectMembers } from "@repo/db/schema";
import { router, protectedProcedure, projectProcedure } from "../trpc";
import { firstOrThrow } from "../lib/db-helpers";

export const projectRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.projects.findMany({
        where: (p, { eq }) => eq(p.organizationId, input.organizationId),
      });
    }),

  listMembers: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const members = await ctx.db.query.projectMembers.findMany({
        where: (pm, { eq }) => eq(pm.projectId, input.projectId),
        with: { user: true },
      });
      return members.map((m) => m.user);
    }),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        name: z.string().min(1).max(255),
        key: z.string().min(1).max(10),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = firstOrThrow(
        await ctx.db.insert(projects).values(input).returning(),
        "insert project"
      );
      return project;
    }),

  connectGithubRepo: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        githubRepoId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = firstOrThrow(
        await ctx.db
          .update(projects)
          .set({ githubRepoId: input.githubRepoId, updatedAt: new Date() })
          .where(eq(projects.id, input.projectId))
          .returning(),
        "connect GitHub repo"
      );
      return updated;
    }),

  addMember: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["EDITOR", "VIEWER"]).default("EDITOR"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = firstOrThrow(
        await ctx.db.insert(projectMembers).values(input).returning(),
        "insert project member"
      );
      return member;
    }),
});
