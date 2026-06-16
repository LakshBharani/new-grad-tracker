// Comprehensive dummy-data seeder for local testing.
// Resets listings + applications, ensures a set of test users, and inserts
// LOTS of varied data so every page (dashboard, board, my apps, gc, trash, stats)
// reflects a realistic load — each user ends up with 60-90 tracked applications.
//
//   node scripts/seed-dummy.cjs
//
// All test users share the password: password123

const Database = require("better-sqlite3");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");

const dbPath = path.resolve(__dirname, "..", "db", "app.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const PASSWORD = "password123";

// ── Deterministic RNG so re-runs are stable ─────────────────────────────────
let _seed = 0xC0FFEE;
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

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}
function dateFromNow(n) {
  return daysFromNow(n).slice(0, 10);
}
// Local datetime string (YYYY-MM-DDTHH:mm) N days from now at a given hour.
function eventIn(days, hour = 14, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Listing pool ────────────────────────────────────────────────────────────
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
  "Software Engineer, New Grad",
  "Software Engineer I",
  "Software Engineer III, New Grad",
  "Member of Technical Staff (New Grad)",
  "New Grad Software Engineer",
  "Software Engineer, University Grad",
  "Backend Engineer, New Grad",
  "Frontend Engineer, New Grad",
  "Full-Stack Engineer (New Grad 2026)",
  "Machine Learning Engineer, New Grad",
  "Infrastructure Engineer, New Grad",
  "Platform Engineer (New Grad)",
];
const INTERN_ROLES = [
  "Software Engineering Intern",
  "Software Engineer Intern",
  "Backend Engineering Intern",
  "Machine Learning Intern",
  "Infrastructure Intern",
  "Full-Stack Intern",
];

const LISTING_NOTES = [
  null, null, null, null, null,
  "Strong comp, no sponsorship details listed",
  "Accepts OPT, good TC",
  "Rolling basis — apply ASAP",
  "Multiple teams hiring",
  "Quant-adjacent, exceptional comp",
  "Hybrid SF only",
  "Remote-friendly",
  "Recruiter responsive",
  "Heard back within a week historically",
  "Behavioral-heavy loop",
  "Heavy DS&A focus",
  "Talked to a current intern, said culture is great",
];

const REFERRAL_PEOPLE = [
  "Rahul (prev intern)", "Priya (SWE there)", "Arjun from team", "Siddharth",
  "Bootcamp friend", "Team lead", "College alum", "Hackathon buddy",
  "Hiring manager (LinkedIn)", "Skip-level", "Open referral form",
];

const NOTE_TEMPLATES = [
  null, null, null, null, null, null,
  "Recruiter reached out on LinkedIn",
  "HC loop done. Awaiting decision.",
  "OA link from portal. Due this week.",
  "Phone screen scheduled — preparing behavioral",
  "First round went well",
  "Onsite next week — 5 rounds",
  "Behavioral was rough, hopeful for tech",
  "System design round next week",
  "Rejected by recruiter after OA",
  "Ghosted by recruiter",
  "Loved the team — really hoping for an offer",
  "Compensation discussion went well",
  "Rejected — got positive feedback though",
  "Timeline didn't work out",
  "Withdrew — accepted elsewhere",
  "$220k TC. Accept by deadline.",
  "Signed!",
  "Dream job 🎉",
  "Take-home assessment in progress",
];

// Status distribution per user. We split unused listings into INTERESTED too.
const STATUS_POOL = [
  ...Array(8).fill("APPLIED"),
  ...Array(4).fill("REJECTED"),
  ...Array(3).fill("OA"),
  ...Array(3).fill("PHONE_SCREEN"),
  ...Array(2).fill("INTERVIEW"),
  ...Array(2).fill("INTERESTED"),
  ...Array(1).fill("FINAL_ROUND"),
  ...Array(1).fill("WITHDRAWN"),
];
const EVENT_STAGES = new Set(["OA", "PHONE_SCREEN", "INTERVIEW", "FINAL_ROUND"]);

