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

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- The app uses NextAuth (server-side) and connects with the Postgres role,
-- not via Supabase Auth, so RLS is not enforced for app traffic. We still
-- enable RLS so that anyone hitting the auto-generated PostgREST API with
-- only the anon/publishable key cannot read or write these tables.

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- (No policies defined → all PostgREST access is denied. The Node app
--  connects with the Postgres user from DATABASE_URL which bypasses RLS.)

-- ─── Storage: resumes bucket ────────────────────────────────────────────────
-- Private bucket; the app generates signed URLs server-side when displaying.

INSERT INTO storage.buckets (id, name, public)
  VALUES ('resumes', 'resumes', false)
  ON CONFLICT (id) DO NOTHING;
