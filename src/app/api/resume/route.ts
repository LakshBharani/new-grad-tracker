import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadResume, deleteResume, getResumeSignedUrl } from "@/lib/storage";
import { updateUserResume, getUserById } from "@/lib/db-helpers";

export const runtime = "nodejs";

// GET — return a fresh signed URL for the current user's resume (if any).
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserById(userId);
  if (!user?.resumeUrl) return NextResponse.json({ signedUrl: null });
  try {
    const signedUrl = await getResumeSignedUrl(user.resumeUrl);
    return NextResponse.json({ signedUrl });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST — upload a new PDF resume. Text extraction is deferred (see TODO).
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // TODO: re-introduce PDF text extraction once we pick a stable library
  // (pdf-parse v2 + @napi-rs/canvas didn't play well with Turbopack on Windows).
  const text = "";

  try {
    const { path } = await uploadResume(userId, buf, "application/pdf");
    const updated = await updateUserResume(userId, { resumeUrl: path, resumeText: text });
    const signedUrl = await getResumeSignedUrl(path);
    return NextResponse.json({
      ok: true,
      path,
      signedUrl,
      text: updated?.resumeText ?? "",
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE — remove the resume file + clear DB fields.
export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserById(userId);
  if (user?.resumeUrl) {
    try {
      await deleteResume(user.resumeUrl);
    } catch (err) {
      console.warn("storage delete failed:", err);
    }
  }
  await updateUserResume(userId, { resumeUrl: null, resumeText: null });
  return NextResponse.json({ ok: true });
}
