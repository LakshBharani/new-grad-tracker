"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { STATUS_ORDER, STATUS_LABELS, EVENT_STAGES, ListingWithMeta } from "@/lib/types";

const NONE = "__none__";

type ResumeOption = { id: string; label: string };

type FormData = {
  status: string;
  resumeId: string | null;
  hasReferral: boolean;
  referralFrom: string;
  notes: string;
  appliedAt: string;
  eventAt: string;
};

const DEFAULT: FormData = { status: "INTERESTED", resumeId: null, hasReferral: false, referralFrom: "", notes: "", appliedAt: "", eventAt: "" };

type Props = {
  listing: ListingWithMeta;
  initial?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
};

export function ApplyForm({ listing, initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<FormData>({ ...DEFAULT, ...initial });
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/resume")
      .then((r) => (r.ok ? r.json() : { resumes: [] }))
      .then((d) => {
        if (active) setResumes((d.resumes ?? []).map((x: ResumeOption) => ({ id: x.id, label: x.label })));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const set = (k: keyof FormData, v: string | boolean | null) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try { await onSubmit(form); }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
        <p className="font-semibold text-gray-900">{listing.company}</p>
        <p className="text-sm text-gray-500">{listing.role}</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">My Status</label>
        <Select value={form.status} onValueChange={(v) => set("status", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Applied Date</label>
        <Input type="date" value={form.appliedAt} onChange={(e) => set("appliedAt", e.target.value)} />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Resume used</label>
        <Select
          value={form.resumeId ?? NONE}
          onValueChange={(v) => set("resumeId", v === NONE ? null : v)}
        >
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {resumes.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {resumes.length === 0 && (
          <p className="text-xs text-gray-400">
            No resumes yet — add one on the Resumes page to track which you used.
          </p>
        )}
      </div>

      {EVENT_STAGES.includes(form.status) && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            {STATUS_LABELS[form.status]} Date &amp; Time
          </label>
          <Input type="datetime-local" value={form.eventAt} onChange={(e) => set("eventAt", e.target.value)} />
          <p className="text-xs text-gray-400">Leave blank if it isn&apos;t scheduled yet.</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.hasReferral}
            onChange={(e) => set("hasReferral", e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          <span className="text-sm font-medium text-gray-700">I have a referral</span>
        </label>
        {form.hasReferral && (
          <Input value={form.referralFrom} onChange={(e) => set("referralFrom", e.target.value)}
            placeholder="Referred by (name)" />
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">My Notes</label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
          placeholder="Interview prep notes, recruiter name, comp info..." rows={3} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
      </div>
    </form>
  );
}
