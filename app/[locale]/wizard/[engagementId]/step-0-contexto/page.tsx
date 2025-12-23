/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WizardStepsNav from "@/components/see/WizardStepsNav";
import SurveyAveragesChart from "@/components/see/SurveyAveragesChart";
import { QuestionSetKind, QuestionType } from "@prisma/client";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
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
  if (typeof n === "string" && n.trim() !== "" && !Number.isNaN(Number(n))) return Number(n);
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
  const cleaned = Array.from(new Set(areas.map((a) => String(a).trim()).filter(Boolean)));

  return cleaned.length ? cleaned : DEFAULT_AREAS_ES;
}

async function getSurveyB1Averages(engagementId: string) {
  // 1) Buscar QuestionSet SURVEY
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

  // 2) Traer solo respuestas de esas preguntas
  const answers = await prisma.answer.findMany({
    where: { engagementId, questionId: { in: questionIds } },
    select: { questionId: true, valueJson: true },
  });

  // 3) Agregación: overall + por area
  const overall = new Map<string, { sum: number; n: number }>();
  const byArea = new Map<string, Map<string, { sum: number; n: number }>>(); // area -> questionId -> agg
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
      const m = byArea.get(area) ?? new Map<string, { sum: number; n: number }>();
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

async function getSummary(engagementId: string) {
  const [engagement, accountPlans, unitEconomics, initiatives, risks, areas, b1] =
    await Promise.all([
      prisma.engagement.findUnique({
        where: { id: engagementId },
      }),
      prisma.accountPlanRow.count({ where: { engagementId } }),
      prisma.unitEconomicsRow.count({ where: { engagementId } }),
      prisma.initiative.count({ where: { engagementId } }),
      prisma.risk.count({ where: { engagementId } }),
      getSurveyAreas(engagementId),
      getSurveyB1Averages(engagementId),
    ]);

  // catálogo final de áreas: primero las configuradas, luego las vistas en respuestas
  const mergedAreas = Array.from(
    new Set([...(areas ?? []), ...(b1.areasFromAnswers ?? [])].map((a) => String(a).trim()).filter(Boolean)),
  );

  return {
    engagement,
    accountPlans,
    unitEconomics,
    initiatives,
    risks,
    surveyAreas: mergedAreas,
    surveyB1Rows: b1.rows,
  };
}

export default async function Step0ContextPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const summary = await getSummary(engagementId);

  const e = summary.engagement;

  const clientName =
    (e?.contextCompanyName && e.contextCompanyName.trim()) ||
    (e?.name && e.name.trim()) ||
    t(locale, "Cliente sin nombre", "Client without name");

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <WizardStepsNav
        locale={locale}
        engagementId={engagementId}
        currentStep="step-0-contexto"
      />

      {/* Ficha rápida del cliente (usa los campos del Step-0-Engagement) */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Ficha del cliente", "Client overview")}
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              {clientName}
            </h1>

            <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-slate-700 md:grid-cols-2">
              {e?.contextIndustry && (
                <div className="flex gap-1">
                  <dt className="font-semibold">
                    {t(locale, "Industria:", "Industry:")}
                  </dt>
                  <dd className="flex-1">{e.contextIndustry}</dd>
                </div>
              )}

              {e?.contextGoal12m && (
                <div className="flex gap-1">
                  <dt className="font-semibold">
                    {t(locale, "Meta 12 meses:", "12-month goal:")}
                  </dt>
                  <dd className="flex-1">{e.contextGoal12m}</dd>
                </div>
              )}

              {e?.contextGoal36m && (
                <div className="flex gap-1">
                  <dt className="font-semibold">
                    {t(locale, "Meta 36 meses:", "36-month goal:")}
                  </dt>
                  <dd className="flex-1">{e.contextGoal36m}</dd>
                </div>
              )}

              {e?.contextSponsor && (
                <div className="flex gap-1">
                  <dt className="font-semibold">
                    {t(locale, "Sponsor:", "Sponsor:")}
                  </dt>
                  <dd className="flex-1">{e.contextSponsor}</dd>
                </div>
              )}

              {e?.contextCoreTeam && (
                <div className="flex gap-1 md:col-span-2">
                  <dt className="font-semibold">
                    {t(locale, "Equipo clave:", "Core team:")}
                  </dt>
                  <dd className="flex-1">{e.contextCoreTeam}</dd>
                </div>
              )}
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

        {/* Bloques de avance de tablas clave */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Plan de cuenta", "Account plan")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {summary.accountPlans}
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
              {summary.unitEconomics}
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
              {summary.initiatives}{" "}
              <span className="text-xs font-normal text-slate-500">
                {t(locale, "inits.", "inits.")}
              </span>
            </p>
            <p className="text-xs text-slate-900">
              {summary.risks}{" "}
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

      {/* Gráfico encuesta (B1.*) filtrable por área */}
      <div className="mt-6">
        <SurveyAveragesChart
          locale={locale}
          areas={summary.surveyAreas}
          rows={summary.surveyB1Rows}
        />
      </div>
    </main>
  );
}
