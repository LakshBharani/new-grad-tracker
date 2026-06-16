// Postgres dummy-data seeder for the live Supabase database.
// Mirrors scripts/seed-dummy.cjs but targets Postgres via postgres.js.
//
//   node scripts/seed-dummy-pg.mjs
//
// All test users share the password: password123

import { readFileSync } from "fs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import bcrypt from "bcryptjs";

// ── Load DATABASE_URL from .env.local (the file Next.js uses) ────────────────
const envLocal = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const m = envLocal.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
if (!m) throw new Error("DATABASE_URL not found in .env.local");
const url = m[1].trim().replace(/^["']|["']$/g, "");
const sql = postgres(url, { prepare: false, max: 1 });

const PASSWORD = "password123";

// ── Deterministic RNG so re-runs are stable ─────────────────────────────────
let _seed = 0xc0ffee;
function rand() {
  _seed = (_seed * 1664525 + 1013904223) >>> 0;
  return _seed / 0x100000000;
}
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
function chance(p) { return rand() < p; }
function intBetween(lo, hi) { return Math.floor(rand() * (hi - lo + 1)) + lo; }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); }
function dateFromNow(n) { return daysFromNow(n).slice(0, 10); }
function eventIn(days, hour = 14, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const COMPANIES = [
  "Stripe", "Google", "Meta", "Apple", "OpenAI", "Anthropic", "Databricks",
  "Jane Street", "Figma", "Netflix", "NVIDIA", "Datadog", "Snowflake",
  "Microsoft", "Amazon", "Uber", "Lyft", "DoorDash", "Instacart", "Airbnb",
  "Pinterest", "Reddit", "Discord", "Notion", "Linear", "Vercel", "Cloudflare",
  "MongoDB", "Plaid", "Coinbase", "Ramp", "Brex", "Robinhood", "SoFi",
  "Affirm", "Block", "Square", "Twilio", "Atlassian", "GitLab", "GitHub",
  "Asana", "Dropbox", "Box", "Slack", "Zoom", "Salesforce", "ServiceNow",
  "Palantir", "Anduril", "SpaceX", "Tesla", "Rivian", "Waymo", "Cruise",
  "Scale AI", "Hugging Face", "Mistral", "Cohere", "Perplexity", "Character.AI",
  "Two Sigma", "Citadel", "Hudson River Trading", "Jump Trading", "DRW",
  "Bloomberg", "Goldman Sachs", "JPMorgan", "Morgan Stanley", "Capital One",
  "American Express", "Visa", "Mastercard", "Roblox", "Unity", "Epic Games",
  "Riot Games", "Spotify", "TikTok", "Snap", "Pinterest Labs", "Yelp",
];
const NEW_GRAD_ROLES = [
  "Software Engineer, New Grad", "Software Engineer I", "Software Engineer III, New Grad",
  "Member of Technical Staff (New Grad)", "New Grad Software Engineer",
  "Software Engineer, University Grad", "Backend Engineer, New Grad",
  "Frontend Engineer, New Grad", "Full-Stack Engineer (New Grad 2026)",
  "Machine Learning Engineer, New Grad", "Infrastructure Engineer, New Grad",
  "Platform Engineer (New Grad)",
];
const INTERN_ROLES = [
  "Software Engineering Intern", "Software Engineer Intern", "Backend Engineering Intern",
  "Machine Learning Intern", "Infrastructure Intern", "Full-Stack Intern",
];
const LISTING_NOTES = [
  null, null, null, null, null,
  "Strong comp, no sponsorship details listed", "Accepts OPT, good TC",
  "Rolling basis — apply ASAP", "Multiple teams hiring",
  "Quant-adjacent, exceptional comp", "Hybrid SF only", "Remote-friendly",
  "Recruiter responsive", "Heard back within a week historically",
  "Behavioral-heavy loop", "Heavy DS&A focus",
  "Talked to a current intern, said culture is great",
];
const REFERRAL_PEOPLE = [
  "Rahul (prev intern)", "Priya (SWE there)", "Arjun from team", "Siddharth",
  "Bootcamp friend", "Team lead", "College alum", "Hackathon buddy",
  "Hiring manager (LinkedIn)", "Skip-level", "Open referral form",
];
const NOTE_TEMPLATES = [
  null, null, null, null, null, null,
  "Recruiter reached out on LinkedIn", "HC loop done. Awaiting decision.",
  "OA link from portal. Due this week.", "Phone screen scheduled — preparing behavioral",
  "First round went well", "Onsite next week — 5 rounds",
  "Behavioral was rough, hopeful for tech", "System design round next week",
  "Rejected by recruiter after OA", "Ghosted by recruiter",
  "Loved the team — really hoping for an offer", "Compensation discussion went well",
  "Rejected — got positive feedback though", "Timeline didn't work out",
  "Withdrew — accepted elsewhere", "$220k TC. Accept by deadline.", "Signed!",
  "Dream job 🎉", "Take-home assessment in progress",
];
const STATUS_POOL = [
  ...Array(8).fill("APPLIED"), ...Array(4).fill("REJECTED"), ...Array(3).fill("OA"),
  ...Array(3).fill("PHONE_SCREEN"), ...Array(2).fill("INTERVIEW"),
  ...Array(2).fill("INTERESTED"), ...Array(1).fill("FINAL_ROUND"), ...Array(1).fill("WITHDRAWN"),
];
const EVENT_STAGES = new Set(["OA", "PHONE_SCREEN", "INTERVIEW", "FINAL_ROUND"]);
const companySlug = (c) => c.toLowerCase().replace(/[^a-z0-9]+/g, "");

async function main() {
  const hashed = await bcrypt.hash(PASSWORD, 12);

  const seedUsers = [
    { name: "Laksh", email: "laksh.bharani.us@gmail.com" },
    { name: "Adi", email: "adi@example.com" },
    { name: "Priya", email: "priya@example.com" },
    { name: "Marcus", email: "marcus@example.com" },
    { name: "Sofia", email: "sofia@example.com" },
  ];

  // Clean slate (idempotent). DELETE (not TRUNCATE) so we don't need an
  // ACCESS EXCLUSIVE lock, which the running dev server's connections block.
  await sql`DELETE FROM applications`;
  await sql`DELETE FROM listings`;
  await sql`DELETE FROM users`;

  const U = {};
  const userRows = seedUsers.map((u) => {
    const id = randomUUID();
    U[u.name] = { id, name: u.name };
    return { id, email: u.email, name: u.name, password: hashed, role: "USER" };
  });
  const userList = seedUsers.map((u) => U[u.name]);
  await sql`INSERT INTO users ${sql(userRows, "id", "email", "name", "password", "role")}`;
  console.log(`✓ Ensured ${seedUsers.length} users (password: ${PASSWORD})`);

  const listingRows = [];
  const listings = [];
  const pushListing = (r) => {
    listingRows.push({
      id: r.id, added_by_id: r.addedById, company: r.company, role: r.role,
      link: `https://${companySlug(r.company)}.com/careers`, job_type: r.jobType,
      listing_notes: r.listingNotes ?? null, deleted_at: r.deletedAt ?? null,
      created_at: r.createdAt, updated_at: r.updatedAt ?? r.createdAt,
    });
  };

  // Active listings — each company appears 1-2 times.
  for (const company of COMPANIES) {
    const variants = chance(0.35) ? 2 : 1;
    const usedRoles = new Set();
    for (let v = 0; v < variants; v++) {
      const isIntern = chance(0.22);
      const rolePool = isIntern ? INTERN_ROLES : NEW_GRAD_ROLES;
      let role = pick(rolePool);
      let guard = 0;
      while (usedRoles.has(role) && guard++ < 5) role = pick(rolePool);
      usedRoles.add(role);
      const ageDays = Math.floor(Math.pow(rand(), 1.6) * 90);
      const createdAt = daysFromNow(-ageDays);
      const id = randomUUID();
      const addedBy = pick(userList);
      pushListing({ id, addedById: addedBy.id, company, role, jobType: isIntern ? "INTERNSHIP" : "NEW_GRAD", listingNotes: pick(LISTING_NOTES), createdAt });
      listings.push({ id, company, role, isIntern });
    }
  }

  // Soft-deleted listings per user — populates Trash.
  for (const u of userList) {
    const trashCount = intBetween(1, 3);
    for (let i = 0; i < trashCount; i++) {
      const id = randomUUID();
      const company = pick(COMPANIES) + " (old)";
      const ageDays = intBetween(10, 60);
      const createdAt = daysFromNow(-ageDays);
      pushListing({ id, addedById: u.id, company, role: pick(NEW_GRAD_ROLES), jobType: "NEW_GRAD", listingNotes: null, deletedAt: daysFromNow(-intBetween(1, 25)), createdAt });
    }
  }

  await sql`INSERT INTO listings ${sql(listingRows, "id", "added_by_id", "company", "role", "link", "job_type", "listing_notes", "deleted_at", "created_at", "updated_at")}`;

  // ── Applications ────────────────────────────────────────────────────────────
  const appRows = [];
  const pushApp = (r) => appRows.push({
    id: randomUUID(), user_id: r.userId, listing_id: r.listingId, status: r.status,
    has_referral: !!r.hasReferral, referral_from: r.referralFrom ?? null, notes: r.notes ?? null,
    applied_at: r.appliedAt ?? null, event_at: r.eventAt ?? null, deleted_at: r.deletedAt ?? null,
    created_at: r.createdAt, updated_at: r.updatedAt,
  });

  const activeListings = listings;
  for (const user of userList) {
    if (user.name === "Laksh") continue; // Laksh handled in the showcase below.
    const targetCount = intBetween(60, 90);
    const subset = pickN(activeListings, Math.min(targetCount, activeListings.length));
    for (const l of subset) {
      const status = pick(STATUS_POOL);
      const referral = chance(0.18);
      const appliedAt = status === "INTERESTED" ? null : dateFromNow(-intBetween(1, 90));
      let eventAt = null;
      if (EVENT_STAGES.has(status) && chance(0.7)) eventAt = eventIn(intBetween(1, 21), intBetween(9, 17), pick([0, 15, 30, 45]));
      pushApp({
        userId: user.id, listingId: l.id, status, hasReferral: referral,
        referralFrom: referral ? pick(REFERRAL_PEOPLE) : null,
        notes: chance(0.45) ? pick(NOTE_TEMPLATES) : null,
        appliedAt, eventAt,
        createdAt: daysFromNow(-intBetween(0, 30)), updatedAt: daysFromNow(-intBetween(0, 5)),
      });
    }
  }

  // Showcase for Laksh — rich dashboard on first login.
  const L = U.Laksh.id;
  const showcasePicks = pickN(activeListings, 75);
  let i = 0;
  pushApp({ userId: L, listingId: showcasePicks[i++].id, status: "OA", notes: "OA due this week — 90 min HackerRank", appliedAt: dateFromNow(-3), eventAt: eventIn(1, 9, 30), createdAt: daysFromNow(-3), updatedAt: daysFromNow(0) });
  pushApp({ userId: L, listingId: showcasePicks[i++].id, status: "PHONE_SCREEN", notes: "Recruiter phone screen", appliedAt: dateFromNow(-7), eventAt: eventIn(2, 11, 0), createdAt: daysFromNow(-7), updatedAt: daysFromNow(0) });
  pushApp({ userId: L, listingId: showcasePicks[i++].id, status: "INTERVIEW", hasReferral: true, referralFrom: "Priya (SWE there)", notes: "Tech screen + behavioral", appliedAt: dateFromNow(-12), eventAt: eventIn(4, 14, 0), createdAt: daysFromNow(-12), updatedAt: daysFromNow(0) });
  pushApp({ userId: L, listingId: showcasePicks[i++].id, status: "FINAL_ROUND", hasReferral: true, referralFrom: "Rahul (prev intern)", notes: "Full onsite — 5 rounds", appliedAt: dateFromNow(-20), eventAt: eventIn(7, 13, 30), createdAt: daysFromNow(-20), updatedAt: daysFromNow(0) });
  pushApp({ userId: L, listingId: showcasePicks[i++].id, status: "PHONE_SCREEN", notes: "Mid-level recruiter call", appliedAt: dateFromNow(-9), eventAt: eventIn(10, 15, 0), createdAt: daysFromNow(-9), updatedAt: daysFromNow(0) });
  pushApp({ userId: L, listingId: showcasePicks[i++].id, status: "OFFER", notes: "$215k TC offer — deciding 🎉", appliedAt: dateFromNow(-45), createdAt: daysFromNow(-45), updatedAt: daysFromNow(-2) });
  for (let j = 0; j < 4; j++) {
    const l = showcasePicks[i++];
    pushApp({ userId: L, listingId: l.id, status: "REJECTED", notes: chance(0.5) ? "Rejected after OA" : null, appliedAt: dateFromNow(-intBetween(20, 70)), createdAt: daysFromNow(-intBetween(20, 70)), updatedAt: daysFromNow(-intBetween(5, 20)) });
  }
  for (let j = 0; j < 5; j++) {
    const l = showcasePicks[i++];
    pushApp({ userId: L, listingId: l.id, status: "INTERESTED", createdAt: daysFromNow(-intBetween(0, 14)), updatedAt: daysFromNow(0) });
  }
  while (i < showcasePicks.length) {
    const l = showcasePicks[i++];
    const status = chance(0.08) ? "WITHDRAWN" : "APPLIED";
    const referral = chance(0.15);
    pushApp({ userId: L, listingId: l.id, status, hasReferral: referral, referralFrom: referral ? pick(REFERRAL_PEOPLE) : null, notes: chance(0.3) ? pick(NOTE_TEMPLATES) : null, appliedAt: dateFromNow(-intBetween(2, 90)), createdAt: daysFromNow(-intBetween(2, 60)), updatedAt: daysFromNow(-intBetween(0, 5)) });
  }
  const trashApp = pick(activeListings.filter((l) => !showcasePicks.includes(l)));
  if (trashApp) {
    pushApp({ userId: L, listingId: trashApp.id, status: "APPLIED", notes: "Removed — duplicate posting", appliedAt: dateFromNow(-25), deletedAt: daysFromNow(-2), createdAt: daysFromNow(-25), updatedAt: daysFromNow(-2) });
  }

  // Insert applications in chunks (avoids oversized statements on the pooler).
  for (let c = 0; c < appRows.length; c += 200) {
    const chunk = appRows.slice(c, c + 200);
    await sql`INSERT INTO applications ${sql(chunk, "id", "user_id", "listing_id", "status", "has_referral", "referral_from", "notes", "applied_at", "event_at", "deleted_at", "created_at", "updated_at")}`;
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  const [c1] = await sql`SELECT count(*)::int c FROM listings`;
  const [c2] = await sql`SELECT count(*)::int c FROM listings WHERE deleted_at IS NULL`;
  const [c3] = await sql`SELECT count(*)::int c FROM applications`;
  console.log(`✓ Seeded ${c1.c} listings (${c2.c} active) and ${c3.c} applications across ${userList.length} users.`);
  const perUser = await sql`SELECT u.name, count(a.id)::int c FROM users u LEFT JOIN applications a ON a.user_id = u.id AND a.deleted_at IS NULL GROUP BY u.id, u.name ORDER BY u.name`;
  console.log("\nApplications per user:");
  for (const r of perUser) console.log(`  • ${r.name.padEnd(7)} ${r.c}`);
  console.log("\nLog in with any of these (password: " + PASSWORD + "):");
  for (const u of seedUsers) console.log(`  • ${u.name.padEnd(7)} ${u.email}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => sql.end());
