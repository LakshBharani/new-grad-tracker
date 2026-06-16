import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, GitBranch, FileText, Calendar, Eye } from "lucide-react";
import { auth } from "@/lib/auth";
import { getUserById, getMyApplications, listResumes } from "@/lib/db-helpers";
import { getResumeSignedUrl } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Stages that count as a response (anything past APPLIED), matching the GC page.
const RESPONSE_STAGES = ["OA", "PHONE_SCREEN", "INTERVIEW", "OFFER"];

const AVATAR_COLORS = ["#818cf8", "#38bdf8", "#fb923c", "#4ade80", "#f87171", "#c084fc"];

type ProfileApp = Awaited<ReturnType<typeof getMyApplications>>[number];

function avatarColor(id: string) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function AppCard({ app }: { app: ProfileApp }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-900">{app.listing.company}</span>
          <span className="text-gray-400">·</span>
          <span className="text-sm text-gray-600">{app.listing.role}</span>
          {app.listing.jobType === "INTERNSHIP" && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
              Intern
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
          {app.appliedAt && (
            <span className="flex items-center gap-1 text-gray-500">
              <Calendar className="h-3 w-3" />
              Applied {formatDate(app.appliedAt)}
            </span>
          )}
          {app.hasReferral && (
            <span className="flex items-center gap-1 font-medium text-emerald-600">
              <GitBranch className="h-3 w-3" />
              Referral{app.referralFrom ? ` · ${app.referralFrom}` : ""}
            </span>
          )}
          {app.resumeLabel && (
            <span className="flex max-w-[200px] items-center gap-1 font-medium text-rose-500">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{app.resumeLabel}</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <StatusBadge status={app.status} />
        <a
          href={app.listing.link}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id as string;

  const user = await getUserById(id);
  if (!user) notFound();

  const [apps, resumeRows] = await Promise.all([getMyApplications(id), listResumes(id)]);

  const resumes = await Promise.all(
    resumeRows.map(async (r) => {
      let signedUrl: string | null = null;
      try {
        signedUrl = await getResumeSignedUrl(r.storagePath);
      } catch {
        signedUrl = null;
      }
      return { id: r.id, label: r.label, signedUrl };
    })
  );

  // Stats (same formulas as the GC page).
  const statusCounts: Record<string, number> = {};
  for (const a of apps) statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  const total = apps.length;
  const referrals = apps.filter((a) => a.hasReferral).length;
  const offers = statusCounts["OFFER"] || 0;
  const responseRate =
    total > 0
      ? Math.round((RESPONSE_STAGES.reduce((s, k) => s + (statusCounts[k] || 0), 0) / total) * 100)
      : 0;

  const isSelf = id === currentUserId;
  const firstName = user.name.split(" ")[0];

  // Recently applied: most recent 10 apps the user actually applied to.
  const recentlyApplied = apps
    .filter((a) => a.status !== "INTERESTED")
    .sort((a, b) => (b.appliedAt ?? b.createdAt ?? "").localeCompare(a.appliedAt ?? a.createdAt ?? ""))
    .slice(0, 10);
  // Highlighted pipeline stages — show all of each.
  const oaApps = apps.filter((a) => a.status === "OA");
  const interviewApps = apps.filter((a) => a.status === "PHONE_SCREEN" || a.status === "INTERVIEW");
  const offerApps = apps.filter((a) => a.status === "OFFER");

  const stats = [
    { label: "Total", value: total, color: "text-indigo-600" },
    { label: "Response Rate", value: `${responseRate}%`, color: "text-violet-600" },
    { label: "Referrals", value: referrals, color: "text-emerald-600" },
    { label: "Offers", value: offers, color: "text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/gc"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to GC
      </Link>

      {/* Header */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ backgroundColor: avatarColor(user.id) }}
            >
              {user.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                {isSelf && (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                    You
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-400">{user.email}</p>
              {user.bio && <p className="mt-2 text-sm text-gray-600">{user.bio}</p>}
              {user.linkedinUrl && (
                <a
                  href={user.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  LinkedIn
                </a>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumes */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Resumes {resumes.length > 0 && <span className="text-gray-400">({resumes.length})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resumes.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              {firstName} hasn&apos;t added any resumes yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {resumes.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100">
                    <FileText className="h-5 w-5 text-rose-600" />
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{r.label}</p>
                  {r.signedUrl && (
                    <a
                      href={r.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Highlights: Offers, Interviews, OAs (all of each) */}
      {offerApps.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-green-700">
              Offers <span className="text-gray-400">({offerApps.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {offerApps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {interviewApps.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Interviews <span className="text-gray-400">({interviewApps.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {interviewApps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {oaApps.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Online Assessments <span className="text-gray-400">({oaApps.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {oaApps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recently applied — last 10 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Recently Applied
            {recentlyApplied.length > 0 && (
              <span className="text-gray-400"> (last {recentlyApplied.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentlyApplied.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              {firstName} hasn&apos;t applied to anything yet.
            </p>
          ) : (
            <div className="space-y-2">
              {recentlyApplied.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
