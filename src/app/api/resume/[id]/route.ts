import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteResume as deleteResumeObject, getResumeSignedUrl } from "@/lib/storage";
import { getResumeById, updateResume, deleteResume } from "@/lib/db-helpers";

export const runtime = "nodejs";

async function ownedResume(id: string) {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const resume = await getResumeById(id);
  if (!resume) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (resume.userId !== userId) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { resume };
}

// GET — fresh signed URL for one resume.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, resume } = await ownedResume(id);
  if (error) return error;
  try {
    const signedUrl = await getResumeSignedUrl(resume!.storagePath);
    return NextResponse.json({ signedUrl });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// PATCH — rename a resume.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await ownedResume(id);
  if (error) return error;

  const body = await req.json();
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 80) : "";
  if (!label) return NextResponse.json({ error: "Label is required" }, { status: 400 });

  const updated = await updateResume(id, { label });
  return NextResponse.json({ ok: true, resume: { id: updated!.id, label: updated!.label } });
}

// DELETE — remove a resume (storage object + DB row). Applications referencing
// it keep their row (resume_id is set NULL by the FK).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, resume } = await ownedResume(id);
  if (error) return error;

  try {
    await deleteResumeObject(resume!.storagePath);
  } catch (err) {
    console.warn("storage delete failed:", err);
  }
  await deleteResume(id);
  return NextResponse.json({ ok: true });
}
