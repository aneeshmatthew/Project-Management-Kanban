import { z } from "zod";
import { eq } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { boards, columns } from "@repo/db/schema";
import { router, protectedProcedure, projectProcedure } from "../trpc";
import { firstOrThrow } from "../lib/db-helpers";

export const boardRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.boards.findMany({
        where: (b, { eq }) => eq(b.projectId, input.projectId),
        orderBy: (b, { asc }) => asc(b.createdAt),
      });
    }),

  create: projectProcedure
    .input(z.object({ projectId: z.string().uuid(), name: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const board = firstOrThrow(
        await ctx.db
          .insert(boards)
          .values({ projectId: input.projectId, name: input.name })
          .returning(),
        "insert board"
      );

      // Seed a sensible default column set so a new board isn't empty.
      const defaults = ["Backlog", "To Do", "In Progress", "Done"];
      let pos: string | null = null;
      for (const name of defaults) {
        pos = generateKeyBetween(pos, null);
        await ctx.db.insert(columns).values({ boardId: board.id, name, position: pos });
      }

      return board;
    }),

  rename: projectProcedure
    .input(z.object({ projectId: z.string().uuid(), boardId: z.string().uuid(), name: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const updated = firstOrThrow(
        await ctx.db
          .update(boards)
          .set({ name: input.name })
          .where(eq(boards.id, input.boardId))
          .returning(),
        "update board"
      );
      return updated;
    }),

  remove: projectProcedure
    .input(z.object({ projectId: z.string().uuid(), boardId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Cascades to columns, and from there to tasks (see schema onDelete
      // rules) — the client should have already warned the user about
      // this before calling remove.
      await ctx.db.delete(boards).where(eq(boards.id, input.boardId));
      return { deleted: true };
    }),

  getFirstForProject: projectProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.boards.findFirst({
        where: (b, { eq }) => eq(b.projectId, input.projectId),
      });
    }),

  get: projectProcedure
    .input(z.object({ projectId: z.string().uuid(), boardId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const board = await ctx.db.query.boards.findFirst({
        where: (b, { eq }) => eq(b.id, input.boardId),
        with: {
          project: true,
          columns: {
            orderBy: (c, { asc }) => asc(c.position),
            with: {
              tasks: {
                orderBy: (t, { asc }) => asc(t.position),
                with: {
                  assignee: true,
                  owner: true,
                  epic: true,
                  comments: true,
                },
              },
            },
          },
        },
      });

      return board;
    }),
});
