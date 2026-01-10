// app/[locale]/wizard/[engagementId]/check-in/data-pack/exec/page.tsx
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

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function summaryStepKey(periodKey: string, scopeKey: string) {
  return `checkin-summary:${scopeKey}:${periodKey}`;
}
function execStepKey(periodKey: string, scopeKey: string) {
  return `datapack-exec:${scopeKey}:${periodKey}`;
}

export default async function DataPackExecPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams: SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = await searchParams;

  const periodKey = sp.period && /^\d{4}-\d{2}$/.test(sp.period) ? sp.period : defaultMonthKey();
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
    select: { id: true, nameEs: true, nameEn: true },
    orderBy: [{ nameEs: "asc" }],
  });

  const [wpSummary, wpExec] = await Promise.all([
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: summaryStepKey(periodKey, scopeKey) } },
      select: { notes: true },
    }),
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: execStepKey(periodKey, scopeKey) } },
      select: { notes: true },
    }),
  ]);

  const summarySaved = safeJsonParse<{ highlights?: string; nextActions?: string }>(wpSummary?.notes, {});
  const execSaved = safeJsonParse<{
    headline?: string;
    traffic?: "GREEN" | "AMBER" | "RED";
    impact?: string;
    method?: string;
    kpi1?: string;
    kpi2?: string;
    kpi3?: string;
    caseText?: string;
    caseEvidence?: string;
  }>(wpExec?.notes, { traffic: "AMBER" });

  async function saveExec(formData: FormData) {
    "use server";

    const p = String(formData.get("periodKey") ?? "").trim();
    const safePeriod = /^\d{4}-\d{2}$/.test(p) ? p : defaultMonthKey();

    const accRaw = String(formData.get("accountId") ?? "").trim();
    const safeAccountId = sanitizeSegment(accRaw || null);
    const scopeKey = safeAccountId ? `UNIT:${safeAccountId}` : "GLOBAL";

    const headline = String(formData.get("headline") ?? "").trim();
    const traffic = (String(formData.get("traffic") ?? "AMBER").trim() as "GREEN" | "AMBER" | "RED") || "AMBER";
    const impact = String(formData.get("impact") ?? "").trim();
    const method = String(formData.get("method") ?? "").trim();
    const kpi1 = String(formData.get("kpi1") ?? "").trim();
    const kpi2 = String(formData.get("kpi2") ?? "").trim();
    const kpi3 = String(formData.get("kpi3") ?? "").trim();
    const caseText = String(formData.get("caseText") ?? "").trim();
    const caseEvidence = String(formData.get("caseEvidence") ?? "").trim();

    await prisma.wizardProgress.upsert({
      where: { engagementId_stepKey: { engagementId, stepKey: execStepKey(safePeriod, scopeKey) } },
      create: {
        engagementId,
        stepKey: execStepKey(safePeriod, scopeKey),
        completedAt: new Date(),
        notes: JSON.stringify({ headline, traffic, impact, method, kpi1, kpi2, kpi3, caseText, caseEvidence }),
      },
      update: {
        completedAt: new Date(),
        notes: JSON.stringify({ headline, traffic, impact, method, kpi1, kpi2, kpi3, caseText, caseEvidence }),
      },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/check-in`);
    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/data-pack/exec`);
    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/summary`);
    revalidatePath(`/${locale}/wizard/${engagementId}/dashboard`);

    const qs = new URLSearchParams();
    qs.set("period", safePeriod);
    if (safeAccountId) qs.set("accountId", safeAccountId);
    redirect(`/${locale}/wizard/${engagementId}/check-in/data-pack/exec?${qs.toString()}`);
  }

  const qsBase = new URLSearchParams();
  qsBase.set("period", periodKey);
  if (activeAccountId) qsBase.set("accountId", activeAccountId);
  const baseQs = qsBase.toString();

  const opsHref = `/${locale}/wizard/${engagementId}/check-in/data-pack/ops?${baseQs}`;
  const execHref = `/${locale}/wizard/${engagementId}/check-in/data-pack/exec?${baseQs}`;

  const trafficLabel = (x: "GREEN" | "AMBER" | "RED") =>
    x === "GREEN" ? t(locale, "Verde", "Green") : x === "RED" ? t(locale, "Rojo", "Red") : t(locale, "Ámbar", "Amber");

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Data Pack · Dirección", "Data Pack · Exec")}
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
          <Link
            href={opsHref}
            className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            {t(locale, "Operación", "Ops")}
          </Link>
          <Link href={execHref} className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
            {t(locale, "Dirección", "Exec")}
          </Link>
        </div>

        {/* Top headline + traffic light */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">{t(locale, "1) Estado general", "1) Overall status")}</h2>

          <form action={saveExec} className="mt-4 space-y-3">
            <input type="hidden" name="periodKey" value={periodKey} />
            <input type="hidden" name="accountId" value={activeAccountId ?? ""} />

            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-medium text-slate-700">{t(locale, "Headline (1–2 líneas)", "Headline (1–2 lines)")}</label>
                <input
                  name="headline"
                  defaultValue={execSaved.headline ?? ""}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder={t(locale, "Ej: Cumplimiento estable con dos riesgos en seguimiento.", "e.g. Stable delivery with two risks under watch.")}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">{t(locale, "Semáforo", "Traffic light")}</label>
                <select
                  name="traffic"
                  defaultValue={execSaved.traffic ?? "AMBER"}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="GREEN">{trafficLabel("GREEN")}</option>
                  <option value="AMBER">{trafficLabel("AMBER")}</option>
                  <option value="RED">{trafficLabel("RED")}</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">{t(locale, "Impacto en continuidad / negocio", "Business continuity impact")}</label>
                <textarea
                  name="impact"
                  rows={4}
                  defaultValue={execSaved.impact ?? ""}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">{t(locale, "Método / supuestos (si aplica)", "Method / assumptions (if any)")}</label>
                <textarea
                  name="method"
                  rows={4}
                  defaultValue={execSaved.method ?? ""}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            {/* KPI picks for charts (MVP) */}
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-900">{t(locale, "2) 3 KPIs clave (para gráficos)", "2) 3 key KPIs (for charts)")}</h2>
              <p className="mt-1 text-xs text-slate-600">{t(locale, "MVP: selecciona 3 KPIs. Luego los graficamos en la siguiente etapa.", "MVP: pick 3 KPIs. We'll chart them next.")}</p>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {(["kpi1", "kpi2", "kpi3"] as const).map((name, idx) => (
                  <div key={name} className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700">
                      {t(locale, "KPI", "KPI")} {idx + 1}
                    </label>
                    <select
                      name={name}
                      defaultValue={(execSaved as any)[name] ?? ""}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="">{t(locale, "— (sin seleccionar)", "— (none)")}</option>
                      {kpis.map((k) => (
                        <option key={k.id} value={k.id}>
                          {t(locale, k.nameEs, k.nameEn)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Case of the month */}
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-900">{t(locale, "3) Caso del mes", "3) Case of the month")}</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">{t(locale, "Resumen del caso (before/after)", "Case summary (before/after)")}</label>
                  <textarea
                    name="caseText"
                    rows={5}
                    defaultValue={execSaved.caseText ?? ""}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">{t(locale, "Evidencia (URL)", "Evidence (URL)")}</label>
                  <input
                    name="caseEvidence"
                    defaultValue={execSaved.caseEvidence ?? ""}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    placeholder="https://..."
                  />
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <div className="font-semibold text-slate-900">{t(locale, "Resumen ejecutivo (desde Summary)", "Exec summary (from Summary)")}</div>
                    <div className="mt-2 text-[11px] font-semibold text-slate-700">{t(locale, "Highlights", "Highlights")}</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{summarySaved.highlights?.trim() ? summarySaved.highlights : "—"}</div>
                    <div className="mt-3 text-[11px] font-semibold text-slate-700">{t(locale, "Próximas acciones", "Next actions")}</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{summarySaved.nextActions?.trim() ? summarySaved.nextActions : "—"}</div>
                  </div>
                </div>
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
      </section>
    </main>
  );
}
