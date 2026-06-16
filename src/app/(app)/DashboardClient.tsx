"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sankey, Layer, Rectangle } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ListingWithMeta, UserApplicationRow, EVENT_STAGES, STATUS_LABELS } from "@/lib/types";
import { formatDateTime, formatRelative } from "@/lib/utils";

type User = { id: string; name: string; email: string };

type Props = {
  users: User[];
  listings: ListingWithMeta[];
  currentUserId: string;
};

const STAT_BOXES = [
  { key: "APPLIED",   label: "Applied",    color: "text-indigo-600",  bg: "bg-indigo-50" },
  { key: "INTERVIEW", label: "Interviews", color: "text-sky-600",     bg: "bg-sky-50" },
  { key: "OFFER",     label: "Offers",     color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "REJECTED",  label: "Rejected",   color: "text-rose-500",    bg: "bg-rose-50" },
];

// Status → color mapping for the pie chart (matches StatusBadge palette).
const STATUS_PIE_COLORS: Record<string, string> = {
  INTERESTED:   "#fbbf24", // amber-400
  APPLIED:      "#6366f1", // indigo-500
  OA:           "#f59e0b", // amber-500
  PHONE_SCREEN: "#a855f7", // purple-500
  INTERVIEW:    "#06b6d4", // cyan-500
  OFFER:        "#10b981", // emerald-500
  REJECTED:     "#f43f5e", // rose-500
  WITHDRAWN:    "#9ca3af", // gray-400
};

// INTERESTED is excluded — pie shows only submitted applications.
const PIE_STATUS_ORDER = [
  "APPLIED", "OA", "PHONE_SCREEN", "INTERVIEW",
  "OFFER", "REJECTED", "WITHDRAWN",
];

// Round nodes use a short prefix so they're unique in the Sankey graph
// (e.g. "PS·R1" vs "Int·R1") but display as just "R1", "R2" in the label.
const FUNNEL_STAGES = [
  { status: "OA",           label: "OA",           prefix: "OA"  },
  { status: "PHONE_SCREEN", label: "Phone Screen",  prefix: "PS"  },
  { status: "INTERVIEW",    label: "Interview",     prefix: "Int" },
] as const;

function sankeyNodeColor(name: string): string {
  if (name === "Applied")                          return "#6366f1";
  if (name === "OA"   || name.startsWith("OA·"))  return "#f59e0b";
  if (name === "Phone Screen" || name.startsWith("PS·"))  return "#a855f7";
  if (name === "Interview"    || name.startsWith("Int·")) return "#06b6d4";
  if (name === "Still Going")                      return "#94a3b8";
  if (name === "Offer")                            return "#10b981";
  if (name === "Rejected")                         return "#f43f5e";
  if (name === "Withdrawn")                        return "#9ca3af";
  return "#cbd5e1";
}

function sankeyDisplayLabel(name: string): string {
  const dot = name.indexOf("·");
  return dot === -1 ? name : name.slice(dot + 1).trim(); // "PS·R2" → "R2"
}

// Custom Sankey node — colored rect + label outside
type SankeyNodeProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: { name: string; value: number };
  containerWidth: number;
};

