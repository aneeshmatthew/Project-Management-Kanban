import { z } from "zod";
import { router, projectProcedure } from "../trpc";

export const boardRouter = router({
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
