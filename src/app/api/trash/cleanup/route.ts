import { auth } from "@/lib/auth";
import { hardDeleteOldTrash } from "@/lib/db-helpers";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await hardDeleteOldTrash(session.user.id);
  return NextResponse.json({ deleted: count });
}
