import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckInNav from "@/components/see/CheckInNav";
import { KpiDirection, BscPerspective, Prisma } from "@prisma/client";

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

function perspectiveLabel(locale: string, p: BscPerspective) {
  const map: Record<BscPerspective, { es: string; en: string }> = {
    FINANCIAL: { es: "Finanzas", en: "Financial" },
    CUSTOMER: { es: "Clientes", en: "Customer" },
    INTERNAL_PROCESS: { es: "Procesos internos", en: "Internal process" },
    LEARNING_GROWTH: { es: "Aprendizaje y crecimiento", en: "Learning & growth" },
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

  const kpis = await prisma.kpi.findMany({
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
    },
    orderBy: [{ perspective: "asc" }, { nameEs: "asc" }],
  });

  const ids = kpis.map((k) => k.id);

  const existing = ids.length
    ? await prisma.kpiValue.findMany({
        where: {
          kpiId: { in: ids },
          periodKey: { in: [periodKey, prevKey] },
          scopeKey,
        },
        select: { id: true, kpiId: true, periodKey: true, value: true, note: true, isGreen: true, scopeKey: true },
      })
    : [];

  const byKey = new Map<string, typeof existing[number]>();
  for (const v of existing) byKey.set(`${v.kpiId}:${v.periodKey}`, v);

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
      select: { id: true, direction: true, targetValue: true },
    });

    await Promise.all(
      list.map(async (k) => {
        const rawValue = String(formData.get(`value_${k.id}`) ?? "").trim();
        const rawNote = String(formData.get(`note_${k.id}`) ?? "").trim();

        const valueNum = rawValue === "" ? null : Number(rawValue);
        const targetNum = k.targetValue ? Number(String(k.targetValue)) : null;

        const safeValueNum = Number.isFinite(valueNum as number) ? (valueNum as number) : null;
        const isGreen = computeIsGreen(k.direction, safeValueNum, targetNum);

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
            isGreen,
            createdByUserId: null,
          },
          update: {
            periodStart: start,
            periodEnd: end,
            value: valueDec,
            note: rawNote || null,
            isGreen,
            accountPlanRowId: safeAccountId,
          },
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

            <p className="mt-1 text-xs text-slate-600">
              {t(locale, "Período:", "Period:")} <span className="font-semibold">{periodKey}</span>
              {" · "}
              {t(locale, "Scope:", "Scope:")}{" "}
              <span className="font-semibold">{activeAccountId ? t(locale, "Unidad", "Unit") : "GLOBAL"}</span>
            </p>

            <p className="mt-2 text-xs text-slate-600">
              {t(
                locale,
                "Tip: completa valores y luego guarda. Después sigue con Iniciativas y cierra con Resumen.",
                "Tip: fill values and save. Then continue with Initiatives and close with Summary."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/${locale}/wizard/${engagementId}/check-in?${baseQs}`} className={btnSoft()}>
              ← {t(locale, "Inicio", "Home")}
            </Link>

            <Link href={`/${locale}/wizard/${engagementId}/check-in/initiatives?${baseQs}`} className={btnSoft()}>
              {t(locale, "Ir a Iniciativas →", "Go to Initiatives →")}
            </Link>

            <Link href={`/${locale}/wizard/${engagementId}/check-in/summary?${baseQs}`} className={btnPrimary()}>
              {t(locale, "Ver resumen →", "View summary →")}
            </Link>
          </div>
        </div>

        <div className="mt-4">
          <CheckInNav locale={locale} engagementId={engagementId} />
        </div>

        {kpis.length === 0 ? (
          <p className="mt-6 text-xs text-slate-600">{t(locale, "No hay KPIs creados aún.", "No KPIs yet.")}</p>
        ) : (
          <form action={save} className="mt-6 space-y-4">
            <input type="hidden" name="periodKey" value={periodKey} />
            <input type="hidden" name="accountId" value={activeAccountId ?? ""} />

            <div className="grid gap-3 md:grid-cols-2">
              {kpis.map((k) => {
                const current = byKey.get(`${k.id}:${periodKey}`);
                const prev = byKey.get(`${k.id}:${prevKey}`);

                const prevNum = toNumber(prev?.value?.toString());
                const curNum = toNumber(current?.value?.toString());
                const targetNum = k.targetValue ? Number(String(k.targetValue)) : null;

                const delta = curNum != null && prevNum != null ? curNum - prevNum : null;

                const badge = !current
                  ? { txt: t(locale, "Sin dato", "No data"), cls: "text-slate-500" }
                  : current.isGreen
                    ? { txt: t(locale, "Verde", "Green"), cls: "text-emerald-700 font-semibold" }
                    : { txt: t(locale, "Rojo", "Red"), cls: "text-rose-700 font-semibold" };

                return (
                  <div key={k.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{t(locale, k.nameEs, k.nameEn)}</div>
                        <div className="mt-1 text-[11px] text-slate-600">
                          {perspectiveLabel(locale, k.perspective)}
                          {k.unit ? ` · ${k.unit}` : ""}
                        </div>

                        <div className="mt-2 grid gap-1 text-[11px] text-slate-600">
                          <div>
                            {t(locale, "Prev:", "Prev:")}{" "}
                            <span className="font-semibold">{prev?.value ? String(prev.value) : "—"}</span>
                            {delta != null ? ` · Δ ${delta}` : ""}
                          </div>
                          <div>
                            {t(locale, "Target:", "Target:")}{" "}
                            <span className="font-semibold">{targetNum != null ? String(targetNum) : "—"}</span>
                            {k.targetText ? ` · ${k.targetText}` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-[11px]">
                        <span className={badge.cls}>{badge.txt}</span>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <div className="md:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          {t(locale, "Valor", "Value")}
                        </label>
                        <input
                          name={`value_${k.id}`}
                          defaultValue={current?.value ? String(current.value) : ""}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          placeholder={t(locale, "Ej: 12.5", "e.g. 12.5")}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          {t(locale, "Nota", "Note")}
                        </label>
                        <input
                          name={`note_${k.id}`}
                          defaultValue={current?.note ?? ""}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          placeholder={t(locale, "Contexto, fuente, comentarios…", "Context, source, comments…")}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

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
