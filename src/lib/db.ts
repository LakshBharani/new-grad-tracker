import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle> | undefined;
  pg: ReturnType<typeof postgres> | undefined;
};

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local — get it from Supabase: " +
        "Project Settings → Database → Connection string → URI (use the Transaction pooler URL on port 6543 for serverless)."
    );
  }
  // prepare: false is required for Supabase's transaction pooler (PgBouncer).
  // max must allow several concurrent connections: every page issues parallel
  // queries via Promise.all, and a single-connection pool (max: 1) deadlocks
  // when concurrent queries are pipelined through the transaction pooler.
  const pg = postgres(url, { prepare: false, max: 10 });
  return { pg, db: drizzle(pg, { schema }) };
}

const { db, pg } = globalForDb.db
  ? { db: globalForDb.db, pg: globalForDb.pg! }
  : (() => {
      const created = createDb();
      if (process.env.NODE_ENV !== "production") {
        globalForDb.db = created.db;
        globalForDb.pg = created.pg;
      }
      return created;
    })();

export { db, pg };
