const Database = require('better-sqlite3');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const dbPath = path.resolve(__dirname, '..', 'db', 'app.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const users = db.prepare('SELECT id, name FROM users').all();
if (users.length < 2) { console.error('Need at least 2 users. Run setup-db.mjs first.'); process.exit(1); }

const laksh = users.find(u => u.name === 'Laksh');
const adi   = users.find(u => u.name === 'Adi');

// Clear old seed data so re-runs are idempotent
db.exec('DELETE FROM applications; DELETE FROM listings;');

const now = new Date().toISOString();

const insertListing = db.prepare(`
  INSERT INTO listings (id, added_by_id, company, role, link, job_type, deadline, listing_notes, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertApp = db.prepare(`
  INSERT INTO applications (id, user_id, listing_id, status, has_referral, referral_from, notes, applied_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Helper to create a listing and return its id
function listing({ addedBy, company, role, link, jobType = 'NEW_GRAD', deadline = null, notes = null }) {
  const id = randomUUID();
  insertListing.run(id, addedBy.id, company, role, link, jobType, deadline, notes, now, now);
  return id;
}

function apply({ user, listingId, status, referral = false, referralFrom = null, notes = null, appliedAt = null }) {
  insertApp.run(randomUUID(), user.id, listingId, status, referral ? 1 : 0, referralFrom, notes, appliedAt, now, now);
}

// ── Listings ──────────────────────────────────────────────────────────────────
const stripe      = listing({ addedBy: laksh, company: 'Stripe',      role: 'Software Engineer, New Grad',         link: 'https://stripe.com/jobs', jobType: 'NEW_GRAD', deadline: '2026-07-15', notes: 'No OPT mentioned, strong comp' });
const google      = listing({ addedBy: laksh, company: 'Google',      role: 'Software Engineer III (New Grad)',     link: 'https://careers.google.com', jobType: 'NEW_GRAD', deadline: '2026-08-01' });
const meta        = listing({ addedBy: adi,   company: 'Meta',        role: 'Software Engineer, University Grad',   link: 'https://metacareers.com', jobType: 'NEW_GRAD', deadline: '2026-07-20', notes: 'Accepts OPT, good TC' });
const apple       = listing({ addedBy: adi,   company: 'Apple',       role: 'Software Engineer, New Grad',          link: 'https://jobs.apple.com', jobType: 'NEW_GRAD' });
const openai      = listing({ addedBy: laksh, company: 'OpenAI',      role: 'Software Engineer (New Grad 2026)',    link: 'https://openai.com/careers', jobType: 'NEW_GRAD', deadline: '2026-06-30', notes: 'Rolling basis, apply ASAP' });
const databricks  = listing({ addedBy: adi,   company: 'Databricks',  role: 'Software Engineer – New Grad 2026',   link: 'https://databricks.com/company/careers', jobType: 'NEW_GRAD', deadline: '2026-07-01' });
const jane        = listing({ addedBy: laksh, company: 'Jane Street', role: 'Software Engineer (SWE)',              link: 'https://janestreet.com/join-jane-street', jobType: 'NEW_GRAD', notes: 'Quant-adjacent, crazy comp' });
const figma       = listing({ addedBy: adi,   company: 'Figma',       role: 'Software Engineer, New Grad',          link: 'https://figma.com/careers', jobType: 'NEW_GRAD' });
const netflix     = listing({ addedBy: laksh, company: 'Netflix',     role: 'New Grad Software Engineer',          link: 'https://jobs.netflix.com', jobType: 'NEW_GRAD', deadline: '2026-07-31' });

// Internship listings
const ramp        = listing({ addedBy: adi,   company: 'Ramp',        role: 'Software Engineering Intern',         link: 'https://ramp.com/careers', jobType: 'INTERNSHIP', deadline: '2026-06-25' });
const airbnb      = listing({ addedBy: laksh, company: 'Airbnb',      role: 'Software Engineering Intern',         link: 'https://careers.airbnb.com', jobType: 'INTERNSHIP' });

// ── Applications ──────────────────────────────────────────────────────────────
// Laksh's applications
apply({ user: laksh, listingId: stripe,     status: 'FINAL_ROUND', referral: true,  referralFrom: 'Rahul (prev intern)', notes: 'HC loop done. Awaiting decision.', appliedAt: '2026-05-10' });
apply({ user: laksh, listingId: openai,     status: 'OA',          referral: false, notes: 'Got OA link from portal. Due this week.', appliedAt: '2026-05-20' });
apply({ user: laksh, listingId: meta,       status: 'REJECTED',    referral: false, appliedAt: '2026-04-15' });
apply({ user: laksh, listingId: google,     status: 'PHONE_SCREEN',referral: false, notes: 'Phone screen scheduled for next Tuesday', appliedAt: '2026-05-01' });
apply({ user: laksh, listingId: databricks, status: 'APPLIED',     referral: false, appliedAt: '2026-05-28' });
apply({ user: laksh, listingId: jane,       status: 'INTERVIEW',   referral: true,  referralFrom: 'Priya (SWE there)', notes: 'First round went well. Waiting on second.', appliedAt: '2026-05-05' });
apply({ user: laksh, listingId: airbnb,     status: 'APPLIED',     referral: false, appliedAt: '2026-05-30' });

// Adi's applications
apply({ user: adi, listingId: meta,        status: 'OFFER',       referral: true,  referralFrom: 'Arjun from team',  notes: '💰 $220k TC. Deadline to accept June 20.', appliedAt: '2026-04-10' });
apply({ user: adi, listingId: stripe,      status: 'INTERVIEW',   referral: false, notes: 'System design round next week', appliedAt: '2026-05-12' });
apply({ user: adi, listingId: figma,       status: 'OA',          referral: false, appliedAt: '2026-05-25' });
apply({ user: adi, listingId: netflix,     status: 'APPLIED',     referral: false, appliedAt: '2026-05-29' });
apply({ user: adi, listingId: ramp,        status: 'FINAL_ROUND', referral: true,  referralFrom: 'Siddharth',        notes: 'Really liked the team. Fingers crossed.', appliedAt: '2026-05-08' });
apply({ user: adi, listingId: databricks,  status: 'PHONE_SCREEN',referral: false, notes: 'Recruiter screen done. Technical next.', appliedAt: '2026-05-28' });
apply({ user: adi, listingId: apple,       status: 'WITHDRAWN',   referral: false, notes: 'Timeline didn\'t work out', appliedAt: '2026-04-20' });

console.log(`✓ Created ${11} listings and ${14} applications across Laksh and Adi.`);
db.close();
