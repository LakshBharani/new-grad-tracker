"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, ExternalLink, Pencil, Trash2, GitBranch, Users, StickyNote, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListingForm } from "@/components/ListingForm";
import { ApplyForm } from "@/components/ApplyForm";
import { StatusBadge } from "@/components/StatusBadge";
import { ListingWithMeta, STATUS_ORDER, STATUS_LABELS } from "@/lib/types";
import { formatRelative } from "@/lib/utils";

type User = { id: string; name: string; email: string };

type Props = {
  listings: ListingWithMeta[];
  users: User[];
  currentUserId: string;
};

export function BoardClient({ listings: initial, users, currentUserId }: Props) {
  const [listings, setListings] = useState(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ListingWithMeta | null>(null);
  const [applyTarget, setApplyTarget] = useState<ListingWithMeta | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortField, setSortField] = useState<"RECENCY" | "POPULARITY" | "ALPHA">("RECENCY");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-sort-split]")) setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [sortMenuOpen]);

  const visible = useMemo(() => {
    const filtered = listings.filter((l) => {
      if (search && !`${l.company} ${l.role}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "ALL" && l.jobType !== typeFilter) return false;
      if (statusFilter !== "ALL") {
        const myApp = l.applications.find((a) => a.userId === currentUserId);
        const myStatus = myApp?.status ?? "NONE";
        if (statusFilter === "NONE" && myApp) return false;
        if (statusFilter !== "NONE" && myStatus !== statusFilter) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    const cmp = (() => {
      switch (sortField) {
        case "POPULARITY":
          return (a: ListingWithMeta, b: ListingWithMeta) => a.applications.length - b.applications.length;
        case "ALPHA":
          return (a: ListingWithMeta, b: ListingWithMeta) => a.company.localeCompare(b.company);
        case "RECENCY":
        default:
          return (a: ListingWithMeta, b: ListingWithMeta) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
      }
    })();
    sorted.sort((a, b) => (sortDir === "ASC" ? cmp(a, b) : cmp(b, a)));
    return sorted;
  }, [listings, search, typeFilter, statusFilter, sortField, sortDir, currentUserId]);

  const refresh = async () => {
    const res = await fetch("/api/listings");
    if (res.ok) setListings(await res.json());
  };

  const handleAddListing = async (data: Parameters<typeof ListingForm>[0]["initial"]) => {
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to add listing");
    await refresh();
    setAddOpen(false);
  };

  const handleEditListing = async (data: Parameters<typeof ListingForm>[0]["initial"]) => {
    if (!editTarget) return;
    const res = await fetch(`/api/listings/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update listing");
    await refresh();
    setEditTarget(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Move to trash? You can restore it within 30 days.")) return;
    await fetch(`/api/listings/${id}`, { method: "DELETE" });
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const handleApply = async (listingId: string, data: Parameters<typeof ApplyForm>[0]["initial"]) => {
    const res = await fetch(`/api/listings/${listingId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to save");
    await refresh();
    setApplyTarget(null);
  };

  const appliedCount = listings.filter((l) => l.applications.some((a) => a.userId === currentUserId)).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">The Board</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {listings.length} listings · you&apos;ve applied to {appliedCount}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Post Listing
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company or role..." className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="NEW_GRAD">New Grad</SelectItem>
            <SelectItem value="INTERNSHIP">Internship</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="My Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="NONE">Not applied</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative" data-sort-split>
          <div className="inline-flex items-stretch h-9 text-sm rounded-md border border-gray-200 bg-white overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setSortMenuOpen((o) => !o)}
              className="pl-3 pr-2 flex items-center gap-2 hover:bg-gray-50 transition-colors"
              aria-haspopup="menu"
              aria-expanded={sortMenuOpen}
            >
              <span className="text-gray-700 font-medium">
                {sortField === "RECENCY" ? "Recency" : sortField === "POPULARITY" ? "Popularity" : "A → Z"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
            <div className="w-px bg-gray-200" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "ASC" ? "DESC" : "ASC"))}
              className="px-2.5 flex items-center hover:bg-gray-50 transition-colors"
              aria-label="Toggle sort direction"
              title={
                sortField === "RECENCY"
                  ? sortDir === "DESC" ? "Newest first" : "Oldest first"
                  : sortField === "POPULARITY"
                  ? sortDir === "DESC" ? "Most popular first" : "Least popular first"
                  : sortDir === "ASC" ? "A → Z" : "Z → A"
              }
            >
              {sortDir === "DESC" ? (
                <ArrowDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ArrowUp className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>
          {sortMenuOpen && (
            <div
              role="menu"
              className="absolute left-0 mt-1 z-20 w-40 rounded-md border border-gray-200 bg-white shadow-lg py-1"
            >
              {([
                { value: "RECENCY", label: "Recency" },
                { value: "POPULARITY", label: "Popularity" },
                { value: "ALPHA", label: "A → Z" },
              ] as const).map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSortField(f.value);
                    setSortMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-indigo-50 transition-colors ${
                    sortField === f.value
                      ? "font-semibold text-indigo-700 bg-indigo-50/60"
                      : "text-gray-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Listings */}
      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">No listings found</p>
            <Button variant="outline" className="mt-3" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Post the first listing
            </Button>
          </div>
        ) : (
          visible.map((listing) => {
            const myApp = listing.applications.find((a) => a.userId === currentUserId);
            const applicants = listing.applications.length;

            return (
              <div key={listing.id} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{listing.company}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-sm text-gray-600">{listing.role}</span>
                      {listing.jobType === "INTERNSHIP" && (
                        <span className="text-xs rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 font-medium">Intern</span>
                      )}
                      {myApp?.hasReferral && (
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          Referral{myApp.referralFrom ? ` · ${myApp.referralFrom}` : ""}
                        </span>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span>
                        <span className="font-medium text-indigo-600">@{listing.addedBy.name}</span>
                        <span className="text-gray-400"> · {formatRelative(listing.createdAt)}</span>
                      </span>
                      {applicants > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {applicants} in GC applied
                        </span>
                      )}
                      {listing.listingNotes && (
                        <span className="flex items-center gap-1 text-indigo-600">
                          <StickyNote className="h-3 w-3" />
                          {listing.listingNotes}
                        </span>
                      )}
                    </div>

                    {/* Who applied from the GC */}
                    {listing.applications.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {listing.applications.map((a) => (
                          <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 py-0.5 pl-2 pr-0.5 text-xs">
                            <span className="font-medium">{a.user.name.split(" ")[0]}</span>
                            <StatusBadge status={a.status} />
                            {a.hasReferral && <GitBranch className="h-2.5 w-2.5 text-emerald-600 mr-1" />}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!myApp && (
                      <Button size="sm" onClick={() => setApplyTarget(listing)} className="text-xs h-8">
                        I&apos;m Interested
                      </Button>
                    )}
                    <a href={listing.link} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button onClick={() => setEditTarget(listing)}
                      className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(listing.id)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add listing dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Post a Listing</DialogTitle></DialogHeader>
          <ListingForm onSubmit={handleAddListing} onCancel={() => setAddOpen(false)} submitLabel="Post" />
        </DialogContent>
      </Dialog>

      {/* Edit listing dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Listing</DialogTitle></DialogHeader>
          {editTarget && (
            <ListingForm
              initial={{
                company: editTarget.company, role: editTarget.role, link: editTarget.link,
                jobType: editTarget.jobType,
                listingNotes: editTarget.listingNotes ?? "",
              }}
              onSubmit={handleEditListing}
              onCancel={() => setEditTarget(null)}
              submitLabel="Save"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Apply / update dialog */}
      <Dialog open={!!applyTarget} onOpenChange={(o) => !o && setApplyTarget(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {applyTarget?.applications.find((a) => a.userId === currentUserId) ? "Update My Application" : "Track My Application"}
            </DialogTitle>
          </DialogHeader>
          {applyTarget && (() => {
            const myApp = applyTarget.applications.find((a) => a.userId === currentUserId);
            return (
              <ApplyForm
                listing={applyTarget}
                initial={myApp ? {
                  status: myApp.status,
                  resumeId: myApp.resumeId,
                  hasReferral: myApp.hasReferral,
                  referralFrom: myApp.referralFrom ?? "",
                  notes: myApp.notes ?? "",
                  appliedAt: myApp.appliedAt ?? "",
                  eventAt: myApp.eventAt ?? "",
                } : undefined}
                onSubmit={(data) => handleApply(applyTarget.id, data)}
                onCancel={() => setApplyTarget(null)}
              />
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
