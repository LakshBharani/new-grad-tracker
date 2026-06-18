import { auth } from "@/lib/auth";
import { createInvite } from "@/lib/db-helpers";
import { NextResponse } from "next/server";

// Generate a fresh single-use invite code for the signed-in member.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = await createInvite(session.user.id as string);
  return NextResponse.json({ code }, { status: 201 });
}
