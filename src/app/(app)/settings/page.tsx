"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, ExternalLink, Check, Eye, EyeOff } from "lucide-react";
import { setGeminiKey, useGeminiKey } from "@/lib/ai-client";

export default function SettingsPage() {
  const storedKey = useGeminiKey();
  const [draft, setDraft] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [saved, setSaved] = useState(false);

  const value = draft ?? storedKey;
  const hadKey = storedKey.length > 0;

  const save = () => {
    setGeminiKey(value);
    setDraft(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clear = () => {
    setGeminiKey("");
    setDraft("");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-400">Connect AI features with your own API key.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Gemini API key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            AI features (resume match scores, GC skill insights) use Google Gemini. Paste your own
            free API key — it&apos;s stored only in this browser and sent directly to our server to
            call Gemini on your behalf. It is never saved on our servers.
          </p>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={reveal ? "text" : "password"}
                value={value}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="AIza…"
                autoComplete="off"
                spellCheck={false}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={reveal ? "Hide key" : "Show key"}
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={save} disabled={value.trim() === storedKey}>
              {saved ? (
                <>
                  <Check className="mr-1 h-4 w-4" /> Saved
                </>
              ) : (
                "Save"
              )}
            </Button>
            {hadKey && (
              <Button variant="outline" onClick={clear}>
                Clear
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                hadKey ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${hadKey ? "bg-green-500" : "bg-gray-400"}`} />
              {hadKey ? "Key connected" : "No key set"}
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
            >
              Get a free key
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
