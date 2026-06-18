import { getUserByEmail, getUserByUsername, createUser, getInvite, consumeInvite } from "@/lib/db-helpers";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, password } = body;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim() : "";

  if (!name || !email || !username || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3–20 characters: lowercase letters, numbers, or underscores" },
      { status: 400 }
    );
  }

  // A code is valid if it matches the master env code OR an unused invite.
  const masterCode = process.env.INVITE_CODE ?? "friends2024";
  const isMaster = inviteCode === masterCode;
  if (!isMaster) {
    const invite = await getInvite(inviteCode);
    if (!invite || invite.usedById) {
      return NextResponse.json({ error: "Invalid or already-used invite code" }, { status: 403 });
    }
  }

  if (await getUserByEmail(email)) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }
  if (await getUserByUsername(username)) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await createUser({ name, email, username, password: hashed });

  // Claim the invite only after the account exists. The master code is unlimited.
  if (!isMaster && user) {
    await consumeInvite(inviteCode, user.id);
  }

  return NextResponse.json(
    { id: user?.id, name: user?.name, email: user?.email, username: user?.username },
    { status: 201 }
  );
}
