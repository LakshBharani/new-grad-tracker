import postgres from "postgres";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const result = await sql`
  UPDATE applications
  SET status = 'INTERVIEW'
  WHERE status = 'FINAL_ROUND'
  RETURNING id
`;

console.log(`Migrated ${result.length} application(s) from FINAL_ROUND → INTERVIEW.`);
await sql.end();
