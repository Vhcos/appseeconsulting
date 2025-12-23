// app/[locale]/wizard/[engagementId]/check-in/summary/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BscPerspective } from "@prisma/client";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<{ period?: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function defaultMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function prevMonthKey(periodKey: string) {
  const [yStr, mStr] = periodKey.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = new Date(y, m - 2, 1);
  return defaultMonthKey(d);
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type InitiativeSnapshotItem = {
  initiativeId: string;
  progressPct: number | null;
  status: string | null;
  notes: string | null;
  blockers: string | null;
  evidenceUrls: string[];
};

type InitiativeSnapshot = {
  items: InitiativeSnapshotItem[];
};

function initiativeStepKey(periodKey: string) {
  return `checkin-initiatives:${periodKey}`;
}

function summaryStepKey(periodKey: string) {
  return `checkin-summary:${periodKey}`;
}

function toNum(x: unknown): number | null {
  if (x == null) return null;
  const n = Number(String(x));
  return Number.isFinite(n) ? n : null;
}

export default async function CheckInSummaryPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams: SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = await searchParams;

  const periodKey = sp.period && /^\d{4}-\d{2}$/.test(sp.period) ? sp.period : defaultMonthKey();
  const prevKey = prevMonthKey(periodKey);

  const [engagement, kpis] = await Promise.all([
    prisma.engagement.findUnique({ where: { id: engagementId }, select: { id: true } }),
    prisma.kpi.findMany({
      where: { engagementId },
      select: { id: true, nameEs: true, nameEn: true, perspective: true },
      orderBy: [{ perspective: "asc" }, { nameEs: "asc" }],
    }),
  ]);

  if (!engagement) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-slate-700">{t(locale, "No existe este engagement.", "Engagement not found.")}</p>
        <Link className="mt-4 inline-flex text-xs text-indigo-600 hover:text-indigo-500" href={`/${locale}/wizard`}>
          ← {t(locale, "Volver", "Back")}
        </Link>
      </main>
    );
  }

  const kpiIds = kpis.map((k) => k.id);

  const values = kpiIds.length
    ? await prisma.kpiValue.findMany({
        where: { kpiId: { in: kpiIds }, periodKey: { in: [periodKey, prevKey] } },
        select: { kpiId: true, periodKey: true, value: true, isGreen: true, note: true },
      })
    : [];

  const valMap = new Map<string, typeof values[number]>();
  for (const v of values) valMap.set(`${v.kpiId}:${v.periodKey}`, v);

  const [wpCur, wpPrev, wpSummary] = await Promise.all([
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: initiativeStepKey(periodKey) } },
      select: { notes: true },
    }),
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: initiativeStepKey(prevKey) } },
      select: { notes: true },
    }),
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: summaryStepKey(periodKey) } },
      select: { notes: true },
    }),
  ]);

  const curInit = safeJsonParse<InitiativeSnapshot>(wpCur?.notes, { items: [] });
  const prevInit = safeJsonParse<InitiativeSnapshot>(wpPrev?.notes, { items: [] });
  const prevById = new Map(prevInit.items.map((x) => [x.initiativeId, x]));

  const initChanges = curInit.items
    .map((x) => {
      const p = prevById.get(x.initiativeId);
      const dp =
        x.progressPct != null && p?.progressPct != null ? x.progressPct - p.progressPct : null;
      const statusChanged = (x.status ?? "") !== (p?.status ?? "");
      return { ...x, deltaPct: dp, statusChanged };
    })
    .filter((x) => x.deltaPct != null || x.statusChanged || (x.blockers ?? "").trim() !== "");

  const kpiDiffs = kpis
    .map((k) => {
      const cur = valMap.get(`${k.id}:${periodKey}`);
      const prev = valMap.get(`${k.id}:${prevKey}`);
      const curNum = toNum(cur?.value?.toString());
      const prevNum = toNum(prev?.value?.toString());
      const delta = curNum != null && prevNum != null ? curNum - prevNum : null;

      return {
        kpi: k,
        cur,
        prev,
        curNum,
        prevNum,
        delta,
      };
    })
    .filter((x) => x.cur || x.prev);

  const summarySaved = safeJsonParse<{ highlights?: string; nextActions?: string }>(wpSummary?.notes, {});
  const highlightsDefault = summarySaved.highlights ?? "";
  const nextActionsDefault = summarySaved.nextActions ?? "";

  async function saveSummary(formData: FormData) {
    "use server";

    const p = String(formData.get("periodKey") ?? "").trim();
    const safePeriod = /^\d{4}-\d{2}$/.test(p) ? p : defaultMonthKey();

    const highlights = String(formData.get("highlights") ?? "").trim();
    const nextActions = String(formData.get("nextActions") ?? "").trim();

    await prisma.wizardProgress.upsert({
      where: { engagementId_stepKey: { engagementId, stepKey: summaryStepKey(safePeriod) } },
      create: {
        engagementId,
        stepKey: summaryStepKey(safePeriod),
        completedAt: new Date(),
        notes: JSON.stringify({ highlights, nextActions }),
      },
      update: {
        completedAt: new Date(),
        notes: JSON.stringify({ highlights, nextActions }),
      },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/summary`);
    revalidatePath(`/${locale}/wizard/${engagementId}/dashboard`);
    redirect(`/${locale}/wizard/${engagementId}/check-in/summary?period=${safePeriod}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Resumen del período", "Period summary")}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">
              {periodKey} <span className="text-xs font-normal text-slate-500">({t(locale, "vs", "vs")} {prevKey})</span>
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              {t(locale, "Diff de KPIs + iniciativas (según snapshots).", "Diff for KPIs + initiatives (via snapshots).")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/wizard/${engagementId}/check-in?period=${periodKey}`}
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              ← {t(locale, "Volver", "Back")}
            </Link>
            <Link
              href={`/${locale}/wizard/${engagementId}/report`}
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              {t(locale, "Ver informe", "View report")}
            </Link>
          </div>
        </div>

        {/* KPI Diff */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">{t(locale, "KPIs (diff)", "KPIs (diff)")}</h2>
          {kpiDiffs.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">{t(locale, "Aún no hay valores KPI en estos períodos.", "No KPI values in these periods yet.")}</p>
          ) : (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {kpiDiffs.map((x) => (
                <div key={x.kpi.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="font-semibold text-slate-900">{t(locale, x.kpi.nameEs, x.kpi.nameEn)}</div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    {t(locale, "Prev:", "Prev:")} <span className="font-semibold">{x.prev?.value ? String(x.prev.value) : "—"}</span>{" "}
                    · {t(locale, "Actual:", "Current:")}{" "}
                    <span className="font-semibold">{x.cur?.value ? String(x.cur.value) : "—"}</span>
                    {x.delta != null ? ` · Δ ${x.delta}` : ""}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    {x.cur ? (
                      x.cur.isGreen ? (
                        <span className="font-semibold text-emerald-700">{t(locale, "Green", "Green")}</span>
                      ) : (
                        <span className="font-semibold text-amber-700">{t(locale, "No green", "Not green")}</span>
                      )
                    ) : (
                      <span className="text-slate-500">{t(locale, "Sin dato actual", "No current data")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Initiatives Diff */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Iniciativas (diff)", "Initiatives (diff)")}</h2>
          {initChanges.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              {t(locale, "Sin cambios detectados (o no hay snapshot del período).", "No changes detected (or missing period snapshot).")}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {initChanges.slice(0, 12).map((x) => (
                <div key={x.initiativeId} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900">{x.initiativeId}</div>
                    <div className="text-[11px] text-slate-600">
                      {x.progressPct != null ? `${t(locale, "Progreso", "Progress")}: ${x.progressPct}%` : ""}
                      {x.deltaPct != null ? ` · Δ ${x.deltaPct}%` : ""}
                      {x.status ? ` · ${x.status}` : ""}
                    </div>
                  </div>
                  {x.notes ? <div className="mt-1 text-[11px] text-slate-600">{x.notes}</div> : null}
                  {x.blockers ? (
                    <div className="mt-1 text-[11px] text-amber-700">
                      {t(locale, "Bloqueos:", "Blockers:")} {x.blockers}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/${locale}/wizard/${engagementId}/check-in/initiatives?period=${periodKey}`}
              className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              {t(locale, "Actualizar iniciativas", "Update initiatives")}
            </Link>
            <Link
              href={`/${locale}/wizard/${engagementId}/check-in/kpis?period=${periodKey}`}
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              {t(locale, "Cargar KPIs", "Log KPIs")}
            </Link>
          </div>
        </div>

        {/* Executive summary saved */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Resumen ejecutivo (guardar)", "Executive summary (save)")}</h2>
          <form action={saveSummary} className="mt-4 space-y-3">
            <input type="hidden" name="periodKey" value={periodKey} />
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">{t(locale, "Highlights", "Highlights")}</label>
              <textarea
                name="highlights"
                rows={4}
                defaultValue={highlightsDefault}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder={t(locale, "3–6 bullets: qué pasó, qué cambió, qué preocupa.", "3–6 bullets: what happened, what changed, what worries us.")}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">{t(locale, "Próximas acciones", "Next actions")}</label>
              <textarea
                name="nextActions"
                rows={3}
                defaultValue={nextActionsDefault}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder={t(locale, "5–10 acciones próximas.", "5–10 next actions.")}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                {t(locale, "Guardar resumen", "Save summary")}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-[11px] text-slate-500">
          {t(
            locale,
            "Nota: diffs de riesgos/acciones “por período” quedan limitados mientras Risk y ActionItem no tengan timestamps. Se puede mejorar con una migración mínima (createdAt/updatedAt) sin tocar datos.",
            "Note: risk/action diffs by period are limited while Risk and ActionItem lack timestamps. We can improve with a minimal migration (createdAt/updatedAt) without data loss.",
          )}
        </p>
      </section>
    </main>
  );
}
