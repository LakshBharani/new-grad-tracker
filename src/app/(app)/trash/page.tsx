import { auth } from "@/lib/auth";
import { getMyApplications, getDeletedListingsByUser } from "@/lib/db-helpers";
import { TrashClient } from "./TrashClient";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const session = await auth();
  const userId = session?.user?.id as string;

  const [deletedApps, deletedListings] = await Promise.all([
    getMyApplications(userId, true),
    getDeletedListingsByUser(userId),
  ]);

  return (
    <TrashClient
      deletedApplications={deletedApps}
      deletedListings={deletedListings}
      currentUserId={userId}
    />
  );
}
