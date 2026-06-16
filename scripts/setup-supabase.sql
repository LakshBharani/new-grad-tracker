-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase schema for new-grad-tracker (locked.in)
-- Run this once in the Supabase SQL Editor, or via `npm run db:setup-pg`
-- which connects with DATABASE_URL and executes the same statements.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: ISO-8601 timestamp string matching JS new Date().toISOString()
-- e.g. '2026-06-13T11:00:42.714Z'
CREATE OR REPLACE FUNCTION iso_now() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $$;

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  password      text NOT NULL,
  role          text NOT NULL DEFAULT 'USER',
  resume_url    text,
  resume_text   text,
  linkedin_url  text,
  bio           text,
  created_at    text NOT NULL DEFAULT iso_now(),
  updated_at    text NOT NULL DEFAULT iso_now()
);

CREATE TABLE IF NOT EXISTS listings (
  id             text PRIMARY KEY,
  added_by_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company        text NOT NULL,
  role           text NOT NULL,
  link           text NOT NULL,
  job_type       text NOT NULL DEFAULT 'NEW_GRAD',
  listing_notes  text,
  deleted_at     text,
  created_at     text NOT NULL DEFAULT iso_now(),
  updated_at     text NOT NULL DEFAULT iso_now()
);

CREATE TABLE IF NOT EXISTS applications (
  id               text PRIMARY KEY,
  user_id          text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id       text NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'INTERESTED',
  has_referral     boolean NOT NULL DEFAULT false,
  referral_from    text,
  notes            text,
  applied_at       text,
  event_at         text,
  interview_round  integer,
  deleted_at       text,
  created_at       text NOT NULL DEFAULT iso_now(),
  updated_at       text NOT NULL DEFAULT iso_now()
);

CREATE UNIQUE INDEX IF NOT EXISTS applications_user_listing_idx
  ON applications (user_id, listing_id);

-- A user can store several resumes; applications reference which one was used.
CREATE TABLE IF NOT EXISTS resumes (
  id            text PRIMARY KEY,
  user_id       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         text NOT NULL,
  storage_path  text NOT NULL,
  file_name     text,
  created_at    text NOT NULL DEFAULT iso_now(),
  updated_at    text NOT NULL DEFAULT iso_now()
);

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS resume_id text REFERENCES resumes(id) ON DELETE SET NULL;

-- Migrate any pre-existing single resume (users.resume_url) into the resumes
-- table as "My Resume". Idempotent: skips users already migrated to that path.
INSERT INTO resumes (id, user_id, label, storage_path, file_name)
SELECT gen_random_uuid()::text, u.id, 'My Resume', u.resume_url, 'resume.pdf'
FROM users u
WHERE u.resume_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM resumes r WHERE r.user_id = u.id AND r.storage_path = u.resume_url
  );

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- The app uses NextAuth (server-side) and connects with the Postgres role,
-- not via Supabase Auth, so RLS is not enforced for app traffic. We still
-- enable RLS so that anyone hitting the auto-generated PostgREST API with
-- only the anon/publishable key cannot read or write these tables.

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes      ENABLE ROW LEVEL SECURITY;

-- (No policies defined → all PostgREST access is denied. The Node app
--  connects with the Postgres user from DATABASE_URL which bypasses RLS.)

-- ─── Storage: resumes bucket ────────────────────────────────────────────────
-- Private bucket; the app generates signed URLs server-side when displaying.

INSERT INTO storage.buckets (id, name, public)
  VALUES ('resumes', 'resumes', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies: the app talks to Storage with the anon/publishable key,
-- so storage.objects RLS applies. Authorization is enforced server-side by
-- NextAuth + per-user storage paths (`${userId}/...`); these policies simply let
-- the app read/write objects in the private `resumes` bucket. Object listing is
-- never exposed to the browser — the server hands out short-lived signed URLs.
DROP POLICY IF EXISTS "resumes_select" ON storage.objects;
DROP POLICY IF EXISTS "resumes_insert" ON storage.objects;
DROP POLICY IF EXISTS "resumes_update" ON storage.objects;
DROP POLICY IF EXISTS "resumes_delete" ON storage.objects;

CREATE POLICY "resumes_select" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'resumes');
CREATE POLICY "resumes_insert" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "resumes_update" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'resumes') WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "resumes_delete" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'resumes');
