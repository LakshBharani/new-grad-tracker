"use client";

// A small bottom-open arc gauge (like a speedometer) showing an ATS match score.
// The arc fills proportionally to the score and is colored red / yellow / green
// for low / medium / high match.

function bandColor(score: number) {
  if (score >= 70) return "#16a34a"; // green — high
  if (score >= 40) return "#eab308"; // yellow — medium
  return "#dc2626"; // red — low
}

// 0deg at the top, increasing clockwise.
function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function ScoreGauge({ score, size = 36 }: { score: number; size?: number }) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc spans 270°, leaving a 90° gap centered at the bottom (135° → 225°).
  const start = polar(cx, cy, r, 225);
  const end = polar(cx, cy, r, 135);
  const d = `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y}`;

  const arcLen = r * (270 * Math.PI) / 180;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * arcLen;
  const color = bandColor(score);

  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-0">
        {/* track */}
        <path d={d} fill="none" stroke="#e5e7eb" strokeWidth={stroke} strokeLinecap="round" />
        {/* filled portion */}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${arcLen}`}
        />
      </svg>
      <span className="text-[11px] font-bold tabular-nums" style={{ color }}>
        {score}
      </span>
    </span>
  );
}
