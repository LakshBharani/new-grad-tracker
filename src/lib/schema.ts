import { pgTable, text, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Postgres `now()` formatted as a JS-compatible ISO 8601 string so all helpers
// can keep working with plain strings — no Date objects flowing through the app.
const isoNow = sql`to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("USER"),
  resumeUrl: text("resume_url"),
  resumeText: text("resume_text"),
  linkedinUrl: text("linkedin_url"),
  bio: text("bio"),
  createdAt: text("created_at").notNull().default(isoNow),
  updatedAt: text("updated_at").notNull().default(isoNow),
});

// A user's stored resumes — each user can keep several (e.g. "SWE", "Data").
export const resumes = pgTable("resumes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  storagePath: text("storage_path").notNull(),
  fileName: text("file_name"),
  createdAt: text("created_at").notNull().default(isoNow),
  updatedAt: text("updated_at").notNull().default(isoNow),
});

// Shared job listings pool — anyone in the group can add a listing
export const listings = pgTable("listings", {
  id: text("id").primaryKey(),
  addedById: text("added_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  role: text("role").notNull(),
  link: text("link").notNull(),
  jobType: text("job_type").notNull().default("NEW_GRAD"),
  listingNotes: text("listing_notes"),   // notes about the listing itself
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().default(isoNow),
  updatedAt: text("updated_at").notNull().default(isoNow),
});

// Per-user application tracking on a listing
export const applications = pgTable(
  "applications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    listingId: text("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    resumeId: text("resume_id").references(() => resumes.id, { onDelete: "set null" }),
    status: text("status").notNull().default("INTERESTED"),
    hasReferral: boolean("has_referral").notNull().default(false),
    referralFrom: text("referral_from"),
    notes: text("notes"),
    appliedAt: text("applied_at"),
    eventAt: text("event_at"),
    interviewRound: integer("interview_round"),
    deletedAt: text("deleted_at"),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => ({
    userListingUnique: uniqueIndex("applications_user_listing_idx").on(t.userId, t.listingId),
  })
);

export type User = typeof users.$inferSelect;
export type Resume = typeof resumes.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Application = typeof applications.$inferSelect;
