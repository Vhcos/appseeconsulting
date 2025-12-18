import Link from "next/link";
import WizardStepsNav from "@/components/see/WizardStepsNav";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

const DATA_ROOM_ITEMS: { key: string; es: string; en: string; categoryEs: string; categoryEn: string }[] = [
  {
    key: "financials",
    categoryEs: "Finanzas",
    categoryEn: "Finance",
    es: "Estados de resultados, balances y flujos de caja de los últimos 3 años",
    en: "P&L, balance sheet and cashflows for the last 3 years",
  },
  {
    key: "contracts",
    categoryEs: "Contratos",
    categoryEn: "Contracts",
    es: "Contratos vigentes con clientes clave (incluyendo anexos relevantes)",
    en: "Active contracts with key clients (including relevant addendums)",
  },
  {
    key: "pipeline",
    categoryEs: "Comercial",
    categoryEn: "Commercial",
    es: "Pipeline comercial y cartera de proyectos en evaluación",
    en: "Sales pipeline and portfolio of projects under evaluation",
  },
  {
    key: "org-chart",
    categoryEs: "Personas",
    categoryEn: "People",
    es: "Organigrama actualizado y descripción resumida de roles clave",
    en: "Updated org chart and short description of key roles",
  },
  {
    key: "hsec",
    categoryEs: "HSEC",
    categoryEn: "HSEC",
    es: "Indicadores HSEC relevantes (accidentalidad, hallazgos críticos, etc.)",
    en: "Relevant HSEC indicators (incidents, critical findings, etc.)",
  },
  {
    key: "ops-kpi",
    categoryEs: "Operaciones",
    categoryEn: "Operations",
    es: "KPI operacionales actuales asociados al contrato/negocio",
    en: "Current operational KPIs associated with the contract/business",
  },
];

export default async function Step1DataRoomPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <WizardStepsNav
        locale={locale}
        engagementId={engagementId}
        currentStep="step-1-data-room"
      />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "Data Room estratégico", "Strategic Data Room")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Antes de opinar sobre la estrategia, necesitamos ordenar la información crítica del negocio. Esta checklist se basa en el Anexo A.",
              "Before we discuss strategy, we need to organize the critical business information. This checklist is based on Annex A."
            )}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}/step-0-engagement`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Volver a contexto", "Back to context")}
        </Link>
      </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <section className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "En la versión actual esta tabla es solo referencial. En próximas iteraciones podrás marcar el estado de cada ítem y subir archivos.",
              "In the current version this table is only reference. In future iterations you'll be able to set status and upload files."
            )}
          </p>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
            {t(locale, "Basado en Anexo A", "Based on Annex A")}
          </span>
        </section>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs text-slate-800">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 font-medium">
                  {t(locale, "Categoría", "Category")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, "Documento / información requerida", "Required document / information")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, "Estado (referencial)", "Status (reference)")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, "Comentarios", "Comments")}
                </th>
              </tr>
            </thead>
            <tbody>
              {DATA_ROOM_ITEMS.map((item, idx) => (
                <tr
                  key={item.key}
                  className={idx % 2 === 0 ? "border-b border-slate-100 bg-white" : "border-b border-slate-100 bg-slate-50"}
                >
                  <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                    {t(locale, item.categoryEs, item.categoryEn)}
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] text-slate-800">
                    {t(locale, item.es, item.en)}
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] text-slate-600">
                    {t(locale, "Pendiente / parcial / completo", "Pending / partial / complete")}
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] text-slate-500">
                    {t(
                      locale,
                      "Aquí luego se podrán agregar notas específicas por ítem.",
                      "Here you'll later be able to add notes per item."
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "Cuando el Data Room esté razonablemente completo, pasamos al diagnóstico 360° (encuestas + entrevistas).",
              "Once the Data Room is reasonably complete, we move to the 360° diagnosis (surveys + interviews)."
            )}
          </p>

          <Link
            href={`/${locale}/wizard/${engagementId}/step-2-diagnostico`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(locale, "Ir al diagnóstico 360° →", "Go to 360° diagnosis →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
