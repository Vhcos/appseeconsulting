import Link from "next/link";
import WizardStepsNav from "@/components/see/WizardStepsNav";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

const PERSPECTIVE_LABELS: Record<string, { es: string; en: string }> = {
  FINANCIAL: {
    es: "Finanzas",
    en: "Finance",
  },
  CUSTOMER: {
    es: "Clientes",
    en: "Customers",
  },
  INTERNAL: {
    es: "Procesos internos",
    en: "Internal processes",
  },
  LEARNING: {
    es: "Personas / aprendizaje",
    en: "People / learning",
  },
};

function perspectiveLabel(locale: string, raw: unknown): string {
  if (!raw) return "-";
  const key = String(raw);
  const labels = PERSPECTIVE_LABELS[key];
  if (!labels) return key;
  return locale === "en" ? labels.en : labels.es;
}

export default async function Step6PortafolioPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  const initiatives = await prisma.initiative.findMany({
    where: { engagementId },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <WizardStepsNav
        locale={locale}
        engagementId={engagementId}
        currentStep="step-6-portafolio"
      />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "Portafolio de iniciativas", "Initiative portfolio")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Aquí vemos todas las iniciativas del engagement, conectadas con el BSC y listas para priorizar y llevar al roadmap.",
              "Here we see all initiatives for this engagement, connected to the BSC and ready to be prioritized and moved into the roadmap."
            )}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}/step-5-bsc`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Volver al BSC", "Back to BSC")}
        </Link>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <section className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "Los datos de esta vista vienen directamente de la tabla de iniciativas. Para editar o crear nuevas, usa la vista de tablas.",
              "The data in this view comes directly from the initiatives table. To edit or create new ones, use the tables view."
            )}
          </p>
          <Link
            href={`/${locale}/wizard/${engagementId}/tables/initiatives`}
            className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
          >
            {t(locale, "Abrir tabla de iniciativas", "Open initiatives table")}
          </Link>
        </section>

        {initiatives.length === 0 ? (
          <p className="text-sm text-slate-500">
            {t(
              locale,
              "Aún no hay iniciativas cargadas para este engagement. Parte creando algunas en la tabla de iniciativas.",
              "There are no initiatives yet for this engagement. Start by creating some in the initiatives table."
            )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs text-slate-800">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Perspectiva BSC", "BSC perspective")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Iniciativa", "Initiative")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Dueño", "Owner")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Sponsor", "Sponsor")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Estado", "Status")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "Ventana de ejecución", "Execution window")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t(locale, "KPI asociado", "Linked KPI")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {initiatives.map((init, idx) => {
                  const start = (init as any).startDate as Date | null | undefined;
                  const end = (init as any).endDate as Date | null | undefined;
                  const status = (init as any).status as string | null | undefined;
                  const owner = (init as any).owner as string | null | undefined;
                  const sponsor = (init as any).sponsor as string | null | undefined;
                  const kpiId = (init as any).kpiId as string | null | undefined;

                  const dateFmt = (d?: Date | null) =>
                    d ? new Date(d).toLocaleDateString(locale === "en" ? "en-US" : "es-CL") : "";

                  return (
                    <tr
                      key={init.id}
                      className={
                        idx % 2 === 0
                          ? "border-b border-slate-100 bg-white"
                          : "border-b border-slate-100 bg-slate-50"
                      }
                    >
                      <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                        {perspectiveLabel(locale, (init as any).perspective)}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-900">
                        {(init as any).title ?? "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                        {owner || "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                        {sponsor || "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                        {status || "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                        {start || end
                          ? `${dateFmt(start)} → ${dateFmt(end)}`
                          : "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                        {kpiId ? `KPI #${kpiId}` : "-"}
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
            {t(locale, "Notas de priorización", "Prioritization notes")}
          </h2>
          <p className="text-xs text-slate-600">
            {t(
              locale,
              "Aquí el consultor suele explicar por qué algunas iniciativas son quick wins, otras son apuestas de mediano plazo y cómo se relacionan con los objetivos del BSC.",
              "Here the consultant usually explains why some initiatives are quick wins, others are medium-term bets and how they relate to the BSC goals."
            )}
          </p>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            placeholder={t(
              locale,
              "Ej: Iniciativas I01, I02 e I03 son quick wins de eficiencia; I05 e I06 son apuestas de expansión comercial a 36 meses.",
              "e.g. Initiatives I01, I02 and I03 are efficiency quick wins; I05 and I06 are 36-month commercial expansion bets."
            )}
            disabled
          />
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "En el siguiente paso bajaremos este portafolio a un roadmap de 20 semanas con hitos concretos.",
              "In the next step we'll convert this portfolio into a 20-week roadmap with concrete milestones."
            )}
          </p>

          <Link
            href={`/${locale}/wizard/${engagementId}/step-7-roadmap`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {t(locale, "Ir al Roadmap 20 semanas →", "Go to 20-week roadmap →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
