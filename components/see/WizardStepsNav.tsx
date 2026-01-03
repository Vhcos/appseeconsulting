// components/see/WizardStepsNav.tsx
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
      { id: "step-9-reporte", labelEs: "Estado del informe", labelEn: "Report status" },
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

function inferStepFromPathname(pathname: string, engagementId: string): string | null {
  const marker = `/wizard/${engagementId}/`;
  const i = pathname.indexOf(marker);
  if (i === -1) return null;

  const rest = pathname.slice(i + marker.length);
  const seg = rest.split("/")[0] ?? "";

  if (seg.startsWith("step-")) return seg;
  return null; // tables/check-in/report/dashboard => no es step
}

export default function WizardStepsNav({ locale, engagementId, currentStep }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const accountId = getAccountId(sp);

  const unitLabel = t(locale, "Unidad", "Unit");

  const pathStep = useMemo(
    () => inferStepFromPathname(pathname, engagementId),
    [pathname, engagementId]
  );

  const stepKeyFromProps =
    typeof currentStep === "string" && currentStep.trim().length > 0 ? currentStep.trim() : null;

  const storageKey = `see:lastWizardStep:${engagementId}`;

  const initialWizardStep =
    (pathStep && pathStep.startsWith("step-") ? pathStep : null) ??
    (stepKeyFromProps && stepKeyFromProps.startsWith("step-") ? stepKeyFromProps : null) ??
    "step-0-engagement";

  const [wizardStep, setWizardStep] = useState<string>(initialWizardStep);

  // Step actual para pintar fases/steps (si no estás en step, usamos “último step visitado”)
  const navStepKey = pathStep ?? (stepKeyFromProps ?? wizardStep);

  // Guardar último step visitado
  useEffect(() => {
    if (navStepKey.startsWith("step-")) {
      try {
        localStorage.setItem(storageKey, navStepKey);
      } catch {}
    }
  }, [navStepKey, storageKey]);

  // Si estás en rutas que NO son step, recupera último step
  useEffect(() => {
    if (pathStep) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && saved.startsWith("step-")) setWizardStep(saved);
    } catch {}
  }, [pathStep, storageKey]);

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

  const stepHref = (stepId: string) =>
    withAccountId(`/${locale}/wizard/${engagementId}/${stepId}`, accountId);

  const currentPhase =
    PHASES.find((p) => p.steps.some((s) => s.id === navStepKey)) ?? PHASES[0];

  const phaseActive = (id: string) =>
    id === currentPhase.id && navStepKey.startsWith("step-");

  return (
    <div className="mb-3 space-y-3">
      {/* Línea compacta: Unidad */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] font-medium text-slate-500">
          {t(locale, "Navegación del wizard", "Wizard navigation")}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-xs font-medium text-slate-600 md:inline">{unitLabel}:</span>

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

      {/* Fases (clickeables) */}
      <div className="flex flex-wrap gap-2">
        {PHASES.map((p) => {
          const first = p.steps[0]?.id ?? "step-0-engagement";
          return (
            <Link
              key={p.id}
              href={stepHref(first)}
              className={[
                "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                phaseActive(p.id)
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              {t(locale, p.labelEs, p.labelEn)}
            </Link>
          );
        })}
      </div>

      {/* Steps dentro de la fase actual */}
      <div className="flex flex-wrap gap-2">
        {currentPhase.steps.map((s) => {
          const active = s.id === navStepKey;
          return (
            <Link
              key={s.id}
              href={stepHref(s.id)}
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