function SankeyNode({ x, y, width, height, index, payload, containerWidth }: SankeyNodeProps) {
  const isOut = x + width + 6 > containerWidth - 80;
  const fill = sankeyNodeColor(payload.name);
  const labelX = isOut ? x - 6 : x + width + 6;
  const cy = y + height / 2;
  return (
    <Layer key={`node-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity={1} />
      <text
        textAnchor={isOut ? "end" : "start"}
        x={labelX}
        y={cy - 7}
        fontSize="11"
        fontWeight={600}
        fill="#374151"
        stroke="none"
        dy="0.35em"
      >
        {sankeyDisplayLabel(payload.name)}
      </text>
      <text
        textAnchor={isOut ? "end" : "start"}
        x={labelX}
        y={cy + 7}
        fontSize="10"
        fill="#9ca3af"
        stroke="none"
        dy="0.35em"
      >
        {payload.value}
      </text>
    </Layer>
  );
}

export function DashboardClient({ listings: initialListings, currentUserId }: Props) {
  const [listings, setListings] = useState(initialListings);
  const [interestingIds, setInterestingIds] = useState<Set<string>>(new Set());

  // Capture timestamps once on mount.
  const [todayStartTs] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  const myApps: UserApplicationRow[] = useMemo(
    () => listings.flatMap((l) => l.applications).filter((a) => a.userId === currentUserId),
    [listings, currentUserId]
  );

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of myApps) c[a.status] = (c[a.status] || 0) + 1;
    return c;
  }, [myApps]);

  const total = myApps.length;
  const referrals = myApps.filter((a) => a.hasReferral).length;
  const pipeline = ["OA", "PHONE_SCREEN", "INTERVIEW", "OFFER"].reduce((s, k) => s + (statusCounts[k] || 0), 0);
  const responseRate = total > 0 ? Math.round((pipeline / total) * 100) : 0;
  const active = myApps.filter((a) => !["INTERESTED", "REJECTED", "WITHDRAWN"].includes(a.status)).length;
  const oaStage = statusCounts["OA"] || 0;
  // "Applied" = anything that left INTERESTED — covers all pipeline stages, offers, rejections, etc.
  const statBoxValues: Record<string, number> = {
    ...statusCounts,
    APPLIED: myApps.filter((a) => a.status !== "INTERESTED").length,
  };

  const pieData = useMemo(
    () =>
      PIE_STATUS_ORDER
        .map((s) => ({ name: STATUS_LABELS[s] || s, status: s, value: statusCounts[s] || 0 }))
        .filter((d) => d.value > 0),
    [statusCounts]
  );

  const recentListings = useMemo(
    () =>
      [...listings]
        .filter((l) => !l.applications.some((a) => a.userId === currentUserId))
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 5),
    [listings, currentUserId]
  );

  const upcomingDeadlines = useMemo(() => {
    const eventStages: string[] = [...EVENT_STAGES];
    return listings
      .flatMap((l) =>
        l.applications
          .filter(
            (a) =>
              a.userId === currentUserId &&
              a.eventAt &&
              eventStages.includes(a.status) &&
              new Date(a.eventAt).getTime() >= todayStartTs
          )
          .map((a) => {
            const ts = new Date(a.eventAt as string).getTime();
            const daysLeft = Math.max(0, Math.ceil((ts - todayStartTs) / 86_400_000));
            return { listing: l, app: a, daysLeft, ts };
          })
      )
      .sort((a, b) => a.ts - b.ts)
      .slice(0, 5);
  }, [listings, currentUserId, todayStartTs]);

  // Funnel: Applied → [stage nodes with rounds] → terminal.
  // Nodes are labeled by stage (OA, Phone Screen, Interview) + round number so the
  // hierarchy is clear. Apps that have progressed past earlier stages show those
  // stages as single passthrough nodes since per-stage round history isn't stored.
  const sankeyData = useMemo(() => {
    // Build a fixed order so Sankey renders left-to-right correctly.
    const ORDER: string[] = ["Applied"];
    // ORDER: stage block node first, then its round sub-nodes (prefixed so they're unique).
    for (const { label, prefix } of FUNNEL_STAGES) {
      ORDER.push(label);
      for (let r = 1; r <= 5; r++) ORDER.push(r === 5 ? `${prefix}·R5+` : `${prefix}·R${r}`);
    }
    ORDER.push("Still Going", "Offer", "Rejected", "Withdrawn");

    const linkCount = new Map<string, number>();
    const bump = (s: string, t: string) => {
      const k = `${s}|${t}`;
      linkCount.set(k, (linkCount.get(k) ?? 0) + 1);
    };

    for (const a of myApps) {
      if (a.status === "INTERESTED") continue;

      const stageIdx = FUNNEL_STAGES.findIndex((p) => p.status === a.status);
      const round = Math.min(5, Math.max(0, a.interviewRound ?? 0));
      let prev = "Applied";

      if (stageIdx >= 0) {
        // Walk passed stages as single passthrough nodes.
        for (let si = 0; si < stageIdx; si++) {
          const node = FUNNEL_STAGES[si].label;
          bump(prev, node);
          prev = node;
        }
        // Always emit the current stage block, then its round sub-nodes.
        const { label, prefix } = FUNNEL_STAGES[stageIdx];
        bump(prev, label);
        prev = label;
        for (let r = 1; r <= round; r++) {
          const node = r === 5 ? `${prefix}·R5+` : `${prefix}·R${r}`;
          bump(prev, node);
          prev = node;
        }
      } else if (round > 0) {
        // Terminal status with tracked rounds — assume Interview was the last stage.
        const { label, prefix } = FUNNEL_STAGES[2]; // Interview
        bump(prev, label);
        prev = label;
        for (let r = 1; r <= round; r++) {
          const node = r === 5 ? `${prefix}·R5+` : `${prefix}·R${r}`;
          bump(prev, node);
          prev = node;
        }
      }

      let terminal = "Still Going";
      if (a.status === "OFFER") terminal = "Offer";
      else if (a.status === "REJECTED") terminal = "Rejected";
      else if (a.status === "WITHDRAWN") terminal = "Withdrawn";

      bump(prev, terminal);
    }

    if (linkCount.size === 0) return { nodes: [], links: [] };

    const used = new Set<string>();
    linkCount.forEach((_, k) => {
      const [s, t] = k.split("|");
      used.add(s);
      used.add(t);
    });
    const nodeNames = ORDER.filter((n) => used.has(n));
    const idx = new Map(nodeNames.map((n, i) => [n, i]));
    const links = [...linkCount.entries()].map(([k, value]) => {
      const [s, t] = k.split("|");
      return { source: idx.get(s)!, target: idx.get(t)!, value };
    });
    return { nodes: nodeNames.map((name) => ({ name })), links };
  }, [myApps]);

  const handleInterested = async (listingId: string) => {
    setInterestingIds((prev) => new Set(prev).add(listingId));
    try {
      const res = await fetch(`/api/listings/${listingId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INTERESTED" }),
      });
      if (!res.ok) throw new Error("Failed");
      const newApp: UserApplicationRow = await res.json();
      // Patch local listings state so the badge appears immediately.
      setListings((prev) =>
        prev.map((l) =>
          l.id === listingId
            ? { ...l, applications: [...l.applications, newApp] }
            : l
        )
      );
    } finally {
      setInterestingIds((prev) => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">your personal job-hunt snapshot 🔒</p>
      </div>

      {/* Your stats + status breakdown — half and half */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: Your Stats (4 status boxes 2x2 + 4 summary cards 2x2) */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Your Stats</p>
          <div className="grid grid-cols-2 gap-3">
            {STAT_BOXES.map(({ key, label, color, bg }) => (
              <Card key={key} className="border-0 shadow-sm">
                <CardContent className={`p-4 rounded-xl ${bg}`}>
                  <p className="text-xs font-medium text-gray-500">{label}</p>
                  <p className={`mt-1 text-3xl font-bold tracking-tight ${color}`}>{statBoxValues[key] || 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { label: "Active",         value: active,             color: "text-sky-600" },
              { label: "OA Stage",       value: oaStage,            color: "text-amber-600" },
              { label: "With Referral",  value: referrals,          color: "text-emerald-600" },
              { label: "Response Rate",  value: `${responseRate}%`, color: "text-violet-600" },
            ].map(({ label, value, color }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-gray-400">{label}</p>
                  <p className={`mt-1 text-2xl font-bold tracking-tight ${color}`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Status Breakdown pie chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-300">No applications yet</div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-72 w-72 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={64}
                        outerRadius={120}
                        paddingAngle={1}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {pieData.map((d) => (
                          <Cell key={d.status} fill={STATUS_PIE_COLORS[d.status] || "#9ca3af"} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          padding: "6px 10px",
                        }}
                        formatter={(value: number, name: string) => {
                          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                          return [`${value} (${pct}%)`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-1.5 text-xs">
                  {pieData.map((d) => {
                    const pct = statBoxValues.APPLIED > 0 ? Math.round((d.value / statBoxValues.APPLIED) * 100) : 0;
                    return (
                      <li key={d.status} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: STATUS_PIE_COLORS[d.status] || "#9ca3af" }}
                        />
                        <span className="flex-1 text-gray-600">{d.name}</span>
                        <span className="font-semibold text-gray-800">{d.value}</span>
                        <span className="w-9 text-right text-gray-400">{pct}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deadlines + Catch Up — half and half */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Upcoming Deadlines */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-300">No upcoming events 🎉</div>
            ) : (
              <div className="space-y-2.5">
                {upcomingDeadlines.map(({ listing: l, app: a, daysLeft }) => {
                  const urgency =
                    daysLeft <= 1 ? "bg-rose-50 text-rose-600"
                    : daysLeft <= 3 ? "bg-amber-50 text-amber-600"
                    : "bg-gray-50 text-gray-500";
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className={`w-16 shrink-0 rounded-lg px-2 py-1.5 text-center ${urgency}`}>
                        <p className="text-base font-bold leading-none tracking-tight">{daysLeft}d</p>
                        <p className="mt-0.5 text-[10px] font-medium leading-none opacity-70">left</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-800">{l.company}</p>
                        <p className="truncate text-xs text-gray-400">
                          {l.role} · {formatDateTime(a.eventAt)}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Catch Up */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Catch Up</CardTitle>
          </CardHeader>
          <CardContent>
            {recentListings.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-300">No listings yet</div>
            ) : (
              <div className="space-y-2.5">
                {recentListings.map((l) => {
                  const mine = l.applications.find((a) => a.userId === currentUserId);
                  const loading = interestingIds.has(l.id);
                  return (
                    <div key={l.id} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-gray-800">{l.company}</span>
                          {l.jobType === "INTERNSHIP" && (
                            <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">Intern</span>
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-400">
                          {l.role} · <span className="text-indigo-600 font-medium">@{l.addedBy.name}</span> · {formatRelative(l.createdAt)}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {mine ? (
                          <StatusBadge status={mine.status} />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs"
                            disabled={loading}
                            onClick={() => handleInterested(l.id)}
                          >
                            {loading ? "…" : "I'm Interested"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Interview Funnel — Sankey diagram of round-by-round progression */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Interview Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          {sankeyData.links.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-300">
              Apply to some listings to see your funnel come to life
            </div>
          ) : (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <Sankey
                  data={sankeyData}
                  // @ts-expect-error — recharts' Sankey custom node typing is too narrow; SankeyNode receives the documented props at runtime.
                  node={<SankeyNode containerWidth={960} />}
                  nodePadding={32}
                  nodeWidth={12}
                  linkCurvature={0.5}
                  iterations={64}
                  margin={{ top: 8, right: 80, bottom: 16, left: 80 }}
                  link={{ stroke: "#cbd5e1", strokeOpacity: 0.35, fill: "#cbd5e1", fillOpacity: 0.35 }}
                >
                  <Tooltip
                    formatter={(value) => [`${value} app${value === 1 ? "" : "s"}`, ""]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                </Sankey>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}