"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from "recharts";
import type { TooltipProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingWithMeta } from "@/lib/types";

type User = { id: string; name: string; email: string };

type Props = {
  listings: ListingWithMeta[];
  users: User[];
  currentUserId: string;
};

const PIPELINE_STAGES = ["APPLIED", "OA", "PHONE_SCREEN", "INTERVIEW", "OFFER"];
const USER_COLORS = ["#818cf8", "#38bdf8", "#fb923c", "#4ade80", "#f87171", "#c084fc"];

const STACK_KEYS = [
  { key: "Applied",     fill: "#818cf8" },
  { key: "OA",          fill: "#fb923c" },
  { key: "In Pipeline", fill: "#38bdf8" },
  { key: "Offer",       fill: "#4ade80" },
  { key: "Rejected",    fill: "#fca5a5" },
];

function BarTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + ((p.value as number) || 0), 0);
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-xl text-xs min-w-[130px]">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.filter((p) => (p.value as number) > 0).map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
          <span className="text-gray-500">{p.dataKey}</span>
          <span className="ml-auto font-semibold text-gray-800">{p.value}</span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
        <span className="text-gray-400">Total</span>
        <span className="font-semibold text-gray-700">{total}</span>
      </div>
    </div>
  );
}

export function GcClient({ listings, users, currentUserId }: Props) {
  const allApps = useMemo(() => listings.flatMap((l) => l.applications), [listings]);

  const userStats = useMemo(() =>
    users.map((u) => {
      const apps = allApps.filter((a) => a.userId === u.id);
      const statusCounts: Record<string, number> = {};
      for (const a of apps) statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      const referrals = apps.filter((a) => a.hasReferral).length;
      const offers = statusCounts["OFFER"] || 0;
      const responseRate = apps.length > 0
        ? Math.round((PIPELINE_STAGES.slice(1).reduce((s, k) => s + (statusCounts[k] || 0), 0) / apps.length) * 100)
        : 0;
      return { user: u, statusCounts, referrals, offers, responseRate, total: apps.length };
    }),
    [allApps, users]
  );

  const hotListings = useMemo(() =>
    [...listings].sort((a, b) => b.applications.length - a.applications.length).slice(0, 5),
    [listings]
  );

  const barData = userStats.map(({ user, statusCounts }) => ({
    name: user.name.split(" ")[0],
    Applied:       statusCounts["APPLIED"] || 0,
    OA:            statusCounts["OA"] || 0,
    "In Pipeline": (statusCounts["PHONE_SCREEN"] || 0) + (statusCounts["INTERVIEW"] || 0),
    Offer:         statusCounts["OFFER"] || 0,
    Rejected:      statusCounts["REJECTED"] || 0,
  }));

  const barHeight = Math.max(140, users.length * 52 + 32);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GC</h1>
        <p className="text-sm text-gray-400 mt-0.5">who&apos;s locked in for next summer? 🔒</p>
      </div>

      {/* Member cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {userStats.map(({ user, total, referrals, offers, responseRate }, i) => (
          <Card key={user.id} className={`border-0 shadow-sm ${user.id === currentUserId ? "ring-2 ring-indigo-400" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
                </div>
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: USER_COLORS[i % USER_COLORS.length] }}
                >
                  {user.name[0]}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total",         value: total,        color: "text-indigo-600" },
                  { label: "Response Rate", value: `${responseRate}%`, color: "text-violet-600" },
                  { label: "Referrals",     value: referrals,    color: "text-emerald-600" },
                  { label: "Offers",        value: offers,       color: "text-green-600" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className={`text-xl font-bold tracking-tight ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5">
        {/* Horizontal stacked bar — full width */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Pipeline Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={barHeight}>
              <BarChart
                layout="vertical"
                data={barData}
                margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                barSize={22}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#d1d5db" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 13, fill: "#374151", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "#f9fafb" }} />
                {STACK_KEYS.map(({ key, fill }, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="s"
                    fill={fill}
                    radius={i === STACK_KEYS.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {STACK_KEYS.map(({ key, fill }) => (
                <span key={key} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: fill }} />
                  {key}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hot listings */}
      {hotListings.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Group Favorites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {hotListings.map((l, i) => {
                const rankStyle =
                  i === 0 ? "bg-amber-100 text-amber-700"
                  : i === 1 ? "bg-gray-200 text-gray-600"
                  : i === 2 ? "bg-orange-100 text-orange-700"
                  : "bg-gray-50 text-gray-400";
                return (
                  <div key={l.id} className="flex items-center gap-4 py-3 first:pt-1 last:pb-1">
                    {/* Rank */}
                    <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${rankStyle}`}>
                      {i + 1}
                    </div>

                    {/* Company + role */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 truncate">{l.company}</span>
                        {l.jobType === "INTERNSHIP" && (
                          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">Intern</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{l.role}</p>
                    </div>

                    {/* Applicant avatars + count */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex -space-x-1.5">
                        {l.applications.slice(0, 5).map((a) => {
                          const userIdx = users.findIndex((u) => u.id === a.userId);
                          const color = USER_COLORS[userIdx % USER_COLORS.length] ?? "#9ca3af";
                          return (
                            <span
                              key={a.id}
                              title={a.user.name}
                              className="h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
                              style={{ backgroundColor: color }}
                            >
                              {a.user.name[0]}
                            </span>
                          );
                        })}
                      </div>
                      <span className="text-xs font-semibold text-gray-500 tabular-nums w-14 text-right">
                        {l.applications.length}/{users.length} <span className="text-gray-300 font-normal">in</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
