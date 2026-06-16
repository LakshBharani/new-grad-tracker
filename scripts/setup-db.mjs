import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "..", "db", "app.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Migrate applications table if it has old schema (inline company/role instead of listing_id)
const appCols = db.prepare("PRAGMA table_info(applications)").all().map((c) => c.name);
if (appCols.length > 0 && !appCols.includes("listing_id")) {
  db.pragma("foreign_keys = OFF");
  db.exec("DROP TABLE IF EXISTS applications;");
  db.pragma("foreign_keys = ON");
  console.log("⚠ Dropped old applications table (schema migration)");
}

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  resume_url TEXT,
  linkedin_url TEXT,
  bio TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  added_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  link TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'NEW_GRAD',
  listing_notes TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'INTERESTED',
  has_referral INTEGER NOT NULL DEFAULT 0,
  referral_from TEXT,
  notes TEXT,
  applied_at TEXT,
  event_at TEXT,
  interview_round INTEGER,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(user_id, listing_id)
);
`);

console.log("✓ Tables created");

// Seed users
const seedUsers = [
  { name: "Laksh", email: "laksh.bharani.us@gmail.com", password: "changeme123" },
  { name: "Adi", email: "adi@example.com", password: "changeme123" },
];

for (const u of seedUsers) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(u.email);
  if (!existing) {
    const hashed = await bcrypt.hash(u.password, 12);
    db.prepare(
      "INSERT INTO users (id, email, name, password, role) VALUES (?, ?, ?, ?, 'USER')"
    ).run(randomUUID(), u.email, u.name, hashed);
    console.log(`✓ Created user: ${u.name} (password: ${u.password})`);
  } else {
    console.log(`→ User already exists: ${u.name}`);
  }
}

console.log("\nInvite code for new friends: friends2024");
db.close();
