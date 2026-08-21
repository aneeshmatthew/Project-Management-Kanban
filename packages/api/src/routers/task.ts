import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { tasks, comments, activityEvents } from "@repo/db/schema";
import { router, protectedProcedure, projectProcedure } from "../trpc";

export const taskRouter = router({
  getById: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, input.taskId),
        with: {
          assignee: true,
          owner: true,
          epic: true,
          sprint: true,
          column: true,
          subtasks: true,
          attachments: true,
          comments: {
            orderBy: (c, { asc }) => asc(c.createdAt),
            with: { author: true },
          },
        },
      });
    }),

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
        epicId: z.string().uuid().optional(),
        sprintId: z.string().uuid().optional(),
        ownerId: z.string().uuid().optional(),
        assigneeId: z.string().uuid().optional(),
        priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        storyPoints: z.number().int().min(0).max(100).optional(),
        startDate: z.date().optional(),
        dueDate: z.date().optional(),
        // Position of the last task in the column, if any — used to
        // generate a key after it. Omit to place at the top.
        afterPosition: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const position = generateKeyBetween(input.afterPosition ?? null, null);

      // Simple max+1 counter for the human-readable key (e.g. "PMT-42").
      // Fine for hobby-project traffic; under real concurrent writes this
      // can race — move to a Postgres sequence per project (or a
      // `SELECT ... FOR UPDATE` on a counters table) before this sees
      // multi-user concurrent task creation in the same project.
      const [{ maxNumber }] = await ctx.db
        .select({ maxNumber: sql<number>`coalesce(max(${tasks.number}), 0)` })
        .from(tasks)
        .where(eq(tasks.projectId, input.projectId));

      const [task] = await ctx.db
        .insert(tasks)
        .values({
          projectId: input.projectId,
          columnId: input.columnId,
          number: maxNumber + 1,
          title: input.title,
          description: input.description,
          epicId: input.epicId,
          sprintId: input.sprintId,
          ownerId: input.ownerId,
          assigneeId: input.assigneeId,
          priority: input.priority,
          storyPoints: input.storyPoints,
          startDate: input.startDate,
          dueDate: input.dueDate,
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

  /** Sets the PM-facing accountable owner — distinct from the assignee. */
  setOwner: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        taskId: z.string().uuid(),
        ownerId: z.string().uuid().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tasks)
        .set({ ownerId: input.ownerId, updatedAt: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();

      await ctx.db.insert(activityEvents).values({
        projectId: input.projectId,
        taskId: input.taskId,
        actorId: ctx.session.userId,
        type: "TASK_UPDATED",
        payload: { ownerId: input.ownerId },
      });

      return updated;
    }),

  /** Sets start/due dates — the timeline a PM plans against. */
  setTimeline: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        taskId: z.string().uuid(),
        startDate: z.date().nullable().optional(),
        dueDate: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { taskId, projectId, ...patch } = input;
      const [updated] = await ctx.db
        .update(tasks)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(tasks.id, taskId))
        .returning();

      await ctx.db.insert(activityEvents).values({
        projectId: input.projectId,
        taskId: input.taskId,
        actorId: ctx.session.userId,
        type: "TASK_UPDATED",
        payload: { startDate: input.startDate, dueDate: input.dueDate },
      });

      return updated;
    }),

  setEpic: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        taskId: z.string().uuid(),
        epicId: z.string().uuid().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tasks)
        .set({ epicId: input.epicId, updatedAt: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();
      return updated;
    }),

  setSprint: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        taskId: z.string().uuid(),
        sprintId: z.string().uuid().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tasks)
        .set({ sprintId: input.sprintId, updatedAt: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();
      return updated;
    }),

  setStoryPoints: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        taskId: z.string().uuid(),
        storyPoints: z.number().int().min(0).max(100).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tasks)
        .set({ storyPoints: input.storyPoints, updatedAt: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();
      return updated;
    }),

  addComment: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        taskId: z.string().uuid(),
        body: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [comment] = await ctx.db
        .insert(comments)
        .values({
          taskId: input.taskId,
          authorId: ctx.session.userId,
          body: input.body,
        })
        .returning();

      await ctx.db.insert(activityEvents).values({
        projectId: input.projectId,
        taskId: input.taskId,
        actorId: ctx.session.userId,
        type: "COMMENT_ADDED",
        payload: { commentId: comment.id },
      });

      return comment;
    }),
});
