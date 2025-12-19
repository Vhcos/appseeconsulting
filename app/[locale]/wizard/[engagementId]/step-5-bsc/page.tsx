/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WizardStepsNav from "@/components/see/WizardStepsNav";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

const PERSPECTIVE_LABELS: Record<string, { es: string; en: string }> = {
  FINANCIAL: { es: "Finanzas", en: "Finance" },
  CUSTOMER: { es: "Clientes", en: "Customers" },
  INTERNAL: { es: "Procesos internos", en: "Internal processes" },
  LEARNING: { es: "Personas / aprendizaje", en: "People / learning" },
};

function perspectiveLabel(locale: string, raw: unknown): string {
  if (!raw) return "-";
  const key = String(raw);
  const labels = PERSPECTIVE_LABELS[key];
  if (!labels) return key;
  return locale === "en" ? labels.en : labels.es;
}

export default async function Step5BscPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  const [kpiCount, initiatives] = await Promise.all([
    prisma.kpi.count(),
    prisma.initiative.findMany({ where: { engagementId } }),
  ]);

  const initiativesByPerspective: Record<string, any[]> = {};
  for (const init of initiatives as any[]) {
    const p = String(init.perspective ?? "OTHER");
    if (!initiativesByPerspective[p]) initiativesByPerspective[p] = [];
    initiativesByPerspective[p].push(init);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <WizardStepsNav
        locale={locale}
        engagementId={engagementId}
        currentStep="step-5-bsc"
      />

      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          {t(locale, "Cuadro de mando (BSC)", "Scorecard (BSC)")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {t(
            locale,
            "Transformamos la visión y los objetivos estratégicos en un cuadro de mando con KPI, metas y responsables por perspectiva.",
            "We transform vision and strategic goals into a scorecard with KPIs, targets and owners per perspective."
          )}
        </p>
      </header>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <section className="space-y-3">
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "Este cuadro se conecta con dos cosas: la librería de KPIs de la compañía y el portafolio de iniciativas de este engagement.",
              "This scorecard connects with two things: the company's KPI library and this engagement's initiative portfolio."
            )}
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-medium text-slate-600">
                {t(locale, "KPIs definidos (total)", "Defined KPIs (total)")}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {kpiCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-medium text-slate-600">
                {t(locale, "Iniciativas en este engagement", "Initiatives in this engagement")}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {initiatives.length}
              </p>
              <Link
                href={`/${locale}/wizard/${engagementId}/tables/initiatives`}
                className="mt-2 inline-block text-[11px] text-indigo-600 hover:text-indigo-500"
              >
                {t(locale, "Ver tabla de iniciativas", "View initiatives table")}
              </Link>
            </div>
          </div>
        </section>

        {/* Vista por perspectiva usando iniciativas como proxy de foco */}
        <section className="space-y-3 pt-2">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(locale, "Foco por perspectiva", "Focus by perspective")}
          </h2>
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "Aquí vemos cuántas iniciativas cuelgan de cada perspectiva del BSC. Más adelante podremos aterrizar los KPI por perspectiva.",
              "Here we see how many initiatives hang from each BSC perspective. Later we can map the KPIs per perspective."
            )}
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {Object.keys(initiativesByPerspective).length === 0 ? (
              <p className="text-sm text-slate-500">
                {t(
                  locale,
                  "Aún no hay iniciativas clasificadas por perspectiva. Puedes hacerlo en la tabla de iniciativas.",
                  "There are no initiatives classified by perspective yet. You can do it in the initiatives table."
                )}
              </p>
            ) : (
              Object.entries(initiativesByPerspective).map(([p, list]) => (
                <div
                  key={p}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                >
                  <p className="text-[11px] font-medium text-slate-600">
                    {perspectiveLabel(locale, p)}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {list.length}{" "}
                    {t(locale, "iniciativas", "initiatives")}
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-slate-700">
                    {(list as any[]).slice(0, 4).map((init) => (
                      <li key={init.id}>• {init.title ?? "-"}</li>
                    ))}
                    {list.length > 4 && (
                      <li className="text-[11px] text-slate-500">
                        +{list.length - 4} {t(locale, "más…", "more…")}
                      </li>
                    )}
                  </ul>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "Con el BSC armado pasamos al portafolio de iniciativas, donde ya conectamos directamente con las tablas.",
              "With the BSC set up we move to the initiative portfolio, where we already connect directly with the tables."
            )}
          </p>
          <Link
            href={`/${locale}/wizard/${engagementId}/step-6-portafolio`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(locale, "Ir a Portafolio →", "Go to Portfolio →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
