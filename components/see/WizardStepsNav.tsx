import Link from "next/link";

type WizardStepsNavProps = {
  locale: string;
  engagementId: string;
  currentStep: string;
};

const STEPS: { id: string; labelEs: string; labelEn: string; phase: string }[] = [
  { id: "step-0-engagement",  labelEs: "Contexto",                    labelEn: "Context",                    phase: "Kickoff" },
  { id: "step-1-data-room",   labelEs: "Data Room",                   labelEn: "Data Room",                  phase: "Diagnóstico" },
  { id: "step-2-diagnostico", labelEs: "Diagnóstico 360°",            labelEn: "360° diagnosis",             phase: "Diagnóstico" },
  { id: "step-3-estrategia",  labelEs: "Visión, misión, objetivos",   labelEn: "Vision, mission, goals",     phase: "Estrategia" },
  { id: "step-4-foda",        labelEs: "FODA",                        labelEn: "SWOT",                        phase: "Estrategia" },
  { id: "step-5-bsc",         labelEs: "Cuadro de mando (BSC)",       labelEn: "Scorecard (BSC)",            phase: "Estrategia" },
  { id: "step-6-portafolio",  labelEs: "Portafolio iniciativas",      labelEn: "Initiative portfolio",       phase: "Portafolio" },
  { id: "step-7-roadmap",     labelEs: "Roadmap 20 semanas",          labelEn: "20-week roadmap",            phase: "Roadmap" },
  { id: "step-8-gobernanza",  labelEs: "Gobernanza",                  labelEn: "Governance",                 phase: "Gobernanza" },
  { id: "step-9-reporte",     labelEs: "Informe final",               labelEn: "Final report",               phase: "Informe" },
];

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default function WizardStepsNav({
  locale,
  engagementId,
  currentStep,
}: WizardStepsNavProps) {
  return (
    <div className="mb-6 space-y-4">
      {/* Fases grandes */}
      <div className="flex flex-wrap gap-2 text-xs text-slate-700">
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {t(locale, "Kickoff", "Kickoff")}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {t(locale, "Diagnóstico", "Diagnosis")}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {t(locale, "Estrategia", "Strategy")}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {t(locale, "Portafolio", "Portfolio")}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {t(locale, "Roadmap", "Roadmap")}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {t(locale, "Gobernanza", "Governance")}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {t(locale, "Informe", "Report")}
        </span>
      </div>

      {/* Pasos */}
      <div className="overflow-x-auto">
        <ol className="flex min-w-max items-center gap-3 text-xs">
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            return (
              <li key={step.id} className="flex items-center gap-2">
                <Link
                  href={`/${locale}/wizard/${engagementId}/${step.id}`}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
                    isActive
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold">
                    {index}
                  </span>
                  <span className="whitespace-nowrap">
                    {t(locale, step.labelEs, step.labelEn)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
