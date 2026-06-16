import { auth } from "@/lib/auth";
import { listResumes } from "@/lib/db-helpers";
import { getResumeSignedUrl } from "@/lib/storage";
import { ResumesClient, type ResumeItem } from "./ResumesClient";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const session = await auth();
  const userId = session?.user?.id as string;

  const rows = await listResumes(userId);
  const resumes: ResumeItem[] = await Promise.all(
    rows.map(async (r) => {
      let signedUrl: string | null = null;
      try {
        signedUrl = await getResumeSignedUrl(r.storagePath);
      } catch {
        signedUrl = null;
      }
      return { id: r.id, label: r.label, fileName: r.fileName, createdAt: r.createdAt, signedUrl };
    })
  );

  return <ResumesClient initialResumes={resumes} />;
}
