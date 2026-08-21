import { z } from "zod";
import { eq } from "drizzle-orm";
import { projects, projectMembers } from "@repo/db/schema";
import { router, protectedProcedure, projectProcedure } from "../trpc";

export const projectRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.projects.findMany({
        where: (p, { eq }) => eq(p.organizationId, input.organizationId),
      });
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
      const [project] = await ctx.db.insert(projects).values(input).returning();
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
      const [updated] = await ctx.db
        .update(projects)
        .set({ githubRepoId: input.githubRepoId, updatedAt: new Date() })
        .where(eq(projects.id, input.projectId))
        .returning();
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
      const [member] = await ctx.db
        .insert(projectMembers)
        .values(input)
        .returning();
      return member;
    }),
});
