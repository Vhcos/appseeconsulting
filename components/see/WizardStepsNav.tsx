import Link from "next/link";

type Params = {
  locale: string;
  engagementId: string;
  currentStep?: string; // ej: "step-4-foda" | "dashboard" | "report" | "check-in"
};

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

type PhaseId =
  | "Kickoff"
  | "Diagnostico"
  | "Estrategia"
  | "Portafolio"
  | "Roadmap"
  | "Gobernanza"
  | "Informe"
  | "Seguimiento";

const PHASES: { id: PhaseId; es: string; en: string }[] = [
  { id: "Kickoff", es: "Kickoff", en: "Kickoff" },
  { id: "Diagnostico", es: "Diagnóstico", en: "Diagnosis" },
  { id: "Estrategia", es: "Estrategia", en: "Strategy" },
  { id: "Portafolio", es: "Portafolio", en: "Portfolio" },
  { id: "Roadmap", es: "Roadmap", en: "Roadmap" },
  { id: "Gobernanza", es: "Gobernanza", en: "Governance" },
  { id: "Informe", es: "Informe", en: "Report" },
  { id: "Seguimiento", es: "Seguimiento", en: "Check-in" },
];

type StepDef = {
  id: string;
  index: number;
  es: string;
  en: string;
  phase: PhaseId;
  href: (locale: string, engagementId: string) => string;
};

const STEPS: StepDef[] = [
  {
    id: "step-0-engagement",
    index: 0,
    es: "Ficha",
    en: "Card",
    phase: "Kickoff",
    href: (l, e) => `/${l}/wizard/${e}/step-0-engagement`,
  },
  {
    id: "step-1-data-room",
    index: 1,
    es: "Data Room",
    en: "Data Room",
    phase: "Kickoff",
    href: (l, e) => `/${l}/wizard/${e}/step-1-data-room`,
  },
  {
    id: "step-2-encuesta",
    index: 2,
    es: "Encuestas",
    en: "Surveys",
    phase: "Diagnostico",
    href: (l, e) => `/${l}/wizard/${e}/step-2-encuesta`,
  },
  {
    id: "step-3-estrategia",
    index: 3,
    es: "Visión, misión, objetivos",
    en: "Vision, mission, objectives",
    phase: "Estrategia",
    href: (l, e) => `/${l}/wizard/${e}/step-3-estrategia`,
  },
  {
    id: "step-4-foda",
    index: 4,
    es: "FODA",
    en: "SWOT",
    phase: "Estrategia",
    href: (l, e) => `/${l}/wizard/${e}/step-4-foda`,
  },
  {
    id: "step-5-bsc",
    index: 5,
    es: "BSC",
    en: "BSC",
    phase: "Portafolio",
    href: (l, e) => `/${l}/wizard/${e}/step-5-bsc`,
  },
  {
    id: "step-6-portafolio",
    index: 6,
    es: "Iniciativas",
    en: "Initiatives",
    phase: "Portafolio",
    href: (l, e) => `/${l}/wizard/${e}/step-6-portafolio`,
  },
  {
    id: "step-7-roadmap",
    index: 7,
    es: "Roadmap",
    en: "Roadmap",
    phase: "Roadmap",
    href: (l, e) => `/${l}/wizard/${e}/step-7-roadmap`,
  },
  {
    id: "step-8-gobernanza",
    index: 8,
    es: "Gobernanza",
    en: "Governance",
    phase: "Gobernanza",
    href: (l, e) => `/${l}/wizard/${e}/step-8-gobernanza`,
  },
  {
    id: "step-9-reporte",
    index: 9,
    es: "Informe",
    en: "Report",
    phase: "Informe",
    href: (l, e) => `/${l}/wizard/${e}/step-9-reporte`,
  },

  // Paso 10: operación periódica
  {
    id: "check-in",
    index: 10,
    es: "Check-in",
    en: "Check-in",
    phase: "Seguimiento",
    href: (l, e) => `/${l}/wizard/${e}/check-in`,
  },
];

function phaseOf(stepId?: string): PhaseId {
  if (!stepId) return "Kickoff";
  if (stepId === "dashboard" || stepId === "report") return "Informe";
  const s = STEPS.find((x) => x.id === stepId);
  return s?.phase ?? "Kickoff";
}

export default function WizardStepsNav({ locale, engagementId, currentStep }: Params) {
  const activePhase = phaseOf(currentStep);

  const firstStepByPhase = (phase: PhaseId) => STEPS.find((s) => s.phase === phase);

  return (
    <div className="w-full">
      {/* Fases + botones rápidos */}
      <div className="flex flex-wrap items-center gap-2">
        {PHASES.map((p) => {
          const first = firstStepByPhase(p.id);
          const href = first ? first.href(locale, engagementId) : `/${locale}/wizard/${engagementId}/step-0-contexto`;
          const isActive = p.id === activePhase;

          return (
            <Link
              key={p.id}
              href={href}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                isActive
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {t(locale, p.es, p.en)}
            </Link>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/${locale}/wizard/${engagementId}/dashboard`}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              currentStep === "dashboard"
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {t(locale, "Panel de control", "Dashboard")}
          </Link>

          <Link
            href={`/${locale}/wizard/${engagementId}/check-in`}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              currentStep === "check-in"
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {t(locale, "Check-in", "Check-in")}
          </Link>

          <Link
            href={`/${locale}/wizard/${engagementId}/report`}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              currentStep === "report"
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {t(locale, "Informe", "Report")}
          </Link>
        </div>
      </div>

      {/* Steps */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {STEPS.map((s) => {
          const href = s.href(locale, engagementId);
          const isActive = s.id === currentStep;

          return (
            <Link
              key={s.id}
              href={href}
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              ].join(" ")}
            >
              <span className="text-[10px] font-semibold opacity-80">{s.index}</span>
              <span>{t(locale, s.es, s.en)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
