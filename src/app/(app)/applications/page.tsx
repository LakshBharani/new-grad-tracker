import { auth } from "@/lib/auth";
import { getMyApplications } from "@/lib/db-helpers";
import { MyAppsClient } from "./MyAppsClient";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const session = await auth();
  const userId = session?.user?.id as string;

  const apps = await getMyApplications(userId);

  return <MyAppsClient initialApps={apps} currentUserId={userId} />;
}
