import { z } from "zod";
import { eq } from "drizzle-orm";
import { epics } from "@repo/db/schema";
import { router, protectedProcedure, projectProcedure } from "../trpc";

export const epicRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.epics.findMany({
        where: (e, { eq }) => eq(e.projectId, input.projectId),
        with: { owner: true, tasks: true },
        orderBy: (e, { asc }) => asc(e.createdAt),
      });
    }),

  create: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        color: z.string().optional(),
        ownerId: z.string().uuid().optional(),
        startDate: z.date().optional(),
        targetDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [epic] = await ctx.db.insert(epics).values(input).returning();
      return epic;
    }),

  update: projectProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        epicId: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(["PLANNED", "IN_PROGRESS", "DONE"]).optional(),
        ownerId: z.string().uuid().nullable().optional(),
        startDate: z.date().nullable().optional(),
        targetDate: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { epicId, projectId, ...patch } = input;
      const [updated] = await ctx.db
        .update(epics)
        .set(patch)
        .where(eq(epics.id, epicId))
        .returning();
      return updated;
    }),
});
