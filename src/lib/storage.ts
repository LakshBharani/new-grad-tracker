// Server-side Supabase Storage helpers for the `resumes` private bucket.
// The bucket is created by scripts/setup-supabase.sql.
//
// We use the publishable (anon) key here. The bucket is private, so listing
// or reading objects without a valid signed URL is denied — the server is
// responsible for generating signed URLs before handing files to the client.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const BUCKET = "resumes";

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

/** Upload a resume to an explicit storage path. `file` may be a Blob, File, or Buffer. */
export async function uploadResume(
  path: string,
  file: Blob | Buffer | ArrayBuffer,
  contentType = "application/pdf"
): Promise<{ path: string }> {
  const supabase = getClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: true });
  if (error) throw error;
  return { path };
}

/** Generate a short-lived signed URL for downloading/viewing a resume. */
export async function getResumeSignedUrl(
  path: string,
  expiresInSeconds = 60 * 10 // 10 min default
): Promise<string> {
  const supabase = getClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

/** Download a resume object's raw bytes (server-side, for sending to Gemini). */
export async function downloadResumeBytes(path: string): Promise<Buffer> {
  const supabase = getClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Delete a resume object. */
export async function deleteResume(path: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
