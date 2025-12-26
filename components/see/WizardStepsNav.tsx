"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

type Props = {
  locale: string;
  engagementId: string;
  currentStep?: string | null;
};

type Phase = {
  id: string;
  labelEs: string;
  labelEn: string;
  steps: Array<{ id: string; labelEs: string; labelEn: string }>;
};

const PHASES: Phase[] = [
  {
    id: "kickoff",
    labelEs: "Kickoff",
    labelEn: "Kickoff",
    steps: [
      { id: "dashboard", labelEs: "Vista general", labelEn: "Overview" },
      { id: "step-0-engagement", labelEs: "Ficha cliente", labelEn: "Client sheet" },
      { id: "step-1-data-room", labelEs: "Data room", labelEn: "Data room" },
    ],
  },
  {
    id: "diagnostico",
    labelEs: "Diagnóstico",
    labelEn: "Diagnosis",
    steps: [
      { id: "step-2-encuesta", labelEs: "Encuesta", labelEn: "Survey" },
      { id: "step-2-diagnostico-360", labelEs: "360", labelEn: "360" },
      { id: "step-2b-entrevistas", labelEs: "Entrevistas", labelEn: "Interviews" },
    ],
  },
  {
    id: "estrategia",
    labelEs: "Estrategia",
    labelEn: "Strategy",
    steps: [
      { id: "step-3-estrategia", labelEs: "Visión/Misión/Objetivos", labelEn: "Vision/Mission/Objectives" },
      { id: "step-4-foda", labelEs: "FODA", labelEn: "SWOT" },
    ],
  },
  {
    id: "bsc",
    labelEs: "BSC",
    labelEn: "BSC",
    steps: [
      { id: "step-5-bsc", labelEs: "KPIs", labelEn: "KPIs" },
      { id: "step-6-portafolio", labelEs: "Portafolio", labelEn: "Portfolio" },
      { id: "step-7-roadmap", labelEs: "Roadmap", labelEn: "Roadmap" },
    ],
  },
  {
    id: "cierre",
    labelEs: "Cierre",
    labelEn: "Close-out",
    steps: [
      { id: "step-8-gobernanza", labelEs: "Gobernanza", labelEn: "Governance" },
      { id: "step-9-reporte", labelEs: "Informe", labelEn: "Report" },
    ],
  },
];

function withAccountId(href: string, accountId: string | null) {
  if (!accountId) return href;
  const glue = href.includes("?") ? "&" : "?";
  return `${href}${glue}accountId=${encodeURIComponent(accountId)}`;
}

function getAccountId(sp: ReturnType<typeof useSearchParams>) {
  const raw = sp.get("accountId");
  return raw && raw.trim() ? raw.trim() : null;
}

function pill(active: boolean) {
  return [
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
    active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
  ].join(" ");
}

export default function WizardStepsNav({ locale, engagementId, currentStep }: Props) {
  const stepKey =
    typeof currentStep === "string" && currentStep.trim().length > 0
      ? currentStep.trim()
      : "dashboard";

  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const accountId = getAccountId(sp);

  const unitLabel = t(locale, "Unidad", "Unit");

  const isTables = pathname.includes(`/wizard/${engagementId}/tables`);
  const isCheckIn = pathname.includes(`/wizard/${engagementId}/check-in`);
  const isOverview = pathname.includes(`/wizard/${engagementId}/dashboard`);
  const isReport = pathname.includes(`/wizard/${engagementId}/report`);

  const storageKey = `see:lastWizardStep:${engagementId}`;
  useEffect(() => {
    if (stepKey.startsWith("step-")) {
      try {
        localStorage.setItem(storageKey, stepKey);
      } catch {}
    }
  }, [stepKey, storageKey]);

  const initialWizardStep = stepKey.startsWith("step-") ? stepKey : "step-0-engagement";
  const [wizardStep, setWizardStep] = useState<string>(initialWizardStep);

  useEffect(() => {
    if (!isTables && !isCheckIn && !isOverview && !isReport) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && saved.startsWith("step-")) setWizardStep(saved);
    } catch {}
  }, [isTables, isCheckIn, isOverview, isReport, storageKey]);

  const wizardHomeHref = useMemo(() => {
    return withAccountId(`/${locale}/wizard/${engagementId}/${wizardStep}`, accountId);
  }, [locale, engagementId, wizardStep, accountId]);

  const overviewHref = withAccountId(`/${locale}/wizard/${engagementId}/dashboard`, accountId);
  const tablesHref = withAccountId(`/${locale}/wizard/${engagementId}/tables`, accountId);
  const checkInHref = withAccountId(`/${locale}/wizard/${engagementId}/check-in`, accountId);
  const reportHref = withAccountId(`/${locale}/wizard/${engagementId}/report`, accountId);

  const [accountOptions, setAccountOptions] = useState<Array<{ id: string; label: string }>>([]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/engagement/${engagementId}/accounts`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setAccountOptions(Array.isArray(j?.rows) ? j.rows : []);
      })
      .catch(() => {
        if (!alive) return;
        setAccountOptions([]);
      });
    return () => {
      alive = false;
    };
  }, [engagementId]);

  function onUnitChange(next: string) {
    const params = new URLSearchParams(sp.toString());
    if (!next) params.delete("accountId");
    else params.set("accountId", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const currentPhase =
    PHASES.find((p) => p.steps.some((s) => s.id === stepKey)) ?? PHASES[0];

  const phaseActive = (id: string) =>
    id === currentPhase.id && (stepKey.startsWith("step-") || stepKey === "dashboard");

  const stepHref = (stepId: string) => {
    if (stepId === "dashboard") return overviewHref;
    return withAccountId(`/${locale}/wizard/${engagementId}/${stepId}`, accountId);
  };

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={wizardHomeHref} className={pill(!isTables && !isCheckIn && !isOverview && !isReport)}>
            {t(locale, "Wizard", "Wizard")}
          </Link>
          <Link href={overviewHref} className={pill(isOverview)}>
            {t(locale, "Vista general", "Overview")}
          </Link>
          <Link href={tablesHref} className={pill(isTables)}>
            {t(locale, "Tablas", "Tables")}
          </Link>
          <Link href={checkInHref} className={pill(isCheckIn)}>
            {t(locale, "Check-in", "Check-in")}
          </Link>
          <Link href={reportHref} className={pill(isReport)}>
            {t(locale, "Informe", "Report")}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-xs font-medium text-slate-600 md:inline">
            {unitLabel}:
          </span>

          {accountOptions.length === 0 ? (
            <Link
              href={withAccountId(`/${locale}/wizard/${engagementId}/tables/account-plan`, accountId)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {t(locale, "Crear unidades", "Create units")}
            </Link>
          ) : (
            <select
              value={accountId ?? ""}
              onChange={(e) => onUnitChange(e.target.value)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800"
            >
              <option value="">{t(locale, "Todas", "All")}</option>
              {accountOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}

          <Link
            href={withAccountId(`/${locale}/wizard/${engagementId}/tables/account-plan`, accountId)}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {t(locale, "Editar unidades", "Edit units")}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PHASES.map((p) => (
          <span
            key={p.id}
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold",
              phaseActive(p.id) ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border border-slate-200",
            ].join(" ")}
          >
            {t(locale, p.labelEs, p.labelEn)}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {currentPhase.steps.map((s) => {
          const href = stepHref(s.id);
          const active = s.id === stepKey || (s.id === "dashboard" && isOverview);
          return (
            <Link
              key={s.id}
              href={href}
              className={[
                "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              {t(locale, s.labelEs, s.labelEn)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
