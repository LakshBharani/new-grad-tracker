"use client";

import { useState } from "react";
import { FileSearch } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResumeReviewPanel, type ResumeOption } from "@/components/ResumeReviewPanel";
import { ScoreGauge } from "@/components/ScoreGauge";

export function ResumeReviewDialog({
  listingId,
  company,
  role,
  initialJd = "",
  initialScore = null,
}: {
  listingId: string;
  company: string;
  role: string;
  initialJd?: string;
  initialScore?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [score, setScore] = useState<number | null>(initialScore);

  const handleOpen = () => {
    setOpen(true);
    if (!loaded) {
      fetch("/api/resume")
        .then((r) => (r.ok ? r.json() : { resumes: [] }))
        .then((d) => {
          setResumes((d.resumes ?? []).map((x: ResumeOption) => ({ id: x.id, label: x.label })));
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        title={score !== null ? `Resume match: ${score}/100 — click to review` : "Review a resume against this job"}
        className="inline-flex items-center justify-center rounded p-0.5 text-gray-400 transition-colors hover:text-indigo-600 hover:bg-indigo-50"
      >
        {score !== null ? <ScoreGauge score={score} /> : <FileSearch className="m-1 h-4 w-4" />}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] max-h-[92vh] overflow-y-auto sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-indigo-500" />
              Resume Review — {company}
              <span className="text-sm font-normal text-gray-400">· {role}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Key forces a fresh panel (and state) per listing each time it opens. */}
          {open && (
            <ResumeReviewPanel
              key={`${company}|${role}`}
              resumes={resumes}
              listingId={listingId}
              initialCompany={company}
              initialRole={role}
              initialJd={initialJd}
              showCompany
              lockJob
              onScored={setScore}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
