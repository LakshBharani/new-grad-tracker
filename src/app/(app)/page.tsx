import { auth } from "@/lib/auth";
import { getAllListings, getAllUsers } from "@/lib/db-helpers";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const currentUserId = session?.user?.id as string;

  const [users, listings] = await Promise.all([getAllUsers(), getAllListings()]);

  return <DashboardClient users={users} listings={listings} currentUserId={currentUserId} />;
}
