// app/[locale]/wizard/[engagementId]/check-in/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CheckInNav from "@/components/see/CheckInNav";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<{ period?: string; accountId?: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function defaultMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function sanitizeSegment(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.includes("/") || s.includes("\\") || s.includes("..")) return null;
  if (s.length > 120) return null;
  return s;
}

function stepKeyInitiatives(periodKey: string, scopeKey: string) {
  return `checkin-initiatives:${scopeKey}:${periodKey}`;
}
function stepKeySummary(periodKey: string, scopeKey: string) {
  return `checkin-summary:${scopeKey}:${periodKey}`;
}
function stepKeyOps(periodKey: string, scopeKey: string) {
  return `datapack-ops:${scopeKey}:${periodKey}`;
}
function stepKeyExec(periodKey: string, scopeKey: string) {
  return `datapack-exec:${scopeKey}:${periodKey}`;
}

function actionCardBase() {
  return [
    "group rounded-2xl border border-slate-200 bg-white p-4",
    "shadow-sm hover:shadow transition-all",
    "hover:bg-slate-50",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
    "active:scale-[0.99]",
  ].join(" ");
}

function pill(cls: string) {
  return [
    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
    cls,
  ].join(" ");
}

function miniBar(pct: number) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
      <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${clamped}%` }} />
    </div>
  );
}

type Status = "PENDING" | "IN_PROGRESS" | "DONE";
function statusMeta(locale: string, s: Status) {
  if (s === "DONE") return { txt: t(locale, "Listo", "Done"), cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" };
  if (s === "IN_PROGRESS") return { txt: t(locale, "En progreso", "In progress"), cls: "bg-amber-50 text-amber-800 ring-1 ring-amber-200" };
  return { txt: t(locale, "Pendiente", "Pending"), cls: "bg-slate-50 text-slate-700 ring-1 ring-slate-200" };
}

export default async function CheckInPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams: SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = await searchParams;

  const periodKey =
    sp.period && /^\d{4}-\d{2}$/.test(sp.period) ? sp.period : defaultMonthKey();

  const activeAccountId = sanitizeSegment(sp.accountId ?? null);
  const scopeKey = activeAccountId ? `UNIT:${activeAccountId}` : "GLOBAL";

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: { id: true, name: true },
  });

  if (!engagement) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-slate-700">
          {t(locale, "No existe este engagement.", "Engagement not found.")}
        </p>
        <Link
          className="mt-4 inline-flex text-xs text-indigo-600 hover:text-indigo-500"
          href={`/${locale}/wizard`}
        >
          ← {t(locale, "Volver", "Back")}
        </Link>
      </main>
    );
  }

  const units = await prisma.accountPlanRow.findMany({
    where: { engagementId },
    select: { id: true, account: true },
    orderBy: [{ id: "desc" }],
  });

  // ---------- Status computations (baja fricción) ----------
  const allKpis = await prisma.kpi.findMany({
    where: { engagementId },
    select: { id: true },
  });
  const totalKpis = allKpis.length;

  const filledKpis = totalKpis
    ? await prisma.kpiValue.count({
        where: {
          kpiId: { in: allKpis.map((k) => k.id) },
          periodKey,
          scopeKey,
          value: { not: null },
        },
      })
    : 0;

  const kpiPct = totalKpis ? Math.round((filledKpis / totalKpis) * 100) : 0;

  const [progInit, progSummary, progOps, progExec] = await Promise.all([
    prisma.wizardProgress.findUnique({
  where: { engagementId_stepKey: { engagementId, stepKey: stepKeyInitiatives(periodKey, scopeKey) } },
  select: { id: true },
}),

    prisma.wizardProgress.findUnique({ where: { engagementId_stepKey: { engagementId, stepKey: stepKeySummary(periodKey, scopeKey) } }
, select: { id: true } }),
    prisma.wizardProgress.findUnique({ where: { engagementId_stepKey: { engagementId, stepKey: stepKeyOps(periodKey, scopeKey) } }
, select: { id: true } }),
    prisma.wizardProgress.findUnique({where: { engagementId_stepKey: { engagementId, stepKey: stepKeyExec(periodKey, scopeKey) } }
, select: { id: true } }),
  ]);

  const kpisStatus: Status =
    totalKpis === 0 ? "PENDING" : filledKpis === 0 ? "PENDING" : filledKpis < totalKpis ? "IN_PROGRESS" : "DONE";

  const initsStatus: Status = progInit ? "DONE" : "PENDING";
  const summaryStatus: Status = progSummary ? "DONE" : "PENDING";

  const dataPackStatus: Status =
    progOps && progExec ? "DONE" : progOps || progExec ? "IN_PROGRESS" : "PENDING";

  // ---------- Links ----------
  const qs = new URLSearchParams();
  qs.set("period", periodKey);
  if (activeAccountId) qs.set("accountId", activeAccountId);
  const baseQs = qs.toString();

  const kpisHref = `/${locale}/wizard/${engagementId}/check-in/kpis?${baseQs}`;
  const initsHref = `/${locale}/wizard/${engagementId}/check-in/initiatives?${baseQs}`;
  const summaryHref = `/${locale}/wizard/${engagementId}/check-in/summary?${baseQs}`;
  const dataPackHref = `/${locale}/wizard/${engagementId}/check-in/data-pack?${baseQs}`;
  // Informe (web) + PDF
  const reportHref = `/${locale}/wizard/${engagementId}/report?${baseQs}`;

  // IMPORTANT: API routes NO llevan /{locale}
  const pdfHref = `/api/export/summary/pdf?locale=${encodeURIComponent(locale)}&engagementId=${encodeURIComponent(
   engagementId
  )}&period=${encodeURIComponent(periodKey)}${activeAccountId ? `&accountId=${encodeURIComponent(activeAccountId)}` : ""}`;


  // CTA “continuar donde quedaste”
  const next =
    kpisStatus !== "DONE"
      ? { href: kpisHref, label: t(locale, "Continuar con KPIs →", "Continue with KPIs →") }
      : initsStatus !== "DONE"
        ? { href: initsHref, label: t(locale, "Continuar con Iniciativas →", "Continue with Initiatives →") }
        : summaryStatus !== "DONE"
          ? { href: summaryHref, label: t(locale, "Continuar con Resumen →", "Continue with Summary →") }
          : { href: dataPackHref, label: t(locale, "Ir a Data Pack →", "Go to Data Pack →") };

  const unitLabel = activeAccountId ? t(locale, "Unidad", "Unit") : "GLOBAL";

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Check-in", "Check-in")}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">
              {engagement.name || t(locale, "Compromiso", "Engagement")}
            </h1>

            <p className="mt-1 text-xs text-slate-600">
              {t(locale, "Meta:", "Goal:")}{" "}
              <span className="font-semibold">
                {t(locale, "cerrar el mes en 5 pasos .", "close the month in 5 steps ")}
              </span>
            </p>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">{t(locale, "Checklist rápido", "Quick checklist")}</div>
              <ol className="mt-1 list-decimal pl-5 space-y-1">
                <li>{t(locale, "KPIs: Seguimiento mensual.", "KPIs: values + notes (minimum viable).")}</li>
                <li>{t(locale, "Iniciativas: Seguimiento + progreso + bloqueos.", "Initiatives: progress + blockers + evidence.")}</li>
                <li>{t(locale, "Resumen: Avances y control.", "Summary: 1–2 lines + risks + next steps.")}</li>
                <li>{t(locale, "Data Pack: Informe para Dirección/Operación.", "Data Pack: polished output for Exec/Ops.")}</li>
                <li>{t(locale, "Reporte Semanal: Por unidad operativa.", "Data Pack: polished output for Exec/Ops.")}</li>
              </ol>
            </div>
          </div>

         <div className="flex flex-wrap items-center gap-2">
          <Link
             href={`/${locale}/wizard/${engagementId}/check-in/faena-semanal`}
             className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all active:scale-[0.98]"
           >
             {t(locale, "Reporte Semanal", "Report Weekly")}
          </Link>
         </div></div>

        <div className="mt-4">
          <CheckInNav locale={locale} engagementId={engagementId} />
        </div>

        <form method="get" className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="block text-[11px] font-semibold text-slate-700">
              {t(locale, "Período", "Period")}
            </label>
            <input
              type="month"
              name="period"
              defaultValue={periodKey}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-700">
              {t(locale, "Unidad (Cuenta/Faena)", "Unit (Account/Site)")}
            </label>
            <select
              name="accountId"
              defaultValue={activeAccountId ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">{t(locale, "GLOBAL (sin unidad)", "GLOBAL (no unit)")}</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.account && u.account.trim() ? u.account : u.id}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-all active:scale-[0.98]"
            >
              {t(locale, "Aplicar", "Apply")}
            </button>

            <span className="text-xs text-slate-600">
              {t(locale, "Activo:", "Active:")}{" "}
              <span className="font-semibold">{periodKey}</span>
              {" · "}
              <span className="font-semibold">{unitLabel}</span>
            </span>

            <Link
              href={next.href}
              className="ml-auto inline-flex items-center rounded-full bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-all active:scale-[0.98]"
            >
              {next.label}
            </Link>
          </div>
        </form>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {/* KPIs */}
          <Link href={kpisHref} className={actionCardBase()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{t(locale, "1) KPIs", "1) KPIs")}</div>
                <div className="mt-1 text-xs text-slate-600">
                  {t(locale, "Valores + notas. Base del resto.", "Values + notes. Everything builds on this.")}
                </div>
              </div>
              <span className={pill(statusMeta(locale, kpisStatus).cls)}>{statusMeta(locale, kpisStatus).txt}</span>
            </div>

            <div className="mt-3 text-xs text-slate-700">
              {t(locale, "Cobertura:", "Coverage:")}{" "}
              <span className="font-semibold">
                {filledKpis}/{totalKpis || 0}
              </span>
              {totalKpis ? ` · ${kpiPct}%` : ""}
              {miniBar(totalKpis ? kpiPct : 0)}
            </div>

            <div className="mt-3 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-500">
              {t(locale, "Abrir →", "Open →")}
            </div>
          </Link>

          {/* Iniciativas */}
          <Link href={initsHref} className={actionCardBase()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{t(locale, "2) Iniciativas", "2) Initiatives")}</div>
                <div className="mt-1 text-xs text-slate-600">
                  {t(locale, "Progreso + bloqueos + evidencia.", "Progress + blockers + evidence.")}
                </div>
              </div>
              <span className={pill(statusMeta(locale, initsStatus).cls)}>{statusMeta(locale, initsStatus).txt}</span>
            </div>

            <div className="mt-3 text-[11px] text-slate-600">
              {t(locale, "Idea:", "Idea:")} {t(locale, "deja 1 línea clara por iniciativa.", "leave 1 clear line per initiative.")}
            </div>

            <div className="mt-3 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-500">
              {t(locale, "Abrir →", "Open →")}
            </div>
          </Link>

          {/* Resumen */}
          <Link href={summaryHref} className={actionCardBase()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{t(locale, "3) Resumen", "3) Summary")}</div>
                <div className="mt-1 text-xs text-slate-600">
                  {t(locale, "Executive summary + riesgos + acciones.", "Executive summary + risks + actions.")}
                </div>
              </div>
              <span className={pill(statusMeta(locale, summaryStatus).cls)}>{statusMeta(locale, summaryStatus).txt}</span>
            </div>

            <div className="mt-3 text-[11px] text-slate-600">
              {t(locale, "Regla:", "Rule:")} {t(locale, "no repetir KPIs: explicar el porqué.", "don’t repeat KPIs: explain the why.")}
            </div>

            <div className="mt-3 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-500">
              {t(locale, "Abrir →", "Open →")}
            </div>
          </Link>

          {/* Data Pack */}
          <Link href={dataPackHref} className={actionCardBase()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{t(locale, "Data Pack", "Data Pack")}</div>
                <div className="mt-1 text-xs text-slate-600">
                  {t(locale, "Salida 1 página (Operación / Dirección).", "One-page output (Ops / Exec).")}
                </div>
              </div>
              <span className={pill(statusMeta(locale, dataPackStatus).cls)}>{statusMeta(locale, dataPackStatus).txt}</span>
            </div>

            <div className="mt-3 text-[11px] text-slate-600">
              {t(locale, "Objetivo:", "Goal:")} {t(locale, "listo para enviar (PDF).", "ready to send (PDF).")}
            </div>

            <div className="mt-3 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-500">
              {t(locale, "Abrir →", "Open →")}
            </div>
          </Link>
<Link
  href={`/${locale}/wizard/${engagementId}/check-in/faena-semanal`}
  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
>
  <div className="flex items-start justify-between gap-3">
    <div>
      <div className="text-sm font-semibold text-slate-900">Reporte semanal</div>
      <div className="mt-1 text-xs text-slate-600">
        Reporte semanal por faena. para ser llenado por cada responsable de la unidad Link sin login.
      </div>
    </div>
    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      Nuevo
    </span>
  </div>
  <div className="mt-3 text-xs font-medium text-indigo-700">Abrir →</div>
</Link>
        </div>
      </section>
    </main>
  );
}
