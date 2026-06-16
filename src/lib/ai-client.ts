"use client";

import { useSyncExternalStore } from "react";

// Client-side helper for the user's own Gemini API key.
// Stored only in localStorage and sent per-request to our server proxy routes;
// it is never persisted on the server.

const KEY = "gemini_api_key";
const EVENT = "gemini-key-change";

export function getGeminiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY) ?? "";
}

export function setGeminiKey(value: string) {
  if (typeof window === "undefined") return;
  const trimmed = value.trim();
  if (trimmed) window.localStorage.setItem(KEY, trimmed);
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function hasGeminiKey(): boolean {
  return getGeminiKey().length > 0;
}

/** Headers to attach to AI requests; empty if no key is set. */
export function aiHeaders(): Record<string, string> {
  const key = getGeminiKey();
  return key ? { "x-gemini-key": key } : {};
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Reactive Gemini key — updates when saved/cleared (SSR-safe, returns ""). */
export function useGeminiKey(): string {
  return useSyncExternalStore(subscribe, getGeminiKey, () => "");
}
