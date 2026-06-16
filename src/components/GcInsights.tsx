"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { aiHeaders, useGeminiKey } from "@/lib/ai-client";

type Insights = {
  topSkills: { skill: string; why: string }[];
  summary: string;
  basedOn?: number;
  updatedAt?: string;
};

export function GcInsights() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasKey = useGeminiKey().length > 0;

  useEffect(() => {
    let active = true;
    fetch("/api/ai/gc-insights")
      .then((r) => (r.ok ? r.json() : { insights: null }))
      .then((d) => active && d.insights && setInsights(d.insights))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/gc-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...aiHeaders() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setInsights(data.insights);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          In-demand skills across the GC&apos;s listings
        </CardTitle>
        {hasKey && (
          <Button size="sm" variant="outline" onClick={run} disabled={running} className="h-8 text-xs">
            {running ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Analyzing…
              </>
            ) : insights ? (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Re-run
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Generate
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!hasKey ? (
          <p className="text-sm text-gray-500">
            Add your Gemini API key in{" "}
            <Link href="/settings" className="font-medium text-indigo-600 underline">
              Settings
            </Link>{" "}
            to generate AI skill insights for the group.
          </p>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : !insights ? (
          <p className="text-sm text-gray-400">
            Generate an AI summary of the skills most worth focusing on, based on every job the group is tracking.
          </p>
        ) : (
          <div className="space-y-3">
            {insights.summary && <p className="text-sm text-gray-600">{insights.summary}</p>}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {insights.topSkills.map((s, i) => (
                <div key={s.skill} className="flex gap-2.5 rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{s.skill}</p>
                    {s.why && <p className="text-xs text-gray-500">{s.why}</p>}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400">
              AI-generated{insights.basedOn ? ` from ${insights.basedOn} listings` : ""} · may be inaccurate.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
