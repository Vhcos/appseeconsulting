/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BscPerspective } from "@prisma/client";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function notEmpty(s: unknown) {
  return typeof s === "string" && s.trim().length > 0;
}

function splitBullets(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split(/\r?\n|•/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function perspectiveLabel(locale: string, p: BscPerspective) {
  const map: Record<BscPerspective, { es: string; en: string }> = {
    FINANCIAL: { es: "Finanzas", en: "Financial" },
    CUSTOMER: { es: "Clientes", en: "Customer" },
    INTERNAL_PROCESS: { es: "Procesos internos", en: "Internal process" },
    LEARNING_GROWTH: { es: "Personas y aprendizaje", en: "Learning & growth" },
  };
  const r = map[p];
  return t(locale, r.es, r.en);
}

function fmtDate(locale: string, d: Date | null | undefined) {
  if (!d) return "—";
  const loc = locale === "en" ? "en-US" : "es-CL";
  return new Intl.DateTimeFormat(loc, { year: "numeric", month: "long", day: "2-digit" }).format(d);
}

function fmtDec(v: any) {
  if (v == null) return "—";
  const s = typeof v === "object" && typeof v.toString === "function" ? v.toString() : String(v);
  return s;
}

export default async function WizardReportPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    include: { company: true },
  });

  if (!engagement) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <p className="mb-4 text-lg font-medium">{t(locale, "No existe este proyecto.", "Project not found.")}</p>
        <Link href={`/${locale}/wizard`} className="text-sm text-indigo-600 underline">
          {t(locale, "Volver al listado", "Back to list")}
        </Link>
      </main>
    );
  }

  const clientName =
    ((engagement as any).contextCompanyName && String((engagement as any).contextCompanyName).trim()) ||
    (engagement.company?.name && engagement.company.name.trim()) ||
    (engagement.name && engagement.name.trim()) ||
    t(locale, "Cliente sin nombre", "Client without name");

  const [
    kpis,
    initiatives,
    risksRaw,
    actions,
    dataRoomItems,
    dataRoomWithData,
    dataRoomFiles,
  ] = await Promise.all([
    prisma.kpi.findMany({
      where: { engagementId },
      select: {
        id: true,
        nameEs: true,
        nameEn: true,
        perspective: true,
        unit: true,
        targetValue: true,
        targetText: true,
      },
      orderBy: [{ perspective: "asc" }, { nameEs: "asc" }],
    }),
    prisma.initiative.findMany({
      where: { engagementId },
      select: { id: true, title: true, perspective: true, impact: true, effort: true, owner: true, status: true },
      orderBy: [{ perspective: "asc" }, { impact: "desc" }, { title: "asc" }],
    }),
    prisma.risk.findMany({
      where: { engagementId },
      select: { id: true, risk: true, probability: true, impact: true, mitigation: true, owner: true, reviewDate: true },
      take: 200,
    }),
    prisma.actionItem.findMany({
      where: { engagementId },
      select: { id: true, task: true, owner: true, dueDate: true, status: true, blocker: true },
      orderBy: [{ dueDate: "asc" }, { id: "desc" }],
      take: 12,
    }),
    prisma.dataRoomItem.count({ where: { engagementId } }),
    prisma.dataRoomItem.count({ where: { engagementId, hasData: true } } as any),
    prisma.dataRoomFile.count({ where: { engagementId } }),
  ]);

  const kpiIds = kpis.map((k) => k.id);

  const latestValues = kpiIds.length
    ? await prisma.kpiValue.findMany({
        where: { kpiId: { in: kpiIds } },
        orderBy: { periodEnd: "desc" },
        distinct: ["kpiId"],
        select: { kpiId: true, value: true, isGreen: true, periodKey: true, periodEnd: true },
      })
    : [];

  const latestByKpi = new Map(latestValues.map((v) => [v.kpiId, v]));

  const risks = risksRaw
    .map((r) => ({ ...r, score: (r.probability ?? 0) * (r.impact ?? 0) }))
    .sort((a, b) => b.score - a.score);

  const topRisks = risks.slice(0, 10);

  const kpisRed = kpis.filter((k) => {
    const v = latestByKpi.get(k.id);
    return v && v.isGreen === false;
  });
  const kpisMissing = kpis.filter((k) => !latestByKpi.get(k.id));

  const strategyVision = (engagement as any).strategyVision as string | null;
  const strategyMission = (engagement as any).strategyMission as string | null;
  const strategyObjectives = (engagement as any).strategyObjectives as string | null;

  const swotStrengths = (engagement as any).swotStrengths as string | null;
  const swotWeaknesses = (engagement as any).swotWeaknesses as string | null;
  const swotOpportunities = (engagement as any).swotOpportunities as string | null;
  const swotThreats = (engagement as any).swotThreats as string | null;

  const execSummaryBullets: string[] = [
    t(locale, `KPIs definidos: ${kpis.length} (rojos: ${kpisRed.length}, sin dato: ${kpisMissing.length}).`, `Defined KPIs: ${kpis.length} (red: ${kpisRed.length}, missing: ${kpisMissing.length}).`),
    t(locale, `Iniciativas registradas: ${initiatives.length}.`, `Initiatives registered: ${initiatives.length}.`),
    t(locale, `Riesgos registrados: ${risksRaw.length}.`, `Risks registered: ${risksRaw.length}.`),
    dataRoomItems > 0
      ? t(locale, `Data Room: ${dataRoomWithData}/${dataRoomItems} items con data (${Math.round((dataRoomWithData / dataRoomItems) * 100)}%).`, `Data Room: ${dataRoomWithData}/${dataRoomItems} items with data (${Math.round((dataRoomWithData / dataRoomItems) * 100)}%).`)
      : t(locale, "Data Room: sin items aún.", "Data Room: no items yet."),
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          main { max-width: 100% !important; padding: 0 !important; }
          .print-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
          a { text-decoration: none !important; color: inherit !important; }
        }
      `}</style>

      <header className="no-print mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Informe estratégico (web)", "Strategic report (web)")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{clientName}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(locale, "Fecha:", "Date:")} {fmtDate(locale, new Date())}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <PrintButton label={t(locale, "Imprimir / PDF", "Print / PDF")} />
          <Link
            href={`/${locale}/wizard/${engagementId}/dashboard`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(locale, "Volver al panel", "Back to dashboard")}
          </Link>
        </div>
      </header>

      <section className="print-card space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Resumen ejecutivo", "Executive summary")}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Estado actual y focos", "Current status and focus")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t(locale, "Este informe se arma con datos reales del engagement (Prisma).", "This report is built from real engagement data (Prisma).")}
          </p>
        </div>

        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
          {execSummaryBullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>

        {topRisks.length ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              {t(locale, "Top riesgos por criticidad (prob×impact)", "Top risks by criticality (prob×impact)")}
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-800">
              {topRisks.slice(0, 5).map((r) => (
                <li key={r.id}>
                  {r.risk} <span className="text-xs text-slate-500">({t(locale, "score", "score")} {r.score})</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>

      <section className="mt-6 print-card space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">1. {t(locale, "Estrategia", "Strategy")}</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Visión", "Vision")}</p>
            <p className="mt-1 text-sm text-slate-800">{notEmpty(strategyVision) ? strategyVision : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Misión", "Mission")}</p>
            <p className="mt-1 text-sm text-slate-800">{notEmpty(strategyMission) ? strategyMission : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Objetivos", "Goals")}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{notEmpty(strategyObjectives) ? strategyObjectives : "—"}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 print-card space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">2. {t(locale, "FODA", "SWOT")}</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { es: "Fortalezas", en: "Strengths", v: swotStrengths },
            { es: "Debilidades", en: "Weaknesses", v: swotWeaknesses },
            { es: "Oportunidades", en: "Opportunities", v: swotOpportunities },
            { es: "Amenazas", en: "Threats", v: swotThreats },
          ].map((x) => (
            <div key={x.es} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{t(locale, x.es, x.en)}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                {splitBullets(x.v).length ? splitBullets(x.v).slice(0, 12).map((b, i) => <li key={i}>{b}</li>) : <li className="text-slate-500">—</li>}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 print-card space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">3. {t(locale, "Cuadro de mando (BSC)", "Scorecard (BSC)")}</h2>

        {kpis.length === 0 ? (
          <p className="text-sm text-slate-500">{t(locale, "Aún no hay KPIs configurados.", "No KPIs configured yet.")}</p>
        ) : (
          <div className="space-y-6">
            {Object.values(BscPerspective).map((p) => {
              const list = kpis.filter((k) => k.perspective === p);
              if (!list.length) return null;

              return (
                <div key={p}>
                  <h3 className="text-sm font-semibold text-slate-900">{perspectiveLabel(locale, p)}</h3>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full border-collapse text-left text-xs text-slate-800">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-3 py-2 font-medium">{t(locale, "KPI", "KPI")}</th>
                          <th className="px-3 py-2 font-medium">{t(locale, "Target", "Target")}</th>
                          <th className="px-3 py-2 font-medium">{t(locale, "Último valor", "Latest value")}</th>
                          <th className="px-3 py-2 font-medium">{t(locale, "Semáforo", "Status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((k, idx) => {
                          const v = latestByKpi.get(k.id);
                          const label = locale === "en" ? k.nameEn : k.nameEs;
                          const target = k.targetText || (k.targetValue != null ? `${fmtDec(k.targetValue)}${k.unit ? ` ${k.unit}` : ""}` : "—");
                          const latest = v?.value != null ? `${fmtDec(v.value)}${k.unit ? ` ${k.unit}` : ""}` : "—";
                          const status = !v ? "—" : v.isGreen ? t(locale, "Verde", "Green") : t(locale, "Rojo", "Red");

                          return (
                            <tr key={k.id} className={idx % 2 === 0 ? "border-b border-slate-100 bg-white" : "border-b border-slate-100 bg-slate-50"}>
                              <td className="px-3 py-2 text-[11px] text-slate-900">{label}</td>
                              <td className="px-3 py-2 text-[11px] text-slate-700">{target}</td>
                              <td className="px-3 py-2 text-[11px] text-slate-900">
                                {latest} {v?.periodKey ? <span className="text-[10px] text-slate-500">({v.periodKey})</span> : null}
                              </td>
                              <td className="px-3 py-2 text-[11px] text-slate-700">{status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6 print-card space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">4. {t(locale, "Iniciativas", "Initiatives")}</h2>

        {initiatives.length === 0 ? (
          <p className="text-sm text-slate-500">{t(locale, "Aún no hay iniciativas.", "No initiatives yet.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs text-slate-800">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 font-medium">{t(locale, "Iniciativa", "Initiative")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Perspectiva", "Perspective")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Impacto", "Impact")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Owner", "Owner")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Estado", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {initiatives.slice(0, 10).map((i, idx) => (
                  <tr key={i.id} className={idx % 2 === 0 ? "border-b border-slate-100 bg-white" : "border-b border-slate-100 bg-slate-50"}>
                    <td className="px-3 py-2 text-[11px] text-slate-900">{i.title}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">{perspectiveLabel(locale, i.perspective)}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">{i.impact ?? "—"}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">{i.owner ?? "—"}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">{i.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 print-card space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">5. {t(locale, "Riesgos top y mitigaciones", "Top risks and mitigations")}</h2>

        {topRisks.length === 0 ? (
          <p className="text-sm text-slate-500">{t(locale, "Aún no hay riesgos.", "No risks yet.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs text-slate-800">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 font-medium">{t(locale, "Riesgo", "Risk")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Prob", "Prob")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Imp", "Impact")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Score", "Score")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Mitigación", "Mitigation")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Owner / revisión", "Owner / review")}</th>
                </tr>
              </thead>
              <tbody>
                {topRisks.map((r, idx) => (
                  <tr key={r.id} className={idx % 2 === 0 ? "border-b border-slate-100 bg-white" : "border-b border-slate-100 bg-slate-50"}>
                    <td className="px-3 py-2 text-[11px] text-slate-900">{r.risk}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">{r.probability ?? "—"}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">{r.impact ?? "—"}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-900">{r.score}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">{r.mitigation ?? "—"}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {(r.owner ?? "—") + (r.reviewDate ? ` · ${fmtDate(locale, r.reviewDate)}` : "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 print-card space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">6. {t(locale, "Próximas acciones", "Next actions")}</h2>

        {actions.length === 0 ? (
          <p className="text-sm text-slate-500">{t(locale, "Aún no hay acciones.", "No actions yet.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs text-slate-800">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 font-medium">{t(locale, "Acción", "Action")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Owner", "Owner")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Due", "Due")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Estado", "Status")}</th>
                  <th className="px-3 py-2 font-medium">{t(locale, "Bloqueo", "Blocker")}</th>
                </tr>
              </thead>
              <tbody>
                {actions.slice(0, 10).map((a, idx) => (
                  <tr key={a.id} className={idx % 2 === 0 ? "border-b border-slate-100 bg-white" : "border-b border-slate-100 bg-slate-50"}>
                    <td className="px-3 py-2 text-[11px] text-slate-900">{a.task}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">{a.owner ?? "—"}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">{fmtDate(locale, a.dueDate)}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">{a.status ?? "—"}</td>
                    <td className="px-3 py-2 text-[11px] text-rose-700">{a.blocker ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 print-card space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">7. {t(locale, "Anexos: Data Room", "Annexes: Data Room")}</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-medium text-slate-600">{t(locale, "Items", "Items")}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{dataRoomItems}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-medium text-slate-600">{t(locale, "Items con data", "Items with data")}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{dataRoomWithData}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-medium text-slate-600">{t(locale, "Archivos", "Files")}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{dataRoomFiles}</p>
          </div>
        </div>

        {dataRoomItems > 0 ? (
          <p className="text-sm text-slate-700">
            {t(locale, "Cobertura:", "Coverage:")} {Math.round((dataRoomWithData / dataRoomItems) * 100)}%
          </p>
        ) : (
          <p className="text-sm text-slate-500">{t(locale, "Aún no hay items Data Room.", "No Data Room items yet.")}</p>
        )}
      </section>

      <div className="no-print mt-8 flex justify-end">
        <Link href={`/${locale}/wizard/${engagementId}/dashboard`} className="text-xs text-indigo-600 hover:text-indigo-500">
          ← {t(locale, "Volver al panel", "Back to dashboard")}
        </Link>
      </div>
    </main>
  );
}
