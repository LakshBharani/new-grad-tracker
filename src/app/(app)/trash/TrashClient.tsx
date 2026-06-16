"use client";

import { useState } from "react";
import { RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { UserApplicationRow, ListingWithMeta } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { differenceInDays } from "date-fns";

type AppWithListing = UserApplicationRow & { listing: ListingWithMeta["id"] extends string ? { company: string; role: string } : never };

type Props = {
  deletedApplications: (UserApplicationRow & { listing: { company: string; role: string } })[];
  deletedListings: ListingWithMeta[];
  currentUserId: string;
};

function daysLeft(deletedAt: string | null) {
  if (!deletedAt) return 30;
  return Math.max(0, 30 - differenceInDays(new Date(), new Date(deletedAt)));
}

function DaysChip({ deletedAt }: { deletedAt: string | null }) {
  const d = daysLeft(deletedAt);
  const urgent = d <= 7;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${urgent ? "text-red-600" : "text-gray-400"}`}>
      {urgent && <AlertTriangle className="h-3 w-3" />}
      {d}d left
    </span>
  );
}

export function TrashClient({ deletedApplications, deletedListings, currentUserId }: Props) {
  const [apps, setApps] = useState(deletedApplications);
  const [listings, setListings] = useState(deletedListings);

  const restoreApp = async (id: string) => {
    const res = await fetch(`/api/applications/${id}/restore`, { method: "POST" });
    if (res.ok) setApps((prev) => prev.filter((a) => a.id !== id));
  };

  const hardDeleteApp = async (id: string) => {
    if (!confirm("Permanently delete? This cannot be undone.")) return;
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (res.ok) setApps((prev) => prev.filter((a) => a.id !== id));
  };

  const restoreListing = async (id: string) => {
    const res = await fetch(`/api/listings/${id}/restore`, { method: "POST" });
    if (res.ok) setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const hardDeleteListing = async (id: string) => {
    if (!confirm("Permanently delete this listing? This cannot be undone.")) return;
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (res.ok) setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const empty = apps.length === 0 && listings.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trash</h1>
        <p className="text-sm text-gray-500 mt-0.5">Items are permanently deleted 30 days after being trashed.</p>
      </div>

      {empty ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
          <Trash2 className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Trash is empty</p>
        </div>
      ) : (
        <>
          {listings.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">My Deleted Listings</h2>
              {listings.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-700">{l.company}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-sm text-gray-500">{l.role}</span>
                      <span className="text-xs rounded-full bg-gray-100 text-gray-500 px-2 py-0.5">Listing</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Deleted {formatDate(l.deletedAt)}</span>
                      <DaysChip deletedAt={l.deletedAt} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => restoreListing(l.id)} className="gap-1">
                      <RotateCcw className="h-3.5 w-3.5" />Restore
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => hardDeleteListing(l.id)} className="gap-1">
                      <Trash2 className="h-3.5 w-3.5" />Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {apps.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">My Deleted Applications</h2>
              {apps.map((app) => (
                <div key={app.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-700">{app.listing.company}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-sm text-gray-500">{app.listing.role}</span>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Deleted {formatDate(app.deletedAt)}</span>
                      <DaysChip deletedAt={app.deletedAt} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => restoreApp(app.id)} className="gap-1">
                      <RotateCcw className="h-3.5 w-3.5" />Restore
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => hardDeleteApp(app.id)} className="gap-1">
                      <Trash2 className="h-3.5 w-3.5" />Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
