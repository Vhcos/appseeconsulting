import Link from "next/link";
import WizardStepsNav from "@/components/see/WizardStepsNav";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

type BscRow = {
  perspectiveEs: string;
  perspectiveEn: string;
  goalLabelEs: string;
  goalLabelEn: string;
  kpiLabelEs: string;
  kpiLabelEn: string;
};

const BSC_ROWS: BscRow[] = [
  {
    perspectiveEs: "Finanzas",
    perspectiveEn: "Finance",
    goalLabelEs: "Objetivo financiero",
    goalLabelEn: "Financial goal",
    kpiLabelEs: "KPI financiero",
    kpiLabelEn: "Financial KPI",
  },
  {
    perspectiveEs: "Clientes",
    perspectiveEn: "Customers",
    goalLabelEs: "Objetivo de clientes",
    goalLabelEn: "Customer goal",
    kpiLabelEs: "KPI de clientes",
    kpiLabelEn: "Customer KPI",
  },
  {
    perspectiveEs: "Procesos internos",
    perspectiveEn: "Internal processes",
    goalLabelEs: "Objetivo de procesos",
    goalLabelEn: "Process goal",
    kpiLabelEs: "KPI de procesos",
    kpiLabelEn: "Process KPI",
  },
  {
    perspectiveEs: "Personas / aprendizaje",
    perspectiveEn: "People / learning",
    goalLabelEs: "Objetivo de personas",
    goalLabelEn: "People goal",
    kpiLabelEs: "KPI de personas",
    kpiLabelEn: "People KPI",
  },
];

export default async function Step5BscPage({
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
        currentStep="step-5-bsc"
      />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "Cuadro de mando (BSC)", "Balanced Scorecard (BSC)")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Transformamos la visión y los objetivos estratégicos en un Cuadro de Mando con KPI, metas y responsables por perspectiva.",
              "We turn the vision and strategic goals into a Scorecard with KPIs, targets and owners by perspective."
            )}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}/step-4-foda`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Volver a FODA", "Back to SWOT")}
        </Link>
      </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <section className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "Para cada perspectiva definimos 1–2 objetivos, sus KPI, metas a 12/36 meses y un responsable. Esto se conectará después con las iniciativas y el roadmap.",
              "For each perspective we define 1–2 goals, their KPIs, 12/36-month targets and an owner. This will later connect with initiatives and the roadmap."
            )}
          </p>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
            {t(locale, "Taller 3 · BSC", "Workshop 3 · BSC")}
          </span>
        </section>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs text-slate-800">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 font-medium">
                  {t(locale, "Perspectiva", "Perspective")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, "Objetivo", "Goal")}
                </th>
                <th className="px-3 py-2 font-medium">KPI</th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, "Meta 12 meses", "12-month target")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, "Meta 36 meses", "36-month target")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t(locale, "Responsable", "Owner")}
                </th>
              </tr>
            </thead>
            <tbody>
              {BSC_ROWS.map((row, idx) => (
                <tr
                  key={row.perspectiveEs}
                  className={
                    idx % 2 === 0
                      ? "border-b border-slate-100 bg-white"
                      : "border-b border-slate-100 bg-slate-50"
                  }
                >
                  <td className="px-3 py-2 align-top text-[11px] font-medium text-slate-800">
                    {t(locale, row.perspectiveEs, row.perspectiveEn)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <textarea
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 placeholder:text-slate-400"
                      placeholder={t(
                        locale,
                        "Ej: Aumentar el margen EBITDA consolidado.",
                        "e.g. Increase consolidated EBITDA margin."
                      )}
                      disabled
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <textarea
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 placeholder:text-slate-400"
                      placeholder={t(
                        locale,
                        "Ej: Margen EBITDA %, NPS, % contratos con estándar HSEC, etc.",
                        "e.g. EBITDA margin %, NPS, % contracts meeting HSEC standard, etc."
                      )}
                      disabled
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 placeholder:text-slate-400"
                      placeholder={t(locale, "Ej: 18%", "e.g. 18%")}
                      disabled
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 placeholder:text-slate-400"
                      placeholder={t(locale, "Ej: 20%", "e.g. 20%")}
                      disabled
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 placeholder:text-slate-400"
                      placeholder={t(
                        locale,
                        "Ej: Gerente de Finanzas, Gerente de Operaciones, etc.",
                        "e.g. Finance Manager, Operations Manager, etc."
                      )}
                      disabled
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="space-y-2 pt-2">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(locale, "Notas sobre alineamiento", "Alignment notes")}
          </h2>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            placeholder={t(
              locale,
              "Ej: Cómo se conectan estos objetivos con el FODA, con el contrato clave y con el roadmap de 20 semanas.",
              "e.g. How these goals connect with SWOT, the key contract and the 20-week roadmap."
            )}
            disabled
          />
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "En el siguiente paso bajaremos este cuadro de mando a un portafolio de iniciativas priorizado.",
              "In the next step we'll translate this scorecard into a prioritized initiative portfolio."
            )}
          </p>

          <Link
            href={`/${locale}/wizard/${engagementId}/step-6-portafolio`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(locale, "Ir a Portafolio de iniciativas →", "Go to initiative portfolio →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
