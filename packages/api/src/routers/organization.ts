import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const organizationRouter = router({
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.organizations.findFirst({
        where: (o, { eq }) => eq(o.slug, input.slug),
      });
    }),
});
