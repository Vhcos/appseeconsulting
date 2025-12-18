import Link from "next/link";
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <WizardStepsNav
        locale={locale}
        engagementId={engagementId}
        currentStep="step-3-estrategia"
      />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(
              locale,
              "Visión, misión y objetivos estratégicos",
              "Vision, mission and strategic goals"
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "En este paso definimos la estrella polar del negocio a 3 años y los objetivos que guiarán el BSC y el portafolio de iniciativas.",
              "In this step we define the 3-year north star and the goals that will drive the BSC and initiative portfolio."
            )}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}/step-2-diagnostico`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Volver al diagnóstico 360°", "Back to 360° diagnosis")}
        </Link>
      </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Visión */}
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "Visión a 3 años", "3-year vision")}
            </h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
              {t(locale, "Taller 1 · Anexo D", "Workshop 1 · Annex D")}
            </span>
          </div>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            placeholder={t(
              locale,
              "Ej: Ser el partner estratégico preferido de la minera X en soluciones de datos y operación, duplicando el tamaño del negocio manteniendo estándares HSEC de clase mundial.",
              "e.g. Become the preferred strategic partner of mining company X in data and operations, doubling business size while keeping world-class HSEC standards."
            )}
            disabled
          />
          <p className="text-[11px] text-slate-500">
            {t(
              locale,
              "Texto corto, aspiracional pero aterrizado, que se pueda leer en menos de 20 segundos.",
              "Short, aspirational but grounded text that can be read in under 20 seconds."
            )}
          </p>
        </section>

        {/* Misión */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(locale, "Misión", "Mission")}
          </h2>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            placeholder={t(
              locale,
              "Ej: Diseñamos y operamos soluciones que combinan datos, tecnología y personas para que la minería sea más segura, eficiente y sustentable.",
              "e.g. We design and operate solutions that combine data, technology and people to make mining safer, more efficient and more sustainable."
            )}
            disabled
          />
          <p className="text-[11px] text-slate-500">
            {t(
              locale,
              "Debe explicar qué hacemos, para quién y cómo, sin jerga innecesaria.",
              "Should explain what we do, for whom and how, without unnecessary jargon."
            )}
          </p>
        </section>

        {/* Objetivos */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "Objetivos estratégicos", "Strategic goals")}
            </h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
              {t(locale, "Se conectan con el BSC", "They connect to the BSC")}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "Normalmente definimos entre 3 y 5 objetivos para los próximos 36 meses. Luego, cada objetivo tendrá 1–3 KPI en el cuadro de mando.",
              "We usually define between 3 and 5 goals for the next 36 months. Each goal will later have 1–3 KPIs in the scorecard."
            )}
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {["1", "2", "3", "4"].map((n, idx) => (
              <div key={n} className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  {idx < 3
                    ? t(locale, `Objetivo ${n}`, `Goal ${n}`)
                    : t(locale, "Objetivo 4 (opcional)", "Goal 4 (optional)")}
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder={
                    idx === 0
                      ? t(
                          locale,
                          "Ej: Aumentar el margen EBITDA consolidado al 18–20%.",
                          "e.g. Increase consolidated EBITDA margin to 18–20%."
                        )
                      : idx === 1
                      ? t(
                          locale,
                          "Ej: Mejorar la satisfacción del cliente clave a un NPS ≥ 60.",
                          "e.g. Improve key client's satisfaction to NPS ≥ 60."
                        )
                      : idx === 2
                      ? t(
                          locale,
                          "Ej: Reducir la exposición a riesgos HSEC críticos en un 50%.",
                          "e.g. Reduce exposure to critical HSEC risks by 50%."
                        )
                      : t(
                          locale,
                          "Ej: Desarrollar al menos 2 nuevas líneas de servicio relevantes para la minera.",
                          "e.g. Develop at least 2 new service lines relevant for the mining client."
                        )
                  }
                  disabled
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "En el siguiente paso transformaremos estos objetivos en un Cuadro de Mando (BSC) con KPI, metas y dueños.",
              "In the next step we'll turn these goals into a Balanced Scorecard (BSC) with KPIs, targets and owners."
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
