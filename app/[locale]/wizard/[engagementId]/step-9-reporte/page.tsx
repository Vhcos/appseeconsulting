import Link from "next/link";
import WizardStepsNav from "@/components/see/WizardStepsNav";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

async function getCounts(engagementId: string) {
  const [
    initiatives,
    risks,
    decisions,
    roadmapWeeks,
    actions,
    raci,
    unitEconomics,
    accountPlans,
  ] = await Promise.all([
    prisma.initiative.count({ where: { engagementId } }),
    prisma.risk.count({ where: { engagementId } }),
    prisma.decision.count({ where: { engagementId } }),
    prisma.roadmapWeek.count({ where: { engagementId } }),
    prisma.actionItem.count({ where: { engagementId } }),
    prisma.raciRow.count({ where: { engagementId } }),
    prisma.unitEconomicsRow.count({ where: { engagementId } }),
    prisma.accountPlanRow.count({ where: { engagementId } }),
  ]);

  return {
    initiatives,
    risks,
    decisions,
    roadmapWeeks,
    actions,
    raci,
    unitEconomics,
    accountPlans,
  };
}

export default async function Step9ReportePage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const counts = await getCounts(engagementId);

  const sections = [
    {
      key: "diagnosis",
      labelEs: "Diagnóstico 360° (encuesta + entrevistas)",
      labelEn: "360° diagnosis (survey + interviews)",
      ready: true, // viene de los steps 2–3 narrativos
    },
    {
      key: "strategy",
      labelEs: "Visión, misión, objetivos y FODA",
      labelEn: "Vision, mission, goals and SWOT",
      ready: true,
    },
    {
      key: "bsc",
      labelEs: "Cuadro de mando (BSC) y KPI",
      labelEn: "Scorecard (BSC) and KPIs",
      ready: counts.initiatives > 0 || counts.unitEconomics > 0,
    },
    {
      key: "portfolio",
      labelEs: "Portafolio de iniciativas",
      labelEn: "Initiative portfolio",
      ready: counts.initiatives > 0,
      detail: `${counts.initiatives} iniciativas`,
    },
    {
      key: "roadmap",
      labelEs: "Roadmap 20 semanas",
      labelEn: "20-week roadmap",
      ready: counts.roadmapWeeks >= 1,
      detail: `${counts.roadmapWeeks} semanas cargadas`,
    },
    {
      key: "governance",
      labelEs: "Gobernanza (acciones + RACI)",
      labelEn: "Governance (actions + RACI)",
      ready: counts.actions > 0 || counts.raci > 0,
      detail: `${counts.actions} acciones, ${counts.raci} filas RACI`,
    },
    {
      key: "economics",
      labelEs: "Unit economics y plan de cuenta",
      labelEn: "Unit economics and account plan",
      ready: counts.unitEconomics > 0 || counts.accountPlans > 0,
      detail: `${counts.unitEconomics} filas unit economics, ${counts.accountPlans} planes`,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <WizardStepsNav
        locale={locale}
        engagementId={engagementId}
        currentStep="step-9-reporte"
      />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "Informe final", "Final report")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "En este último paso cerramos el informe ejecutivo que resume todo el proceso: diagnóstico, estrategia, portafolio, roadmap y gobernanza.",
              "In this last step we close the executive report that sums up the whole process: diagnosis, strategy, portfolio, roadmap and governance."
            )}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}/step-8-gobernanza`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Volver a gobernanza", "Back to governance")}
        </Link>
      </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Estado de secciones */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(locale, "Estado de las secciones del informe", "Report sections status")}
          </h2>
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "Usamos las tablas del engagement para chequear qué partes del informe ya tienen datos y cuáles siguen pendientes.",
              "We use the engagement tables to check which parts of the report already have data and which ones are still pending."
            )}
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs text-slate-800">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Sección", "Section")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Estado", "Status")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Detalle", "Detail")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sections.map((s, idx) => (
                  <tr
                    key={s.key}
                    className={
                      idx % 2 === 0
                        ? "border-b border-slate-100 bg-white"
                        : "border-b border-slate-100 bg-slate-50"
                    }
                  >
                    <td className="px-3 py-2 align-top text-[11px] text-slate-900">
                      {t(locale, s.labelEs, s.labelEn)}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px]">
                      <span
                        className={
                          s.ready
                            ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-100"
                            : "inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700 border border-amber-100"
                        }
                      >
                        {s.ready
                          ? t(locale, "Listo / con datos", "Ready / has data")
                          : t(locale, "Pendiente", "Pending")}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-600">
                      {s.detail ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Llamado a generar / revisar informe */}
        <section className="space-y-3 pt-2">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(locale, "Ver informe consolidado", "View consolidated report")}
          </h2>
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "El informe final se genera en una página separada usando todos los datos del engagement. Desde ahí luego podremos exportar a PDF.",
              "The final report is generated in a separate page using all engagement data. From there we can later export to PDF."
            )}
          </p>

          <Link
            href={`/${locale}/report/${engagementId}`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(locale, "Abrir informe final →", "Open final report →")}
          </Link>
        </section>

        <section className="space-y-2 pt-2">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(locale, "Notas para entrega al cliente", "Notes for client delivery")}
          </h2>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            placeholder={t(
              locale,
              "Ej: Próximos pasos acordados con el directorio, compromisos de la próxima reunión y detalles de cómo se usará el informe.",
              "e.g. Next steps agreed with the board, commitments for the next meeting and details on how the report will be used."
            )}
            disabled
          />
        </section>
      </div>
    </div>
  );
}
