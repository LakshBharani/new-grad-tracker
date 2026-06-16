"use client";

import { ResumeReviewPanel, type ResumeOption } from "@/components/ResumeReviewPanel";

export function ResumeReviewClient({ resumes }: { resumes: ResumeOption[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resume Review</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          Paste a job description and grade one of your resumes against it — ATS score, tailored tweaks, and keywords to add.
        </p>
      </div>

      <ResumeReviewPanel resumes={resumes} />
    </div>
  );
}
