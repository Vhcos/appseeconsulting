/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

async function getReportData(engagementId: string) {
  const [engagement, accountPlans, unitEconomics, initiatives, risks] =
    await Promise.all([
      prisma.engagement.findUnique({
        where: { id: engagementId },
        include: { company: true },
      }),
      prisma.accountPlanRow.count({ where: { engagementId } }),
      prisma.unitEconomicsRow.count({ where: { engagementId } }),
      prisma.initiative.count({ where: { engagementId } }),
      prisma.risk.count({ where: { engagementId } }),
    ]);

  return {
    engagement,
    accountPlans,
    unitEconomics,
    initiatives,
    risks,
  };
}

export default async function ReportPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const { engagement, accountPlans, unitEconomics, initiatives, risks } =
    await getReportData(engagementId);

  if (!engagement) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <p className="mb-4 text-lg font-medium">
          {t(locale, "No existe este proyecto.", "Project not found.")}
        </p>
        <Link
          href={`/${locale}/wizard`}
          className="text-sm text-indigo-600 underline"
        >
          {t(locale, "Volver al listado", "Back to list")}
        </Link>
      </main>
    );
  }

  // Nombre que se usará en el informe
  const clientName =
    (engagement.contextCompanyName &&
      engagement.contextCompanyName.trim()) ||
    (engagement.company?.name && engagement.company.name.trim()) ||
    (engagement.name && engagement.name.trim()) ||
    t(locale, "Cliente sin nombre", "Client without name");

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t(
              locale,
              "Informe de diagnóstico y roadmap",
              "Diagnosis & roadmap report",
            )}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {clientName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {engagement.company?.name
              ? t(
                  locale,
                  `Empresa: ${engagement.company.name}`,
                  `Company: ${engagement.company.name}`,
                )
              : null}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}/step-0-contexto`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          {t(locale, "← Volver al panel", "← Back to panel")}
        </Link>
      </header>

      <div className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* 1. Contexto y metas */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            1.{" "}
            {t(
              locale,
              "Contexto y metas del proyecto",
              "Context and project goals",
            )}
          </h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {engagement.contextIndustry && (
              <p>
                <span className="font-semibold">
                  {t(locale, "Industria:", "Industry:")}{" "}
                </span>
                {engagement.contextIndustry}
              </p>
            )}
            {engagement.contextGoal12m && (
              <p>
                <span className="font-semibold">
                  {t(locale, "Meta a 12 meses:", "12-month goal:")}{" "}
                </span>
                {engagement.contextGoal12m}
              </p>
            )}
            {engagement.contextGoal36m && (
              <p>
                <span className="font-semibold">
                  {t(locale, "Meta a 36 meses:", "36-month goal:")}{" "}
                </span>
                {engagement.contextGoal36m}
              </p>
            )}
            {(engagement.contextSponsor || engagement.contextCoreTeam) && (
              <p>
                <span className="font-semibold">
                  {t(locale, "Gobernanza del proceso:", "Process governance:")}{" "}
                </span>
                {[
                  engagement.contextSponsor &&
                    t(
                      locale,
                      `Sponsor principal: ${engagement.contextSponsor}`,
                      `Main sponsor: ${engagement.contextSponsor}`,
                    ),
                  engagement.contextCoreTeam &&
                    t(
                      locale,
                      `Equipo clave: ${engagement.contextCoreTeam}`,
                      `Core team: ${engagement.contextCoreTeam}`,
                    ),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </section>

        {/* 2. Base de información (Data Room) */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            2.{" "}
            {t(
              locale,
              "Base de información utilizada",
              "Information base used",
            )}
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            {t(
              locale,
              "El diagnóstico utiliza la información cargada en las tablas clave del Data Room para cuantificar tamaño, rentabilidad y riesgo del negocio.",
              "The diagnosis uses the information loaded in the Data Room key tables to quantify size, profitability and risk of the business.",
            )}
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <li>
              <span className="font-semibold">
                {t(locale, "Plan de cuenta:", "Account plan:")}{" "}
              </span>
              {accountPlans}{" "}
              {t(
                locale,
                "contratos o cuentas registrados.",
                "contracts/accounts registered.",
              )}
            </li>
            <li>
              <span className="font-semibold">
                {t(locale, "Unit economics:", "Unit economics:")}{" "}
              </span>
              {unitEconomics}{" "}
              {t(
                locale,
                "registros con precios, costos y márgenes.",
                "records with prices, costs and margins.",
              )}
            </li>
            <li>
              <span className="font-semibold">
                {t(locale, "Iniciativas:", "Initiatives:")}{" "}
              </span>
              {initiatives}{" "}
              {t(
                locale,
                "iniciativas estratégicas registradas.",
                "strategic initiatives recorded.",
              )}
            </li>
            <li>
              <span className="font-semibold">
                {t(locale, "Riesgos:", "Risks:")}{" "}
              </span>
              {risks}{" "}
              {t(
                locale,
                "riesgos priorizados en la matriz.",
                "risks prioritized in the matrix.",
              )}
            </li>
          </ul>
        </section>

        {/* 3. Resumen ejecutivo (placeholder) */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            3.{" "}
            {t(
              locale,
              "Resumen ejecutivo del diagnóstico",
              "Executive summary of the diagnosis",
            )}
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            {t(
              locale,
              "En la siguiente iteración aquí se incorporarán los hallazgos del diagnóstico 360°, FODA, BSC y portafolio priorizado.",
              "In the next iteration this section will incorporate the findings from the 360° diagnosis, SWOT, BSC and prioritized portfolio.",
            )}
          </p>
        </section>

        {/* 4. Roadmap (placeholder) */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            4.{" "}
            {t(
              locale,
              "Roadmap y próximos pasos",
              "Roadmap and next steps",
            )}
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            {t(
              locale,
              "El roadmap de 20 semanas se conectará a este informe una vez que se completen los pasos de estrategia, portafolio y gobernanza.",
              "The 20-week roadmap will be connected to this report once the strategy, portfolio and governance steps are completed.",
            )}
          </p>
        </section>
      </div>
    </main>
  );
}