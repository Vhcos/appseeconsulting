//app/%5Blocale%5D/wizard/%5BengagementId%5D/dashboard/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SurveyAveragesChart from "@/components/see/SurveyAveragesChart";
import { BscPerspective, QuestionSetKind, QuestionType } from "@prisma/client";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function notEmpty(s: unknown) {
  return typeof s === "string" && s.trim().length > 0;
}

function truncate(s: string, n = 160) {
  const clean = s.trim();
  if (clean.length <= n) return clean;
  return `${clean.slice(0, n).trim()}…`;
}

function splitBullets(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split(/\r?\n|•/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 6);
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
  return new Intl.DateTimeFormat(loc, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function fmtDec(v: any) {
  if (v == null) return "—";
  const s =
    typeof v === "object" && typeof v.toString === "function"
      ? v.toString()
      : String(v);
  return s;
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function pickNumberFromValueJson(v: unknown): number | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as any;
  const n = obj?.value;
  if (typeof n === "number") return n;
  if (typeof n === "string" && n.trim() !== "" && !Number.isNaN(Number(n)))
    return Number(n);
  return null;
}

function pickStringFromValueJson(v: unknown, key: string): string | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as any;
  const s = obj?.[key];
  return typeof s === "string" && s.trim() !== "" ? s.trim() : null;
}

const DEFAULT_AREAS_ES = [
  "Directorio",
  "Gerencia",
  "Operaciones",
  "Comercial",
  "Informática",
  "Administración",
  "Logística",
];

async function getSurveyAreas(engagementId: string) {
  const wp = await prisma.wizardProgress.findUnique({
    where: { engagementId_stepKey: { engagementId, stepKey: "survey-areas" } },
    select: { notes: true },
  });

  const parsed = safeJsonParse<{ areas?: string[] }>(wp?.notes, {});
  const areas = Array.isArray(parsed.areas) ? parsed.areas : [];
  const cleaned = Array.from(
    new Set(areas.map((a) => String(a).trim()).filter(Boolean)),
  );

  return cleaned.length ? cleaned : DEFAULT_AREAS_ES;
}

async function getSurveyB1Averages(engagementId: string) {
  const qs = await prisma.questionSet.findFirst({
    where: { engagementId, kind: QuestionSetKind.SURVEY },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  const questions = (qs?.questions ?? []).filter(
    (q) => q.type === QuestionType.SCALE_1_5 && q.key.startsWith("B1."),
  );

  if (!questions.length) {
    return { rows: [] as any[], areasFromAnswers: [] as string[] };
  }

  const questionIds = questions.map((q) => q.id);

  const answers = await prisma.answer.findMany({
    where: { engagementId, questionId: { in: questionIds } },
    select: { questionId: true, valueJson: true },
  });

  const overall = new Map<string, { sum: number; n: number }>();
  const byArea = new Map<string, Map<string, { sum: number; n: number }>>();
  const areasFromAnswersSet = new Set<string>();

  for (const a of answers) {
    const n = pickNumberFromValueJson(a.valueJson);
    if (n == null) continue;

    const agg = overall.get(a.questionId) ?? { sum: 0, n: 0 };
    agg.sum += n;
    agg.n += 1;
    overall.set(a.questionId, agg);

    const area = pickStringFromValueJson(a.valueJson, "area");
    if (area) {
      areasFromAnswersSet.add(area);
      const m =
        byArea.get(area) ?? new Map<string, { sum: number; n: number }>();
      const a2 = m.get(a.questionId) ?? { sum: 0, n: 0 };
      a2.sum += n;
      a2.n += 1;
      m.set(a.questionId, a2);
      byArea.set(area, m);
    }
  }

  const rows = questions.map((q) => {
    const o = overall.get(q.id);
    const avgOverall = o && o.n > 0 ? o.sum / o.n : null;

    const perArea: Record<string, { avg: number | null; n: number }> = {};
    for (const [area, m] of byArea.entries()) {
      const a = m.get(q.id);
      perArea[area] = {
        avg: a && a.n > 0 ? a.sum / a.n : null,
        n: a?.n ?? 0,
      };
    }

    return {
      key: q.key,
      prompt: q.promptEs,
      avgOverall,
      nOverall: o?.n ?? 0,
      byArea: perArea,
    };
  });

  return { rows, areasFromAnswers: Array.from(areasFromAnswersSet) };
}

export default async function DashboardPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
      contextCompanyName: true,

      // Campos de "Ficha" (step-0-engagement)
      contextIndustry: true,
      contextGoal12m: true,
      contextGoal36m: true,
      contextSponsor: true,
      contextCoreTeam: true,

      company: { select: { name: true } },

      // Step-3 (fuente de verdad)
      strategyVision: true,
      strategyMission: true,
      strategyObjectives: true,

      // Step-4 (fuente de verdad)
      swotStrengths: true,
      swotWeaknesses: true,
      swotOpportunities: true,
      swotThreats: true,
    },
  });

  if (!engagement) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
        <p className="text-lg font-medium text-slate-900">
          {t(locale, "No existe este engagement.", "Engagement not found.")}
        </p>
        <Link
          href={`/${locale}/wizard`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Volver", "Back")}
        </Link>
      </main>
    );
  }

  const clientName =
    (engagement.contextCompanyName && engagement.contextCompanyName.trim()) ||
    (engagement.company?.name && engagement.company.name.trim()) ||
    (engagement.name && engagement.name.trim()) ||
    t(locale, "Cliente sin nombre", "Unnamed client");

  const [
    dataRoomItemsCount,
    dataRoomWithDataCount,
    dataRoomFilesCount,
    kpis,
    initiativesCount,
    risks,
    actionsCount,
    accountPlansCount,
    unitEconomicsCount,
    surveyAreasCfg,
    surveyB1,
  ] = await Promise.all([
    prisma.dataRoomItem.count({ where: { engagementId } }),
    prisma.dataRoomItem.count({ where: { engagementId, hasData: true } } as any),
    prisma.dataRoomFile.count({ where: { engagementId } }),

    prisma.kpi.findMany({
      where: { engagementId },
      select: {
        id: true,
        nameEs: true,
        nameEn: true,
        perspective: true,
        targetValue: true,
        targetText: true,
        unit: true,
      },
      orderBy: [{ perspective: "asc" }, { nameEs: "asc" }],
    }),

    prisma.initiative.count({ where: { engagementId } }),

    prisma.risk.findMany({
      where: { engagementId },
      take: 60,
      select: {
        id: true,
        risk: true,
        probability: true,
        impact: true,
        mitigation: true,
        owner: true,
        reviewDate: true,
      },
    }),

    prisma.actionItem.count({ where: { engagementId } }),

    prisma.accountPlanRow.count({ where: { engagementId } }),
    prisma.unitEconomicsRow.count({ where: { engagementId } }),

    getSurveyAreas(engagementId),
    getSurveyB1Averages(engagementId),
  ]);

  const mergedSurveyAreas = Array.from(
    new Set(
      [...(surveyAreasCfg ?? []), ...(surveyB1.areasFromAnswers ?? [])]
        .map((a) => String(a).trim())
        .filter(Boolean),
    ),
  );

  const kpiIds = kpis.map((k) => k.id);

  const latestValues = kpiIds.length
    ? await prisma.kpiValue.findMany({
        where: { kpiId: { in: kpiIds } },
        orderBy: { periodEnd: "desc" },
        distinct: ["kpiId"],
        select: {
          kpiId: true,
          value: true,
          isGreen: true,
          periodKey: true,
          periodEnd: true,
        },
      })
    : [];

  const latestByKpi = new Map(latestValues.map((v) => [v.kpiId, v]));

  const kpisRed = kpis.filter((k) => {
    const v = latestByKpi.get(k.id);
    return v && v.isGreen === false;
  });
  const kpisMissing = kpis.filter((k) => !latestByKpi.get(k.id));
  const kpisKey = [...kpisRed, ...kpisMissing].slice(0, 6);

  const topRisks = risks
    .map((r) => ({ ...r, score: (r.probability ?? 0) * (r.impact ?? 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const topInitiatives = await prisma.initiative.findMany({
    where: { engagementId },
    orderBy: [{ impact: "desc" }, { effort: "asc" }, { title: "asc" }],
    take: 8,
    select: {
      id: true,
      title: true,
      perspective: true,
      status: true,
      owner: true,
      impact: true,
    },
  });

  const upcomingActions = await prisma.actionItem.findMany({
    where: { engagementId },
    orderBy: [{ dueDate: "asc" }, { id: "desc" }],
    take: 8,
    select: {
      id: true,
      task: true,
      owner: true,
      dueDate: true,
      status: true,
      blocker: true,
    },
  });

  const strategyReady =
    notEmpty((engagement as any).strategyVision) ||
    notEmpty((engagement as any).strategyMission) ||
    notEmpty((engagement as any).strategyObjectives);

  const swotReady =
    notEmpty((engagement as any).swotStrengths) ||
    notEmpty((engagement as any).swotWeaknesses) ||
    notEmpty((engagement as any).swotOpportunities) ||
    notEmpty((engagement as any).swotThreats);

  const steps = [
    {
      es: "Ficha",
      en: "Client sheet",
      ok: true,
      href: `/${locale}/wizard/${engagementId}/step-0-engagement`,
    },
    {
      es: "Data Room",
      en: "Data Room",
      ok: dataRoomItemsCount > 0,
      href: `/${locale}/wizard/${engagementId}/step-1-data-room`,
    },
    {
      es: "Estrategia",
      en: "Strategy",
      ok: strategyReady,
      href: `/${locale}/wizard/${engagementId}/step-3-estrategia`,
    },
    {
      es: "FODA",
      en: "SWOT",
      ok: swotReady,
      href: `/${locale}/wizard/${engagementId}/step-4-foda`,
    },
    {
      es: "KPIs (BSC)",
      en: "KPIs (BSC)",
      ok: kpis.length > 0,
      href: `/${locale}/wizard/${engagementId}/step-5-bsc`,
    },
    {
      es: "Iniciativas",
      en: "Initiatives",
      ok: initiativesCount > 0,
      href: `/${locale}/wizard/${engagementId}/step-6-portafolio`,
    },
    {
      es: "Acciones",
      en: "Actions",
      ok: actionsCount > 0,
      href: `/${locale}/wizard/${engagementId}/step-8-gobernanza`,
    },
    {
      es: "Informe",
      en: "Report",
      ok: true,
      href: `/${locale}/wizard/${engagementId}/report`,
    },
    {
      es: "Check-in",
      en: "Check-in",
      ok: true,
      href: `/${locale}/wizard/${engagementId}/check-in`,
    },
  ];

  const swS = (engagement as any).swotStrengths as string | null;
  const swW = (engagement as any).swotWeaknesses as string | null;
  const swO = (engagement as any).swotOpportunities as string | null;
  const swT = (engagement as any).swotThreats as string | null;

  const sV = (engagement as any).strategyVision as string | null;
  const sM = (engagement as any).strategyMission as string | null;
  const sO = (engagement as any).strategyObjectives as string | null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-0">
      <header className="mb-6 mt-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Panel de control", "Dashboard")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {clientName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(locale, "Última actualización:", "Last update:")}{" "}
            {fmtDate(locale, engagement.updatedAt)} ·{" "}
            {t(locale, "Estado:", "Status:")} {String(engagement.status)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/wizard/${engagementId}/report`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(locale, "Informe", "Report")}
          </Link>
          <Link
            href={`/${locale}/wizard/${engagementId}/check-in`}
            className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {t(locale, "Check-in", "Check-in")}
          </Link>
          <Link
            href={`/${locale}/wizard/${engagementId}`}
            className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {t(locale, "Ver wizard", "Open wizard")}
          </Link>
        </div>
      </header>

      {/* Ficha rápida + bloques (antes era step-0-contexto) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Ficha del cliente", "Client overview")}
            </p>
            <p className="text-lg font-semibold text-slate-900">{clientName}</p>

            <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-slate-700 md:grid-cols-2">
              {(engagement as any)?.contextIndustry ? (
                <div className="flex gap-1">
                  <dt className="font-semibold">
                    {t(locale, "Industria:", "Industry:")}
                  </dt>
                  <dd className="flex-1">{(engagement as any).contextIndustry}</dd>
                </div>
              ) : null}

              {(engagement as any)?.contextGoal12m ? (
                <div className="flex gap-1">
                  <dt className="font-semibold">
                    {t(locale, "Meta 12 meses:", "12-month goal:")}
                  </dt>
                  <dd className="flex-1">{(engagement as any).contextGoal12m}</dd>
                </div>
              ) : null}

              {(engagement as any)?.contextGoal36m ? (
                <div className="flex gap-1">
                  <dt className="font-semibold">
                    {t(locale, "Meta 36 meses:", "36-month goal:")}
                  </dt>
                  <dd className="flex-1">{(engagement as any).contextGoal36m}</dd>
                </div>
              ) : null}

              {(engagement as any)?.contextSponsor ? (
                <div className="flex gap-1">
                  <dt className="font-semibold">
                    {t(locale, "Sponsor:", "Sponsor:")}
                  </dt>
                  <dd className="flex-1">{(engagement as any).contextSponsor}</dd>
                </div>
              ) : null}

              {(engagement as any)?.contextCoreTeam ? (
                <div className="flex gap-1 md:col-span-2">
                  <dt className="font-semibold">
                    {t(locale, "Equipo clave:", "Core team:")}
                  </dt>
                  <dd className="flex-1">{(engagement as any).contextCoreTeam}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-800">
              {t(locale, "Panel de control", "Control panel")}
            </p>
            <p className="mt-1">
              {t(
                locale,
                "Desde aquí ves cuánto avance hay en las tablas clave antes de entrar al diagnóstico 360°.",
                "From here you can see how much progress there is in the key tables before moving to the 360° diagnosis.",
              )}
            </p>
            <Link
              href={`/${locale}/wizard/${engagementId}/step-0-engagement`}
              className="mt-2 inline-flex text-[11px] font-semibold text-indigo-600 hover:text-indigo-500"
            >
              {t(locale, "Editar ficha del cliente", "Edit client sheet")}
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Plan de cuenta", "Account plan")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {accountPlansCount}
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              {t(
                locale,
                "filas cargadas en la tabla de contratos clave.",
                "rows loaded in the key contracts table.",
              )}
            </p>
            <Link
              href={`/${locale}/wizard/${engagementId}/tables/account-plan`}
              className="mt-3 inline-flex text-[11px] font-semibold text-indigo-600 hover:text-indigo-500"
            >
              {t(locale, "Ver tabla", "View table")}
            </Link>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Unit economics", "Unit economics")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {unitEconomicsCount}
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              {t(
                locale,
                "registros con precios, costos y márgenes por contrato o faena.",
                "records with prices, costs and margins per contract/site.",
              )}
            </p>
            <Link
              href={`/${locale}/wizard/${engagementId}/tables/unit-economics`}
              className="mt-3 inline-flex text-[11px] font-semibold text-indigo-600 hover:text-indigo-500"
            >
              {t(locale, "Ver tabla", "View table")}
            </Link>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Iniciativas y riesgos", "Initiatives & risks")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {initiativesCount}{" "}
              <span className="text-xs font-normal text-slate-500">
                {t(locale, "inits.", "inits.")}
              </span>
            </p>
            <p className="text-xs text-slate-900">
              {risks.length}{" "}
              <span className="text-xs font-normal text-slate-500">
                {t(locale, "riesgos", "risks")}
              </span>
            </p>
            <div className="mt-3 flex flex-col gap-1">
              <Link
                href={`/${locale}/wizard/${engagementId}/tables/initiatives`}
                className="inline-flex text-[11px] font-semibold text-indigo-600 hover:text-indigo-500"
              >
                {t(locale, "Ver iniciativas", "View initiatives")}
              </Link>
              <Link
                href={`/${locale}/wizard/${engagementId}/tables/risks`}
                className="inline-flex text-[11px] font-semibold text-indigo-600 hover:text-indigo-500"
              >
                {t(locale, "Ver riesgos", "View risks")}
              </Link>
            </div>
          </article>
        </div>

        <div className="mt-4 flex justify-end">
          <Link
            href={`/${locale}/wizard/${engagementId}/step-1-data-room`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            {t(locale, "Ir al Data Room →", "Go to Data Room →")}
          </Link>
        </div>
      </section>

      {/* Encuesta B1 (antes era step-0-contexto) */}
      <div className="mt-6">
        <SurveyAveragesChart
          locale={locale}
          areas={mergedSurveyAreas}
          rows={surveyB1.rows}
        />
      </div>

      {/* Dashboard original */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "Estado del proceso", "Process status")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {steps.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                    s.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800",
                  ].join(" ")}
                >
                  <span className="text-[10px] font-semibold">
                    {s.ok ? "OK" : "…"}
                  </span>
                  <span>{t(locale, s.es, s.en)}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  {t(locale, "Estrategia", "Strategy")}
                </h2>
                <Link
                  href={`/${locale}/wizard/${engagementId}/step-3-estrategia`}
                  className="text-[11px] text-indigo-600 hover:text-indigo-500"
                >
                  {t(locale, "Editar", "Edit")}
                </Link>
              </div>

              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {t(locale, "Visión", "Vision")}
                  </p>
                  <p className="mt-1 text-slate-800">
                    {notEmpty(sV) ? truncate(sV!, 140) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {t(locale, "Misión", "Mission")}
                  </p>
                  <p className="mt-1 text-slate-800">
                    {notEmpty(sM) ? truncate(sM!, 140) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {t(locale, "Objetivos", "Goals")}
                  </p>
                  <p className="mt-1 text-slate-800">
                    {notEmpty(sO) ? truncate(sO!, 160) : "—"}
                  </p>
                </div>
              </div>

              <Link
                href={`/${locale}/wizard/${engagementId}/tables/strategy`}
                className="mt-4 inline-block text-[11px] text-indigo-600 hover:text-indigo-500"
              >
                {t(
                  locale,
                  "Ayuda para desarrollar tu estrategia",
                  "Help to build your strategy",
                )}
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  {t(locale, "FODA", "SWOT")}
                </h2>
                <Link
                  href={`/${locale}/wizard/${engagementId}/step-4-foda`}
                  className="text-[11px] text-indigo-600 hover:text-indigo-500"
                >
                  {t(locale, "Editar", "Edit")}
                </Link>
              </div>

              <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                {[
                  { k: "S", es: "Fortalezas", en: "Strengths", v: swS },
                  { k: "W", es: "Debilidades", en: "Weaknesses", v: swW },
                  { k: "O", es: "Oportunidades", en: "Opportunities", v: swO },
                  { k: "T", es: "Amenazas", en: "Threats", v: swT },
                ].map((x) => (
                  <div
                    key={x.k}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <p className="text-[11px] font-medium text-slate-700">
                      {t(locale, x.es, x.en)}
                    </p>
                    <ul className="mt-2 list-disc pl-5 text-[12px] text-slate-800">
                      {splitBullets(x.v).length ? (
                        splitBullets(x.v).map((b, i) => <li key={i}>{b}</li>)
                      ) : (
                        <li className="text-slate-500">—</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>

              <Link
                href={`/${locale}/wizard/${engagementId}/tables/swot`}
                className="mt-4 inline-block text-[11px] text-indigo-600 hover:text-indigo-500"
              >
                {t(
                  locale,
                  "Ayuda para desarrollar tu FODA",
                  "Help to build your SWOT",
                )}
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {t(locale, "KPIs clave", "Key KPIs")}
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  {t(locale, "Rojos o sin medición.", "Red or missing measurement.")}
                </p>
              </div>
              <Link
                href={`/${locale}/wizard/${engagementId}/tables/kpis`}
                className="text-[11px] text-indigo-600 hover:text-indigo-500"
              >
                {t(locale, "Abrir KPIs", "Open KPIs")}
              </Link>
            </div>

            {kpis.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                {t(locale, "Aún no hay KPIs.", "No KPIs yet.")}
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-xs text-slate-800">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 font-medium">
                        {t(locale, "KPI", "KPI")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t(locale, "Perspectiva", "Perspective")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t(locale, "Target", "Target")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t(locale, "Último", "Latest")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t(locale, "Estado", "Status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpisKey.map((k, idx) => {
                      const v = latestByKpi.get(k.id);
                      const label = locale === "en" ? k.nameEn : k.nameEs;
                      const target =
                        k.targetText ||
                        (k.targetValue != null
                          ? `${fmtDec(k.targetValue)}${k.unit ? ` ${k.unit}` : ""}`
                          : "—");
                      const latest =
                        v?.value != null
                          ? `${fmtDec(v.value)}${k.unit ? ` ${k.unit}` : ""}`
                          : "—";

                      const status = !v
                        ? {
                            es: "Sin dato",
                            en: "No data",
                            cls: "bg-slate-100 text-slate-700 border-slate-200",
                          }
                        : v.isGreen
                          ? {
                              es: "Verde",
                              en: "Green",
                              cls: "bg-emerald-50 text-emerald-800 border-emerald-100",
                            }
                          : {
                              es: "Rojo",
                              en: "Red",
                              cls: "bg-rose-50 text-rose-800 border-rose-100",
                            };

                      return (
                        <tr
                          key={k.id}
                          className={
                            idx % 2 === 0
                              ? "border-b border-slate-100 bg-white"
                              : "border-b border-slate-100 bg-slate-50"
                          }
                        >
                          <td className="px-3 py-2 text-[11px] text-slate-900">
                            {label}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-700">
                            {perspectiveLabel(locale, k.perspective)}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-700">
                            {target}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-900">
                            {latest}
                            {v?.periodKey ? (
                              <span className="ml-2 text-[10px] text-slate-500">
                                ({v.periodKey})
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${status.cls}`}
                            >
                              {t(locale, status.es, status.en)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {t(locale, "Top riesgos", "Top risks")}
              </h2>
              <Link
                href={`/${locale}/wizard/${engagementId}/tables/risks`}
                className="text-[11px] text-indigo-600 hover:text-indigo-500"
              >
                {t(locale, "Abrir", "Open")}
              </Link>
            </div>

            {topRisks.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                {t(locale, "Aún no hay riesgos.", "No risks yet.")}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {topRisks.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-900">
                        {truncate(r.risk, 120)}
                      </p>
                      <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700">
                        {t(locale, "Score", "Score")}: {r.score}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-700">
                      {t(locale, "Prob/Imp:", "Prob/Imp:")}{" "}
                      {r.probability ?? "—"} / {r.impact ?? "—"} ·{" "}
                      {t(locale, "Owner:", "Owner:")} {r.owner ?? "—"}
                    </p>
                    {r.mitigation ? (
                      <p className="mt-2 text-[11px] text-slate-700">
                        <span className="font-medium">
                          {t(locale, "Mitigación:", "Mitigation:")}
                        </span>{" "}
                        {truncate(r.mitigation, 140)}
                      </p>
                    ) : null}
                    {r.reviewDate ? (
                      <p className="mt-1 text-[10px] text-slate-500">
                        {t(locale, "Revisión:", "Review:")}{" "}
                        {fmtDate(locale, r.reviewDate)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {t(locale, "Iniciativas clave", "Key initiatives")}
              </h2>
              <Link
                href={`/${locale}/wizard/${engagementId}/tables/initiatives`}
                className="text-[11px] text-indigo-600 hover:text-indigo-500"
              >
                {t(locale, "Abrir", "Open")}
              </Link>
            </div>

            {initiativesCount === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                {t(
                  locale,
                  "Aún no hay iniciativas.",
                  "No initiatives yet.",
                )}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {topInitiatives.map((i) => (
                  <div
                    key={i.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <p className="text-xs font-medium text-slate-900">
                      {truncate(i.title, 120)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-700">
                      {perspectiveLabel(locale, i.perspective)} ·{" "}
                      {t(locale, "Impacto", "Impact")}: {i.impact ?? "—"} ·{" "}
                      {t(locale, "Owner", "Owner")}: {i.owner ?? "—"}
                    </p>
                    {i.status ? (
                      <p className="mt-1 text-[11px] text-slate-600">
                        {t(locale, "Estado:", "Status:")} {i.status}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {t(locale, "Próximas acciones", "Next actions")}
              </h2>
              <Link
                href={`/${locale}/wizard/${engagementId}/tables/actions`}
                className="text-[11px] text-indigo-600 hover:text-indigo-500"
              >
                {t(locale, "Abrir", "Open")}
              </Link>
            </div>

            {actionsCount === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                {t(locale, "Aún no hay acciones.", "No actions yet.")}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {upcomingActions.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <p className="text-xs font-medium text-slate-900">
                      {truncate(a.task, 120)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-700">
                      {t(locale, "Due:", "Due:")} {fmtDate(locale, a.dueDate)} ·{" "}
                      {t(locale, "Owner:", "Owner:")} {a.owner ?? "—"}
                    </p>
                    {a.blocker ? (
                      <p className="mt-1 text-[11px] text-rose-700">
                        {t(locale, "Bloqueo:", "Blocker:")}{" "}
                        {truncate(a.blocker, 120)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {t(locale, "Data Room", "Data Room")}
              </h2>
              <Link
                href={`/${locale}/wizard/${engagementId}/step-1-data-room`}
                className="text-[11px] text-indigo-600 hover:text-indigo-500"
              >
                {t(locale, "Abrir", "Open")}
              </Link>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-medium text-slate-600">
                  {t(locale, "Items", "Items")}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {dataRoomItemsCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  {t(locale, "Con data:", "With data:")} {dataRoomWithDataCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-medium text-slate-600">
                  {t(locale, "Archivos", "Files")}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {dataRoomFilesCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  {dataRoomItemsCount > 0
                    ? `${t(locale, "Cobertura:", "Coverage:")} ${Math.round(
                        (dataRoomWithDataCount / dataRoomItemsCount) * 100,
                      )}%`
                    : t(locale, "Cobertura: —", "Coverage: —")}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
