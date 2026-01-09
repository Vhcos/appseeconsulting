import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckInNav from "@/components/see/CheckInNav";
import { BscPerspective, KpiDirection, KpiBasis } from "@prisma/client";
import { buildMonthKeysBack, computeEvaluatedValue } from "@/lib/see/kpiEval";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<{ period?: string; accountId?: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function sanitizeSegment(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.includes("/") || s.includes("\\") || s.includes("..")) return null;
  if (s.length > 120) return null;
  return s;
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

function initiativeStepKey(periodKey: string, scopeKey: string) {
  return `checkin-initiatives:${scopeKey}:${periodKey}`;
}

function summaryStepKey(periodKey: string, scopeKey: string) {
  return `checkin-summary:${scopeKey}:${periodKey}`;
}

function toNum(x: unknown): number | null {
  if (x == null) return null;
  const n = Number(String(x));
  return Number.isFinite(n) ? n : null;
}

function computeIsOk(direction: KpiDirection, evaluated: number | null, target: number | null) {
  if (evaluated == null) return false;
  if (target == null) return true;
  return direction === "HIGHER_IS_BETTER" ? evaluated >= target : evaluated <= target;
}

function pill(cls: string) {
  return ["inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold", cls].join(" ");
}

function btnBase() {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold",
    "transition-all",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
    "active:scale-[0.98] active:translate-y-[1px]",
  ].join(" ");
}

function btnSoft() {
  return [
    btnBase(),
    "bg-white text-slate-900",
    "ring-2 ring-slate-300",
    "hover:bg-slate-50 hover:ring-slate-400 hover:shadow-sm",
    "active:bg-slate-100 active:ring-slate-500 active:shadow-none",
  ].join(" ");
}

function btnPrimary() {
  return [
    btnBase(),
    "bg-indigo-600 text-white",
    "ring-2 ring-indigo-600/40",
    "hover:bg-indigo-500 hover:ring-indigo-500/60 hover:shadow-sm",
    "active:bg-indigo-700 active:ring-indigo-700/60 active:shadow-none",
  ].join(" ");
}

function btnDark() {
  return [
    btnBase(),
    "bg-slate-900 text-white",
    "ring-2 ring-slate-900/30",
    "hover:bg-slate-800 hover:ring-slate-900/45 hover:shadow-sm",
    "active:bg-slate-950 active:ring-slate-950/45 active:shadow-none",
  ].join(" ");
}

function perspectiveLabel(locale: string, p: BscPerspective) {
  const map: Record<BscPerspective, { es: string; en: string }> = {
    FINANCIAL: { es: "Finanzas", en: "Financial" },
    CUSTOMER: { es: "Clientes", en: "Customer" },
    INTERNAL_PROCESS: { es: "Operación", en: "Operations" },
    LEARNING_GROWTH: { es: "Procesos", en: "Processes" },
  };
  return t(locale, map[p].es, map[p].en);
}

// Orden fijo
const P_ORDER: BscPerspective[] = ["FINANCIAL", "CUSTOMER", "INTERNAL_PROCESS", "LEARNING_GROWTH"];
function pIndex(p: BscPerspective) {
  const i = P_ORDER.indexOf(p);
  return i === -1 ? 999 : i;
}

