type SeriesPoint = { periodKey: string; value: number | null };

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function niceDomain(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) {
    const p = Math.abs(min || 1) * 0.25;
    return { min: min - p, max: max + p };
  }
  const span = max - min;
  const pad = span * 0.12;
  return { min: min - pad, max: max + pad };
}

export default function KpiMiniChart({
  series,
  evaluatedSeries,
  targetValue,
  width = 132,
  height = 34,
}: {
  series: SeriesPoint[];
  evaluatedSeries: Array<number | null>;
  targetValue: number | null;
  width?: number;
  height?: number;
}) {
  const s0 = Array.isArray(series) ? series : [];
  const e0 = Array.isArray(evaluatedSeries) ? evaluatedSeries : [];

  // Orden cronológico
  let s = s0;
  let e = e0;
  if (s.length >= 2 && s[0]?.periodKey > s[s.length - 1]?.periodKey) {
    s = [...s0].reverse();
    e = [...e0].reverse();
  }

  const curMonthly = s.length ? s[s.length - 1]?.value ?? null : null;
  const curEval = e.length ? e[e.length - 1] ?? null : null;
  const tgt = isFiniteNumber(targetValue) ? targetValue : null;

  const vals: number[] = [0];
  if (isFiniteNumber(curMonthly)) vals.push(curMonthly);
  if (isFiniteNumber(curEval)) vals.push(curEval);
  if (isFiniteNumber(tgt)) vals.push(tgt);

  let minV = Math.min(...vals);
  let maxV = Math.max(...vals);
  const dom = niceDomain(minV, maxV);
  minV = dom.min;
  maxV = dom.max;

  const W = width;
  const H = height;

  const m = { l: 10, r: 10, t: 8, b: 12 };
  const trackX = m.l;
  const trackY = m.t;
  const trackW = W - m.l - m.r;
  const trackH = H - m.t - m.b;

  const span = maxV - minV || 1;

  const x = (v: number) => {
    const t = (v - minV) / span;
    return trackX + t * trackW;
  };

  const x0 = x(0);

  function barRect(v: number | null, thickness: number) {
    if (!isFiniteNumber(v)) return null;
    const xv = x(v);
    const left = Math.min(x0, xv);
    const right = Math.max(x0, xv);
    const w = Math.max(2, right - left);
    const y = trackY + (trackH - thickness) / 2;
    return { x: left, y, w, h: thickness };
  }

  const evalBar = barRect(curEval, Math.max(11, Math.floor(trackH * 0.78)));
  const monthBar = barRect(curMonthly, Math.max(7, Math.floor(trackH * 0.5)));
  const targetX = tgt == null ? null : x(tgt);

  const title = [
    `Mes: ${curMonthly == null ? "—" : String(curMonthly)}`,
    `Eval: ${curEval == null ? "—" : String(curEval)}`,
    `Meta: ${tgt == null ? "—" : String(tgt)}`,
  ].join(" | ");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label="KPI mini chart">
      <title>{title}</title>

      {/* Contenedor */}
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="10" className="fill-white stroke-slate-200" />

      {/* Track */}
      <rect x={trackX} y={trackY} width={trackW} height={trackH} rx="8" className="fill-slate-100" />

      {/* Línea cero */}
      <line x1={x0} y1={trackY - 2} x2={x0} y2={trackY + trackH + 2} className="stroke-slate-400" strokeWidth={1} />

      {/* Mes (ámbar) */}
      {monthBar ? (
        <rect x={monthBar.x} y={monthBar.y} width={monthBar.w} height={monthBar.h} rx="6" className="fill-amber-500" opacity="0.85" />
      ) : null}

      {/* Evaluado (azul) */}
      {evalBar ? (
        <rect x={evalBar.x} y={evalBar.y} width={evalBar.w} height={evalBar.h} rx="7" className="fill-blue-600" opacity="0.92" />
      ) : null}

      {/* Meta (fucsia) */}
      {targetX != null ? (
        <>
          <line x1={targetX} y1={trackY - 3} x2={targetX} y2={trackY + trackH + 3} className="stroke-fuchsia-600" strokeWidth={2.5} />
          <circle cx={targetX} cy={trackY - 3} r={2.8} className="fill-fuchsia-600" />
        </>
      ) : null}

      {/* Leyenda mínima (puntos) */}
      <g>
        <circle cx={trackX + 4} cy={H - 6} r={2.2} className="fill-amber-500" />
        <text x={trackX + 10} y={H - 4.5} fontSize="9" className="fill-slate-600">Mes</text>

        <circle cx={trackX + 40} cy={H - 6} r={2.2} className="fill-blue-600" />
        <text x={trackX + 46} y={H - 4.5} fontSize="9" className="fill-slate-600">Eval</text>

        <circle cx={trackX + 78} cy={H - 6} r={2.2} className="fill-fuchsia-600" />
        <text x={trackX + 84} y={H - 4.5} fontSize="9" className="fill-slate-600">Meta</text>
      </g>
    </svg>
  );
}
