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

const users = [
  { name: "Laksh", email: "laksh.bharani.us@gmail.com", password: "changeme123" },
  { name: "Adi", email: "adi@example.com", password: "changeme123" },
];

async function main() {
  for (const u of users) {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(u.email);
    if (!existing) {
      const hashed = await bcrypt.hash(u.password, 12);
      const id = randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        "INSERT INTO users (id, email, name, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(id, u.email, u.name, hashed, "USER", now, now);
      console.log(`✓ Created user: ${u.name} (password: ${u.password})`);
    } else {
      console.log(`→ User already exists: ${u.name}`);
    }
  }

  console.log("\nInvite code for new friends: friends2024");
}

main().finally(() => db.close());
