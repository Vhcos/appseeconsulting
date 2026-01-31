"use client";

import { useMemo } from "react";

type Row = {
  name: string;
  email: string;
  unit: string | null;
  role: string | null;
  score: number | null;
  reason: string | null;
  focus: string | null;
  comment: string | null;
  respondedAt: string | null;
};

type Summary = {
  responses: number;
  nps: number | null;
  promoters: number;
  passives: number;
  detractors: number;
};

export default function DashboardClient(props: {
  locale: string;
  engagementId: string | null;
  semesterKey: string;
  semesters: string[];
  summary?: Summary;
  distribution?: { score: number; count: number }[];
  byUnit?: { unit: string; responses: number; nps: number | null }[];
  rows?: Row[];
}) {
  const {
    locale,
    engagementId,
    semesterKey,
    semesters,
  } = props;

  const summary: Summary = props.summary ?? {
    responses: 0,
    nps: null,
    promoters: 0,
    passives: 0,
    detractors: 0,
  };

  const distribution = Array.isArray(props.distribution) ? props.distribution : [];
  const byUnit = Array.isArray(props.byUnit) ? props.byUnit : [];
  const rows = Array.isArray(props.rows) ? props.rows : [];

  const maxDist = useMemo(() => {
    if (distribution.length === 0) return 1;
    return Math.max(1, ...distribution.map((d) => d.count ?? 0));
  }, [distribution]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reportes NPS</h1>
          <p className="mt-1 text-sm text-slate-600">
            Semestre: <b>{semesterKey}</b>
            {engagementId ? (
              <>
                {" "}· Engagement: <span className="font-mono text-xs">{engagementId}</span>
              </>
            ) : null}
          </p>
        </div>

        <a
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          href={`/${locale}/reportes/nps?${new URLSearchParams({
            ...(engagementId ? { engagementId } : {}),
            semesterKey,
          }).toString()}`}
        >
          Refrescar
        </a>
      </div>

      {/* selector semestre */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="text-sm text-slate-600">Semestres:</div>
        {semesters.map((s) => (
          <a
            key={s}
            href={`/${locale}/reportes/nps?${new URLSearchParams({
              ...(engagementId ? { engagementId } : {}),
              semesterKey: s,
            }).toString()}`}
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold border",
              s === semesterKey
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            {s}
          </a>
        ))}
      </div>

      {/* cards */}
      <div className="mt-6 grid gap-3 md:grid-cols-5">
        <Card label="Respuestas" value={String(summary.responses)} />
        <Card label="NPS" value={summary.nps === null ? "—" : String(summary.nps)} />
        <Card label="Promoters (9–10)" value={String(summary.promoters)} />
        <Card label="Passives (7–8)" value={String(summary.passives)} />
        <Card label="Detractors (0–6)" value={String(summary.detractors)} />
      </div>

      {/* gráficos */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Distribución (0–10)</h2>

          {distribution.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Aún no hay datos (0 respuestas).</p>
          ) : (
            <div className="mt-3 space-y-2">
              {distribution.map((d) => (
                <div key={d.score} className="flex items-center gap-3">
                  <div className="w-6 text-xs font-semibold text-slate-700">{d.score}</div>
                  <div className="h-3 flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-indigo-600"
                      style={{ width: `${((d.count ?? 0) / maxDist) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-xs text-slate-600">{d.count ?? 0}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Por unidad</h2>

          {byUnit.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No hay respuestas aún (o no hay unidades cruzadas).</p>
          ) : (
            <div className="mt-3 space-y-2">
              {byUnit.map((u) => (
                <div key={u.unit} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{u.unit}</div>
                    <div className="text-[11px] text-slate-500">{u.responses} respuestas</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    NPS: {u.nps === null ? "—" : u.nps}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* tabla */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Respuestas (detalle)</h2>

        <div className="mt-3 overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 font-semibold text-slate-700">Nombre</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Email</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Unidad</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Rol</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Score</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Razón</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Foco</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Comentario</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Respondió</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr key={`${r.email}-${idx}`} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{r.name}</td>
                  <td className="px-3 py-2 text-slate-700">{r.email}</td>
                  <td className="px-3 py-2 text-slate-700">{r.unit || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{r.role || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{r.score ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{r.reason || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{r.focus || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{r.comment || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {r.respondedAt ? new Date(r.respondedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                    No hay datos para mostrar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
