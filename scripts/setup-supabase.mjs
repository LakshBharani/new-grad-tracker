// Runs scripts/setup-supabase.sql against DATABASE_URL.
// Use this once after creating the Supabase project.
//
//   npm run db:setup-pg
//
// Requires DATABASE_URL in .env.local — get it from Supabase:
//   Project Settings → Database → Connection string → URI
//   (the Transaction pooler URL on port 6543 is fine for one-off scripts too)

import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local first, then .env as fallback
config({ path: path.resolve(__dirname, "..", ".env.local") });
config({ path: path.resolve(__dirname, "..", ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL is not set. Add it to .env.local and rerun.");
  process.exit(1);
}

const sqlPath = path.resolve(__dirname, "setup-supabase.sql");
const ddl = fs.readFileSync(sqlPath, "utf8");

const sql = postgres(url, { prepare: false, max: 1 });

try {
  console.log("→ Running schema + storage setup against Supabase…");
  await sql.unsafe(ddl);
  console.log("✓ Schema created (users, listings, applications + resumes bucket)");
} catch (err) {
  console.error("✗ Setup failed:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
