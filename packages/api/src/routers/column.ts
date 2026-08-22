import { z } from "zod";
import { eq } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { columns } from "@repo/db/schema";
import { router, projectProcedure } from "../trpc";
import { firstOrThrow } from "../lib/db-helpers";

export const columnRouter = router({
  create: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        boardId: z.string().uuid(),
        name: z.string().min(1).max(255),
        wipLimit: z.number().int().min(1).max(999).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.columns.findMany({
        where: (c, { eq }) => eq(c.boardId, input.boardId),
        orderBy: (c, { desc }) => desc(c.position),
        limit: 1,
      });

      const position = generateKeyBetween(existing[0]?.position ?? null, null);

      const column = firstOrThrow(
        await ctx.db
          .insert(columns)
          .values({
            boardId: input.boardId,
            name: input.name,
            position,
            wipLimit: input.wipLimit ?? null,
          })
          .returning(),
        "insert column"
      );

      return column;
    }),

  rename: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        columnId: z.string().uuid(),
        name: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = firstOrThrow(
        await ctx.db
          .update(columns)
          .set({ name: input.name })
          .where(eq(columns.id, input.columnId))
          .returning(),
        "rename column"
      );
      return updated;
    }),

  setWipLimit: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        columnId: z.string().uuid(),
        wipLimit: z.number().int().min(1).max(999).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = firstOrThrow(
        await ctx.db
          .update(columns)
          .set({ wipLimit: input.wipLimit })
          .where(eq(columns.id, input.columnId))
          .returning(),
        "set column wipLimit"
      );
      return updated;
    }),

  /**
   * Reorders a column via the same fractional-indexing technique used for
   * task.move — pass the position of the columns it should land between
   * (either can be null for the start/end of the board).
   */
  move: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        columnId: z.string().uuid(),
        beforePosition: z.string().nullable(),
        afterPosition: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const position = generateKeyBetween(input.beforePosition, input.afterPosition);
      const updated = firstOrThrow(
        await ctx.db
          .update(columns)
          .set({ position })
          .where(eq(columns.id, input.columnId))
          .returning(),
        "move column"
      );
      return updated;
    }),

  remove: projectProcedure
    .input(z.object({ projectId: z.string().uuid(), columnId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Cascades to tasks in this column (see schema onDelete rule) — the
      // client is responsible for warning the user about this first.
      await ctx.db.delete(columns).where(eq(columns.id, input.columnId));
      return { deleted: true };
    }),
});
