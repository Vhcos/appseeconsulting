import Link from "next/link";
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <WizardStepsNav
        locale={locale}
        engagementId={engagementId}
        currentStep="step-4-foda"
      />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "FODA estratégico", "Strategic SWOT")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "En este paso sintetizamos el diagnóstico en fortalezas, oportunidades, debilidades y amenazas que conectan directo con la estrategia.",
              "In this step we synthesize the diagnosis into strengths, opportunities, weaknesses and threats that directly connect to the strategy."
            )}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}/step-3-estrategia`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Volver a visión y objetivos", "Back to vision & goals")}
        </Link>
      </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <section className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "Usamos el FODA como puente entre el diagnóstico 360° y el portafolio de iniciativas. Normalmente priorizamos 3–5 ítems por cuadrante.",
              "We use the SWOT as a bridge between the 360° diagnosis and the initiative portfolio. We usually prioritize 3–5 items per quadrant."
            )}
          </p>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
            {t(locale, "Taller 2 · Anexo E", "Workshop 2 · Annex E")}
          </span>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Fortalezas */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="text-sm font-semibold text-emerald-900">
              {t(locale, "Fortalezas", "Strengths")}
            </h2>
            <p className="mt-1 text-[11px] text-emerald-900/80">
              {t(
                locale,
                "Capacidades internas que hoy nos ayudan a competir y que debemos cuidar o escalar.",
                "Internal capabilities that help us compete today and that we must protect or scale."
              )}
            </p>
            <textarea
              rows={5}
              className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-emerald-400"
              placeholder={t(
                locale,
                "Ej: 1) Equipo HSEC muy sólido. 2) Relación cercana con la minera. 3) Capacidad de respuesta en terreno.",
                "e.g. 1) Very strong HSEC team. 2) Close relationship with the mining client. 3) Strong in-field response capacity."
              )}
              disabled
            />
          </div>

          {/* Oportunidades */}
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <h2 className="text-sm font-semibold text-sky-900">
              {t(locale, "Oportunidades", "Opportunities")}
            </h2>
            <p className="mt-1 text-[11px] text-sky-900/80">
              {t(
                locale,
                "Tendencias externas o espacios de mercado que podríamos capturar si jugamos bien nuestras cartas.",
                "External trends or market spaces we could capture if we play our cards well."
              )}
            </p>
            <textarea
              rows={5}
              className="mt-2 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-sky-400"
              placeholder={t(
                locale,
                "Ej: 1) Empuje de la minera por digitalizar contratos. 2) Demanda por soluciones de datos y reporting. 3) Nuevos proyectos en cartera regional.",
                "e.g. 1) Client push to digitalize contracts. 2) Demand for data & reporting solutions. 3) New projects in regional pipeline."
              )}
              disabled
            />
          </div>

          {/* Debilidades */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-sm font-semibold text-amber-900">
              {t(locale, "Debilidades", "Weaknesses")}
            </h2>
            <p className="mt-1 text-[11px] text-amber-900/80">
              {t(
                locale,
                "Aspectos internos que hoy nos frenan y que requieren iniciativas específicas.",
                "Internal aspects that hold us back and require specific initiatives."
              )}
            </p>
            <textarea
              rows={5}
              className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-amber-500"
              placeholder={t(
                locale,
                "Ej: 1) Estrategia poco compartida. 2) Sobrecarga del equipo clave. 3) Poca estandarización de procesos.",
                "e.g. 1) Strategy not widely shared. 2) Key team overloaded. 3) Poor process standardization."
              )}
              disabled
            />
          </div>

          {/* Amenazas */}
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <h2 className="text-sm font-semibold text-rose-900">
              {t(locale, "Amenazas", "Threats")}
            </h2>
            <p className="mt-1 text-[11px] text-rose-900/80">
              {t(
                locale,
                "Riesgos externos que, si se materializan, impactan fuerte la sustentabilidad del negocio.",
                "External risks that, if they materialize, strongly impact the sustainability of the business."
              )}
            </p>
            <textarea
              rows={5}
              className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-rose-500"
              placeholder={t(
                locale,
                "Ej: 1) Alta concentración en un cliente. 2) Nuevos competidores con respaldo financiero. 3) Cambios regulatorios HSEC.",
                "e.g. 1) High dependency on one client. 2) New competitors with strong financial backing. 3) HSEC regulatory changes."
              )}
              disabled
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "El FODA se usa para justificar el portafolio de iniciativas y priorizar quick wins vs. apuestas de mediano plazo.",
              "The SWOT is used to justify the initiative portfolio and prioritize quick wins vs. medium-term bets."
            )}
          </p>

          <Link
            href={`/${locale}/wizard/${engagementId}/step-5-bsc`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(locale, "Ir al Cuadro de mando (BSC) →", "Go to Scorecard (BSC) →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
