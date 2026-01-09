//app/[locale]/wizard/[engagementId]/check-in/kpis/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckInNav from "@/components/see/CheckInNav";
import KpiMiniChart from "@/components/see/KpiMiniChart";
import { KpiDirection, BscPerspective, Prisma, KpiBasis } from "@prisma/client";
import { buildMonthKeysBack, computeEvaluatedSeries, computeEvaluatedValue } from "@/lib/see/kpiEval";

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

const PERSPECTIVE_ORDER: BscPerspective[] = ["FINANCIAL", "CUSTOMER", "INTERNAL_PROCESS", "LEARNING_GROWTH"];

function perspectiveRank(p: BscPerspective) {
  const i = PERSPECTIVE_ORDER.indexOf(p);
  return i === -1 ? 999 : i;
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

function defaultMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthStartEnd(periodKey: string) {
  const [yStr, mStr] = periodKey.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

function prevMonthKey(periodKey: string) {
  const [yStr, mStr] = periodKey.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = new Date(y, m - 2, 1);
  return defaultMonthKey(d);
}

function toNumber(x: unknown): number | null {
  if (x == null) return null;
  const n = typeof x === "number" ? x : Number(String(x));
  return Number.isFinite(n) ? n : null;
}

function computeIsGreen(direction: KpiDirection, value: number | null, target: number | null) {
  if (value == null) return false;
  if (target == null) return true;
  return direction === "HIGHER_IS_BETTER" ? value >= target : value <= target;
}

function pill(cls: string) {
  return ["inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold", cls].join(" ");
}

function btnSoft() {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold",
    "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50",
    "transition-all active:scale-[0.98]",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
  ].join(" ");
}

function btnPrimary() {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold",
    "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 ring-1 ring-indigo-600/10",
    "transition-all active:scale-[0.98]",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
  ].join(" ");
}

function btnDark() {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold",
    "bg-slate-900 text-white shadow-sm hover:bg-slate-700 ring-1 ring-slate-900/10",
    "transition-all active:scale-[0.98]",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
  ].join(" ");
}

function basisLabel(locale: string, b: KpiBasis) {
  // No mostramos "A/L" al usuario; lo traducimos a algo humano.
  if (b === "A") return t(locale, "Acumulado (Prom. YTD)", "Cumulative (YTD Avg)");
  return t(locale, "Últimos 12 meses (Prom.)", "Last 12 months (Avg)");
}

