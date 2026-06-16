import { db } from "./db";
import { users, listings, applications, resumes, aiCache } from "./schema";
import { eq, and, isNull, isNotNull, desc, like } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { UserApplicationRow, ListingWithMeta } from "./types";

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserById(id: string) {
  const r = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return r[0] ?? null;
}

export async function getUserByEmail(email: string) {
  const r = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return r[0] ?? null;
}

export async function getAllUsers() {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .orderBy(users.name);
}

export async function createUser(data: { name: string; email: string; password: string }) {
  const id = randomUUID();
  await db.insert(users).values({ id, ...data, role: "USER" });
  return getUserById(id);
}

export async function updateUserResume(
  userId: string,
  data: { resumeUrl: string | null; resumeText: string | null }
) {
  const now = new Date().toISOString();
  await db
    .update(users)
    .set({ resumeUrl: data.resumeUrl, resumeText: data.resumeText, updatedAt: now })
    .where(eq(users.id, userId));
  return getUserById(userId);
}

// ─── Resumes ──────────────────────────────────────────────────────────────────

export async function listResumes(userId: string) {
  return db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.createdAt));
}

export async function getResumeById(id: string) {
  const r = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
  return r[0] ?? null;
}

export async function createResume(data: {
  userId: string;
  label: string;
  storagePath: string;
  fileName: string | null;
}) {
  const id = randomUUID();
  await db.insert(resumes).values({ id, ...data });
  return getResumeById(id);
}

export async function updateResume(id: string, data: { label: string }) {
  const now = new Date().toISOString();
  await db.update(resumes).set({ label: data.label, updatedAt: now }).where(eq(resumes.id, id));
  return getResumeById(id);
}

export async function deleteResume(id: string) {
  await db.delete(resumes).where(eq(resumes.id, id));
}

// ─── AI: cache ────────────────────────────────────────────────────────────────

export async function getAiCache(key: string) {
  const r = await db.select().from(aiCache).where(eq(aiCache.key, key)).limit(1);
  return r[0] ?? null;
}

export async function setAiCache(key: string, valueJson: string) {
  const now = new Date().toISOString();
  const existing = await getAiCache(key);
  if (existing) {
    await db.update(aiCache).set({ valueJson, updatedAt: now }).where(eq(aiCache.key, key));
  } else {
    await db.insert(aiCache).values({ key, valueJson });
  }
  return getAiCache(key);
}

// Resume-review ATS scores are cached per (user, listing) under this key prefix.
function reviewKey(userId: string, listingId: string) {
  return `review:${userId}:${listingId}`;
}

export async function saveReviewScore(userId: string, listingId: string, atsScore: number) {
  return setAiCache(reviewKey(userId, listingId), JSON.stringify({ atsScore, updatedAt: new Date().toISOString() }));
}

