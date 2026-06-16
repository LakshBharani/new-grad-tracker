import { auth } from "@/lib/auth";
import { getMyApplications } from "@/lib/db-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deleted = new URL(req.url).searchParams.get("deleted") === "true";
  const apps = await getMyApplications(session.user.id, deleted);
  return NextResponse.json(apps);
}
