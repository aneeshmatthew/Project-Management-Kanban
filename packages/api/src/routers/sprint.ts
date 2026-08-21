import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sprints, activityEvents } from "@repo/db/schema";
import { router, protectedProcedure, projectProcedure } from "../trpc";

const DAY_MS = 1000 * 60 * 60 * 24;

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

  /**
   * Ideal-vs-actual burndown series for a sprint.
   *
   * "Actual completed" is approximated as: a task counts as done on the
   * day of its `updatedAt` IF its current column is named "Done". This is
   * a reasonable heuristic for a hobby project but has a real limitation
   * worth knowing: if a task is moved into Done and later moved back out,
   * we lose the historical completion date (updatedAt reflects the most
   * recent change, not the Done-entry date). A fully accurate burndown
   * would derive completion dates from `activityEvents` of type
   * TASK_MOVED by inspecting each event's `toColumnId` over time, rather
   * than trusting the task's current state — worth doing before this
   * feeds a real sprint retro.
   */
  burndown: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), sprintId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const sprint = await ctx.db.query.sprints.findFirst({
        where: (s, { eq }) => eq(s.id, input.sprintId),
      });

      if (!sprint) throw new TRPCError({ code: "NOT_FOUND" });

      const sprintTasks = await ctx.db.query.tasks.findMany({
        where: (t, { eq }) => eq(t.sprintId, input.sprintId),
        with: { column: true },
      });

      const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

      const start = new Date(sprint.startDate);
      const end = new Date(sprint.endDate);
      const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS));
      const today = new Date();
      const lastDay = today < end ? today : end;

      const series: { date: string; ideal: number; actual: number }[] = [];

      for (let d = 0; d <= totalDays; d++) {
        const date = new Date(start.getTime() + d * DAY_MS);
        if (date > lastDay) break;

        const idealRemaining = Math.max(0, totalPoints * (1 - d / totalDays));

        const completedPoints = sprintTasks
          .filter(
            (t) =>
              t.column?.name === "Done" && t.storyPoints && new Date(t.updatedAt) <= date
          )
          .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

        series.push({
          date: date.toISOString().slice(0, 10),
          ideal: Math.round(idealRemaining),
          actual: totalPoints - completedPoints,
        });
      }

      return { sprint, totalPoints, series };
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
