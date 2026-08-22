import { TRPCError } from "@trpc/server";

/**
 * Drizzle's `.returning()` always types as `T[]`, so destructuring
 * `const [row] = await db.insert(...).returning()` types `row` as
 * `T | undefined` under this repo's `noUncheckedIndexedAccess` tsconfig
 * setting — even though an insert/update that doesn't throw and matches
 * a row always returns at least one. This asserts that at runtime (so a
 * genuinely-missing row, e.g. updating a deleted id, still fails loudly
 * with a proper tRPC error instead of a silent `undefined`) and gives
 * every callsite a non-optional type instead of scattering `!`
 * assertions throughout the routers.
 */
export function firstOrThrow<T>(rows: T[], context: string): T {
  const row = rows[0];
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Expected a row from ${context}, got none`,
    });
  }
  return row;
}
