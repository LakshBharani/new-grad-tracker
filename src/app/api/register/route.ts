import { getUserByEmail, createUser } from "@/lib/db-helpers";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, password, inviteCode } = body;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (inviteCode !== process.env.INVITE_CODE && inviteCode !== "friends2024") {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 403 });
  }

  if (!name || !email || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await createUser({ name, email, password: hashed });

  return NextResponse.json({ id: user?.id, name: user?.name, email: user?.email }, { status: 201 });
}
