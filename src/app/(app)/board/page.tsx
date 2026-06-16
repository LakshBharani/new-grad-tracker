import { auth } from "@/lib/auth";
import { getAllListings, getAllUsers } from "@/lib/db-helpers";
import { BoardClient } from "./BoardClient";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const session = await auth();
  const currentUserId = session?.user?.id as string;

  const [listings, users] = await Promise.all([getAllListings(), getAllUsers()]);

  return <BoardClient listings={listings} users={users} currentUserId={currentUserId} />;
}
