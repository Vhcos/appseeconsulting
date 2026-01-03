// app/[locale]/wizard/[engagementId]/report/page.tsx
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
    LEARNING_GROWTH: { es: "Personas y aprendizaje", en: "People & learning" },
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

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function Section({
  id,
  n,
  title,
  subtitle,
  editHref,
  children,
}: {
  id: string;
  n: number;
  title: string;
  subtitle?: string;
  editHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="print-card space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {n}. {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>

        {editHref ? (
          <Link
            href={editHref}
            className="no-print inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {title.includes("Diagnóstico")
              ? t("es", "Editar", "Edit")
              : t("es", "Editar", "Edit")}
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}

export default async function WizardReportPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    include: { company: true, org: true },
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

  // -----------------------------
  // Data (todo basado en Prisma)
  // -----------------------------
  const [
    kpis,
    initiatives,
    risksRaw,
    actions,
    dataRoomItems,
    dataRoomWithData,
    dataRoomFiles,
    roadmapWeeks,
    raciRows,
    decisions,
    unitEconomics,
    accountPlans,
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
      select: {
        id: true,
        title: true,
        perspective: true,
        impact: true,
        effort: true,
        owner: true,
        status: true,
      },
      orderBy: [{ perspective: "asc" }, { impact: "desc" }, { title: "asc" }],
    }),
    prisma.risk.findMany({
      where: { engagementId },
      select: {
        id: true,
        risk: true,
        probability: true,
        impact: true,
        mitigation: true,
        owner: true,
        reviewDate: true,
      },
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
    prisma.roadmapWeek.count({ where: { engagementId } }),
    prisma.raciRow.count({ where: { engagementId } }),
    prisma.decision.count({ where: { engagementId } }),
    prisma.unitEconomicsRow.count({ where: { engagementId } }),
    prisma.accountPlanRow.count({ where: { engagementId } }),
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

  // Estrategia y FODA vienen del Engagement
  const strategyVision = (engagement as any).strategyVision as string | null;
  const strategyMission = (engagement as any).strategyMission as string | null;
  const strategyObjectives = (engagement as any).strategyObjectives as string | null;

  const swotStrengths = (engagement as any).swotStrengths as string | null;
  const swotWeaknesses = (engagement as any).swotWeaknesses as string | null;
  const swotOpportunities = (engagement as any).swotOpportunities as string | null;
  const swotThreats = (engagement as any).swotThreats as string | null;

  const drCoverage = dataRoomItems > 0 ? pct(dataRoomWithData, dataRoomItems) : 0;

  const execSummaryBullets: string[] = [
    t(
      locale,
      `KPIs (indicadores clave) definidos: ${kpis.length} (rojos: ${kpisRed.length}, sin dato: ${kpisMissing.length}).`,
      `KPIs defined: ${kpis.length} (red: ${kpisRed.length}, missing: ${kpisMissing.length}).`
    ),
    t(locale, `Iniciativas registradas: ${initiatives.length}.`, `Initiatives registered: ${initiatives.length}.`),
    t(locale, `Riesgos registrados: ${risksRaw.length}.`, `Risks registered: ${risksRaw.length}.`),
    dataRoomItems > 0
      ? t(
          locale,
          `Data room: ${dataRoomWithData}/${dataRoomItems} items con data (${drCoverage}%).`,
          `Data room: ${dataRoomWithData}/${dataRoomItems} items with data (${drCoverage}%).`
        )
      : t(locale, "Data room: sin items aún.", "Data room: no items yet."),
    t(
      locale,
      `Roadmap: ${roadmapWeeks} semanas cargadas · Gobernanza: ${actions.length} acciones, ${raciRows} filas RACI (Responsible/Accountable/Consulted/Informed).`,
      `Roadmap: ${roadmapWeeks} weeks · Governance: ${actions.length} actions, ${raciRows} RACI rows.`
    ),
  ];

  const hrefStep = (stepId: string) => `/${locale}/wizard/${engagementId}/${stepId}`;

  const toc = [
    { id: "sec-01", n: 1, es: "Ficha del cliente", en: "Client sheet" },
    { id: "sec-02", n: 2, es: "Data room", en: "Data room" },
    { id: "sec-03", n: 3, es: "Diagnóstico (3 subpasos)", en: "Diagnosis (3 substeps)" },
    { id: "sec-04", n: 4, es: "Visión / Misión / Objetivos", en: "Vision / Mission / Goals" },
    { id: "sec-05", n: 5, es: "FODA", en: "SWOT" },
    { id: "sec-06", n: 6, es: "KPIs (indicadores clave)", en: "KPIs" },
    { id: "sec-07", n: 7, es: "Iniciativas", en: "Initiatives" },
    { id: "sec-08", n: 8, es: "Roadmap", en: "Roadmap" },
    { id: "sec-09", n: 9, es: "Gobernanza", en: "Governance" },
    { id: "sec-10", n: 10, es: "Reporte y anexos", en: "Report status & annexes" },
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

      {/* Cover / header */}
      <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Informe final (Data Pack web)", "Final report (web data pack)")}
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold text-slate-900">{clientName}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {t(locale, "Fecha:", "Date:")} {fmtDate(locale, new Date())}
              {engagement.org?.name ? <span className="text-slate-400"> · </span> : null}
              {engagement.org?.name ? <span className="text-slate-600">{engagement.org.name}</span> : null}
            </p>
          </div>

          <div className="no-print flex flex-wrap gap-2">
            <PrintButton label={t(locale, "Imprimir / PDF", "Print / PDF")} />
            <Link
              href={`/${locale}/wizard/${engagementId}/dashboard`}
              className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              {t(locale, "Volver al panel", "Back to dashboard")}
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{t(locale, "Resumen ejecutivo", "Executive summary")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
              {execSummaryBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{t(locale, "Índice (1–10)", "Index (1–10)")}</p>
              <Link
                href={hrefStep("step-9-reporte")}
                className="no-print text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                {t(locale, "Ver estado del informe →", "View report status →")}
              </Link>
            </div>

            <div className="mt-2 grid gap-1">
              {toc.map((x) => (
                <a
                  key={x.id}
                  href={`#${x.id}`}
                  className="no-print inline-flex items-center justify-between rounded-lg px-2 py-1 text-xs text-slate-700 hover:bg-white"
                >
                  <span>
                    {x.n}. {t(locale, x.es, x.en)}
                  </span>
                  <span className="text-slate-400">↘</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 1. Ficha del cliente */}
      <Section
        id="sec-01"
        n={1}
        title={t(locale, "Ficha del cliente", "Client sheet")}
        subtitle={t(locale, "Datos base del engagement.", "Base engagement data.")}
        editHref={hrefStep("step-0-engagement")}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-medium text-slate-600">{t(locale, "Cliente", "Client")}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{clientName}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-medium text-slate-600">{t(locale, "Proyecto", "Project")}</p>
            <p className="mt-1 text-sm text-slate-900">{(engagement.name && engagement.name.trim()) || "—"}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-medium text-slate-600">{t(locale, "Última actualización", "Last update")}</p>
            <p className="mt-1 text-sm text-slate-900">
              {fmtDate(locale, (engagement as any).updatedAt as Date | null)}
            </p>
          </div>
        </div>
      </Section>

      {/* 2. Data room */}
      <div className="mt-6">
        <Section
          id="sec-02"
          n={2}
          title={t(locale, "Data room", "Data room")}
          subtitle={t(
            locale,
            "Cobertura de documentación y evidencia.",
            "Documentation and evidence coverage."
          )}
          editHref={hrefStep("step-1-data-room")}
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Items", "Items")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{dataRoomItems}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Items con data", "Items with data")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{dataRoomWithData}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Cobertura", "Coverage")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{dataRoomItems > 0 ? `${drCoverage}%` : "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Archivos", "Files")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{dataRoomFiles}</p>
            </div>
          </div>

          {dataRoomItems === 0 ? (
            <p className="text-sm text-slate-500">{t(locale, "Aún no hay items en Data room.", "No Data room items yet.")}</p>
          ) : (
            <p className="text-sm text-slate-700">
              {t(
                locale,
                "Sugerencia: prioriza completar los items sin data antes de cerrar el informe.",
                "Tip: prioritize completing items without data before closing the report."
              )}
            </p>
          )}
        </Section>
      </div>

      {/* 3. Diagnóstico (3 subpasos) */}
      <div className="mt-6">
        <Section
          id="sec-03"
          n={3}
          title={t(locale, "Diagnóstico (3 subpasos)", "Diagnosis (3 substeps)")}
          subtitle={t(locale, "Encuesta, 360 y entrevistas.", "Survey, 360 and interviews.")}
          editHref={hrefStep("step-2-encuesta")}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Link
              href={hrefStep("step-2-encuesta")}
              className="no-print rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              {t(locale, "Encuesta", "Survey")} →
            </Link>
            <Link
              href={hrefStep("step-2-diagnostico-360")}
              className="no-print rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              {t(locale, "Diagnóstico 360", "360 diagnosis")} →
            </Link>
            <Link
              href={hrefStep("step-2b-entrevistas")}
              className="no-print rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              {t(locale, "Entrevistas", "Interviews")} →
            </Link>
          </div>

          <p className="text-sm text-slate-600">
            {t(
              locale,
              "Este informe no inventa hallazgos: si aún no están consolidados, se completan desde los 3 subpasos.",
              "This report does not fabricate findings: if not consolidated yet, complete them from the 3 substeps."
            )}
          </p>
        </Section>
      </div>

      {/* 4. Visión / Misión / Objetivos */}
      <div className="mt-6">
        <Section
          id="sec-04"
          n={4}
          title={t(locale, "Visión / Misión / Objetivos", "Vision / Mission / Goals")}
          subtitle={t(locale, "Definiciones estratégicas base.", "Base strategic definitions.")}
          editHref={hrefStep("step-3-estrategia")}
        >
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
        </Section>
      </div>

      {/* 5. FODA */}
      <div className="mt-6">
        <Section
          id="sec-05"
          n={5}
          title={t(locale, "FODA", "SWOT")}
          subtitle={t(locale, "Fortalezas, debilidades, oportunidades y amenazas.", "Strengths, weaknesses, opportunities and threats.")}
          editHref={hrefStep("step-4-foda")}
        >
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
                  {splitBullets(x.v).length ? (
                    splitBullets(x.v).slice(0, 12).map((b, i) => <li key={i}>{b}</li>)
                  ) : (
                    <li className="text-slate-500">—</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* 6. KPIs */}
      <div className="mt-6">
        <Section
          id="sec-06"
          n={6}
          title={t(locale, "KPIs (indicadores clave)", "KPIs")}
          subtitle={t(locale, "Cuadro de mando BSC (Balanced Scorecard).", "BSC scorecard.")}
          editHref={hrefStep("step-5-bsc")}
        >
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
                            const target =
                              k.targetText ||
                              (k.targetValue != null
                                ? `${fmtDec(k.targetValue)}${k.unit ? ` ${k.unit}` : ""}`
                                : "—");
                            const latest = v?.value != null ? `${fmtDec(v.value)}${k.unit ? ` ${k.unit}` : ""}` : "—";
                            const status = !v
                              ? "—"
                              : v.isGreen
                              ? t(locale, "Verde", "Green")
                              : t(locale, "Rojo", "Red");

                            return (
                              <tr
                                key={k.id}
                                className={
                                  idx % 2 === 0
                                    ? "border-b border-slate-100 bg-white"
                                    : "border-b border-slate-100 bg-slate-50"
                                }
                              >
                                <td className="px-3 py-2 text-[11px] text-slate-900">{label}</td>
                                <td className="px-3 py-2 text-[11px] text-slate-700">{target}</td>
                                <td className="px-3 py-2 text-[11px] text-slate-900">
                                  {latest}{" "}
                                  {v?.periodKey ? <span className="text-[10px] text-slate-500">({v.periodKey})</span> : null}
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
        </Section>
      </div>

      {/* 7. Iniciativas */}
      <div className="mt-6">
        <Section
          id="sec-07"
          n={7}
          title={t(locale, "Iniciativas", "Initiatives")}
          subtitle={t(locale, "Portafolio priorizado de iniciativas.", "Prioritized initiative portfolio.")}
          editHref={hrefStep("step-6-portafolio")}
        >
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
                    <th className="px-3 py-2 font-medium">{t(locale, "Esfuerzo", "Effort")}</th>
                    <th className="px-3 py-2 font-medium">{t(locale, "Owner", "Owner")}</th>
                    <th className="px-3 py-2 font-medium">{t(locale, "Estado", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {initiatives.slice(0, 10).map((i, idx) => (
                    <tr
                      key={i.id}
                      className={
                        idx % 2 === 0 ? "border-b border-slate-100 bg-white" : "border-b border-slate-100 bg-slate-50"
                      }
                    >
                      <td className="px-3 py-2 text-[11px] text-slate-900">{i.title}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">{perspectiveLabel(locale, i.perspective)}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">{i.impact ?? "—"}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">{i.effort ?? "—"}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">{i.owner ?? "—"}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-700">{i.status ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {/* 8. Roadmap */}
      <div className="mt-6">
        <Section
          id="sec-08"
          n={8}
          title={t(locale, "Roadmap", "Roadmap")}
          subtitle={t(locale, "Plan de implementación por semanas.", "Weekly implementation plan.")}
          editHref={hrefStep("step-7-roadmap")}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Semanas cargadas", "Weeks loaded")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{roadmapWeeks}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Sugerencia", "Tip")}</p>
              <p className="mt-1 text-sm text-slate-700">
                {t(locale, "Completa al menos 4 semanas para que el informe se vea sólido.", "Fill at least 4 weeks for a solid report.")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Acceso", "Access")}</p>
              <Link className="no-print mt-1 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-500" href={hrefStep("step-7-roadmap")}>
                {t(locale, "Ir al Roadmap →", "Go to Roadmap →")}
              </Link>
            </div>
          </div>
        </Section>
      </div>

      {/* 9. Gobernanza */}
      <div className="mt-6">
        <Section
          id="sec-09"
          n={9}
          title={t(locale, "Gobernanza", "Governance")}
          subtitle={t(locale, "Acciones, decisiones, riesgos y RACI.", "Actions, decisions, risks and RACI.")}
          editHref={hrefStep("step-8-gobernanza")}
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Acciones", "Actions")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{actions.length}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Decisiones", "Decisions")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{decisions}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "RACI", "RACI")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{raciRows}</p>
              <p className="mt-1 text-[11px] text-slate-600">Responsible / Accountable / Consulted / Informed</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Riesgos", "Risks")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{risksRaw.length}</p>
            </div>
          </div>

          {/* Próximas acciones */}
          <div className="mt-2">
            <p className="text-sm font-semibold text-slate-900">{t(locale, "Próximas acciones", "Next actions")}</p>

            {actions.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">{t(locale, "Aún no hay acciones.", "No actions yet.")}</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
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
                      <tr
                        key={a.id}
                        className={
                          idx % 2 === 0 ? "border-b border-slate-100 bg-white" : "border-b border-slate-100 bg-slate-50"
                        }
                      >
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
          </div>

          {/* Riesgos top */}
          <div className="mt-2">
            <p className="text-sm font-semibold text-slate-900">
              {t(locale, "Riesgos top y mitigaciones", "Top risks and mitigations")}
            </p>

            {topRisks.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">{t(locale, "Aún no hay riesgos.", "No risks yet.")}</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
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
                      <tr
                        key={r.id}
                        className={
                          idx % 2 === 0 ? "border-b border-slate-100 bg-white" : "border-b border-slate-100 bg-slate-50"
                        }
                      >
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
          </div>
        </Section>
      </div>

      {/* 10. Reporte y anexos */}
      <div className="mt-6">
        <Section
          id="sec-10"
          n={10}
          title={t(locale, "Reporte y anexos", "Report status & annexes")}
          subtitle={t(
            locale,
            "Estado del informe + anexos operativos.",
            "Report status + operational annexes."
          )}
          editHref={hrefStep("step-9-reporte")}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{t(locale, "Estado del informe", "Report status")}</p>
              <p className="mt-1 text-sm text-slate-600">
                {t(
                  locale,
                  "Revisa qué secciones están listas y cuáles siguen pendientes.",
                  "Check which sections are ready and which are still pending."
                )}
              </p>
            </div>

            <Link
              href={hrefStep("step-9-reporte")}
              className="no-print inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              {t(locale, "Abrir estado →", "Open status →")}
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{t(locale, "Unit economics", "Unit economics")}</p>
              <p className="mt-1 text-sm text-slate-600">
                {t(
                  locale,
                  "Filas registradas para unit economics y plan de cuenta.",
                  "Rows registered for unit economics and account plan."
                )}
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-600">Unit economics</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{unitEconomics}</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-600">{t(locale, "Plan de cuenta", "Account plan")}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{accountPlans}</p>
                </div>
              </div>

              <div className="no-print mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/${locale}/wizard/${engagementId}/tables/unit-economics`}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t(locale, "Ver unit economics", "View unit economics")}
                </Link>
                <Link
                  href={`/${locale}/wizard/${engagementId}/tables/account-plan`}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t(locale, "Ver plan de cuenta", "View account plan")}
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{t(locale, "Notas de entrega", "Delivery notes")}</p>
              <p className="mt-1 text-sm text-slate-600">
                {t(
                  locale,
                  "Este bloque queda listo para que luego guardemos notas reales (por ahora es solo visual).",
                  "This block will later store real notes (for now it’s visual only)."
                )}
              </p>

              <textarea
                rows={4}
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: Próximos pasos acordados, compromisos, fecha de revisión, etc.",
                  "e.g. Next steps agreed, commitments, review date, etc."
                )}
                disabled
              />
            </div>
          </div>
        </Section>
      </div>

      <div className="no-print mt-8 flex justify-end">
        <Link href={`/${locale}/wizard/${engagementId}/dashboard`} className="text-xs text-indigo-600 hover:text-indigo-500">
          ← {t(locale, "Volver al panel", "Back to dashboard")}
        </Link>
      </div>
    </main>
  );
}
