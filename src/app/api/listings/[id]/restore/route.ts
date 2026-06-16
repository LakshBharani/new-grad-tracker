import { auth } from "@/lib/auth";
import { getListingById, restoreListing } from "@/lib/db-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.addedById !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await restoreListing(id);
  return NextResponse.json({ ok: true });
}
