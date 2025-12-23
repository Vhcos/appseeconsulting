// app/[locale]/wizard/[engagementId]/check-in/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<{ period?: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function defaultMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // YYYY-MM
}

export default async function CheckInIndexPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams: SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = await searchParams;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: { id: true, name: true, company: { select: { name: true } }, contextCompanyName: true },
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

  const periodKey = sp.period && /^\d{4}-\d{2}$/.test(sp.period) ? sp.period : defaultMonthKey();

  async function go(formData: FormData) {
    "use server";
    const p = String(formData.get("period") ?? "").trim();
    const safe = /^\d{4}-\d{2}$/.test(p) ? p : defaultMonthKey();
    redirect(`/${locale}/wizard/${engagementId}/check-in?period=${safe}`);
  }

  const clientName =
    (engagement.contextCompanyName ?? "").trim() ||
    (engagement.company?.name ?? "").trim() ||
    (engagement.name ?? "").trim() ||
    t(locale, "Cliente sin nombre", "Unnamed client");

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Check-in periódico", "Periodic check-in")}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">{clientName}</h1>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Elige el período y registra KPIs + avances de iniciativas. Luego revisa el resumen vs período anterior.",
                "Pick a period and log KPIs + initiative progress. Then review the summary vs the previous period.",
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/wizard/${engagementId}/dashboard`}
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              {t(locale, "Volver al panel", "Back to dashboard")}
            </Link>
            <Link
              href={`/${locale}/wizard/${engagementId}/report`}
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              {t(locale, "Ver informe", "View report")}
            </Link>
          </div>
        </div>

        <form action={go} className="mt-5 flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Período (mes)", "Period (month)")}
            </label>
            <input
              type="month"
              name="period"
              defaultValue={periodKey}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            {t(locale, "Usar este período", "Use this period")}
          </button>
        </form>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Link
            href={`/${locale}/wizard/${engagementId}/check-in/kpis?period=${periodKey}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100"
          >
            <div className="text-sm font-semibold text-slate-900">{t(locale, "Cargar KPIs", "Log KPIs")}</div>
            <div className="mt-1 text-xs text-slate-600">{t(locale, "Upsert en KpiValue.", "Upsert into KpiValue.")}</div>
          </Link>

          <Link
            href={`/${locale}/wizard/${engagementId}/check-in/initiatives?period=${periodKey}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100"
          >
            <div className="text-sm font-semibold text-slate-900">{t(locale, "Actualizar iniciativas", "Update initiatives")}</div>
            <div className="mt-1 text-xs text-slate-600">{t(locale, "Snapshot por período + evidencias.", "Period snapshot + evidences.")}</div>
          </Link>

          <Link
            href={`/${locale}/wizard/${engagementId}/check-in/summary?period=${periodKey}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100"
          >
            <div className="text-sm font-semibold text-slate-900">{t(locale, "Resumen del período", "Period summary")}</div>
            <div className="mt-1 text-xs text-slate-600">{t(locale, "Diff vs período anterior.", "Diff vs previous period.")}</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
