"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, ExternalLink, FileText, Trash2, Eye, FileCode } from "lucide-react";

type Props = {
  initialSignedUrl: string | null;
  initialText: string | null;
  hasResume: boolean;
};

type Builder = {
  name: string;
  tagline: string;
  href: string;
  // External image first; if it fails we fall back to a lucide icon.
  logoUrl: string;
  accent: string; // tailwind bg-* class for the fallback tile
};

const BUILDERS: Builder[] = [
  {
    name: "Jake's Resume",
    tagline:
      "The classic single-page LaTeX template used by SWE new grads everywhere. Clean, ATS-friendly, edit on Overleaf in your browser.",
    href: "https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs",
    logoUrl: "/logos/overleaf.png",
    accent: "bg-white",
  },
  {
    name: "FlowCV",
    tagline:
      "Drag-and-drop resume builder with live preview and 1-click PDF export. Great if you don't want to touch LaTeX.",
    href: "https://flowcv.com/",
    logoUrl: "/logos/flowcv.png",
    accent: "bg-white",
  },
];

function BuilderCard({ b }: { b: Builder }) {
  const [imgError, setImgError] = useState(false);
  return (
    <a
      href={b.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg ${b.accent}`}
        >
          {imgError ? (
            <FileCode className="h-7 w-7 text-gray-500" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.logoUrl}
              alt={`${b.name} logo`}
              className="h-full w-full object-contain"
              onError={() => setImgError(true)}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-gray-900">{b.name}</h3>
            <ExternalLink className="h-3.5 w-3.5 text-gray-400 transition-colors group-hover:text-indigo-500" />
          </div>
          <p className="mt-1 text-sm leading-snug text-gray-500">{b.tagline}</p>
        </div>
      </div>
    </a>
  );
}

export function ResumesClient({ initialSignedUrl, initialText, hasResume: initialHasResume }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(initialSignedUrl);
  const [text, setText] = useState<string | null>(initialText);
  const [hasResume, setHasResume] = useState(initialHasResume);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large (max 5 MB)");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/resume", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setSignedUrl(data.signedUrl);
      setText(data.text ?? "");
      setHasResume(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  async function handleDelete() {
    if (!confirm("Delete your uploaded resume?")) return;
    setError(null);
    setUploading(true);
    try {
      const res = await fetch("/api/resume", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSignedUrl(null);
      setText(null);
      setHasResume(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumes</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          Build a strong resume and keep a copy on file for tailoring later.
        </p>
      </div>

      {/* Recommended builders */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Where to build yours
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {BUILDERS.map((b) => (
            <BuilderCard key={b.name} b={b} />
          ))}
        </div>
      </section>

      {/* Your resume */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700">Your resume</CardTitle>
          {hasResume && (
            <div className="flex items-center gap-2">
              {signedUrl && (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </a>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!hasResume ? (
            <label
              htmlFor="resume-upload"
              onDragOver={(e) => {
                e.preventDefault();
                if (!dragOver) setDragOver(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                // Only flip off when leaving the label itself (not crossing children).
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOver(false);
              }}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 transition-colors ${
                dragOver
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-gray-200 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30"
              }`}
            >
              <Upload className={`h-7 w-7 ${dragOver ? "text-indigo-500" : "text-gray-400"}`} />
              <span className="text-sm font-medium text-gray-700">
                {uploading
                  ? "Uploading…"
                  : dragOver
                  ? "Drop to upload"
                  : "Drop a PDF here, or click to browse"}
              </span>
              <span className="text-xs text-gray-400">PDF only · up to 5 MB</span>
            </label>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100">
                  <FileText className="h-5 w-5 text-rose-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">resume.pdf</p>
                  <p className="text-xs text-gray-400">Stored on Supabase</p>
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            id="resume-upload"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />

          {error && (
            <p className="mt-3 text-xs text-rose-600">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
