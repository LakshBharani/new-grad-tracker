// One-shot data migration: db/app.db (SQLite) → Supabase Postgres.
// Run AFTER `npm run db:setup-pg` has created the tables.
//
//   npm run db:migrate-data
//
// Safe to re-run: uses ON CONFLICT DO NOTHING on PK so partial migrations
// can be resumed. Boolean has_referral is normalized (SQLite stored 0/1).

import Database from "better-sqlite3";
import postgres from "postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "..", ".env.local") });
config({ path: path.resolve(__dirname, "..", ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL not set. Add it to .env.local first.");
  process.exit(1);
}

const sqlitePath = path.resolve(__dirname, "..", "db", "app.db");
const sqlite = new Database(sqlitePath, { readonly: true });
const pg = postgres(url, { prepare: false, max: 1 });

const ts = () => new Date().toISOString();

try {
  // ── users ───────────────────────────────────────────────────────────────
  const users = sqlite.prepare("SELECT * FROM users").all();
  console.log(`→ Migrating ${users.length} users…`);
  for (const u of users) {
    await pg`
      INSERT INTO users (id, email, name, password, role, resume_url, linkedin_url, bio, created_at, updated_at)
      VALUES (${u.id}, ${u.email}, ${u.name}, ${u.password}, ${u.role ?? "USER"},
              ${u.resume_url ?? null}, ${u.linkedin_url ?? null}, ${u.bio ?? null},
              ${u.created_at ?? ts()}, ${u.updated_at ?? ts()})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✓ users done`);

  // ── listings ────────────────────────────────────────────────────────────
  const listings = sqlite.prepare("SELECT * FROM listings").all();
  console.log(`→ Migrating ${listings.length} listings…`);
  for (const l of listings) {
    await pg`
      INSERT INTO listings (id, added_by_id, company, role, link, job_type, listing_notes, deleted_at, created_at, updated_at)
      VALUES (${l.id}, ${l.added_by_id}, ${l.company}, ${l.role}, ${l.link},
              ${l.job_type ?? "NEW_GRAD"}, ${l.listing_notes ?? null},
              ${l.deleted_at ?? null}, ${l.created_at ?? ts()}, ${l.updated_at ?? ts()})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✓ listings done`);

  // ── applications ────────────────────────────────────────────────────────
  const apps = sqlite.prepare("SELECT * FROM applications").all();
  console.log(`→ Migrating ${apps.length} applications…`);
  for (const a of apps) {
    await pg`
      INSERT INTO applications (
        id, user_id, listing_id, status, has_referral, referral_from, notes,
        applied_at, event_at, interview_round, deleted_at, created_at, updated_at
      )
      VALUES (
        ${a.id}, ${a.user_id}, ${a.listing_id},
        ${a.status ?? "INTERESTED"},
        ${Boolean(a.has_referral)},
        ${a.referral_from ?? null}, ${a.notes ?? null},
        ${a.applied_at ?? null}, ${a.event_at ?? null}, ${a.interview_round ?? null},
        ${a.deleted_at ?? null}, ${a.created_at ?? ts()}, ${a.updated_at ?? ts()}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✓ applications done`);

  console.log("\n✓ Migration complete.");
} catch (err) {
  console.error("✗ Migration failed:", err);
  process.exitCode = 1;
} finally {
  sqlite.close();
  await pg.end();
}
