// Minimal Gemini (Generative Language API) client used by the AI routes.
//
// The API key is supplied per-request by the user (their own key) — never stored
// server-side and never logged. We call the REST endpoint directly to avoid a new
// dependency. The `url_context` tool lets Gemini fetch a job posting URL itself;
// resume PDFs are sent inline as base64 (Gemini is multimodal and reads PDFs).

const DEFAULT_MODEL = "gemini-2.5-flash";

type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type GeminiOptions = {
  apiKey: string;
  parts: Part[];
  useUrlContext?: boolean;
  temperature?: number;
  model?: string;
};

export class GeminiError extends Error {}

/** Low-level call: returns the model's raw text output. */
export async function generateText({
  apiKey,
  parts,
  useUrlContext = false,
  temperature = 0.2,
  model = DEFAULT_MODEL,
}: GeminiOptions): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature },
  };
  // url_context is a tool; it cannot be combined with JSON response mode, so we
  // ask for JSON in the prompt and parse defensively instead.
  if (useUrlContext) body.tools = [{ url_context: {} }];

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new GeminiError(`Could not reach Gemini: ${(err as Error).message}`);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error?.message ?? "";
    } catch {
      /* ignore */
    }
    if (res.status === 400 && /api key/i.test(detail)) {
      throw new GeminiError("Invalid Gemini API key.");
    }
    if (res.status === 429) {
      throw new GeminiError("Gemini rate limit reached — try again in a moment.");
    }
    throw new GeminiError(detail || `Gemini request failed (${res.status}).`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");

  if (!text) {
    const finish = data?.candidates?.[0]?.finishReason;
    throw new GeminiError(
      finish === "SAFETY"
        ? "Gemini blocked this request for safety reasons."
        : "Gemini returned an empty response."
    );
  }
  return text;
}

/** Parse JSON from a model response, tolerating ```json fences and stray prose. */
export function parseJson<T>(raw: string): T {
  let s = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // Fall back to the first {...} or [...] block.
  if (!s.startsWith("{") && !s.startsWith("[")) {
    const obj = s.match(/[{[][\s\S]*[}\]]/);
    if (obj) s = obj[0];
  }
  try {
    return JSON.parse(s) as T;
  } catch {
    throw new GeminiError("Could not parse Gemini's response as JSON.");
  }
}

/** Convenience: generate and parse JSON in one call. */
export async function generateJson<T>(opts: GeminiOptions): Promise<T> {
  const text = await generateText(opts);
  return parseJson<T>(text);
}

export { DEFAULT_MODEL };
