"use client";

import Link from "next/link";

type WizardStepsNavProps = {
  locale: string;
  engagementId: string;
  /** Segmento de ruta del paso actual, ej: "step-1-data-room" */
  currentStep: string;
};

type PhaseId =
  | "Kickoff"
  | "Diagnostic"
  | "Strategy"
  | "Portfolio"
  | "Roadmap"
  | "Governance"
  | "Report";

type StepConfig = {
  id: string;
  index: number;
  labelEs: string;
  labelEn: string;
  phase: PhaseId;
};

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

const STEPS: StepConfig[] = [
  {
    id: "step-0-engagement",
    index: 0,
    labelEs: "Contexto",
    labelEn: "Context",
    phase: "Kickoff",
  },
  {
    id: "step-1-data-room",
    index: 1,
    labelEs: "Data Room",
    labelEn: "Data Room",
    phase: "Kickoff",
  },
  {
    id: "step-2-diagnostico-360",
    index: 2,
    labelEs: "Encuestas",
    labelEn: "360° diagnosis",
    phase: "Diagnostic",
  },
  {
    id: "step-3-estrategia",
    index: 3,
    labelEs: "Visión, misión, objetivos",
    labelEn: "Vision, mission, goals",
    phase: "Strategy",
  },
  {
    id: "step-4-foda",
    index: 4,
    labelEs: "FODA",
    labelEn: "SWOT",
    phase: "Strategy",
  },
  {
    id: "step-5-bsc",
    index: 5,
    labelEs: "BSC",
    labelEn: "Scorecard (BSC)",
    phase: "Strategy",
  },
  {
    id: "step-6-portafolio",
    index: 6,
    labelEs: "Iniciativas",
    labelEn: "Initiatives",
    phase: "Portfolio",
  },
  {
    id: "step-7-roadmap",
    index: 7,
    labelEs: "Roadmap",
    labelEn: "Roadmap",
    phase: "Roadmap",
  },
  {
    id: "step-8-gobernanza",
    index: 8,
    labelEs: "Gobernanza",
    labelEn: "Governance & follow-up",
    phase: "Governance",
  },
  {
    id: "step-9-reporte",
    index: 9,
    labelEs: "Informe",
    labelEn: "Final report",
    phase: "Report",
  },
];

const PHASES: { id: PhaseId; labelEs: string; labelEn: string }[] = [
  { id: "Kickoff", labelEs: "Kickoff", labelEn: "Kickoff" },
  { id: "Diagnostic", labelEs: "Diagnóstico", labelEn: "Diagnostic" },
  { id: "Strategy", labelEs: "Estrategia", labelEn: "Strategy" },
  { id: "Portfolio", labelEs: "Portafolio", labelEn: "Portfolio" },
  { id: "Roadmap", labelEs: "Roadmap", labelEn: "Roadmap" },
  { id: "Governance", labelEs: "Gobernanza", labelEn: "Governance" },
  { id: "Report", labelEs: "Informe", labelEn: "Report" },
];

export default function WizardStepsNav({
  locale,
  engagementId,
  currentStep,
}: WizardStepsNavProps) {
  const currentStepDef = STEPS.find((s) => s.id === currentStep);
  const activePhase: PhaseId = currentStepDef?.phase ?? "Kickoff";

  return (
    <header className="mb-6 border-b border-slate-200 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Fila 1: fases */}
        <nav className="flex flex-wrap gap-2 text-xs font-medium">
          {PHASES.map((phase) => {
            const firstStepInPhase = STEPS.find((s) => s.phase === phase.id);
            const href = firstStepInPhase
              ? `/${locale}/wizard/${engagementId}/${firstStepInPhase.id}`
              : `/${locale}/wizard/${engagementId}/step-0-engagement`;

            const isActive = phase.id === activePhase;

            return (
              <Link
                key={phase.id}
                href={href}
                className={[
                  "inline-flex items-center rounded-full px-3 py-1 transition-colors",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                ].join(" ")}
              >
                {t(locale, phase.labelEs, phase.labelEn)}
              </Link>
            );
          })}
        </nav>

        {/* Botón de Panel de control (step-0-contexto) */}
        <Link
          href={`/${locale}/wizard/${engagementId}/step-0-contexto`}
          className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {t(locale, "Panel de control", "Dashboard")}
        </Link>
      </div>

      {/* Fila 2: pasos numerados */}
      <div className="mt-3 overflow-x-auto">
        <ol className="flex gap-2 text-xs">
          {STEPS.map((step) => {
            const isActive = step.id === currentStep;
            return (
              <li key={step.id}>
                <Link
                  href={`/${locale}/wizard/${engagementId}/${step.id}`}
                  className={[
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1 transition-colors",
                    isActive
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
                  ].join(" ")}
                >
                  <span className="text-[10px] font-semibold opacity-70">
                    {step.index}
                  </span>
                  <span>{t(locale, step.labelEs, step.labelEn)}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </header>
  );
}
