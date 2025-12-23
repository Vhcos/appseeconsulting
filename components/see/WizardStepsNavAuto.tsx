"use client";

import { useSelectedLayoutSegments } from "next/navigation";
import WizardStepsNav from "@/components/see/WizardStepsNav";

type Props = {
  locale: string;
  engagementId: string;
};

export default function WizardStepsNavAuto({ locale, engagementId }: Props) {
  const segments = useSelectedLayoutSegments();

  // Ejemplos de segments:
  // ["dashboard"]
  // ["step-9-reporte"]
  // ["check-in", "kpis"]
  // ["report"]
  const first = segments?.[0] ? String(segments[0]) : "";

  let currentStep: string | undefined;

  if (!first) {
    currentStep = undefined;
  } else if (first === "dashboard") {
    currentStep = "dashboard";
  } else if (first === "report") {
    currentStep = "report";
  } else if (first === "check-in") {
    currentStep = "check-in";
  } else if (first.startsWith("step-")) {
    currentStep = first;
  } else {
    currentStep = undefined;
  }

  return (
    <WizardStepsNav
      locale={locale}
      engagementId={engagementId}
      currentStep={currentStep}
    />
  );
}
