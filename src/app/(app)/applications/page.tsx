import { auth } from "@/lib/auth";
import { getMyApplications, getReviewScoresForUser } from "@/lib/db-helpers";
import { MyAppsClient } from "./MyAppsClient";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const session = await auth();
  const userId = session?.user?.id as string;

  const [apps, reviewScores] = await Promise.all([
    getMyApplications(userId),
    getReviewScoresForUser(userId),
  ]);

  return <MyAppsClient initialApps={apps} currentUserId={userId} reviewScores={reviewScores} />;
}
