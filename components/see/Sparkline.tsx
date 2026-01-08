import React from "react";

type Props = {
  values: Array<number | null | undefined>;
  width?: number;
  height?: number;
  target?: number | null;
  className?: string;
};

/**
 * Sparkline simple en SVG:
 * - línea del historial
 * - punto final
 * - línea de meta opcional
 *
 * No usa canvas ni librerías.
 */
export default function Sparkline({ values, width = 140, height = 28, target = null, className }: Props) {
  const clean = values.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));

  const idxs = clean
    .map((v, i) => (v == null ? null : i))
    .filter((x): x is number => x != null);

  if (idxs.length === 0) {
    return (
      <div
        className={["rounded-md bg-slate-50 ring-1 ring-slate-200", className].filter(Boolean).join(" ")}
        style={{ width, height }}
        aria-label="Sin datos"
        title="Sin datos"
      />
    );
  }

  const min = Math.min(...idxs.map((i) => clean[i] as number));
  const max = Math.max(...idxs.map((i) => clean[i] as number));
  const span = max - min || 1;

  const padX = 2;
  const padY = 3;

  const n = clean.length;
  const x = (i: number) => padX + (i * (width - padX * 2)) / Math.max(1, n - 1);
  const y = (v: number) => {
    const t = (v - min) / span; // 0..1
    return padY + (1 - t) * (height - padY * 2);
  };

  // path solo con puntos existentes (saltos si hay nulls)
  let d = "";
  for (let i = 0; i < n; i++) {
    const v = clean[i];
    if (v == null) continue;
    const cmd = d === "" ? "M" : "L";
    d += `${cmd}${x(i).toFixed(2)},${y(v).toFixed(2)} `;
  }

  // último punto existente
  const lastI = idxs[idxs.length - 1];
  const lastV = clean[lastI] as number;

  // línea de meta si viene
  const targetY =
    typeof target === "number" && Number.isFinite(target) ? y(target) : null;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      aria-label="Tendencia"
      role="img"
    >
      {/* fondo suave */}
      <rect x="0" y="0" width={width} height={height} rx="6" className="fill-slate-50 stroke-slate-200" strokeWidth="1" />

      {/* meta */}
      {targetY != null ? (
        <line
          x1={padX}
          x2={width - padX}
          y1={targetY}
          y2={targetY}
          className="stroke-slate-300"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ) : null}

      {/* línea tendencia */}
      <path d={d.trim()} className="stroke-slate-600" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* punto final */}
      <circle cx={x(lastI)} cy={y(lastV)} r="2.3" className="fill-indigo-600" />
    </svg>
  );
}
