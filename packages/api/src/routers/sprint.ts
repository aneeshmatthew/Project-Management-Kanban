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

  /**
   * Combined shape for the backlog/sprint-planning screen: unassigned
   * (sprintId IS NULL) tasks plus every non-completed sprint with its
   * tasks, each including enough relations to render a compact card.
   */
  planningBoard: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [planningSprints, backlogTasks] = await Promise.all([
        ctx.db.query.sprints.findMany({
          where: (s, { and, eq, ne }) =>
            and(eq(s.projectId, input.projectId), ne(s.status, "COMPLETED")),
          orderBy: (s, { asc }) => asc(s.startDate),
          with: {
            tasks: {
              with: { assignee: true, epic: true },
            },
          },
        }),
        ctx.db.query.tasks.findMany({
          where: (t, { and, eq, isNull }) =>
            and(eq(t.projectId, input.projectId), isNull(t.sprintId)),
          with: { assignee: true, epic: true },
        }),
      ]);

      return { backlog: backlogTasks, sprints: planningSprints };
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