function basisShort(locale: string, b: KpiBasis) {
  // corto y humano (lo dejamos mínimo)
  if (b === "A") return t(locale, "Acum.", "Cum.");
  return t(locale, "LTM", "LTM");
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

  const activeAccountId = sanitizeSegment(sp.accountId ?? null);
  const scopeKey = activeAccountId ? `UNIT:${activeAccountId}` : "GLOBAL";

  const [engagement, kpis] = await Promise.all([
    prisma.engagement.findUnique({ where: { id: engagementId }, select: { id: true, name: true } }),
    prisma.kpi.findMany({
      where: { engagementId },
      select: {
        id: true,
        nameEs: true,
        nameEn: true,
        perspective: true,
        unit: true,
        targetValue: true,
        direction: true,
        basis: true,
      },
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
  // Links Pdf y Data Pack
  const pdfHref =
  "/api/export/summary/pdf?locale=" +
  encodeURIComponent(locale) +
  "&engagementId=" +
  encodeURIComponent(engagementId) +
  "&period=" +
  encodeURIComponent(periodKey) +
  (activeAccountId ? `&accountId=${encodeURIComponent(activeAccountId)}` : "");

  
  const kpiIds = kpis.map((k) => k.id);
  const seriesKeys = buildMonthKeysBack(periodKey, 12);

  const seriesRows = kpiIds.length
    ? await prisma.kpiValue.findMany({
        where: {
          kpiId: { in: kpiIds },
          periodKey: { in: seriesKeys },
          scopeKey,
        },
        select: { kpiId: true, periodKey: true, value: true },
      })
    : [];

  const rowByKpiPeriod = new Map<string, typeof seriesRows[number]>();
  for (const r of seriesRows) rowByKpiPeriod.set(`${r.kpiId}:${r.periodKey}`, r);

  // Snapshots iniciativas + summary guardado
  const [wpCur, wpPrev, wpSummary] = await Promise.all([
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: initiativeStepKey(periodKey, scopeKey) } },
      select: { notes: true },
    }),
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: initiativeStepKey(prevKey, scopeKey) } },
      select: { notes: true },
    }),
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: summaryStepKey(periodKey, scopeKey) } },
      select: { notes: true },
    }),
  ]);

  const curInit = safeJsonParse<InitiativeSnapshot>(wpCur?.notes, { items: [] });
  const prevInit = safeJsonParse<InitiativeSnapshot>(wpPrev?.notes, { items: [] });
  const prevById = new Map(prevInit.items.map((x) => [x.initiativeId, x]));

  const initIds = Array.from(
    new Set([...curInit.items.map((x) => x.initiativeId), ...prevInit.items.map((x) => x.initiativeId)]),
  );
  const initTitles = initIds.length
    ? await prisma.initiative.findMany({
        where: { id: { in: initIds } },
        select: { id: true, title: true },
      })
    : [];
  const initTitleById = new Map(initTitles.map((x) => [x.id, x.title]));

  const initChanges = curInit.items
    .map((x) => {
      const p = prevById.get(x.initiativeId);
      const dp = x.progressPct != null && p?.progressPct != null ? x.progressPct - p.progressPct : null;
      const statusChanged = (x.status ?? "") !== (p?.status ?? "");
      const blockersNow = (x.blockers ?? "").trim();
      const notesNow = (x.notes ?? "").trim();
      return { ...x, deltaPct: dp, statusChanged, blockersNow, notesNow };
    })
    .filter((x) => x.deltaPct != null || x.statusChanged || x.blockersNow !== "" || x.notesNow !== "");

  const summarySaved = safeJsonParse<{ highlights?: string; nextActions?: string }>(wpSummary?.notes, {});
  const highlightsDefault = summarySaved.highlights ?? "";
  const nextActionsDefault = summarySaved.nextActions ?? "";

  async function saveSummary(formData: FormData) {
    "use server";

    const p = String(formData.get("periodKey") ?? "").trim();
    const safePeriod = /^\d{4}-\d{2}$/.test(p) ? p : defaultMonthKey();

    const accRaw = String(formData.get("accountId") ?? "").trim();
    const safeAccountId = sanitizeSegment(accRaw || null);
    const scopeKey = safeAccountId ? `UNIT:${safeAccountId}` : "GLOBAL";

    const highlights = String(formData.get("highlights") ?? "").trim();
    const nextActions = String(formData.get("nextActions") ?? "").trim();

    await prisma.wizardProgress.upsert({
      where: { engagementId_stepKey: { engagementId, stepKey: summaryStepKey(safePeriod, scopeKey) } },
      create: {
        engagementId,
        stepKey: summaryStepKey(safePeriod, scopeKey),
        completedAt: new Date(),
        notes: JSON.stringify({ highlights, nextActions }),
      },
      update: {
        completedAt: new Date(),
        notes: JSON.stringify({ highlights, nextActions }),
      },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/check-in`);
    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/summary`);
    revalidatePath(`/${locale}/wizard/${engagementId}/dashboard`);

    const qs = new URLSearchParams();
    qs.set("period", safePeriod);
    if (safeAccountId) qs.set("accountId", safeAccountId);
    redirect(`/${locale}/wizard/${engagementId}/check-in/summary?${qs.toString()}`);
  }

  const qsBase = new URLSearchParams();
  qsBase.set("period", periodKey);
  if (activeAccountId) qsBase.set("accountId", activeAccountId);
  const baseQs = qsBase.toString();

  const dataPackHref = `/${locale}/wizard/${engagementId}/check-in/data-pack?${baseQs}`;

  // Tabla: KPIs compactos (Plan vs Real)
  const kpiRows = [...kpis]
    .sort((a, b) => {
      const pa = pIndex(a.perspective);
      const pb = pIndex(b.perspective);
      if (pa !== pb) return pa - pb;
      const na = (a.nameEs ?? "").toString();
      const nb = (b.nameEs ?? "").toString();
      return na.localeCompare(nb, "es");
    })
    .map((k) => {
      const prevRow = rowByKpiPeriod.get(`${k.id}:${prevKey}`);
      const curRow = rowByKpiPeriod.get(`${k.id}:${periodKey}`);

      const prevNum = prevRow?.value != null ? toNum(prevRow.value.toString()) : null;
      const curNum = curRow?.value != null ? toNum(curRow.value.toString()) : null;

      const targetNumRaw = k.targetValue == null ? null : Number(String(k.targetValue));
      const targetNum = Number.isFinite(targetNumRaw) ? targetNumRaw : null;

      const series = seriesKeys.map((pk) => {
        const r = rowByKpiPeriod.get(`${k.id}:${pk}`);
        const v = r?.value != null ? toNum(r.value.toString()) : null;
        return { periodKey: pk, value: v };
      });

      const evaluatedNow = computeEvaluatedValue(k.basis, series, periodKey);

       // Δ = Evaluado - Meta
      const delta = evaluatedNow != null && targetNum != null ? evaluatedNow - targetNum : null;

      // OK/Atención se decide por Evaluado vs Meta (como ya lo tienes)
      const ok = curNum == null ? null : computeIsOk(k.direction, evaluatedNow, targetNum);

      return {
        k,
        prevTxt: prevRow?.value != null ? String(prevRow.value) : "—",
        curTxt: curRow?.value != null ? String(curRow.value) : "—",
        evaluatedNow,
        delta,
        targetNum,
        ok,
      };
    });

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Check-in · Resumen", "Check-in · Summary")}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">{engagement.name || t(locale, "Engagement", "Engagement")}</h1>
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-semibold">{periodKey}</span>{" "}
              <span className="text-slate-500">({t(locale, "vs", "vs")} {prevKey})</span>
              {" · "}
              {t(locale, "Scope:", "Scope:")}{" "}
              <span className="font-semibold">{activeAccountId ? t(locale, "Unidad", "Unit") : "GLOBAL"}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/${locale}/wizard/${engagementId}/check-in?${baseQs}`} className={btnSoft()}>
              ← {t(locale, "Inicio", "Home")}
            </Link>
            <Link href={`/${locale}/wizard/${engagementId}/check-in/kpis?${baseQs}`} className={btnSoft()}>
              {t(locale, "KPIs", "KPIs")}
            </Link>
            <Link href={`/${locale}/wizard/${engagementId}/check-in/initiatives?${baseQs}`} className={btnSoft()}>
              {t(locale, "Iniciativas", "Initiatives")}
            </Link>
            <Link href={dataPackHref} className={btnPrimary()}>
              {t(locale, "Data Pack", "Data Pack")}
            </Link>
            <Link href={`/${locale}/wizard/${engagementId}/report?${baseQs}`} className={btnDark()}>
              {t(locale, "Ver informe", "View report")}
            </Link>
            <a href={pdfHref} className={btnSoft()}>
              {t(locale, "Descargar PDF", "Download PDF")}
            </a>
          </div>
        </div>

        <div className="mt-4">
          <CheckInNav locale={locale} engagementId={engagementId} />
        </div>

        {/* KPIs (resumen tipo Plan vs Real) */}
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">{t(locale, "KPIs (resumen)", "KPIs (summary)")}</h2>
            <Link href={`/${locale}/wizard/${engagementId}/check-in/kpis?${baseQs}`} className={btnPrimary()}>
              {t(locale, "Editar KPIs", "Edit KPIs")}
            </Link>
          </div>

          {kpiRows.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">{t(locale, "Aún no hay KPIs.", "No KPIs yet.")}</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-[980px] w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-semibold text-slate-700">
                    <th className="px-4 py-3 w-[420px]">{t(locale, "KPI", "KPI")}</th>
                    <th className="px-4 py-3 w-[90px]">{t(locale, "Prev", "Prev")}</th>
                    <th className="px-4 py-3 w-[110px]">{t(locale, "Actual (mes)", "Current")}</th>
                    <th className="px-4 py-3 w-[120px]">{t(locale, "Evaluado", "Evaluated")}</th>
                    <th className="px-4 py-3 w-[110px]">{t(locale, "Δ vs meta", "Δ vs target")}</th>
                    <th className="px-4 py-3 w-[110px]">{t(locale, "Meta", "Target")}</th>
                    <th className="px-4 py-3 w-[120px]">{t(locale, "Estado", "Status")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {kpiRows.map((r) => {
                    const statusPill =
                      r.ok == null
                        ? pill("bg-slate-100 text-slate-700")
                        : r.ok
                          ? pill("bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100")
                          : pill("bg-amber-50 text-amber-800 ring-1 ring-amber-100");

                    const statusTxt =
                      r.ok == null ? t(locale, "Sin dato", "No data") : r.ok ? "OK" : t(locale, "Atención", "Attention");

                    return (
                      <tr key={r.k.id} className="align-middle">
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-slate-900">{t(locale, r.k.nameEs, r.k.nameEn)}</div>
                          <div className="mt-1 text-[11px] text-slate-600">
                            {perspectiveLabel(locale, r.k.perspective)}
                            {r.k.unit ? ` · ${r.k.unit}` : ""}
                            {" · "}
                            {basisShort(locale, r.k.basis)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-900">{r.prevTxt}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{r.curTxt}</td>

                        <td className="px-4 py-3 text-sm text-slate-900">
                          <span className="font-semibold">{r.evaluatedNow != null ? String(r.evaluatedNow) : "—"}</span>
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-900">{r.delta != null ? String(r.delta) : "—"}</td>

                        <td className="px-4 py-3 text-sm text-slate-900">{r.targetNum != null ? String(r.targetNum) : "—"}</td>

                        <td className="px-4 py-3">
                          <span className={statusPill}>{statusTxt}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Initiatives Diff */}
        <div className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Iniciativas (diff)", "Initiatives (diff)")}</h2>
            <Link href={`/${locale}/wizard/${engagementId}/check-in/initiatives?${baseQs}`} className={btnPrimary()}>
              {t(locale, "Editar iniciativas", "Edit initiatives")}
            </Link>
          </div>

          {initChanges.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              {t(locale, "Sin cambios detectados (o no hay snapshot del período).", "No changes detected (or missing period snapshot).")}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {initChanges.slice(0, 12).map((x) => {
                const title = initTitleById.get(x.initiativeId) || x.initiativeId;
                return (
                  <div key={x.initiativeId} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900">{title}</div>
                      <div className="text-[11px] text-slate-600">
                        {x.progressPct != null ? `${t(locale, "Progreso", "Progress")}: ${x.progressPct}%` : ""}
                        {x.deltaPct != null ? ` · Δ ${x.deltaPct}%` : ""}
                        {x.status ? ` · ${x.status}` : ""}
                      </div>
                    </div>

                    {x.notesNow ? <div className="mt-1 text-[11px] text-slate-600">{x.notesNow}</div> : null}

                    {x.blockersNow ? (
                      <div className="mt-1 text-[11px] text-amber-700">
                        {t(locale, "Bloqueos:", "Blockers:")} {x.blockersNow}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Executive summary saved */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Resumen ejecutivo (guardar)", "Executive summary (save)")}</h2>

            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/${locale}/wizard/${engagementId}/check-in/kpis?${baseQs}`} className={btnSoft()}>
                {t(locale, "Ir a KPIs", "Go to KPIs")}
              </Link>
              <Link href={`/${locale}/wizard/${engagementId}/check-in/initiatives?${baseQs}`} className={btnSoft()}>
                {t(locale, "Ir a iniciativas", "Go to initiatives")}
              </Link>
              <Link href={dataPackHref} className={btnPrimary()}>
                {t(locale, "Data Pack", "Data Pack")}
              </Link>
            </div>
          </div>

          <form action={saveSummary} className="mt-4 space-y-3">
            <input type="hidden" name="periodKey" value={periodKey} />
            <input type="hidden" name="accountId" value={activeAccountId ?? ""} />

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">{t(locale, "Highlights", "Highlights")}</label>
              <textarea
                name="highlights"
                rows={4}
                defaultValue={highlightsDefault}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder={t(locale, "3–6 bullets: qué pasó, qué cambió, qué preocupa.", "3–6 bullets: what happened, what changed, what worries us.")}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">{t(locale, "Próximas acciones", "Next actions")}</label>
              <textarea
                name="nextActions"
                rows={3}
                defaultValue={nextActionsDefault}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder={t(locale, "5–10 acciones próximas.", "5–10 next actions.")}
              />
            </div>

            <div className="flex justify-end">
              <button type="submit" className={btnDark()}>
                {t(locale, "Guardar resumen", "Save summary")}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
