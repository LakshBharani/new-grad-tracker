import { auth } from "@/lib/auth";
import { getAllListings, getAllUsers } from "@/lib/db-helpers";
import { GcClient } from "./GcClient";

export const dynamic = "force-dynamic";

export default async function GcPage() {
  const session = await auth();
  const currentUserId = session?.user?.id as string;

  const [listings, users] = await Promise.all([getAllListings(), getAllUsers()]);

  return <GcClient listings={listings} users={users} currentUserId={currentUserId} />;
}
