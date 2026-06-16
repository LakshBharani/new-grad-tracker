import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { uploadResume, getResumeSignedUrl } from "@/lib/storage";
import { listResumes, createResume } from "@/lib/db-helpers";

export const runtime = "nodejs";

// GET — list the current user's resumes, each with a fresh signed URL.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await listResumes(userId);
  const withUrls = await Promise.all(
    rows.map(async (r) => {
      let signedUrl: string | null = null;
      try {
        signedUrl = await getResumeSignedUrl(r.storagePath);
      } catch {
        signedUrl = null;
      }
      return {
        id: r.id,
        label: r.label,
        fileName: r.fileName,
        createdAt: r.createdAt,
        signedUrl,
      };
    })
  );
  return NextResponse.json({ resumes: withUrls });
}

// POST — upload a new PDF resume with a label.
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const rawLabel = form.get("label");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  const label =
    typeof rawLabel === "string" && rawLabel.trim()
      ? rawLabel.trim().slice(0, 80)
      : file.name.replace(/\.pdf$/i, "").slice(0, 80) || "Resume";

  const buf = Buffer.from(await file.arrayBuffer());
  const resumeId = randomUUID();
  const path = `${userId}/${resumeId}.pdf`;

  try {
    await uploadResume(path, buf, "application/pdf");
    const resume = await createResume({
      userId,
      label,
      storagePath: path,
      fileName: file.name,
    });
    const signedUrl = await getResumeSignedUrl(path);
    return NextResponse.json({
      ok: true,
      resume: {
        id: resume!.id,
        label: resume!.label,
        fileName: resume!.fileName,
        createdAt: resume!.createdAt,
        signedUrl,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
