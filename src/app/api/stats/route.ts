import { auth } from "@/lib/auth";
import { getAllUsers, getMyApplications } from "@/lib/db-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userList = await getAllUsers();
  const stats = await Promise.all(
    userList.map(async (user) => {
      const apps = await getMyApplications(user.id);
      const statusCounts: Record<string, number> = {};
      let referrals = 0;
      for (const a of apps) {
        statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
        if (a.hasReferral) referrals++;
      }
      return { user, total: apps.length, statusCounts, referrals };
    })
  );
  return NextResponse.json(stats);
}
