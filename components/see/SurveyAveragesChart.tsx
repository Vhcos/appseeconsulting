"use client";

import { useMemo, useState } from "react";

type QuestionRow = {
  key: string;
  prompt: string;
  avgOverall: number | null;
  nOverall: number;
  byArea: Record<string, { avg: number | null; n: number }>;
};

export default function SurveyAveragesChart({
  locale,
  areas,
  rows,
}: {
  locale: string;
  areas: string[];
  rows: QuestionRow[];
}) {
  const [area, setArea] = useState<string>("__ALL__");

  const areaOptions = useMemo(() => {
    const cleaned = Array.from(
      new Set((areas ?? []).map((a) => String(a).trim()).filter(Boolean)),
    );
    return cleaned;
  }, [areas]);

  const label = (es: string, en: string) => (locale === "en" ? en : es);

  const displayed = useMemo(() => {
    return rows.map((r) => {
      const picked =
        area === "__ALL__"
          ? { avg: r.avgOverall, n: r.nOverall }
          : r.byArea?.[area] ?? { avg: null, n: 0 };

      return { ...r, pickedAvg: picked.avg, pickedN: picked.n };
    });
  }, [rows, area]);

  const overallAvg = useMemo(() => {
    const nums = displayed
      .map((d) => d.pickedAvg)
      .filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
    if (!nums.length) return null;
    const s = nums.reduce((a, b) => a + b, 0);
    return s / nums.length;
  }, [displayed]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label("Encuesta interna (B1)", "Internal survey (B1)")}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-slate-900">
            {label(
              "Promedio por pregunta (filtrable por área)",
              "Average per question (filterable by area)",
            )}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            {label(
              "Solo considera preguntas B1.* (escala 1–5).",
              "Only considers B1.* questions (1–5 scale).",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">{label("Área:", "Area:")}</span>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
          >
            <option value="__ALL__">{label("Todas", "All")}</option>
            {areaOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-medium text-slate-600">
            {label("Preguntas B1", "B1 questions")}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{rows.length}</p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-medium text-slate-600">
            {label("Promedio global (vista actual)", "Overall average (current view)")}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {overallAvg == null ? "—" : overallAvg.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-medium text-slate-600">
            {label("Nota", "Note")}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {label(
              "El largo de la barra es (promedio/5).",
              "Bar length is (average/5).",
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 font-medium text-slate-600">
                {label("Código", "Code")}
              </th>
              <th className="px-3 py-2 font-medium text-slate-600">
                {label("Pregunta", "Question")}
              </th>
              <th className="px-3 py-2 font-medium text-slate-600">
                {label("Promedio", "Average")}
              </th>
              <th className="px-3 py-2 font-medium text-slate-600">N</th>
              <th className="px-3 py-2 font-medium text-slate-600">
                {label("Barra", "Bar")}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {displayed.map((r) => {
              const pct =
                typeof r.pickedAvg === "number" ? Math.max(0, Math.min(100, (r.pickedAvg / 5) * 100)) : 0;

              return (
                <tr key={r.key} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 align-top font-mono text-[11px] text-slate-500">
                    {r.key}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-800">{r.prompt}</td>
                  <td className="px-3 py-2 align-top text-slate-800">
                    {r.pickedAvg == null ? "—" : r.pickedAvg.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-800">{r.pickedN ?? 0}</td>
                  <td className="px-3 py-2 align-top">
                    <div className="h-2 w-40 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-indigo-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
