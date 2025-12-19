/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WizardStepsNav from "@/components/see/WizardStepsNav";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default async function Step4FodaPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  const risks = await prisma.risk.findMany({
    where: { engagementId },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <WizardStepsNav
        locale={locale}
        engagementId={engagementId}
        currentStep="step-4-foda"
      />

      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          {t(locale, "FODA", "SWOT")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {t(
            locale,
            "Ordenamos las principales fortalezas, oportunidades, debilidades y amenazas para conectar el diagnóstico con la estrategia.",
            "We organize the main strengths, opportunities, weaknesses and threats to connect diagnosis with strategy."
          )}
        </p>
      </header>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(locale, "Riesgos y oportunidades identificados", "Identified risks and opportunities")}
          </h2>
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "Usamos la tabla de riesgos como base para las amenazas del FODA y para algunas oportunidades clave.",
              "We use the risks table as a base for the threats in the SWOT and for some key opportunities."
            )}
          </p>

          {risks.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t(
                locale,
                "Aún no hay riesgos registrados para este engagement. Puedes cargarlos en la tabla de riesgos.",
                "There are no risks registered for this engagement yet. You can load them in the risks table."
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs text-slate-800">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 font-medium">
                      {t(locale, "Riesgo / oportunidad", "Risk / opportunity")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t(locale, "Tipo", "Type")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t(locale, "Impacto", "Impact")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {risks.map((r, idx) => {
                    const rr: any = r;
                    return (
                      <tr
                        key={r.id}
                        className={
                          idx % 2 === 0
                            ? "border-b border-slate-100 bg-white"
                            : "border-b border-slate-100 bg-slate-50"
                        }
                      >
                        <td className="px-3 py-2 text-[11px] text-slate-900">
                          {rr.title ?? rr.description ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-700">
                          {rr.category ?? rr.type ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-700">
                          {rr.impact ?? rr.level ?? "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Link
            href={`/${locale}/wizard/${engagementId}/tables/risks`}
            className="inline-block text-[11px] text-indigo-600 hover:text-indigo-500"
          >
            {t(locale, "Abrir tabla de riesgos", "Open risks table")}
          </Link>
        </section>

        {/* Los cuatro cuadrantes FODA se dejan como textos guiados */}
        <section className="grid gap-4 md:grid-cols-2">
          {["Fortalezas", "Debilidades", "Oportunidades", "Amenazas"].map(
            (labelEs) => {
              const labelEnMap: Record<string, string> = {
                Fortalezas: "Strengths",
                Debilidades: "Weaknesses",
                Oportunidades: "Opportunities",
                Amenazas: "Threats",
              };
              const labelEn = labelEnMap[labelEs];
              return (
                <div key={labelEs} className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {t(locale, labelEs, labelEn)}
                  </p>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                    placeholder={t(
                      locale,
                      `Ej: Principales ${labelEs.toLowerCase()} que aparecen en el diagnóstico.`,
                      `e.g. Main ${labelEn.toLowerCase()} that appear in the diagnosis.`
                    )}
                    disabled
                  />
                </div>
              );
            }
          )}
        </section>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "Con el FODA listo construimos el cuadro de mando (BSC) por perspectiva.",
              "With the SWOT ready we build the scorecard (BSC) by perspective."
            )}
          </p>
          <Link
            href={`/${locale}/wizard/${engagementId}/step-5-bsc`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(locale, "Ir a Cuadro de mando (BSC) →", "Go to Scorecard (BSC) →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
