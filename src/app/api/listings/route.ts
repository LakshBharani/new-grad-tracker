import { auth } from "@/lib/auth";
import { getAllListings, createListing } from "@/lib/db-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getAllListings());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { company, role, link, jobType, listingNotes } = body;
  if (!company || !role || !link) {
    return NextResponse.json({ error: "company, role, link required" }, { status: 400 });
  }

  const listing = await createListing({
    addedById: session.user.id,
    company, role, link,
    jobType: jobType || "NEW_GRAD",
    listingNotes: listingNotes || null,
  });
  return NextResponse.json(listing, { status: 201 });
}
