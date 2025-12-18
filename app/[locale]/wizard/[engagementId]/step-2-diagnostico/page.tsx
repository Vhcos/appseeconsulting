import Link from "next/link";
import WizardStepsNav from "@/components/see/WizardStepsNav";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default async function Step2DiagnosticoPage({
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
        currentStep="step-2-diagnostico"
      />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "Diagnóstico 360°", "360° diagnosis")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Aquí consolidamos lo que dice la organización y el cliente. Usamos resultados de encuesta interna y entrevistas para identificar brechas clave.",
              "Here we consolidate what the organization and the client say. We use survey results and interviews to identify key gaps."
            )}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}/step-1-data-room`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Volver al Data Room", "Back to Data Room")}
        </Link>
      </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Encuesta */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {t(locale, "Encuesta interna", "Internal survey")}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {t(
                  locale,
                  "Resultados agregados de la encuesta anónima al equipo (alineamiento, propuesta de valor, prioridades, HSEC, datos, etc.).",
                  "Aggregated results from the anonymous staff survey (alignment, value proposition, priorities, HSEC, data, etc.)."
                )}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
              {t(locale, "Basado en Anexo B", "Based on Annex B")}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                {t(
                  locale,
                  "Resumen de resultados cuantitativos",
                  "Summary of quantitative results"
                )}
              </label>
              <textarea
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: 70% percibe que la estrategia no está clara; 60% ve sobrecarga operacional; solo 35% cree que usamos bien los datos.",
                  "e.g. 70% perceive unclear strategy; 60% see operational overload; only 35% think we use data well."
                )}
                disabled
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                {t(
                  locale,
                  "Ideas fuerza de respuestas abiertas",
                  "Key themes from open-ended answers"
                )}
              </label>
              <textarea
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: Falta foco; poca coordinación entre áreas; esfuerzo alto para mantener contratos actuales; dudas sobre visión a 3 años.",
                  "e.g. Lack of focus; poor coordination between areas; high effort just to maintain current contracts; doubts about 3-year vision."
                )}
                disabled
              />
            </div>
          </div>
        </section>

        {/* Entrevistas */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {t(locale, "Entrevistas por rol", "Role-based interviews")}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {t(
                  locale,
                  "Principales aprendizajes por rol (Directorio, Gerencia General, Operaciones, HSEC, Comercial, Finanzas, Datos, cliente, etc.).",
                  "Main insights per role (Board, CEO, Operations, HSEC, Commercial, Finance, Data, client, etc.)."
                )}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
              {t(locale, "Basado en Anexo C", "Based on Annex C")}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                {t(
                  locale,
                  "Hallazgos desde gerencia y directorio",
                  "Findings from management and board"
                )}
              </label>
              <textarea
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: Preocupación por concentración en un cliente; falta de palancas claras para crecer; dudas sobre capacidades actuales.",
                  "e.g. Concern about dependency on one client; lack of clear growth levers; doubts about current capabilities."
                )}
                disabled
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                {t(
                  locale,
                  "Hallazgos desde operaciones / HSEC / cliente",
                  "Findings from operations / HSEC / client"
                )}
              </label>
              <textarea
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: Alto orgullo por la operación; preocupaciones por carga administrativa; oportunidades de automatizar reportes; feedback directo del cliente.",
                  "e.g. High pride in operations; concerns about admin burden; opportunities to automate reports; direct client feedback."
                )}
                disabled
              />
            </div>
          </div>
        </section>

        {/* Brechas */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {t(locale, "Brechas clave del diagnóstico", "Key gaps from diagnosis")}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {t(
                  locale,
                  "Resumen de 5–7 brechas que conectan directamente con la estrategia y las iniciativas.",
                  "Summary of 5–7 gaps that directly connect with strategy and initiatives."
                )}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Lista de brechas priorizadas", "Prioritized gap list")}
            </label>
            <textarea
              rows={5}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: 1) Estrategia difusa y poco compartida. 2) Uso limitado de datos para gestionar contratos. 3) Sobrecarga del equipo clave. 4) Riesgos HSEC mal integrados en la conversación comercial. 5) Falta de portafolio de iniciativas priorizado.",
                "e.g. 1) Unclear strategy not shared across team. 2) Limited data usage to manage contracts. 3) Key team overload. 4) HSEC risks poorly integrated into commercial discussion. 5) No prioritized initiative portfolio."
              )}
              disabled
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "Estas brechas alimentan los talleres de visión, misión, objetivos y FODA en el siguiente paso.",
              "These gaps feed the vision, mission, goals and SWOT workshops in the next step."
            )}
          </p>

          <Link
            href={`/${locale}/wizard/${engagementId}/step-3-estrategia`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(
              locale,
              "Ir a visión, misión y objetivos →",
              "Go to vision, mission and goals →"
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
