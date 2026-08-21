import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const activityRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.db.query.activityEvents.findMany({
        where: (a, { eq }) => eq(a.projectId, input.projectId),
        orderBy: (a, { desc }) => desc(a.createdAt),
        limit: input.limit,
        with: {
          actor: true,
          task: true,
        },
      });
    }),
});
