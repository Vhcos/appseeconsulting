//app/[locale]/wizard/[engagementId]/check-in/data-pack/ops/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckInNav from "@/components/see/CheckInNav";
import PrintButton from "@/components/see/PrintButton";

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
type InitiativeSnapshot = { items: InitiativeSnapshotItem[] };

function initiativeStepKey(periodKey: string, scopeKey: string) {
  return `checkin-initiatives:${scopeKey}:${periodKey}`;
}
function summaryStepKey(periodKey: string, scopeKey: string) {
  return `checkin-summary:${scopeKey}:${periodKey}`;
}
function opsStepKey(periodKey: string, scopeKey: string) {
  return `datapack-ops:${scopeKey}:${periodKey}`;
}

function toNum(x: unknown): number | null {
  if (x == null) return null;
  const n = Number(String(x));
  return Number.isFinite(n) ? n : null;
}

export default async function DataPackOpsPage({
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
    select: { id: true, nameEs: true, nameEn: true, perspective: true, targetValue: true, unit: true },
    orderBy: [{ perspective: "asc" }, { nameEs: "asc" }],
  });
  const kpiIds = kpis.map((k) => k.id);

  const values = kpiIds.length
    ? await prisma.kpiValue.findMany({
        where: { kpiId: { in: kpiIds }, periodKey: { in: [periodKey, prevKey] }, scopeKey },
        select: { kpiId: true, periodKey: true, value: true, isGreen: true, note: true },
      })
    : [];
  const valMap = new Map<string, typeof values[number]>();
  for (const v of values) valMap.set(`${v.kpiId}:${v.periodKey}`, v);

  const [wpInit, wpSummary, wpOps] = await Promise.all([
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: initiativeStepKey(periodKey, scopeKey) } },
      select: { notes: true },
    }),
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: summaryStepKey(periodKey, scopeKey) } },
      select: { notes: true },
    }),
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: opsStepKey(periodKey, scopeKey) } },
      select: { notes: true },
    }),
  ]);

  const initSnap = safeJsonParse<InitiativeSnapshot>(wpInit?.notes, { items: [] });
  const summarySaved = safeJsonParse<{ highlights?: string; nextActions?: string }>(wpSummary?.notes, {});

  const opsSaved = safeJsonParse<{
    events?: string;
    incidents?: string;
    recommendation?: string;
    asks?: string;
  }>(wpOps?.notes, {});

  async function saveOps(formData: FormData) {
    "use server";

    const p = String(formData.get("periodKey") ?? "").trim();
    const safePeriod = /^\d{4}-\d{2}$/.test(p) ? p : defaultMonthKey();

    const accRaw = String(formData.get("accountId") ?? "").trim();
    const safeAccountId = sanitizeSegment(accRaw || null);
    const scopeKey = safeAccountId ? `UNIT:${safeAccountId}` : "GLOBAL";

    const events = String(formData.get("events") ?? "").trim();
    const incidents = String(formData.get("incidents") ?? "").trim();
    const recommendation = String(formData.get("recommendation") ?? "").trim();
    const asks = String(formData.get("asks") ?? "").trim();

    await prisma.wizardProgress.upsert({
      where: { engagementId_stepKey: { engagementId, stepKey: opsStepKey(safePeriod, scopeKey) } },
      create: {
        engagementId,
        stepKey: opsStepKey(safePeriod, scopeKey),
        completedAt: new Date(),
        notes: JSON.stringify({ events, incidents, recommendation, asks }),
      },
      update: {
        completedAt: new Date(),
        notes: JSON.stringify({ events, incidents, recommendation, asks }),
      },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/check-in`);
    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/data-pack/ops`);
    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/summary`);
    revalidatePath(`/${locale}/wizard/${engagementId}/dashboard`);

    const qs = new URLSearchParams();
    qs.set("period", safePeriod);
    if (safeAccountId) qs.set("accountId", safeAccountId);
    redirect(`/${locale}/wizard/${engagementId}/check-in/data-pack/ops?${qs.toString()}`);
  }

  const qsBase = new URLSearchParams();
  qsBase.set("period", periodKey);
  if (activeAccountId) qsBase.set("accountId", activeAccountId);
  const baseQs = qsBase.toString();

  const opsHref = `/${locale}/wizard/${engagementId}/check-in/data-pack/ops?${baseQs}`;
  const execHref = `/${locale}/wizard/${engagementId}/check-in/data-pack/exec?${baseQs}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Data Pack · Operación", "Data Pack · Ops")}
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrintButton />
            <Link
              href={`/${locale}/wizard/${engagementId}/check-in/summary?${baseQs}`}
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              ← {t(locale, "Volver a Resumen", "Back to Summary")}
            </Link>
          </div>
        </div>

        <div className="mt-4">
          <CheckInNav locale={locale} engagementId={engagementId} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={opsHref} className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
            {t(locale, "Operación", "Ops")}
          </Link>
          <Link
            href={execHref}
            className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            {t(locale, "Dirección", "Exec")}
          </Link>
        </div>

        {/* 1) KPIs table */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">{t(locale, "1) KPIs (Plan vs Real)", "1) KPIs (Plan vs Actual)")}</h2>
          {kpis.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">{t(locale, "No hay KPIs creados aún.", "No KPIs yet.")}</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-semibold text-slate-700">{t(locale, "KPI", "KPI")}</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">{t(locale, "Prev", "Prev")}</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">{t(locale, "Actual", "Current")}</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Δ</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">{t(locale, "Target", "Target")}</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">{t(locale, "Estado", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((k) => {
                    const prev = valMap.get(`${k.id}:${prevKey}`);
                    const cur = valMap.get(`${k.id}:${periodKey}`);
                    const prevNum = toNum(prev?.value?.toString());
                    const curNum = toNum(cur?.value?.toString());
                    const delta = prevNum != null && curNum != null ? curNum - prevNum : null;
                    const targetNum = k.targetValue ? Number(String(k.targetValue)) : null;

                    return (
                      <tr key={k.id} className="border-t border-slate-200">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-900">{t(locale, k.nameEs, k.nameEn)}</div>
                          <div className="text-[11px] text-slate-500">{k.unit ? k.unit : ""}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{prev?.value ? String(prev.value) : "—"}</td>
                        <td className="px-3 py-2 text-slate-900 font-semibold">{cur?.value ? String(cur.value) : "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{delta != null ? String(delta) : "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{targetNum != null ? String(targetNum) : "—"}</td>
                        <td className="px-3 py-2">
                          {cur ? (
                            cur.isGreen ? (
                              <span className="font-semibold text-emerald-700">{t(locale, "OK", "OK")}</span>
                            ) : (
                              <span className="font-semibold text-amber-700">{t(locale, "Atención", "Watch")}</span>
                            )
                          ) : (
                            <span className="text-slate-500">{t(locale, "Sin dato", "No data")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 2) Events / incidents / recommendation */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">{t(locale, "2) Eventos / Incidencias / Recomendación", "2) Events / Incidents / Recommendation")}</h2>

          <form action={saveOps} className="mt-4 space-y-3">
            <input type="hidden" name="periodKey" value={periodKey} />
            <input type="hidden" name="accountId" value={activeAccountId ?? ""} />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  {t(locale, "Eventos relevantes (bullets)", "Relevant events (bullets)")}
                </label>
                <textarea
                  name="events"
                  rows={6}
                  defaultValue={opsSaved.events ?? ""}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder={t(locale, "• ...", "• ...")}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  {t(locale, "Incidencias + acciones correctivas", "Incidents + corrective actions")}
                </label>
                <textarea
                  name="incidents"
                  rows={6}
                  defaultValue={opsSaved.incidents ?? ""}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder={t(locale, "• Incidencia — acción — estado", "• Incident — action — status")}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-medium text-slate-700">
                  {t(locale, "Recomendación operativa (1–3 líneas)", "Operational recommendation (1–3 lines)")}
                </label>
                <textarea
                  name="recommendation"
                  rows={3}
                  defaultValue={opsSaved.recommendation ?? ""}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-medium text-slate-700">
                  {t(locale, "Qué necesito del mandante (si aplica)", "What I need from the client (if any)")}
                </label>
                <textarea
                  name="asks"
                  rows={3}
                  defaultValue={opsSaved.asks ?? ""}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                {t(locale, "Guardar Data Pack", "Save Data Pack")}
              </button>
            </div>
          </form>
        </div>

        {/* 3) Initiative snapshot (read-only) */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">{t(locale, "3) Iniciativas (snapshot)", "3) Initiatives (snapshot)")}</h2>
          {initSnap.items.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">{t(locale, "No hay snapshot de iniciativas en este período.", "No initiatives snapshot for this period.")}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {initSnap.items.slice(0, 12).map((x) => (
                <div key={x.initiativeId} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900">{x.initiativeId}</div>
                    <div className="text-[11px] text-slate-600">
                      {x.progressPct != null ? `${t(locale, "Progreso", "Progress")}: ${x.progressPct}%` : ""}
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
        </div>

        {/* 4) Executive summary reuse (read-only) */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">{t(locale, "4) Resumen ejecutivo (desde Summary)", "4) Exec summary (from Summary)")}</h2>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-700">{t(locale, "Highlights", "Highlights")}</div>
            <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
              {summarySaved.highlights?.trim() ? summarySaved.highlights : "—"}
            </div>
            <div className="mt-4 text-xs font-semibold text-slate-700">{t(locale, "Próximas acciones", "Next actions")}</div>
            <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
              {summarySaved.nextActions?.trim() ? summarySaved.nextActions : "—"}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
