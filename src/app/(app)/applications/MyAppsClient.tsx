"use client";

import { useState, useMemo, useEffect } from "react";
import { ExternalLink, GitBranch, StickyNote, Calendar, CalendarClock, Trash2, ChevronDown, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { ResumeReviewDialog } from "@/components/ResumeReviewDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserApplicationRow, STATUS_ORDER, STATUS_LABELS, EVENT_STAGES, INTERVIEW_STAGES } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

type AppWithListing = UserApplicationRow & {
  listing: {
    id: string; company: string; role: string; link: string; jobType: string;
    listingNotes: string | null; deletedAt: string | null;
    createdAt: string; updatedAt: string; addedById: string;
  };
};

type Props = {
  initialApps: AppWithListing[];
  currentUserId: string;
  reviewScores: Record<string, number>;
};

// Dot color per status — used in the menu items only. Chip itself is grayscale.
const STATUS_CHIP: Record<string, { dot: string }> = {
  INTERESTED:   { dot: "bg-amber-400" },
  APPLIED:      { dot: "bg-blue-500" },
  OA:           { dot: "bg-orange-500" },
  PHONE_SCREEN: { dot: "bg-purple-500" },
  INTERVIEW:    { dot: "bg-cyan-500" },
  OFFER:        { dot: "bg-green-500" },
  REJECTED:     { dot: "bg-red-500" },
  WITHDRAWN:    { dot: "bg-gray-400" },
};

const STATUS_GROUPS: { label: string; statuses: string[] }[] = [
  { label: "Active",       statuses: ["APPLIED", "OA"] },
  { label: "Interviewing", statuses: ["PHONE_SCREEN", "INTERVIEW"] },
  { label: "Outcome",      statuses: ["OFFER", "REJECTED", "WITHDRAWN"] },
];

type PendingEdit = { status: string; interviewRound: number | null; eventAt: string | null };

export function MyAppsClient({ initialApps, currentUserId, reviewScores }: Props) {
  const [apps, setApps] = useState(initialApps);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [referralFilter, setReferralFilter] = useState("ALL");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [pendingSaving, setPendingSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openMenu = (app: AppWithListing) => {
    const interviewRound = INTERVIEW_STAGES.includes(app.status)
      ? (app.interviewRound ?? 1)
      : app.interviewRound;
    setPendingEdit({ status: app.status, interviewRound, eventAt: app.eventAt });
    setOpenMenuId(app.id);
    setSaveError(null);
  };

  const closeMenu = () => {
    setOpenMenuId(null);
    setPendingEdit(null);
  };

  useEffect(() => {
    if (!openMenuId) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-apply-split]")) closeMenu();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openMenuId]);

  // Referral dialog
  const [referralTarget, setReferralTarget] = useState<AppWithListing | null>(null);
  const [referralFrom, setReferralFrom] = useState("");
  const [referralSaving, setReferralSaving] = useState(false);

  // Notes dialog
  const [notesTarget, setNotesTarget] = useState<AppWithListing | null>(null);
  const [notesText, setNotesText] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Resume picker dialog
  const [resumeTarget, setResumeTarget] = useState<AppWithListing | null>(null);
  const [resumeChoice, setResumeChoice] = useState<string | null>(null);
  const [resumeSaving, setResumeSaving] = useState(false);
  const [resumeOptions, setResumeOptions] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/resume")
      .then((r) => (r.ok ? r.json() : { resumes: [] }))
      .then((d) => {
        if (active) setResumeOptions((d.resumes ?? []).map((x: { id: string; label: string }) => ({ id: x.id, label: x.label })));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => apps.filter((a) => {
    if (search && !`${a.listing.company} ${a.listing.role}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
    if (referralFilter === "YES" && !a.hasReferral) return false;
    if (referralFilter === "NO" && a.hasReferral) return false;
    return true;
  }), [apps, search, statusFilter, referralFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of apps) c[a.status] = (c[a.status] || 0) + 1;
    return c;
  }, [apps]);

  const openReferral = (app: AppWithListing) => {
    setReferralFrom(app.referralFrom ?? "");
    setReferralTarget(app);
  };

  const openNotes = (app: AppWithListing) => {
    setNotesText(app.notes ?? "");
    setNotesTarget(app);
  };

  const openResume = (app: AppWithListing) => {
    setResumeChoice(app.resumeId ?? null);
    setResumeTarget(app);
  };

  const save = async (listingId: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/listings/${listingId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Failed to save");
    return res.json();
  };

  const handleUpdate = async (app: AppWithListing) => {
    if (!pendingEdit) return;
    const { status: newStatus, interviewRound: newRound, eventAt: newEventAt } = pendingEdit;

    const today = new Date().toISOString().split("T")[0];
    let appliedAt = app.appliedAt ?? null;
    if (newStatus === "INTERESTED") {
      if (app.status !== "WITHDRAWN") appliedAt = null;
    } else if (app.status === "INTERESTED" && !app.appliedAt) {
      appliedAt = today;
    }

    setSaveError(null);
    setPendingSaving(true);
    try {
      const updated = await save(app.listingId, { status: newStatus, appliedAt, interviewRound: newRound, eventAt: newEventAt });
      setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, ...updated } : a));
      closeMenu();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPendingSaving(false);
    }
  };

  const handleReferralSave = async () => {
    if (!referralTarget) return;
    setReferralSaving(true);
    try {
      const trimmed = referralFrom.trim();
      const hasReferral = trimmed.length > 0;
      const updated = await save(referralTarget.listingId, {
        hasReferral,
        referralFrom: trimmed,
      });
      setApps((prev) => prev.map((a) => a.id === referralTarget.id ? { ...a, ...updated } : a));
      setReferralTarget(null);
    } finally {
      setReferralSaving(false);
    }
  };

  const handleNotesSave = async () => {
    if (!notesTarget) return;
    setNotesSaving(true);
    try {
      const updated = await save(notesTarget.listingId, { notes: notesText });
      setApps((prev) => prev.map((a) => a.id === notesTarget.id ? { ...a, ...updated } : a));
      setNotesTarget(null);
    } finally {
      setNotesSaving(false);
    }
  };

  const handleResumeSave = async () => {
    if (!resumeTarget) return;
    setResumeSaving(true);
    try {
      const updated = await save(resumeTarget.listingId, { resumeId: resumeChoice });
      setApps((prev) => prev.map((a) => a.id === resumeTarget.id ? { ...a, ...updated } : a));
      setResumeTarget(null);
    } finally {
      setResumeSaving(false);
    }
  };

  const handleDelete = async (appId: string) => {
    if (!confirm("Remove this application? It'll move to trash.")) return;
    await fetch(`/api/applications/${appId}`, { method: "DELETE" });
    setApps((prev) => prev.filter((a) => a.id !== appId));
  };

  // Shared status menu used by both the "Apply" split-button (status INTERESTED)
  // and the status pill (any other status), so both behave identically.
  const statusMenu = (app: AppWithListing) =>
    pendingEdit && (
      <div
        role="menu"
        className="absolute top-full right-0 mt-1.5 z-20 w-64 rounded-lg border border-gray-200 bg-white shadow-xl p-1.5"
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => setPendingEdit((p) => p ? { ...p, status: "INTERESTED", eventAt: null } : null)}
          className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs transition-colors ${
            pendingEdit.status === "INTERESTED" ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span className="h-2 w-2 rounded-full shrink-0 bg-gray-300" />
          <span className="flex-1 text-left">Not Applied</span>
          {app.status === "INTERESTED" && pendingEdit.status !== "INTERESTED" && (
            <span className="text-[10px] text-gray-400">current</span>
          )}
        </button>
        {STATUS_GROUPS.map((group) => (
          <div key={group.label} className="mt-1 pt-1 border-t border-gray-100">
            <p className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {group.label}
            </p>
            {group.statuses.map((s) => {
              const c = STATUS_CHIP[s];
              const selected = s === pendingEdit.status;
              const isCurrent = s === app.status;
              return (
                <button
                  key={s}
                  type="button"
                  role="menuitem"
                  onClick={() => setPendingEdit((p) => p ? {
                    ...p,
                    status: s,
                    interviewRound: INTERVIEW_STAGES.includes(s) ? (p.interviewRound ?? 1) : p.interviewRound,
                    eventAt: EVENT_STAGES.includes(s) ? p.eventAt : null,
                  } : null)}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs transition-colors ${
                    selected ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${c.dot}`} />
                  <span className="flex-1 text-left">{STATUS_LABELS[s]}</span>
                  {isCurrent && !selected && <span className="text-[10px] text-gray-400">current</span>}
                </button>
              );
            })}
          </div>
        ))}

        {INTERVIEW_STAGES.includes(pendingEdit.status) && (
          <div className="mt-1 pt-2 border-t border-gray-100 px-1">
            <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Round
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (pendingEdit.interviewRound ?? 1) === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPendingEdit((p) => p ? { ...p, interviewRound: n, eventAt: null } : null)}
                    className={`h-7 flex-1 rounded text-[11px] font-bold tabular-nums transition-colors ${
                      active ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    R{n}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPendingEdit((p) => p ? { ...p, interviewRound: Math.max(6, (p.interviewRound ?? 1) + 1), eventAt: null } : null)}
                title="Add a round"
                className={`h-7 px-1.5 min-w-[28px] rounded text-[11px] font-bold tabular-nums transition-colors flex items-center justify-center gap-0.5 ${
                  (pendingEdit.interviewRound ?? 1) >= 6
                    ? "bg-gray-800 text-white"
                    : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                }`}
              >
                {(pendingEdit.interviewRound ?? 1) >= 6 && <span>R{pendingEdit.interviewRound}</span>}
                <Plus className="h-2.5 w-2.5" strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

        {EVENT_STAGES.includes(pendingEdit.status) && (
          <div className="mt-2 pt-2 border-t border-gray-100 px-1">
            <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Reminder date
            </p>
            <input
              type="datetime-local"
              value={(pendingEdit.eventAt ?? "").slice(0, 16)}
              onChange={(e) => setPendingEdit((p) => p ? { ...p, eventAt: e.target.value || null } : null)}
              className="w-full h-8 px-2 text-xs rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
            />
            {pendingEdit.eventAt && (
              <button
                type="button"
                onClick={() => setPendingEdit((p) => p ? { ...p, eventAt: null } : null)}
                className="mt-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear date
              </button>
            )}
          </div>
        )}

        {saveError && (
          <p className="mt-1 px-1 text-[10px] text-red-500">{saveError}</p>
        )}
        <div className="mt-2 pt-2 border-t border-gray-100 px-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPendingEdit((p) => p ? { ...p, status: "INTERESTED", interviewRound: null, eventAt: null } : null)}
            className="flex-1 h-8 rounded-md border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => handleUpdate(app)}
            disabled={pendingSaving}
            className="flex-1 h-8 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {pendingSaving ? "Saving…" : "Update"}
          </button>
        </div>
      </div>
    );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tracker</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {apps.length} tracked · {apps.filter((a) => a.hasReferral).length} with referral
        </p>
      </div>

      {/* Pipeline pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setStatusFilter("ALL")}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === "ALL" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          All ({apps.length})
        </button>
        {STATUS_ORDER.filter((s) => counts[s]).map((s) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "ALL" : s)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {STATUS_LABELS[s]} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company or role..." />
        </div>
        <Select value={referralFilter} onValueChange={setReferralFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="YES">With Referral</SelectItem>
            <SelectItem value="NO">No Referral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">No applications yet — head to the Board to track some!</p>
          </div>
        ) : (
          filtered.map((app) => (
            <div key={app.id} className={`flex items-start gap-3 rounded-lg border p-4 transition-all ${
              app.status === "INTERESTED"
                ? "border-dashed border-amber-300 bg-amber-50/40 hover:border-amber-400"
                : "border-gray-200 bg-white hover:border-indigo-200"
            }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{app.listing.company}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-sm text-gray-600">{app.listing.role}</span>
                  {app.listing.jobType === "INTERNSHIP" && (
                    <span className="text-xs rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 font-medium">Intern</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs flex-wrap">
                  {/* Applied date / unapplied indicator */}
                  {app.status === "INTERESTED" ? (
                    <span className="text-amber-500 font-medium">not applied yet</span>
                  ) : app.appliedAt ? (
                    <span className="flex items-center gap-1 text-gray-500">
                      <Calendar className="h-3 w-3" />Applied {formatDate(app.appliedAt)}
                    </span>
                  ) : null}
                  {EVENT_STAGES.includes(app.status) && app.eventAt && (
                    <span className="flex items-center gap-1 font-medium text-indigo-600">
                      <CalendarClock className="h-3 w-3" />{STATUS_LABELS[app.status]} · {formatDateTime(app.eventAt)}
                    </span>
                  )}
                  {INTERVIEW_STAGES.includes(app.status) && app.interviewRound && app.interviewRound > 0 && (
                    <span className="rounded-full bg-cyan-50 text-cyan-700 px-2 py-0.5 font-semibold">
                      Round {app.interviewRound}
                    </span>
                  )}
                  {app.hasReferral && (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <GitBranch className="h-3 w-3" />
                      Referral{app.referralFrom ? ` · ${app.referralFrom}` : ""}
                    </span>
                  )}
                  {app.notes && (
                    <span className="flex items-center gap-1 text-indigo-400 max-w-[200px]">
                      <StickyNote className="h-3 w-3 shrink-0" />
                      <span className="truncate">{app.notes}</span>
                    </span>
                  )}
                  {app.resumeLabel && (
                    <span className="flex items-center gap-1 text-rose-500 font-medium max-w-[200px]">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{app.resumeLabel}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {app.status === "INTERESTED" ? (
                  <div className="relative" data-apply-split>
                    <div className="inline-flex items-stretch h-7 min-w-[110px] text-xs rounded-md overflow-hidden shadow-sm">
                      <a
                        href={app.listing.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 flex items-center justify-start font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                      >
                        Apply
                      </a>
                      <div className="w-px bg-indigo-800/40" aria-hidden="true" />
                      <button
                        type="button"
                        onClick={() => openMenuId === app.id ? closeMenu() : openMenu(app)}
                        className="px-1.5 flex items-center text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        aria-label="Change status"
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === app.id}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {openMenuId === app.id && statusMenu(app)}
                  </div>
                ) : (
                  <div className="relative" data-apply-split>
                    {(() => {
                      const isOpen = openMenuId === app.id;
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => isOpen ? closeMenu() : openMenu(app)}
                            className={`inline-flex items-center justify-between gap-1 h-7 min-w-[110px] px-2.5 text-xs font-medium rounded-md border transition-colors ${
                              isOpen
                                ? "bg-gray-100 text-gray-900 border-gray-300"
                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            }`}
                            aria-haspopup="menu"
                            aria-expanded={isOpen}
                          >
                            <span className="truncate">{STATUS_LABELS[app.status]}</span>
                            <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                          {isOpen && statusMenu(app)}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Referral icon */}
                <button
                  onClick={() => openReferral(app)}
                  title={app.hasReferral ? "Edit referral" : "Add referral"}
                  className={`p-1.5 rounded transition-colors ${
                    app.hasReferral
                      ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                      : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                  }`}>
                  <GitBranch className="h-4 w-4" />
                </button>

                {/* Notes icon */}
                <button
                  onClick={() => openNotes(app)}
                  title={app.notes ? "Edit notes" : "Add notes"}
                  className={`p-1.5 rounded transition-colors ${
                    app.notes
                      ? "text-indigo-500 bg-indigo-50 hover:bg-indigo-100"
                      : "text-gray-400 hover:text-indigo-500 hover:bg-indigo-50"
                  }`}>
                  <StickyNote className="h-4 w-4" />
                </button>

                {/* Resume icon */}
                <button
                  onClick={() => openResume(app)}
                  title={app.resumeLabel ? `Resume: ${app.resumeLabel}` : "Set resume used"}
                  className={`p-1.5 rounded transition-colors ${
                    app.resumeId
                      ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
                      : "text-gray-400 hover:text-rose-500 hover:bg-rose-50"
                  }`}>
                  <FileText className="h-4 w-4" />
                </button>

                <a href={app.listing.link} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <ResumeReviewDialog
                  listingId={app.listing.id}
                  company={app.listing.company}
                  role={app.listing.role}
                  initialScore={reviewScores[app.listing.id] ?? null}
                />
                <button onClick={() => handleDelete(app.id)}
                  className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Referral dialog */}
      <Dialog open={!!referralTarget} onOpenChange={(o) => !o && setReferralTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Referral — {referralTarget?.listing.company}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Input
              value={referralFrom}
              onChange={(e) => setReferralFrom(e.target.value)}
              placeholder="Referred by (leave empty if none)"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              Enter the name of the person who referred you. Leave empty if you don&apos;t have a referral.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setReferralTarget(null)}>Cancel</Button>
              <Button onClick={handleReferralSave} disabled={referralSaving}>
                {referralSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes dialog */}
      <Dialog open={!!notesTarget} onOpenChange={(o) => !o && setNotesTarget(null)}>        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notes — {notesTarget?.listing.company}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Interview prep, recruiter name, comp info, anything…"
              rows={5}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNotesTarget(null)}>Cancel</Button>
              <Button onClick={handleNotesSave} disabled={notesSaving}>
                {notesSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resume dialog */}
      <Dialog open={!!resumeTarget} onOpenChange={(o) => !o && setResumeTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Resume used — {resumeTarget?.listing.company}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {resumeOptions.length === 0 ? (
              <p className="text-sm text-gray-500">
                You don&apos;t have any resumes yet. Add one on the Resumes page first.
              </p>
            ) : (
              <Select
                value={resumeChoice ?? "__none__"}
                onValueChange={(v) => setResumeChoice(v === "__none__" ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {resumeOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-gray-500">
              Mark which resume you used to apply to this role.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setResumeTarget(null)}>Cancel</Button>
              <Button onClick={handleResumeSave} disabled={resumeSaving || resumeOptions.length === 0}>
                {resumeSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