/** Map of listingId → latest ATS score for a user (for the My Tracker gauges). */
export async function getReviewScoresForUser(userId: string): Promise<Record<string, number>> {
  const prefix = `review:${userId}:`;
  const rows = await db.select().from(aiCache).where(like(aiCache.key, `${prefix}%`));
  const map: Record<string, number> = {};
  for (const r of rows) {
    try {
      const v = JSON.parse(r.valueJson);
      if (typeof v.atsScore === "number") map[r.key.slice(prefix.length)] = v.atsScore;
    } catch {
      /* skip malformed */
    }
  }
  return map;
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export async function getAllListings(includeDeleted = false): Promise<ListingWithMeta[]> {
  const rows = await db
    .select({ listing: listings, addedBy: { id: users.id, name: users.name, email: users.email } })
    .from(listings)
    .leftJoin(users, eq(listings.addedById, users.id))
    .where(includeDeleted ? isNotNull(listings.deletedAt) : isNull(listings.deletedAt))
    .orderBy(desc(listings.createdAt));

  const allApps = await getAllApplicationsRaw();

  // Group apps by listingId in O(N+M) instead of O(N*M) (matters at 100+ listings × 400+ apps).
  const appsByListing = new Map<string, UserApplicationRow[]>();
  for (const a of allApps) {
    const arr = appsByListing.get(a.listingId);
    if (arr) arr.push(a);
    else appsByListing.set(a.listingId, [a]);
  }

  return rows.map(({ listing, addedBy }) => ({
    ...listing,
    addedBy: addedBy ?? { id: "", name: "", email: "" },
    applications: appsByListing.get(listing.id) ?? [],
  }));
}

export async function getListingById(id: string): Promise<ListingWithMeta | null> {
  const rows = await db
    .select({ listing: listings, addedBy: { id: users.id, name: users.name, email: users.email } })
    .from(listings)
    .leftJoin(users, eq(listings.addedById, users.id))
    .where(eq(listings.id, id))
    .limit(1);

  if (!rows[0]) return null;
  const apps = await getAllApplicationsRaw();
  return {
    ...rows[0].listing,
    addedBy: rows[0].addedBy ?? { id: "", name: "", email: "" },
    applications: apps.filter((a) => a.listingId === id),
  };
}

export async function createListing(data: {
  addedById: string;
  company: string;
  role: string;
  link: string;
  jobType?: string;
  listingNotes?: string | null;
}) {
  const id = randomUUID();
  await db.insert(listings).values({
    id,
    addedById: data.addedById,
    company: data.company,
    role: data.role,
    link: data.link,
    jobType: data.jobType ?? "NEW_GRAD",
    listingNotes: data.listingNotes ?? null,
  });
  return getListingById(id);
}

export async function updateListing(id: string, data: Partial<{
  company: string; role: string; link: string; jobType: string;
  listingNotes: string | null;
}>) {
  const now = new Date().toISOString();
  await db.update(listings).set({ ...data, updatedAt: now }).where(eq(listings.id, id));
  return getListingById(id);
}

export async function softDeleteListing(id: string) {
  await db.update(listings).set({ deletedAt: new Date().toISOString() }).where(eq(listings.id, id));
}

export async function restoreListing(id: string) {
  await db.update(listings).set({ deletedAt: null }).where(eq(listings.id, id));
}

export async function getDeletedListingsByUser(userId: string): Promise<ListingWithMeta[]> {
  const rows = await db
    .select({ listing: listings, addedBy: { id: users.id, name: users.name, email: users.email } })
    .from(listings)
    .leftJoin(users, eq(listings.addedById, users.id))
    .where(and(eq(listings.addedById, userId), isNotNull(listings.deletedAt)))
    .orderBy(desc(listings.createdAt));

  return rows.map(({ listing, addedBy }) => ({
    ...listing,
    addedBy: addedBy ?? { id: "", name: "", email: "" },
    applications: [],
  }));
}

export async function hardDeleteExpiredListings(userId: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString();
  const trashed = await db.select().from(listings)
    .where(and(eq(listings.addedById, userId), isNotNull(listings.deletedAt)));
  const toDelete = trashed.filter((l) => l.deletedAt && l.deletedAt <= cutoffStr);
  for (const l of toDelete) await db.delete(listings).where(eq(listings.id, l.id));
  return toDelete.length;
}

// ─── Applications (per-user status on a listing) ──────────────────────────────

async function getAllApplicationsRaw(): Promise<UserApplicationRow[]> {
  const rows = await db
    .select({ app: applications, user: { id: users.id, name: users.name, email: users.email } })
    .from(applications)
    .leftJoin(users, eq(applications.userId, users.id))
    .where(isNull(applications.deletedAt));

  return rows.map(({ app, user }) => ({
    ...app,
    hasReferral: Boolean(app.hasReferral),
    user: user ?? { id: "", name: "", email: "" },
  }));
}

export async function getMyApplication(userId: string, listingId: string): Promise<UserApplicationRow | null> {
  const rows = await db
    .select({ app: applications, user: { id: users.id, name: users.name, email: users.email }, resumeLabel: resumes.label })
    .from(applications)
    .leftJoin(users, eq(applications.userId, users.id))
    .leftJoin(resumes, eq(applications.resumeId, resumes.id))
    .where(and(eq(applications.userId, userId), eq(applications.listingId, listingId), isNull(applications.deletedAt)))
    .limit(1);

  if (!rows[0]) return null;
  return { ...rows[0].app, hasReferral: Boolean(rows[0].app.hasReferral), resumeLabel: rows[0].resumeLabel ?? null, user: rows[0].user ?? { id: "", name: "", email: "" } };
}

export async function getMyApplications(userId: string, includeDeleted = false): Promise<(UserApplicationRow & { listing: typeof listings.$inferSelect })[]> {
  const where = includeDeleted
    ? and(eq(applications.userId, userId), isNotNull(applications.deletedAt))
    : and(eq(applications.userId, userId), isNull(applications.deletedAt));

  const rows = await db
    .select({ app: applications, user: { id: users.id, name: users.name, email: users.email }, listing: listings, resumeLabel: resumes.label })
    .from(applications)
    .leftJoin(users, eq(applications.userId, users.id))
    .leftJoin(listings, eq(applications.listingId, listings.id))
    .leftJoin(resumes, eq(applications.resumeId, resumes.id))
    .where(where)
    .orderBy(desc(applications.createdAt));

  return rows.map(({ app, user, listing: l, resumeLabel }) => ({
    ...app,
    hasReferral: Boolean(app.hasReferral),
    resumeLabel: resumeLabel ?? null,
    user: user ?? { id: "", name: "", email: "" },
    listing: l!,
  }));
}

export async function upsertApplication(data: {
  userId: string;
  listingId: string;
  resumeId?: string | null;
  status?: string;
  hasReferral?: boolean;
  referralFrom?: string | null;
  notes?: string | null;
  appliedAt?: string | null;
  eventAt?: string | null;
  interviewRound?: number | null;
}): Promise<UserApplicationRow> {
  // Check active application first, then also check soft-deleted (to avoid UNIQUE constraint violation).
  const existing = await getMyApplication(data.userId, data.listingId);
  const now = new Date().toISOString();

  if (existing) {
    await db.update(applications).set({
      resumeId: data.resumeId !== undefined ? data.resumeId : existing.resumeId,
      status: data.status ?? existing.status,
      hasReferral: data.hasReferral ?? existing.hasReferral,
      referralFrom: data.referralFrom !== undefined ? data.referralFrom : existing.referralFrom,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      appliedAt: data.appliedAt !== undefined ? data.appliedAt : existing.appliedAt,
      eventAt: data.eventAt !== undefined ? data.eventAt : existing.eventAt,
      interviewRound: data.interviewRound !== undefined ? data.interviewRound : existing.interviewRound,
      updatedAt: now,
    }).where(eq(applications.id, existing.id));
    return (await getMyApplication(data.userId, data.listingId))!;
  }

  // Check for a soft-deleted record — restore it rather than inserting (avoids UNIQUE violation).
  const deletedRows = await db
    .select({ app: applications, user: { id: users.id, name: users.name, email: users.email } })
    .from(applications)
    .leftJoin(users, eq(applications.userId, users.id))
    .where(and(eq(applications.userId, data.userId), eq(applications.listingId, data.listingId), isNotNull(applications.deletedAt)))
    .limit(1);

  if (deletedRows[0]) {
    const deleted = deletedRows[0];
    await db.update(applications).set({
      resumeId: data.resumeId ?? null,
      status: data.status ?? "INTERESTED",
      hasReferral: data.hasReferral ?? false,
      referralFrom: data.referralFrom ?? null,
      notes: data.notes ?? null,
      appliedAt: data.appliedAt ?? null,
      eventAt: data.eventAt ?? null,
      interviewRound: data.interviewRound ?? null,
      deletedAt: null,
      updatedAt: now,
    }).where(eq(applications.id, deleted.app.id));
    return (await getMyApplication(data.userId, data.listingId))!;
  }

  const id = randomUUID();
  await db.insert(applications).values({
    id,
    userId: data.userId,
    listingId: data.listingId,
    resumeId: data.resumeId ?? null,
    status: data.status ?? "INTERESTED",
    hasReferral: data.hasReferral ?? false,
    referralFrom: data.referralFrom ?? null,
    notes: data.notes ?? null,
    appliedAt: data.appliedAt ?? null,
    eventAt: data.eventAt ?? null,
    interviewRound: data.interviewRound ?? null,
  });
  return (await getMyApplication(data.userId, data.listingId))!;
}

export async function softDeleteApplication(appId: string) {
  await db.update(applications).set({ deletedAt: new Date().toISOString() }).where(eq(applications.id, appId));
}

export async function restoreApplication(appId: string) {
  await db.update(applications).set({ deletedAt: null }).where(eq(applications.id, appId));
}

export async function hardDeleteOldTrash(userId: string) {
  const [l, a] = await Promise.all([
    hardDeleteExpiredListings(userId),
    hardDeleteExpiredApplications(userId),
  ]);
  return l + a;
}

export async function hardDeleteExpiredApplications(userId: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString();
  const trashed = await db.select().from(applications)
    .where(and(eq(applications.userId, userId), isNotNull(applications.deletedAt)));
  const toDelete = trashed.filter((a) => a.deletedAt && a.deletedAt <= cutoffStr);
  for (const a of toDelete) await db.delete(applications).where(eq(applications.id, a.id));
  return toDelete.length;
}
