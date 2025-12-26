import WizardStepsNav from "@/components/see/WizardStepsNav";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default async function CheckInPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <WizardStepsNav locale={locale} engagementId={engagementId} currentStep="check-in" />

      <h1 className="text-xl font-semibold text-slate-900">
        {t(locale, "Check-in", "Check-in")}
      </h1>

      <p className="mt-2 text-sm text-slate-600">
        {t(
          locale,
          "Sección opcional. Aquí vamos a comparar un período vs el anterior (KPIs + iniciativas) filtrado por Unidad.",
          "Optional section. Here we will compare a period vs the previous one (KPIs + initiatives) filtered by Unit."
        )}
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
        {t(
          locale,
          "Placeholder: en el siguiente paso armamos el wizard de Check-in (Período → KPIs → iniciativas → resumen).",
          "Placeholder: next we'll build the Check-in wizard (Period → KPIs → initiatives → summary)."
        )}
      </div>
    </div>
  );
}
