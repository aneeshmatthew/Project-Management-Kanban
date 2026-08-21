import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Neon's HTTP driver — ideal for serverless/edge functions on Vercel since
// it avoids holding a persistent TCP connection per invocation. Swap to
// `drizzle-orm/neon-serverless` (websocket-based) if you need transactions
// across multiple statements in a single request.
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export * from "./schema";
