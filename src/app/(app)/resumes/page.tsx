import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/db-helpers";
import { getResumeSignedUrl } from "@/lib/storage";
import { ResumesClient } from "./ResumesClient";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const session = await auth();
  const userId = session?.user?.id as string;
  const user = await getUserById(userId);

  let signedUrl: string | null = null;
  if (user?.resumeUrl) {
    try {
      signedUrl = await getResumeSignedUrl(user.resumeUrl);
    } catch {
      signedUrl = null;
    }
  }

  return (
    <ResumesClient
      initialSignedUrl={signedUrl}
      initialText={user?.resumeText ?? null}
      hasResume={Boolean(user?.resumeUrl)}
    />
  );
}
