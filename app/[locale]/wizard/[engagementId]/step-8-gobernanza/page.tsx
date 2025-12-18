import Link from "next/link";
import WizardStepsNav from "@/components/see/WizardStepsNav";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default async function Step8GobernanzaPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  const [actionItems, raciRows] = await Promise.all([
    prisma.actionItem.findMany({
      where: { engagementId },
    }),
    prisma.raciRow.findMany({
      where: { engagementId },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <WizardStepsNav
        locale={locale}
        engagementId={engagementId}
        currentStep="step-8-gobernanza"
      />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "Gobernanza del plan", "Plan governance")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Definimos cómo se hace seguimiento al roadmap: quién se reúne, cada cuánto, qué indicadores ve y cómo se gestionan las acciones abiertas.",
              "We define how the roadmap is monitored: who meets, how often, which indicators are reviewed and how open actions are managed."
            )}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}/step-7-roadmap`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Volver al roadmap", "Back to roadmap")}
        </Link>
      </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Cadencia y espacios de gobernanza */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "Cadencia y espacios de seguimiento", "Cadence and follow-up spaces")}
            </h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
              {t(locale, "Basado en Informe final", "Based on final report")}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "Normalmente se define un comité mensual de seguimiento del roadmap, con revisiones trimestrales de estrategia y un espacio específico para riesgos HSEC.",
              "We usually define a monthly committee to follow the roadmap, quarterly strategy reviews and a specific space for HSEC risks."
            )}
          </p>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            placeholder={t(
              locale,
              "Ej: Comité mensual con Gerencia General, Operaciones, Finanzas y HSEC. Revisión de avance por iniciativa prioritaria, KPIs clave y riesgos del plan.",
              "e.g. Monthly committee with General Management, Operations, Finance and HSEC. Review progress per priority initiative, key KPIs and plan risks."
            )}
            disabled
          />
        </section>

        {/* Acciones abiertas */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "Acciones abiertas clave", "Key open actions")}
            </h2>
            <Link
              href={`/${locale}/wizard/${engagementId}/tables/actions`}
              className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
            >
              {t(locale, "Abrir tabla de acciones", "Open actions table")}
            </Link>
          </div>
          {actionItems.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t(
                locale,
                "No hay acciones abiertas registradas aún. Úsalas para registrar acuerdos específicos del comité de seguimiento.",
                "There are no open actions registered yet. Use them to log specific agreements from the follow-up committee."
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs text-slate-800">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 font-medium">
                      {t(locale, "Acción", "Action")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t(locale, "Dueño", "Owner")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t(locale, "Fecha compromiso", "Target date")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t(locale, "Estado", "Status")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {actionItems.map((a, idx) => {
                    const aa = a as any;
                    const date = aa.dueDate as Date | null | undefined;
                    const fmt = (d?: Date | null) =>
                      d
                        ? new Date(d).toLocaleDateString(
                            locale === "en" ? "en-US" : "es-CL"
                          )
                        : "";
                    return (
                      <tr
                        key={a.id}
                        className={
                          idx % 2 === 0
                            ? "border-b border-slate-100 bg-white"
                            : "border-b border-slate-100 bg-slate-50"
                        }
                      >
                        <td className="px-3 py-2 align-top text-[11px] text-slate-900">
                          {aa.title ?? aa.description ?? "-"}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                          {aa.owner ?? "-"}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                          {fmt(date) || "-"}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                          {aa.status ?? "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* RACI */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "Matriz RACI resumida", "RACI matrix summary")}
            </h2>
            <Link
              href={`/${locale}/wizard/${engagementId}/tables/raci`}
              className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
            >
              {t(locale, "Abrir tabla RACI", "Open RACI table")}
            </Link>
          </div>
          {raciRows.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t(
                locale,
                "No hay filas en la matriz RACI todavía. Úsala para clarificar quién es Responsible, Accountable, Consulted e Informed por iniciativa o flujo.",
                "There are no rows in the RACI matrix yet. Use it to clarify who is Responsible, Accountable, Consulted and Informed per initiative or stream."
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs text-slate-800">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 font-medium">
                      {t(locale, "Flujo / hito", "Stream / milestone")}
                    </th>
                    <th className="px-3 py-2 font-medium">R</th>
                    <th className="px-3 py-2 font-medium">A</th>
                    <th className="px-3 py-2 font-medium">C</th>
                    <th className="px-3 py-2 font-medium">I</th>
                  </tr>
                </thead>
                <tbody>
                  {raciRows.map((row, idx) => {
                    const r = row as any;
                    return (
                      <tr
                        key={row.id}
                        className={
                          idx % 2 === 0
                            ? "border-b border-slate-100 bg-white"
                            : "border-b border-slate-100 bg-slate-50"
                        }
                      >
                        <td className="px-3 py-2 align-top text-[11px] text-slate-900">
                          {r.workstream ?? r.deliverable ?? "-"}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                          {r.responsible ?? "-"}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                          {r.accountable ?? "-"}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                          {r.consulted ?? "-"}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                          {r.informed ?? "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "Con esta gobernanza definida, estamos listos para cerrar el informe final y compartirlo con el cliente.",
              "With this governance in place, we are ready to close the final report and share it with the client."
            )}
          </p>

          <Link
            href={`/${locale}/wizard/${engagementId}/step-9-reporte`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(locale, "Ir a Informe final →", "Go to Final report →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
