"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Wand2, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiHeaders, useGeminiKey } from "@/lib/ai-client";

export type ResumeOption = { id: string; label: string };

type ReviewResult = {
  atsScore: number;
  summary: string;
  keywords: string[];
  tweaks: { title: string; detail: string }[];
  matchedSkills: string[];
  missingSkills: string[];
};

function scoreColor(score: number) {
  if (score >= 85) return "text-green-600";
  if (score >= 60) return "text-indigo-600";
  if (score >= 40) return "text-amber-600";
  return "text-rose-600";
}

export function ResumeReviewPanel({
  resumes,
  initialCompany = "",
  initialRole = "",
  initialJd = "",
  showCompany = false,
  lockJob = false,
  listingId,
  onScored,
}: {
  resumes: ResumeOption[];
  initialCompany?: string;
  initialRole?: string;
  initialJd?: string;
  showCompany?: boolean;
  lockJob?: boolean;
  listingId?: string;
  onScored?: (score: number) => void;
}) {
  const hasKey = useGeminiKey().length > 0;
  const [resumeId, setResumeId] = useState(resumes[0]?.id ?? "");
  const [company, setCompany] = useState(initialCompany);
  const [role, setRole] = useState(initialRole);
  const [jdText, setJdText] = useState(initialJd);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);

  const run = async () => {
    setError(null);
    if (!resumeId) return setError("Pick a resume.");
    if (jdText.trim().length < 40) return setError("Paste the full job description.");
    setRunning(true);
    try {
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...aiHeaders() },
        body: JSON.stringify({
          resumeId,
          role: role.trim() || undefined,
          company: showCompany ? company.trim() || undefined : undefined,
          jdText: jdText.trim(),
          listingId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data.result);
      if (data.result && typeof data.result.atsScore === "number") onScored?.(data.result.atsScore);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {!hasKey && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add your Gemini API key in{" "}
          <Link href="/settings" className="font-semibold underline">
            Settings
          </Link>{" "}
          to use Resume Review.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Job details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Resume</label>
              {resumes.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No resumes yet —{" "}
                  <Link href="/resumes" className="font-medium text-indigo-600 underline">
                    add one
                  </Link>
                  .
                </p>
              ) : (
                <Select value={resumeId} onValueChange={setResumeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {showCompany && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Company</label>
                {lockJob ? (
                  <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                    {company || "—"}
                  </p>
                ) : (
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. OpenAI"
                  />
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">
                Role / title{lockJob ? "" : " (optional)"}
              </label>
              {lockJob ? (
                <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                  {role || "—"}
                </p>
              ) : (
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Software Engineer, New Grad 2026"
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Job description</label>
              <Textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={12}
                placeholder="Paste the full job description here…"
                className="resize-y"
              />
            </div>

            {error && <p className="text-xs text-rose-600">{error}</p>}

            <Button
              onClick={run}
              disabled={running || !hasKey || resumes.length === 0}
              className="w-full"
            >
              {running ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" /> {result ? "Re-run review" : "Review resume"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Results</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex h-full min-h-[200px] items-center justify-center text-center">
                <p className="text-sm text-gray-400">
                  {running ? "Analyzing your resume…" : "Your ATS score and recommendations will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* ATS score */}
                <div className="flex items-center gap-4">
                  <div className={`text-4xl font-bold tabular-nums ${scoreColor(result.atsScore)}`}>
                    {result.atsScore}
                    <span className="text-lg font-semibold text-gray-400">/100</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">ATS score</p>
                    {result.summary && <p className="text-sm text-gray-600">{result.summary}</p>}
                  </div>
                </div>

                {/* Keywords to include */}
                {result.keywords.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      <Tag className="h-3.5 w-3.5" /> Keywords to include
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords.map((k) => (
                        <span key={k} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tweaks */}
                {result.tweaks.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      <Wand2 className="h-3.5 w-3.5" /> Recommended changes
                    </p>
                    <ul className="space-y-2">
                      {result.tweaks.map((t, i) => (
                        <li key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                          {t.title && <p className="text-sm font-semibold text-gray-900">{t.title}</p>}
                          {t.detail && <p className="text-xs text-gray-600">{t.detail}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Matched / missing */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {result.matchedSkills.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Matched</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.matchedSkills.map((s) => (
                          <span key={s} className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.missingSkills.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Missing / weak</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.missingSkills.map((s) => (
                          <span key={s} className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-gray-400">AI-generated · may be inaccurate. Verify before relying on it.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
