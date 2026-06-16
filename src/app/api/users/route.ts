import { auth } from "@/lib/auth";
import { getAllUsers } from "@/lib/db-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await getAllUsers();
  return NextResponse.json(users);
}
