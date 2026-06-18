// One-off migration: add unique username to users, prune all users except the
// owner, and create the single-use invites table.
//
// Usage: node scripts/migrate-username-invites.mjs
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const KEEP_EMAIL = "laksh.bharani.us@gmail.com";
const KEEP_USERNAME = "laksh";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

try {
  // 1. Add username column (nullable for now so the backfill can run).
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username text`;

  // 2. Delete every user except the owner (cascades to their rows).
  const deleted = await sql`DELETE FROM users WHERE lower(email) <> ${KEEP_EMAIL} RETURNING email`;
  console.log(`Deleted ${deleted.length} user(s):`, deleted.map((r) => r.email));

  // 3. Backfill a username for any remaining user that lacks one.
  await sql`UPDATE users SET username = ${KEEP_USERNAME} WHERE lower(email) = ${KEEP_EMAIL} AND username IS NULL`;
  await sql`UPDATE users SET username = 'user_' || left(id, 8) WHERE username IS NULL`;

  // 4. Enforce NOT NULL + uniqueness.
  await sql`ALTER TABLE users ALTER COLUMN username SET NOT NULL`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username)`;

  // 5. Create the invites table.
  await sql`
    CREATE TABLE IF NOT EXISTS invites (
      code text PRIMARY KEY,
      created_by_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      used_by_id text REFERENCES users(id) ON DELETE SET NULL,
      used_at text,
      created_at text NOT NULL DEFAULT to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  `;

  const remaining = await sql`SELECT name, email, username FROM users ORDER BY created_at`;
  console.log("Remaining users:");
  for (const r of remaining) console.log(`  ${r.name} — ${r.email} (@${r.username})`);

  console.log("Migration complete.");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
