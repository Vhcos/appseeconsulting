"use client";

import * as React from "react";

type Point = { periodKey: string; value: number | null };

export default function KpiMiniChart({
  series,
  evaluatedSeries,
  targetValue,
}: {
  series: Point[];
  evaluatedSeries: Array<number | null>;
  targetValue: number | null;
}) {
  const W = 160;
  const H = 44;
  const padX = 4;
  const padY = 4;

  const values = series.map((p) => p.value).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const evals = evaluatedSeries.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const targets = targetValue != null && Number.isFinite(targetValue) ? [targetValue] : [];

  let min = Math.min(...values, ...evals, ...(targets.length ? targets : [0]));
  let max = Math.max(...values, ...evals, ...(targets.length ? targets : [0]));

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }

  const n = Math.max(1, series.length);
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const xAt = (i: number) => padX + (innerW * i) / (n - 1 || 1);
  const yAt = (v: number) => padY + ((max - v) * innerH) / (max - min);

  // Bars
  const barW = innerW / n;
  const rects = series.map((p, i) => {
    const v = p.value;
    if (v == null || !Number.isFinite(v)) return null;
    const x = padX + i * barW + 0.8;
    const y = yAt(v);
    const h = padY + innerH - y;
    return <rect key={p.periodKey} x={x} y={y} width={Math.max(1, barW - 1.6)} height={h} rx={1.5} className="fill-slate-200" />;
  });

  // Line path for evaluatedSeries (break on nulls)
  let d = "";
  for (let i = 0; i < n; i++) {
    const v = evaluatedSeries[i];
    if (v == null || !Number.isFinite(v)) {
      // break segment
      continue;
    }
    const x = xAt(i);
    const y = yAt(v);
    d += d === "" || (i > 0 && (evaluatedSeries[i - 1] == null || !Number.isFinite(evaluatedSeries[i - 1] as number)))
      ? `M ${x} ${y}`
      : ` L ${x} ${y}`;
  }

  // Target line
  const targetY = targetValue != null && Number.isFinite(targetValue) ? yAt(targetValue) : null;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
      {/* background */}
      <rect x="0" y="0" width={W} height={H} rx="8" className="fill-slate-50" />

      {/* target */}
      {targetY != null ? (
        <line x1={padX} x2={W - padX} y1={targetY} y2={targetY} className="stroke-emerald-400" strokeWidth="1" strokeDasharray="3 3" />
      ) : null}

      {/* bars */}
      {rects}

      {/* evaluated line */}
      {d ? <path d={d} className="stroke-indigo-600" strokeWidth="1.8" fill="none" /> : null}

      {/* last point */}
      {(() => {
        const last = evaluatedSeries[n - 1];
        if (last == null || !Number.isFinite(last)) return null;
        const x = xAt(n - 1);
        const y = yAt(last);
        return <circle cx={x} cy={y} r="2.4" className="fill-indigo-600" />;
      })()}
    </svg>
  );
}
