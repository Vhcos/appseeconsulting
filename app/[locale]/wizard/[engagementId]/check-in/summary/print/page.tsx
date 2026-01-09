import { prisma } from "@/lib/prisma";
import { BscPerspective } from "@prisma/client";
import { buildMonthKeysBack, computeEvaluatedValue } from "@/lib/see/kpiEval";
import { KpiDirection } from "@prisma/client";

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

function toNum(x: unknown): number | null {
  if (x == null) return null;
  const n = Number(String(x));
  return Number.isFinite(n) ? n : null;
}

function computeIsGreen(direction: KpiDirection, value: number | null, target: number | null) {
  if (value == null) return false;
  if (target == null) return true;
  return direction === "HIGHER_IS_BETTER" ? value >= target : value <= target;
}

const P_ORDER: BscPerspective[] = ["FINANCIAL", "CUSTOMER", "INTERNAL_PROCESS", "LEARNING_GROWTH"];
function pIndex(p: BscPerspective) {
  const i = P_ORDER.indexOf(p);
  return i === -1 ? 999 : i;
}

function perspectiveLabel(locale: string, p: BscPerspective) {
  const map: Record<BscPerspective, { es: string; en: string }> = {
    FINANCIAL: { es: "Finanzas", en: "Financial" },
    CUSTOMER: { es: "Clientes", en: "Customer" },
    INTERNAL_PROCESS: { es: "Procesos internos", en: "Internal process" },
    LEARNING_GROWTH: { es: "Aprendizaje y crecimiento", en: "Learning & growth" },
  };
  return t(locale, map[p].es, map[p].en);
}

export default async function SummaryPrintPage({
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
      <main className="mx-auto max-w-5xl p-8">
        <p className="text-sm text-slate-700">{t(locale, "No existe este engagement.", "Engagement not found.")}</p>
      </main>
    );
  }

  const kpis = await prisma.kpi.findMany({
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
  });

  const ids = kpis.map((k) => k.id);
  const seriesKeys = buildMonthKeysBack(periodKey, 12);

  const rows = ids.length
    ? await prisma.kpiValue.findMany({
        where: { kpiId: { in: ids }, scopeKey, periodKey: { in: [periodKey, prevKey, ...seriesKeys] } },
        select: { kpiId: true, periodKey: true, value: true, note: true, isGreen: true },
      })
    : [];

  const byKpiPeriod = new Map<string, typeof rows[number]>();
  for (const r of rows) byKpiPeriod.set(`${r.kpiId}:${r.periodKey}`, r);

  const items = kpis
    .map((k) => {
      const prev = byKpiPeriod.get(`${k.id}:${prevKey}`);
      const cur = byKpiPeriod.get(`${k.id}:${periodKey}`);

      const series = seriesKeys.map((pk) => {
        const rr = byKpiPeriod.get(`${k.id}:${pk}`);
        return { periodKey: pk, value: rr?.value != null ? toNum(rr.value.toString()) : null };
      });

      const evaluated = computeEvaluatedValue(k.basis, series, periodKey);

      const targetRaw = k.targetValue == null ? null : Number(String(k.targetValue));
      const target = Number.isFinite(targetRaw) ? targetRaw : null;

      // Δ vs meta: Evaluado - Meta
      const delta = evaluated != null && target != null ? evaluated - target : null;

      const isGreenEval = cur?.value == null ? null : computeIsGreen(k.direction, evaluated, target);

      return {
        k,
        prevV: prev?.value != null ? String(prev.value) : "—",
        curV: cur?.value != null ? String(cur.value) : "—",
        evaluatedV: evaluated != null ? String(evaluated) : "—",
        deltaV: delta != null ? String(delta) : "—",
        targetV: target != null ? String(target) : "—",
        status: cur?.value == null ? t(locale, "Sin dato", "No data") : isGreenEval ? t(locale, "OK", "OK") : t(locale, "Atención", "Attention"),
        pLabel: perspectiveLabel(locale, k.perspective),
        unit: (k.unit ?? "").trim(),
      };
    })
    .sort((a, b) => {
      const pa = pIndex(a.k.perspective);
      const pb = pIndex(b.k.perspective);
      if (pa !== pb) return pa - pb;
      return (a.k.nameEs ?? "").localeCompare(b.k.nameEs ?? "", "es");
    });

  return (
    <main className="mx-auto max-w-6xl p-10">
      <style>{`
        @page { size: A4; margin: 18mm; }
        .no-print { display: none !important; }
      `}</style>

      <header className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t(locale, "Check-in · Resumen", "Check-in · Summary")}
        </div>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{engagement.name || "Engagement"}</h1>
        <div className="mt-1 text-xs text-slate-600">
          <span className="font-semibold">{periodKey}</span> <span className="text-slate-400">·</span>{" "}
          {t(locale, "vs", "vs")} <span className="font-semibold">{prevKey}</span>
          <span className="text-slate-400"> · </span>
          {t(locale, "Scope:", "Scope:")} <span className="font-semibold">{activeAccountId ? t(locale, "Unidad", "Unit") : "GLOBAL"}</span>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{t(locale, "KPIs (Plan vs Real)", "KPIs (Plan vs Actual)")}</h2>
          <p className="mt-1 text-xs text-slate-600">
            {t(locale, "Tabla resumida. Δ es brecha Evaluado vs Meta.", "Compact table. Δ is Evaluated vs Target gap.")}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-[11px] font-semibold text-slate-700">
                <th className="px-4 py-3 w-[420px]">{t(locale, "KPI", "KPI")}</th>
                <th className="px-4 py-3 w-[90px]">{t(locale, "Prev", "Prev")}</th>
                <th className="px-4 py-3 w-[110px]">{t(locale, "Actual", "Actual")}</th>
                <th className="px-4 py-3 w-[110px]">{t(locale, "Evaluado", "Evaluated")}</th>
                <th className="px-4 py-3 w-[110px]">{t(locale, "Δ vs meta", "Δ vs target")}</th>
                <th className="px-4 py-3 w-[110px]">{t(locale, "Meta", "Target")}</th>
                <th className="px-4 py-3 w-[120px]">{t(locale, "Estado", "Status")}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map((x) => (
                <tr key={x.k.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">{t(locale, x.k.nameEs, x.k.nameEn)}</div>
                    <div className="mt-1 text-[11px] text-slate-600">
                      {x.pLabel}{x.unit ? ` · ${x.unit}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">{x.prevV}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{x.curV}</td>
                  <td className="px-4 py-3 text-sm text-slate-900 font-semibold">{x.evaluatedV}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{x.deltaV}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{x.targetV}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{x.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
