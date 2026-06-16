import { auth } from "@/lib/auth";
import { listResumes } from "@/lib/db-helpers";
import { ResumeReviewClient } from "./ResumeReviewClient";

export const dynamic = "force-dynamic";

export default async function ResumeReviewPage() {
  const session = await auth();
  const userId = session?.user?.id as string;
  const rows = await listResumes(userId);
  const resumes = rows.map((r) => ({ id: r.id, label: r.label }));
  return <ResumeReviewClient resumes={resumes} />;
}
