import { auth } from "@/lib/auth";
import { upsertApplication, getListingById } from "@/lib/db-helpers";
import { NextRequest, NextResponse } from "next/server";

// POST /api/listings/:id/apply — create or update your application on a listing
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: listingId } = await params;
  const listing = await getListingById(listingId);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const body = await req.json();
  const app = await upsertApplication({
    userId: session.user.id,
    listingId,
    resumeId: body.resumeId,
    status: body.status,
    hasReferral: body.hasReferral,
    referralFrom: body.referralFrom,
    notes: body.notes,
    appliedAt: body.appliedAt,
    eventAt: body.eventAt,
    interviewRound: body.interviewRound,
  });

  return NextResponse.json(app);
}
