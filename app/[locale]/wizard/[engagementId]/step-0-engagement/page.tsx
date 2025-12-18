import Link from "next/link";
import WizardStepsNav from "@/components/see/WizardStepsNav";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default async function Step0EngagementPage({
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
        currentStep="step-0-engagement"
      />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "Ficha del engagement", "Engagement overview")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Aquí dejamos claro quién es la empresa, qué quiere lograr y en qué horizonte de tiempo. Esta ficha alimenta el informe final.",
              "Here we capture who the company is, what it wants to achieve and in which time horizon. This sheet feeds the final report."
            )}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Volver al engagement", "Back to engagement")}
        </Link>
      </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Nombre de la empresa", "Company name")}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(locale, "Ej: Casia", "e.g. Casia")}
              disabled
            />
            <p className="text-[11px] text-slate-500">
              {t(
                locale,
                "Más adelante conectaremos este campo al modelo Engagement.",
                "Later this field will be connected to the Engagement model."
              )}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Rubro / industria", "Industry")}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: Minería sustentable / servicios a la minería",
                "e.g. Sustainable mining / mining services"
              )}
              disabled
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Meta a 12 meses", "12-month goal")}
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: Ordenar contratos actuales, estabilizar margen y mejorar relación con cliente clave.",
                "e.g. Organize current contracts, stabilize margin and improve relationship with key client."
              )}
              disabled
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Meta a 36 meses", "36-month goal")}
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: Duplicar tamaño del negocio manteniendo seguridad, margen y reputación con la minera.",
                "e.g. Double business size while maintaining safety, margin and reputation with the mining client."
              )}
              disabled
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Sponsor principal", "Main sponsor")}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: Gerente general / CEO",
                "e.g. General manager / CEO"
              )}
              disabled
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Equipo clave del proceso", "Core team for this process")}
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: Operaciones, Finanzas, HSEC, Comercial, Transformación.",
                "e.g. Operations, Finance, HSEC, Commercial, Transformation."
              )}
              disabled
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "En la próxima iteración estos campos se guardarán y se usarán en el informe final.",
              "In a next iteration these fields will be saved and used in the final report."
            )}
          </p>
          <div className="flex gap-2">
            <Link
              href={`/${locale}/wizard/${engagementId}/step-1-data-room`}
              className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              {t(locale, "Ir al Data Room →", "Go to Data Room →")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
