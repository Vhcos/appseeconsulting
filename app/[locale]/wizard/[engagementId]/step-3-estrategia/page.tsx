import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WizardStepsNav from "@/components/see/WizardStepsNav";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default async function Step3EstrategiaPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  const [kpiCount, initiativeCount] = await Promise.all([
    prisma.kpi.count(), // kpi suele ser a nivel compañía
    prisma.initiative.count({ where: { engagementId } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <WizardStepsNav
        locale={locale}
        engagementId={engagementId}
        currentStep="step-3-estrategia"
      />

      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          {t(locale, "Visión, misión y objetivos", "Vision, mission and goals")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {t(
            locale,
            "A partir del diagnóstico definimos hacia dónde quiere ir la organización y cuáles son sus objetivos estratégicos.",
            "From the diagnosis we define where the organization wants to go and what its strategic goals are."
          )}
        </p>
      </header>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t(locale, "Visión", "Vision")}
            </p>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: Ser el socio preferido en soluciones sustentables para la gran minería.",
                "e.g. Become the preferred partner in sustainable solutions for large mining."
              )}
              disabled
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t(locale, "Misión", "Mission")}
            </p>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: Diseñar e implementar soluciones que mejoren la seguridad, productividad y sustentabilidad de nuestros clientes.",
                "e.g. Design and implement solutions that improve safety, productivity and sustainability for our clients."
              )}
              disabled
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t(locale, "Objetivos estratégicos", "Strategic goals")}
            </p>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: 1) Crecer EBITDA 20% en 3 años. 2) Diversificar cartera de clientes. 3) Reducir incidentes HSEC críticos a 0.",
                "e.g. 1) Grow EBITDA 20% in 3 years. 2) Diversify customer base. 3) Reduce critical HSEC incidents to 0."
              )}
              disabled
            />
          </div>
        </section>

        <section className="space-y-3 pt-2">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(locale, "Conexión con KPIs e iniciativas", "Connection with KPIs and initiatives")}
          </h2>
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "Los objetivos se traducen en indicadores (KPIs) y en iniciativas concretas. Aquí mostramos un resumen de cuántos tenemos configurados.",
              "Goals are translated into indicators (KPIs) and concrete initiatives. Here we show a summary of how many we have configured."
            )}
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-medium text-slate-600">
                {t(locale, "KPIs definidos (a nivel compañía)", "Defined KPIs (company level)")}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {kpiCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-medium text-slate-600">
                {t(locale, "Iniciativas asociadas al engagement", "Initiatives for this engagement")}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {initiativeCount}
              </p>
              <Link
                href={`/${locale}/wizard/${engagementId}/tables/initiatives`}
                className="mt-2 inline-block text-[11px] text-indigo-600 hover:text-indigo-500"
              >
                {t(locale, "Ver iniciativas", "View initiatives")}
              </Link>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "Con la visión y objetivos claros pasamos a mapear fortalezas, oportunidades, debilidades y amenazas.",
              "With vision and goals clear we move on to map strengths, opportunities, weaknesses and threats."
            )}
          </p>
          <Link
            href={`/${locale}/wizard/${engagementId}/step-4-foda`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(locale, "Ir a FODA →", "Go to SWOT →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
