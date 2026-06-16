const Database = require("better-sqlite3");
const path = require("node:path");

const db = new Database(path.resolve(__dirname, "..", "db", "app.db"));

const rows = db.prepare(
  `SELECT id, status FROM applications
   WHERE status IN ('PHONE_SCREEN','INTERVIEW','FINAL_ROUND','OFFER','REJECTED')
     AND interview_round IS NULL
     AND deleted_at IS NULL`
).all();

console.log("To seed:", rows.length);

const upd = db.prepare("UPDATE applications SET interview_round = ? WHERE id = ?");
const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

for (const r of rows) {
  let round = 1;
  if (r.status === "PHONE_SCREEN") round = 1;
  else if (r.status === "INTERVIEW") round = rand(1, 2);
  else if (r.status === "FINAL_ROUND") round = rand(2, 3);
  else if (r.status === "OFFER") round = rand(2, 4);
  else if (r.status === "REJECTED") round = rand(1, 3);
  upd.run(round, r.id);
}

console.log("Seeded interview_round on", rows.length, "applications");
db.close();
