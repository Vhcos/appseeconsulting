// components/see/WizardProgress10.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

type Step = {
  n: number;
  key:
    | "step-0-engagement"
    | "step-1-data-room"
    | "diagnostico"
    | "step-3-estrategia"
    | "step-4-foda"
    | "step-5-bsc"
    | "step-6-portafolio"
    | "step-7-roadmap"
    | "step-8-gobernanza"
    | "step-9-reporte";
  labelEs: string;
  labelEn: string;
  // Para el link “base” del paso
  hrefStepId: string; // puede ser step-2-encuesta, etc.
};

const STEPS: Step[] = [
  { n: 1, key: "step-0-engagement", labelEs: "Ficha cliente", labelEn: "Client sheet", hrefStepId: "step-0-engagement" },
  { n: 2, key: "step-1-data-room", labelEs: "Data room", labelEn: "Data room", hrefStepId: "step-1-data-room" },

  // Paso 3 agrupa 3 subpasos
  { n: 3, key: "diagnostico", labelEs: "Diagnóstico", labelEn: "Diagnosis", hrefStepId: "step-2-encuesta" },

  { n: 4, key: "step-3-estrategia", labelEs: "Visión/Misión/Objetivos", labelEn: "Vision/Mission/Objectives", hrefStepId: "step-3-estrategia" },
  { n: 5, key: "step-4-foda", labelEs: "FODA", labelEn: "SWOT", hrefStepId: "step-4-foda" },
  { n: 6, key: "step-5-bsc", labelEs: "KPIs", labelEn: "KPIs", hrefStepId: "step-5-bsc" },
  { n: 7, key: "step-6-portafolio", labelEs: "Portafolio", labelEn: "Portfolio", hrefStepId: "step-6-portafolio" },
  { n: 8, key: "step-7-roadmap", labelEs: "Roadmap", labelEn: "Roadmap", hrefStepId: "step-7-roadmap" },
  { n: 9, key: "step-8-gobernanza", labelEs: "Gobernanza", labelEn: "Governance", hrefStepId: "step-8-gobernanza" },
  { n: 10, key: "step-9-reporte", labelEs: "Reporte", labelEn: "Report", hrefStepId: "step-9-reporte" },
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

function inferStepGroup(pathname: string, engagementId: string) {
  const marker = `/wizard/${engagementId}/`;
  const i = pathname.indexOf(marker);
  if (i === -1) return "step-0-engagement";

  const rest = pathname.slice(i + marker.length);
  const seg = rest.split("/")[0] ?? "";

  // Paso 3: agrupa 3 subpasos
  if (seg === "step-2-encuesta" || seg === "step-2-diagnostico-360" || seg === "step-2b-entrevistas") return "diagnostico";

  // Pasos normales
  if (
    seg === "step-0-engagement" ||
    seg === "step-1-data-room" ||
    seg === "step-3-estrategia" ||
    seg === "step-4-foda" ||
    seg === "step-5-bsc" ||
    seg === "step-6-portafolio" ||
    seg === "step-7-roadmap" ||
    seg === "step-8-gobernanza" ||
    seg === "step-9-reporte"
  ) {
    return seg;
  }

  // Si estás en dashboard/tables/check-in/report (informe final), no movemos el progreso:
  // podrías marcar el último paso visitado, pero por ahora lo dejamos neutro:
  return null;
}

export default function WizardProgress10({
  locale,
  engagementId,
}: {
  locale: string;
  engagementId: string;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const accountId = getAccountId(sp);

  const activeKey = useMemo(() => inferStepGroup(pathname, engagementId), [pathname, engagementId]);

  const activeN = useMemo(() => {
    if (!activeKey) return null;
    const s = STEPS.find((x) => x.key === activeKey);
    return s?.n ?? null;
  }, [activeKey]);

  const makeHref = (hrefStepId: string) =>
    withAccountId(`/${locale}/wizard/${engagementId}/${hrefStepId}`, accountId);

  return (
    <nav aria-label={t(locale, "Progreso del Wizard", "Wizard progress")} className="mt-3">
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <ol className="flex flex-wrap items-center gap-2">
          {STEPS.map((s) => {
            const isActive = activeN === s.n;
            const isDone = activeN !== null && activeN > s.n;

            return (
              <li key={s.n} className="flex items-center gap-2">
                <Link
                  href={makeHref(s.hrefStepId)}
                  className={[
                    "group inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                    isActive
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : isDone
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                      isActive
                        ? "bg-indigo-600 text-white"
                        : isDone
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 group-hover:bg-slate-200",
                    ].join(" ")}
                  >
                    {s.n}
                  </span>
                  <span className="max-w-[180px] truncate">
                    {t(locale, s.labelEs, s.labelEn)}
                  </span>
                </Link>

                {s.n !== 10 && (
                  <span className="text-slate-300">›</span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-1 text-[11px] text-slate-500">
          {t(
            locale,
            "Etapa 1–2: recolectar y construir (pasos 1–10). El informe final (PDF) se abre desde el paso 10.",
            "Stage 1–2: collect and build (steps 1–10). The final PDF report opens from step 10."
          )}
        </div>
      </div>
    </nav>
  );
}
