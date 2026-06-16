"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type FormData = {
  company: string;
  role: string;
  link: string;
  jobType: string;
  listingNotes: string;
};

const DEFAULT: FormData = { company: "", role: "", link: "", jobType: "NEW_GRAD", listingNotes: "" };

type Props = {
  initial?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
};

export function ListingForm({ initial, onSubmit, onCancel, submitLabel = "Save" }: Props) {
  const [form, setForm] = useState<FormData>({ ...DEFAULT, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Company *</label>
          <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Stripe" required />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Role *</label>
          <Input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="SWE New Grad" required />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Application Link *</label>
        <Input value={form.link} onChange={(e) => set("link", e.target.value)} placeholder="https://..." type="url" required />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Type</label>
        <Select value={form.jobType} onValueChange={(v) => set("jobType", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NEW_GRAD">New Grad</SelectItem>
            <SelectItem value="INTERNSHIP">Internship</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Notes about listing</label>
        <Textarea value={form.listingNotes} onChange={(e) => set("listingNotes", e.target.value)}
          placeholder="e.g. No visa sponsorship mentioned, strong L4 comp..." rows={2} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : submitLabel}</Button>
      </div>
    </form>
  );
}
