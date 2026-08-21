import { z } from "zod";
import { eq } from "drizzle-orm";
import { sprints, activityEvents } from "@repo/db/schema";
import { router, protectedProcedure, projectProcedure } from "../trpc";

export const sprintRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.sprints.findMany({
        where: (s, { eq }) => eq(s.projectId, input.projectId),
        orderBy: (s, { asc }) => asc(s.startDate),
        with: { tasks: true },
      });
    }),

  create: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1).max(255),
        goal: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [sprint] = await ctx.db.insert(sprints).values(input).returning();
      return sprint;
    }),

  start: projectProcedure
    .input(z.object({ projectId: z.string().uuid(), sprintId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(sprints)
        .set({ status: "ACTIVE" })
        .where(eq(sprints.id, input.sprintId))
        .returning();

      await ctx.db.insert(activityEvents).values({
        projectId: input.projectId,
        actorId: ctx.session.userId,
        type: "SPRINT_STARTED",
        payload: { sprintId: input.sprintId },
      });

      return updated;
    }),

  complete: projectProcedure
    .input(z.object({ projectId: z.string().uuid(), sprintId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(sprints)
        .set({ status: "COMPLETED" })
        .where(eq(sprints.id, input.sprintId))
        .returning();

      await ctx.db.insert(activityEvents).values({
        projectId: input.projectId,
        actorId: ctx.session.userId,
        type: "SPRINT_COMPLETED",
        payload: { sprintId: input.sprintId },
      });

      return updated;
    }),
});