export default async function CheckInKpisPage({
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

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: { id: true, name: true },
  });

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

  const unitLabel =
    activeAccountId
      ? (
          await prisma.accountPlanRow.findUnique({
            where: { id: activeAccountId },
            select: { account: true, id: true },
          })
        )?.account?.trim() || activeAccountId
      : "GLOBAL";

  const rawKpis = await prisma.kpi.findMany({
    where: { engagementId },
    select: {
      id: true,
      nameEs: true,
      nameEn: true,
      perspective: true,
      direction: true,
      unit: true,
      targetValue: true,
      targetText: true,
      basis: true,
    },
  });

  const kpis = [...rawKpis].sort((a, b) => {
    const ra = perspectiveRank(a.perspective);
    const rb = perspectiveRank(b.perspective);
    if (ra !== rb) return ra - rb;
    const an = (a.nameEs ?? "").toLowerCase();
    const bn = (b.nameEs ?? "").toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return a.id.localeCompare(b.id);
  });

  const ids = kpis.map((k) => k.id);

  // Serie 12 meses para graficar/evaluar (una sola query)
  const seriesKeys = buildMonthKeysBack(periodKey, 12);

  const seriesRows = ids.length
    ? await prisma.kpiValue.findMany({
        where: {
          kpiId: { in: ids },
          scopeKey,
          periodKey: { in: seriesKeys },
        },
        select: { kpiId: true, periodKey: true, value: true, note: true, isGreen: true },
      })
    : [];

  // Map kpiId -> Map(periodKey -> value/row)
  const rowByKpiPeriod = new Map<string, typeof seriesRows[number]>();
  for (const r of seriesRows) rowByKpiPeriod.set(`${r.kpiId}:${r.periodKey}`, r);

  // Construimos series por KPI
  const seriesByKpi = new Map<string, { series: { periodKey: string; value: number | null }[] }>();
  for (const k of kpis) {
    const s = seriesKeys.map((pk) => {
      const r = rowByKpiPeriod.get(`${k.id}:${pk}`);
      const v = r?.value != null ? toNumber(r.value.toString()) : null;
      return { periodKey: pk, value: v };
    });
    seriesByKpi.set(k.id, { series: s });
  }

  // Stats del mes, pero con semáforo evaluado (según basis)
  let cntWithData = 0;
  let cntGreen = 0;
  let cntRed = 0;

  const evaluatedNowByKpi = new Map<string, number | null>();
  const evaluatedSeriesByKpi = new Map<string, Array<number | null>>();

  for (const k of kpis) {
    const pack = seriesByKpi.get(k.id);
    const series = pack?.series ?? [];
    const evalSeries = computeEvaluatedSeries(k.basis, series);
    const evaluatedNow = computeEvaluatedValue(k.basis, series, periodKey);

    evaluatedNowByKpi.set(k.id, evaluatedNow);
    evaluatedSeriesByKpi.set(k.id, evalSeries);

    const currentRow = rowByKpiPeriod.get(`${k.id}:${periodKey}`);
    const currentValue = currentRow?.value != null ? toNumber(currentRow.value.toString()) : null;

    if (currentValue == null) continue;
    cntWithData += 1;

    const targetNum = k.targetValue == null ? null : Number(String(k.targetValue));
    const safeTargetNum = Number.isFinite(targetNum) ? targetNum : null;

    const isGreenEval = computeIsGreen(k.direction, evaluatedNow, safeTargetNum);
    if (isGreenEval) cntGreen += 1;
    else cntRed += 1;
  }

  const cntTotal = kpis.length;
  const cntMissing = Math.max(0, cntTotal - cntWithData);

  async function save(formData: FormData) {
    "use server";

    const p = String(formData.get("periodKey") ?? "").trim();
    const safePeriod = /^\d{4}-\d{2}$/.test(p) ? p : defaultMonthKey();

    const accRaw = String(formData.get("accountId") ?? "").trim();
    const safeAccountId = sanitizeSegment(accRaw || null);
    const scopeKey = safeAccountId ? `UNIT:${safeAccountId}` : "GLOBAL";

    const { start, end } = monthStartEnd(safePeriod);

    const list = await prisma.kpi.findMany({
      where: { engagementId },
      select: { id: true, direction: true, targetValue: true, basis: true },
    });

    // 1) Upsert valores/nota del mes (raw mensual)
    await Promise.all(
      list.map(async (k) => {
        const rawValue = String(formData.get(`value_${k.id}`) ?? "").trim();
        const rawNote = String(formData.get(`note_${k.id}`) ?? "").trim();

        const valueDec =
          rawValue === "" ? null : Number.isFinite(Number(rawValue)) ? new Prisma.Decimal(rawValue) : null;

        await prisma.kpiValue.upsert({
          where: { kpiId_periodKey_scopeKey: { kpiId: k.id, periodKey: safePeriod, scopeKey } },
          create: {
            kpiId: k.id,
            scopeKey,
            accountPlanRowId: safeAccountId,
            periodKey: safePeriod,
            periodStart: start,
            periodEnd: end,
            value: valueDec,
            note: rawNote || null,
            isGreen: false, // se recalcula abajo con evaluatedValue
            createdByUserId: null,
          },
          update: {
            periodStart: start,
            periodEnd: end,
            value: valueDec,
            note: rawNote || null,
            accountPlanRowId: safeAccountId,
          },
        });
      }),
    );

    // 2) Recalcular semáforo del mes basado en evaluatedValue (A/L)
    const ids = list.map((k) => k.id);
    const seriesKeys = buildMonthKeysBack(safePeriod, 12);

    const rows = ids.length
      ? await prisma.kpiValue.findMany({
          where: { kpiId: { in: ids }, scopeKey, periodKey: { in: seriesKeys } },
          select: { kpiId: true, periodKey: true, value: true },
        })
      : [];

    const byKpi = new Map<string, Map<string, number | null>>();
    for (const r of rows) {
      const m = byKpi.get(r.kpiId) ?? new Map<string, number | null>();
      m.set(r.periodKey, r.value != null ? Number(r.value.toString()) : null);
      byKpi.set(r.kpiId, m);
    }

    await Promise.all(
      list.map(async (k) => {
        const m = byKpi.get(k.id) ?? new Map<string, number | null>();
        const series = seriesKeys.map((pk) => ({ periodKey: pk, value: m.get(pk) ?? null }));

        const evaluated = computeEvaluatedValue(k.basis, series, safePeriod);

        const targetNum = k.targetValue == null ? null : Number(String(k.targetValue));
        const safeTargetNum = Number.isFinite(targetNum) ? targetNum : null;

        const isGreen = computeIsGreen(k.direction, evaluated, safeTargetNum);

        await prisma.kpiValue.update({
          where: { kpiId_periodKey_scopeKey: { kpiId: k.id, periodKey: safePeriod, scopeKey } },
          data: { isGreen },
        });
      }),
    );

    revalidatePath(`/${locale}/wizard/${engagementId}/check-in`);
    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/kpis`);
    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/summary`);
    revalidatePath(`/${locale}/wizard/${engagementId}/dashboard`);

    const qs = new URLSearchParams();
    qs.set("period", safePeriod);
    if (safeAccountId) qs.set("accountId", safeAccountId);
    redirect(`/${locale}/wizard/${engagementId}/check-in/kpis?${qs.toString()}`);
  }

  const qsBase = new URLSearchParams();
  qsBase.set("period", periodKey);
  if (activeAccountId) qsBase.set("accountId", activeAccountId);
  const baseQs = qsBase.toString();

  const grouped = new Map<BscPerspective, typeof kpis>();
  for (const p of PERSPECTIVE_ORDER) grouped.set(p, []);
  for (const k of kpis) {
    const arr = grouped.get(k.perspective) ?? [];
    arr.push(k);
    grouped.set(k.perspective, arr);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Check-in · KPIs", "Check-in · KPIs")}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">
              {engagement.name || t(locale, "Engagement", "Engagement")}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span>
                {t(locale, "Período:", "Period:")} <span className="font-semibold">{periodKey}</span>
              </span>
              <span className="text-slate-300">·</span>
              <span>
                {t(locale, "Unidad:", "Unit:")} <span className="font-semibold">{unitLabel}</span>
              </span>

              <span className="ml-2 inline-flex flex-wrap items-center gap-2">
                <span className={pill("bg-slate-100 text-slate-700")}>
                  {t(locale, "Total", "Total")}: {cntTotal}
                </span>
                <span className={pill("bg-slate-100 text-slate-700")}>
                  {t(locale, "Sin dato", "Missing")}: {cntMissing}
                </span>
                <span className={pill("bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100")}>
                  {t(locale, "Verdes", "Green")}: {cntGreen}
                </span>
                <span className={pill("bg-rose-50 text-rose-700 ring-1 ring-rose-100")}>
                  {t(locale, "Rojos", "Red")}: {cntRed}
                </span>
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-600">
              {t(
                locale,
                "Ingresas el dato del mes. El estado se evalúa con la regla del KPI (Acumulado o Últimos 12 meses).",
                "You enter the monthly value. Status is evaluated using the KPI rule (YTD or Last 12 months)."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/${locale}/wizard/${engagementId}/check-in?${baseQs}`} className={btnSoft()}>
              ← {t(locale, "Inicio", "Home")}
            </Link>

            <Link href={`/${locale}/wizard/${engagementId}/check-in/initiatives?${baseQs}`} className={btnSoft()}>
              {t(locale, "Iniciativas →", "Initiatives →")}
            </Link>

            <Link href={`/${locale}/wizard/${engagementId}/check-in/summary?${baseQs}`} className={btnPrimary()}>
              {t(locale, "Ver resumen →", "View summary →")}
            </Link>
          </div>
        </div>

        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer select-none text-xs font-semibold text-slate-800">
            {t(locale, "Ver navegación del wizard", "Show wizard navigation")}
          </summary>
          <p className="mt-1 text-xs text-slate-600">
            {t(locale, "Útil si necesitas saltar a otras etapas.", "Use this if you need to jump to other stages.")}
          </p>
          <div className="mt-3">
            <CheckInNav locale={locale} engagementId={engagementId} />
          </div>
        </details>

        {kpis.length === 0 ? (
          <p className="mt-6 text-xs text-slate-600">{t(locale, "No hay KPIs creados aún.", "No KPIs yet.")}</p>
        ) : (
          <form action={save} className="mt-6 space-y-8">
            <input type="hidden" name="periodKey" value={periodKey} />
            <input type="hidden" name="accountId" value={activeAccountId ?? ""} />

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href={`/${locale}/wizard/${engagementId}/check-in/initiatives?${baseQs}`} className={btnSoft()}>
                {t(locale, "Siguiente: Iniciativas →", "Next: Initiatives →")}
              </Link>
              <button type="submit" className={btnDark()}>
                {t(locale, "Guardar KPIs", "Save KPIs")}
              </button>
            </div>

            {PERSPECTIVE_ORDER.map((p) => {
              const list = grouped.get(p) ?? [];
              if (list.length === 0) return null;

              return (
                <section key={p} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">{perspectiveLabel(locale, p)}</h2>
                    <div className="text-[11px] text-slate-500">
                      {t(locale, "Prev:", "Prev:")} {prevKey}
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-[1080px] w-full bg-white">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-[11px] font-semibold text-slate-700">
                          <th className="px-4 py-3 w-[360px]">{t(locale, "KPI", "KPI")}</th>
                          <th className="px-4 py-3 w-[90px]">{t(locale, "Prev", "Prev")}</th>
                          <th className="px-4 py-3 w-[140px]">{t(locale, "Valor (mes)", "Monthly value")}</th>
                          <th className="px-4 py-3 w-[110px]">{t(locale, "Δ vs meta", "Δ vs target")}</th>
                          <th className="px-4 py-3 w-[140px]">{t(locale, "Evaluado", "Evaluated")}</th>
                          <th className="px-4 py-3 w-[140px]">{t(locale, "Meta", "Target")}</th>
                          <th className="px-4 py-3 w-[110px]">{t(locale, "Estado", "Status")}</th>
                          <th className="px-4 py-3 w-[320px]">{t(locale, "Nota", "Note")}</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {list.map((k) => {
                          const currentRow = rowByKpiPeriod.get(`${k.id}:${periodKey}`);
                          const prevRow = rowByKpiPeriod.get(`${k.id}:${prevKey}`);

                          const prevNum = prevRow?.value != null ? toNumber(prevRow.value.toString()) : null;
                          const curNum = currentRow?.value != null ? toNumber(currentRow.value.toString()) : null;

                          const targetNum = k.targetValue == null ? null : Number(String(k.targetValue));
                          const safeTargetNum = Number.isFinite(targetNum) ? targetNum : null;
                          const evalSeries = evaluatedSeriesByKpi.get(k.id) ?? [];

                          const evaluatedNow = evaluatedNowByKpi.get(k.id) ?? null;

                           // Δ = Evaluado - Meta
                          const delta = evaluatedNow != null && safeTargetNum != null ? evaluatedNow - safeTargetNum : null;

                          const isGreenEval = computeIsGreen(k.direction, evaluatedNow, safeTargetNum);

                          const badge =
                            curNum == null
                              ? { txt: t(locale, "Sin dato", "No data"), cls: pill("bg-slate-100 text-slate-700") }
                              : isGreenEval
                                ? { txt: t(locale, "Verde", "Green"), cls: pill("bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100") }
                                : { txt: t(locale, "Rojo", "Red"), cls: pill("bg-rose-50 text-rose-700 ring-1 ring-rose-100") };

                          const series = seriesByKpi.get(k.id)?.series ?? [];

                          return (
                            <tr key={k.id} className="align-top">
                              <td className="px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-900">{t(locale, k.nameEs, k.nameEn)}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <span className={pill("bg-slate-100 text-slate-700")}>{basisLabel(locale, k.basis)}</span>
                                      <span className="text-[11px] text-slate-600">
                                        {k.unit ? `${k.unit}` : t(locale, "Sin unidad", "No unit")}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="shrink-0">
                                    <KpiMiniChart
                                       series={series}
                                       evaluatedSeries={evalSeries}
                                       targetValue={safeTargetNum}
                                       width={190}
                                       height={54}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-900">
                                {prevRow?.value != null ? String(prevRow.value) : "—"}
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  name={`value_${k.id}`}
                                  defaultValue={currentRow?.value != null ? String(currentRow.value) : ""}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                  placeholder={t(locale, "Ej: 12.5", "e.g. 12.5")}
                                />
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-900">
                                {delta != null ? <span>{delta}</span> : "—"}
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-900">
                                <div className="font-semibold">{evaluatedNow != null ? String(evaluatedNow) : "—"}</div>
                                <div className="mt-1 text-[11px] text-slate-600">
                                  {t(locale, "Regla:", "Rule:")} {basisLabel(locale, k.basis)}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-900">
                                <div className="font-semibold">{safeTargetNum != null ? String(safeTargetNum) : "—"}</div>
                                {k.targetText ? <div className="mt-1 text-[11px] text-slate-600">{k.targetText}</div> : null}
                              </td>

                              <td className="px-4 py-3">
                                <span className={badge.cls}>{badge.txt}</span>
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  name={`note_${k.id}`}
                                  defaultValue={currentRow?.note ?? ""}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                  placeholder={t(locale, "Contexto, fuente, comentario…", "Context, source, comment…")}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href={`/${locale}/wizard/${engagementId}/check-in/initiatives?${baseQs}`} className={btnSoft()}>
                {t(locale, "Siguiente: Iniciativas →", "Next: Initiatives →")}
              </Link>
              <button type="submit" className={btnDark()}>
                {t(locale, "Guardar KPIs", "Save KPIs")}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
