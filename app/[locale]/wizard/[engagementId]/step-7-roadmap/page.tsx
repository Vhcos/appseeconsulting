/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default async function Step7RoadmapPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  const roadmapWeeks = (await prisma.roadmapWeek.findMany({
    where: { engagementId },
  })) as any[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "Roadmap 20 semanas", "20-week roadmap")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Convertimos el portafolio en una secuencia de 20 semanas con focos claros, responsables e hitos concretos.",
              "We convert the portfolio into a 20-week sequence with clear focus, owners and concrete milestones."
            )}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}/step-6-portafolio`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Volver a portafolio", "Back to portfolio")}
        </Link>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <section className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "La información de semanas viene de la tabla de Roadmap. Puedes editarla ahí para ajustar responsables, focos e hitos.",
              "Week information comes from the Roadmap table. You can edit it there to adjust owners, focus and milestones."
            )}
          </p>
          <Link
            href={`/${locale}/wizard/${engagementId}/tables/roadmap-20w`}
            className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
          >
            {t(locale, "Abrir tabla de Roadmap", "Open Roadmap table")}
          </Link>
        </section>

        {roadmapWeeks.length === 0 ? (
          <p className="text-sm text-slate-500">
            {t(
              locale,
              "Aún no hay semanas configuradas en el roadmap. Parte cargando las 20 semanas en la tabla correspondiente.",
              "There are no weeks configured in the roadmap yet. Start by loading the 20 weeks in the corresponding table."
            )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs text-slate-800">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Semana", "Week")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Foco principal", "Main focus")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Iniciativas / hitos", "Initiatives / milestones")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Responsable", "Owner")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Notas", "Notes")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {roadmapWeeks.map((w, idx) => {
                  const weekLabel =
                    w.weekNumber ??
                    w.weekIndex ??
                    w.label ??
                    (idx + 1);

                  return (
                    <tr
                      key={w.id ?? idx}
                      className={
                        idx % 2 === 0
                          ? "border-b border-slate-100 bg-white"
                          : "border-b border-slate-100 bg-slate-50"
                      }
                    >
                      <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                        {typeof weekLabel === "number"
                          ? t(locale, `Semana ${weekLabel}`, `Week ${weekLabel}`)
                          : String(weekLabel)}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-900">
                        {w.focus ?? w.mainFocus ?? "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-800">
                        {w.milestones ?? w.initiatives ?? "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                        {w.owner ?? "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-600">
                        {w.notes ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <section className="space-y-2 pt-2">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(locale, "Notas de implementación", "Implementation notes")}
          </h2>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            placeholder={t(
              locale,
              "Ej: Principales dependencias entre semanas, riesgos claves del plan y acuerdos de gobernanza para hacer seguimiento.",
              "e.g. Main dependencies between weeks, key risks of the plan and governance agreements for follow-up."
            )}
            disabled
          />
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "En los últimos pasos cerraremos con gobernanza e informe final usando todo lo que se ha cargado en el portafolio y el roadmap.",
              "In the last steps we'll close with governance and the final report using everything loaded in the portfolio and roadmap."
            )}
          </p>

          <Link
            href={`/${locale}/wizard/${engagementId}/step-8-gobernanza`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(locale, "Ir a Gobernanza →", "Go to Governance →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