function companySlug(c) {
  return c.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function main() {
  const hashed = await bcrypt.hash(PASSWORD, 12);

  // ── Users ──────────────────────────────────────────────────────────────────
  const seedUsers = [
    { name: "Laksh", email: "laksh.bharani.us@gmail.com" },
    { name: "Adi", email: "adi@example.com" },
    { name: "Priya", email: "priya@example.com" },
    { name: "Marcus", email: "marcus@example.com" },
    { name: "Sofia", email: "sofia@example.com" },
  ];

  const upsertUser = db.prepare(
    "INSERT INTO users (id, email, name, password, role) VALUES (?, ?, ?, ?, ?) " +
      "ON CONFLICT(email) DO UPDATE SET name = excluded.name, password = excluded.password"
  );

  const userByName = {};
  for (const u of seedUsers) {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(u.email);
    const id = existing ? existing.id : randomUUID();
    upsertUser.run(id, u.email, u.name, hashed, "USER");
    userByName[u.name] = { id, name: u.name };
  }
  const U = userByName;
  const userList = seedUsers.map((u) => U[u.name]);
  console.log(`✓ Ensured ${seedUsers.length} users (password: ${PASSWORD})`);

  // ── Reset listings + applications for idempotent re-runs ────────────────────
  db.exec("DELETE FROM applications; DELETE FROM listings;");

  const insertListing = db.prepare(`
    INSERT INTO listings (id, added_by_id, company, role, link, job_type, listing_notes, deleted_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertApp = db.prepare(`
    INSERT INTO applications (id, user_id, listing_id, status, has_referral, referral_from, notes, applied_at, event_at, deleted_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const runAll = db.transaction(() => {
    // ── Generate listings ────────────────────────────────────────────────────
    // Each company appears 1-2 times (e.g. new grad + intern, or 2 different roles).
    const listings = [];
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

        // Posting age: 0-90 days ago, weighted toward recent.
        const ageDays = Math.floor(Math.pow(rand(), 1.6) * 90);
        const createdAt = daysFromNow(-ageDays);

        const id = randomUUID();
        const addedBy = pick(userList);
        insertListing.run(
          id,
          addedBy.id,
          company,
          role,
          `https://${companySlug(company)}.com/careers`,
          isIntern ? "INTERNSHIP" : "NEW_GRAD",
          pick(LISTING_NOTES),
          null,
          createdAt,
          createdAt
        );
        listings.push({ id, company, role, isIntern, addedById: addedBy.id, createdAt });
      }
    }

    // A handful of soft-deleted listings per user — populates Trash.
    for (const u of userList) {
      const trashCount = intBetween(1, 3);
      for (let i = 0; i < trashCount; i++) {
        const id = randomUUID();
        const company = pick(COMPANIES) + " (old)";
        const role = pick(NEW_GRAD_ROLES);
        const ageDays = intBetween(10, 60);
        const deletedDays = intBetween(1, 25);
        const createdAt = daysFromNow(-ageDays);
        insertListing.run(
          id, u.id, company, role,
          `https://${companySlug(company)}.com/careers`,
          "NEW_GRAD", null,
          daysFromNow(-deletedDays),
          createdAt, createdAt
        );
      }
    }

    // ── Generate applications per user ───────────────────────────────────────
    // Each user applies/tracks 60-90 of the active listings.
    const activeListings = listings;
    for (const user of userList) {
      const targetCount = intBetween(60, 90);
      const subset = pickN(activeListings, Math.min(targetCount, activeListings.length));

      for (const l of subset) {
        const status = pick(STATUS_POOL);
        const referral = chance(0.18);
        const referralFrom = referral ? pick(REFERRAL_PEOPLE) : null;
        const notes = chance(0.45) ? pick(NOTE_TEMPLATES) : null;

        // applied_at: for INTERESTED, leave null. Otherwise 1-90 days ago.
        const appliedAt = status === "INTERESTED" ? null : dateFromNow(-intBetween(1, 90));

        // event_at: for event stages, ~70% have a scheduled date in the next 1-21 days.
        let eventAt = null;
        if (EVENT_STAGES.has(status) && chance(0.7)) {
          eventAt = eventIn(intBetween(1, 21), intBetween(9, 17), pick([0, 15, 30, 45]));
        }

        insertApp.run(
          randomUUID(), user.id, l.id, status,
          referral ? 1 : 0, referralFrom, notes,
          appliedAt, eventAt, null,
          daysFromNow(-intBetween(0, 30)), daysFromNow(-intBetween(0, 5))
        );
      }
    }

    // ── Showcase: guarantee Laksh has a few upcoming events soon, an offer,
    //    a final round, and an "I'm Interested" or two — so the dashboard
    //    always looks rich on first login.
    db.exec(`DELETE FROM applications WHERE user_id = '${U.Laksh.id}'`);

    const showcasePicks = pickN(activeListings, 75);
    let i = 0;

    // Soonest events for dashboard "Upcoming Deadlines"
    const oa1 = showcasePicks[i++];
    insertApp.run(randomUUID(), U.Laksh.id, oa1.id, "OA", 0, null,
      "OA due this week — 90 min HackerRank", dateFromNow(-3),
      eventIn(1, 9, 30), null, daysFromNow(-3), daysFromNow(0));

    const ps1 = showcasePicks[i++];
    insertApp.run(randomUUID(), U.Laksh.id, ps1.id, "PHONE_SCREEN", 0, null,
      "Recruiter phone screen", dateFromNow(-7),
      eventIn(2, 11, 0), null, daysFromNow(-7), daysFromNow(0));

    const int1 = showcasePicks[i++];
    insertApp.run(randomUUID(), U.Laksh.id, int1.id, "INTERVIEW", 1, "Priya (SWE there)",
      "Tech screen + behavioral", dateFromNow(-12),
      eventIn(4, 14, 0), null, daysFromNow(-12), daysFromNow(0));

    const fr1 = showcasePicks[i++];
    insertApp.run(randomUUID(), U.Laksh.id, fr1.id, "FINAL_ROUND", 1, "Rahul (prev intern)",
      "Full onsite — 5 rounds", dateFromNow(-20),
      eventIn(7, 13, 30), null, daysFromNow(-20), daysFromNow(0));

    const ps2 = showcasePicks[i++];
    insertApp.run(randomUUID(), U.Laksh.id, ps2.id, "PHONE_SCREEN", 0, null,
      "Mid-level recruiter call", dateFromNow(-9),
      eventIn(10, 15, 0), null, daysFromNow(-9), daysFromNow(0));

    // Offer + rejections + interested + many applied
    const offer = showcasePicks[i++];
    insertApp.run(randomUUID(), U.Laksh.id, offer.id, "OFFER", 0, null,
      "$215k TC offer — deciding 🎉", dateFromNow(-45),
      null, null, daysFromNow(-45), daysFromNow(-2));

    for (let j = 0; j < 4; j++) {
      const l = showcasePicks[i++];
      insertApp.run(randomUUID(), U.Laksh.id, l.id, "REJECTED", 0, null,
        chance(0.5) ? "Rejected after OA" : null,
        dateFromNow(-intBetween(20, 70)), null, null,
        daysFromNow(-intBetween(20, 70)), daysFromNow(-intBetween(5, 20)));
    }
    for (let j = 0; j < 5; j++) {
      const l = showcasePicks[i++];
      insertApp.run(randomUUID(), U.Laksh.id, l.id, "INTERESTED",
        0, null, null, null, null, null,
        daysFromNow(-intBetween(0, 14)), daysFromNow(0));
    }
    // Fill the rest as a healthy mix of APPLIED with occasional WITHDRAWN.
    while (i < showcasePicks.length) {
      const l = showcasePicks[i++];
      const status = chance(0.08) ? "WITHDRAWN" : "APPLIED";
      const referral = chance(0.15);
      insertApp.run(randomUUID(), U.Laksh.id, l.id, status,
        referral ? 1 : 0, referral ? pick(REFERRAL_PEOPLE) : null,
        chance(0.3) ? pick(NOTE_TEMPLATES) : null,
        dateFromNow(-intBetween(2, 90)), null, null,
        daysFromNow(-intBetween(2, 60)), daysFromNow(-intBetween(0, 5)));
    }

    // A soft-deleted application for Laksh (shows up if Trash ever surfaces them).
    const trashApp = pick(activeListings.filter((l) => !showcasePicks.includes(l)));
    if (trashApp) {
      insertApp.run(randomUUID(), U.Laksh.id, trashApp.id, "APPLIED",
        0, null, "Removed — duplicate posting",
        dateFromNow(-25), null, daysFromNow(-2),
        daysFromNow(-25), daysFromNow(-2));
    }
  });

  runAll();

  // ── Summary ────────────────────────────────────────────────────────────────
  const counts = {
    users: db.prepare("SELECT COUNT(*) c FROM users").get().c,
    listings: db.prepare("SELECT COUNT(*) c FROM listings").get().c,
    listingsActive: db.prepare("SELECT COUNT(*) c FROM listings WHERE deleted_at IS NULL").get().c,
    applications: db.prepare("SELECT COUNT(*) c FROM applications").get().c,
  };
  console.log(`✓ Seeded ${counts.listings} listings (${counts.listingsActive} active) and ${counts.applications} applications across ${counts.users} users.`);

  const perUser = db.prepare(
    "SELECT u.name, COUNT(a.id) c FROM users u LEFT JOIN applications a ON a.user_id = u.id AND a.deleted_at IS NULL GROUP BY u.id ORDER BY u.name"
  ).all();
  console.log("\nApplications per user:");
  for (const r of perUser) console.log(`  • ${r.name.padEnd(7)} ${r.c}`);

  console.log("\nLog in with any of these (password: " + PASSWORD + "):");
  for (const u of seedUsers) console.log(`  • ${u.name.padEnd(7)} ${u.email}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.close());
