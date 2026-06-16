import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getResumeById, saveReviewScore } from "@/lib/db-helpers";
import { downloadResumeBytes } from "@/lib/storage";
import { generateJson, GeminiError, DEFAULT_MODEL } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

type ReviewResult = {
  atsScore: number;
  summary: string;
  keywords: string[];
  tweaks: { title: string; detail: string }[];
  matchedSkills: string[];
  missingSkills: string[];
};

function shape(raw: Partial<ReviewResult>): ReviewResult {
  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 20) : [];
  let score = Number(raw.atsScore);
  if (!Number.isFinite(score)) score = 0;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const tweaks = Array.isArray(raw.tweaks)
    ? raw.tweaks
        .filter((t) => t && (typeof t.title === "string" || typeof t.detail === "string"))
        .slice(0, 10)
        .map((t) => ({
          title: typeof t.title === "string" ? t.title : "",
          detail: typeof t.detail === "string" ? t.detail : "",
        }))
    : [];
  return {
    atsScore: score,
    summary: typeof raw.summary === "string" ? raw.summary : "",
    keywords: strArr(raw.keywords),
    tweaks,
    matchedSkills: strArr(raw.matchedSkills),
    missingSkills: strArr(raw.missingSkills),
  };
}

// POST /api/ai/review — grade a resume against a pasted job description.
// Body: { resumeId, role?, jdText }  Header: x-gemini-key
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = req.headers.get("x-gemini-key")?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Add your Gemini API key in Settings first." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { resumeId, role, company, jdText, listingId } = body as {
    resumeId?: string;
    role?: string;
    company?: string;
    jdText?: string;
    listingId?: string;
  };

  const jd = typeof jdText === "string" ? jdText.trim() : "";
  if (!resumeId) return NextResponse.json({ error: "Select a resume." }, { status: 400 });
  if (jd.length < 40) {
    return NextResponse.json({ error: "Paste the full job description (it looks too short)." }, { status: 400 });
  }

  const resume = await getResumeById(resumeId);
  if (!resume || resume.userId !== userId) {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }

  let pdfBase64: string;
  try {
    const bytes = await downloadResumeBytes(resume.storagePath);
    pdfBase64 = bytes.toString("base64");
  } catch {
    return NextResponse.json({ error: "Could not read your resume file." }, { status: 500 });
  }

  const roleLine = [
    role && role.trim() ? `Target role: ${role.trim()}` : "",
    company && company.trim() ? `Company: ${company.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const roleBlock = roleLine ? `${roleLine}\n` : "";

  const prompt = `You are an expert technical recruiter and resume coach who knows how Applicant Tracking Systems (ATS) parse and rank resumes.
Evaluate the candidate's resume (attached PDF) against the job description below.

${roleBlock}Job description:
${jd.slice(0, 14000)}

Assess ATS-friendliness and keyword alignment. The ATS score (0-100) should reflect how well the resume would pass automated screening for THIS job:
- 85-100: strong keyword match, well-structured, would pass screening
- 60-84: decent, some missing keywords or structure issues
- 40-59: notable gaps in keywords/relevance
- 0-39: poor match

Return ONLY a JSON object (no markdown) with this exact shape:
{
  "atsScore": number,
  "summary": string,                              // 1-2 sentences on overall fit and ATS readiness
  "keywords": string[],                           // 8-15 exact terms/skills from the JD the resume should include (especially missing ones)
  "tweaks": [ { "title": string, "detail": string } ],  // 4-6 concrete, specific resume edits for this job
  "matchedSkills": string[],                      // JD requirements the resume already satisfies
  "missingSkills": string[]                       // important JD requirements missing or weak
}`;

  let result: ReviewResult;
  try {
    const raw = await generateJson<Partial<ReviewResult>>({
      apiKey,
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
      ],
    });
    result = shape(raw);
  } catch (err) {
    const msg = err instanceof GeminiError ? err.message : "Analysis failed.";
    const status = err instanceof GeminiError ? 502 : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  // Persist the score per (user, listing) so the My Tracker gauge survives reloads.
  if (listingId) {
    try {
      await saveReviewScore(userId, listingId, result.atsScore);
    } catch {
      /* non-fatal — still return the result */
    }
  }

  return NextResponse.json({ result, model: DEFAULT_MODEL });
}
