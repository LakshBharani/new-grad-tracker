"use client";

import { useEffect, useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function InviteFriendDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const link = code && typeof window !== "undefined" ? `${window.location.origin}/register?code=${code}` : "";

  const generate = async () => {
    setLoading(true);
    setError("");
    setCopied(null);
    try {
      const res = await fetch("/api/invites", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate code");
      setCode(data.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate code");
    } finally {
      setLoading(false);
    }
  };

  // Generate a fresh code each time the dialog is opened.
  useEffect(() => {
    if (open) {
      setCode("");
      setError("");
      generate();
    }
  }, [open]);

  const copy = (value: string, which: "code" | "link") => {
    navigator.clipboard.writeText(value);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a friend</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500">
            Share this single-use code or link. It works once, for one new account.
          </p>

          {error ? (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Invite code</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-lg tracking-wider text-gray-900">
                    {loading ? "Generating…" : code}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!code}
                    onClick={() => copy(code, "code")}
                    aria-label="Copy code"
                  >
                    {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Shareable link</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={link}
                    className="flex-1 truncate rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!code}
                    onClick={() => copy(link, "link")}
                    aria-label="Copy link"
                  >
                    {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Button type="button" variant="outline" onClick={generate} disabled={loading} className="w-full">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Generate a new code
          </Button>
        </DialogContent>
      </Dialog>
  );
}
