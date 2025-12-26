import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WizardStepsNavAuto from "@/components/see/WizardStepsNavAuto";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default async function WizardEngagementLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    include: { org: true, company: true },
  });

  const title =
    (engagement?.name && engagement.name.trim()) ||
    t(locale, "Engagement", "Engagement");

  const subtitle = engagement
    ? [
        engagement.org?.name ? engagement.org.name : null,
        engagement.company?.name ? engagement.company.name : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href={`/${locale}/wizard`}
                className="text-sm font-semibold tracking-tight text-slate-900 hover:text-indigo-600"
              >
                SEEConsulting
              </Link>

              <div className="hidden h-6 w-px bg-slate-200 md:block" />

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {title}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {subtitle || t(locale, "Proyecto en curso", "Work in progress")}
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={`/${locale}/wizard/${engagementId}/step-0-engagement`}
                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 hover:bg-slate-200"
              >
                {t(locale, "Vista General", "Overview")}
              </Link>

              <Link
                href={`/${locale}/wizard/${engagementId}/tables`}
                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 hover:bg-slate-200"
              >
                {t(locale, "Tablas", "Tables")}
              </Link>

              <Link
                href={`/${locale}/wizard/${engagementId}/check-in`}
                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 hover:bg-slate-200"
              >
                {t(locale, "Check-in", "Check-in")}
              </Link>

              <Link
                href={`/${locale}/wizard/${engagementId}/report`}
                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 hover:bg-slate-200"
              >
                {t(locale, "Informe", "Report")}
              </Link>

              <Link
                href={`/${locale}/wizard`}
                className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-50"
              >
                {t(locale, "Salir", "Exit")}
              </Link>
            </nav>
          </div>
        </div>

        {/* Wizard nav global (fases + steps) */}
        <div className="border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-3 lg:px-6">
            <WizardStepsNavAuto locale={locale} engagementId={engagementId} />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
