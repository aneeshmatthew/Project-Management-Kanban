import { z } from "zod";
import { eq } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { tasks, activityEvents } from "@repo/db/schema";
import { router, protectedProcedure, projectProcedure } from "../trpc";

export const taskRouter = router({
  listByBoard: projectProcedure
    .input(z.object({ projectId: z.string().uuid(), boardId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.tasks.findMany({
        where: (t, { and, eq }) => and(eq(t.projectId, input.projectId)),
        with: {
          assignee: true,
          comments: true,
          subtasks: true,
        },
      });
    }),

  create: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        columnId: z.string().uuid(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        // Position of the last task in the column, if any — used to
        // generate a key after it. Omit to place at the top.
        afterPosition: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const position = generateKeyBetween(input.afterPosition ?? null, null);

      const [task] = await ctx.db
        .insert(tasks)
        .values({
          projectId: input.projectId,
          columnId: input.columnId,
          title: input.title,
          description: input.description,
          position,
        })
        .returning();

      await ctx.db.insert(activityEvents).values({
        projectId: input.projectId,
        taskId: task.id,
        actorId: ctx.session.userId,
        type: "TASK_CREATED",
        payload: { title: task.title },
      });

      return task;
    }),

  /**
   * The centerpiece mutation for drag-and-drop. Client computes nothing —
   * it just tells us the task, the destination column, and the positions
   * of the two tasks it landed between (either can be null for top/bottom
   * of column). We generate a fresh fractional key so we never rewrite
   * sibling rows.
   */
  move: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        taskId: z.string().uuid(),
        toColumnId: z.string().uuid(),
        beforePosition: z.string().nullable(),
        afterPosition: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const newPosition = generateKeyBetween(
        input.beforePosition,
        input.afterPosition
      );

      const [existing] = await ctx.db
        .select({ columnId: tasks.columnId })
        .from(tasks)
        .where(eq(tasks.id, input.taskId));

      const [updated] = await ctx.db
        .update(tasks)
        .set({
          columnId: input.toColumnId,
          position: newPosition,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, input.taskId))
        .returning();

      await ctx.db.insert(activityEvents).values({
        projectId: input.projectId,
        taskId: input.taskId,
        actorId: ctx.session.userId,
        type: "TASK_MOVED",
        payload: { fromColumnId: existing?.columnId, toColumnId: input.toColumnId },
      });

      return updated;
    }),

  assign: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        taskId: z.string().uuid(),
        assigneeId: z.string().uuid().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tasks)
        .set({ assigneeId: input.assigneeId, updatedAt: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();

      await ctx.db.insert(activityEvents).values({
        projectId: input.projectId,
        taskId: input.taskId,
        actorId: ctx.session.userId,
        type: "TASK_ASSIGNED",
        payload: { assigneeId: input.assigneeId },
      });

      return updated;
    }),
});
