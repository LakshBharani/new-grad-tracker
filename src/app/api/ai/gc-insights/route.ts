import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllListings, getAiCache, setAiCache } from "@/lib/db-helpers";
import { generateJson, GeminiError, DEFAULT_MODEL } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const CACHE_KEY = "gc-skills";

type Insights = {
  topSkills: { skill: string; why: string }[];
  summary: string;
  basedOn?: number;
  updatedAt?: string;
};

function shape(raw: Partial<Insights>): Insights {
  const skills = Array.isArray(raw.topSkills)
    ? raw.topSkills
        .filter((s) => s && typeof s.skill === "string")
        .slice(0, 10)
        .map((s) => ({ skill: String(s.skill), why: typeof s.why === "string" ? s.why : "" }))
    : [];
  return {
    topSkills: skills,
    summary: typeof raw.summary === "string" ? raw.summary : "",
  };
}

// GET — return cached group insights (if any).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await getAiCache(CACHE_KEY);
  if (!row) return NextResponse.json({ insights: null });
  return NextResponse.json({
    insights: { ...(JSON.parse(row.valueJson) as Insights), updatedAt: row.updatedAt },
  });
}

// POST — recompute group insights from current listings.  Header: x-gemini-key
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = req.headers.get("x-gemini-key")?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Add your Gemini API key in Settings first." },
      { status: 400 }
    );
  }

  const listings = await getAllListings();
  if (listings.length === 0) {
    return NextResponse.json({ error: "No listings to analyze yet." }, { status: 400 });
  }

  // De-duplicate role titles to keep the prompt small.
  const titles = Array.from(
    new Set(listings.map((l) => `${l.company} — ${l.role}`))
  ).slice(0, 120);

  const prompt = `You are a career coach for a group of new-grad / internship software candidates.
Below is the list of jobs they are collectively targeting. Identify the skills and
technologies that appear most in-demand across these roles, so the group knows what
to prioritize learning and highlighting on their resumes.

Return ONLY a JSON object (no markdown) with this exact shape:
{
  "topSkills": [ { "skill": string, "why": string } ],  // 6-8 items, ordered most to least important; "why" is one short sentence
  "summary": string                                      // 2-3 sentence takeaway for the group
}

Jobs (${titles.length}):
${titles.join("\n")}`;

  let result: Insights;
  try {
    const raw = await generateJson<Partial<Insights>>({
      apiKey,
      parts: [{ text: prompt }],
      temperature: 0.3,
    });
    result = shape(raw);
  } catch (err) {
    const msg = err instanceof GeminiError ? err.message : "Analysis failed.";
    const status = err instanceof GeminiError ? 502 : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  result.basedOn = listings.length;
  const saved = await setAiCache(CACHE_KEY, JSON.stringify(result));
  return NextResponse.json({
    insights: { ...result, updatedAt: saved?.updatedAt, model: DEFAULT_MODEL },
  });
}
