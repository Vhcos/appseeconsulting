import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function sortWeeks(a: { week: string | null }, b: { week: string | null }) {
  const na = Number(String(a.week ?? "").trim());
  const nb = Number(String(b.week ?? "").trim());
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a.week ?? "").localeCompare(String(b.week ?? ""));
}

export default async function Step7RoadmapPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: { id: true, name: true, contextCompanyName: true },
  });

  if (!engagement) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-sm">{t(locale, "Engagement no encontrado.", "Engagement not found.")}</p>
        <Link className="text-sm text-indigo-600 hover:underline" href={`/${locale}/wizard`}>
          {t(locale, "Volver", "Back")}
        </Link>
      </main>
    );
  }

  const clientName =
    (engagement.contextCompanyName && engagement.contextCompanyName.trim()) ||
    (engagement.name && engagement.name.trim()) ||
    t(locale, "Cliente", "Client");

  const weeksDb = await prisma.roadmapWeek.findMany({
    where: { engagementId },
    select: {
      id: true,
      week: true,
      objective: true,
      keyActivities: true,
      deliverables: true,
      kpiFocus: true,
      ritual: true,
    },
  });

  const weeks = [...weeksDb].sort(sortWeeks);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Paso", "Step")} 8 · {t(locale, "Roadmap", "Roadmap")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Roadmap 20 semanas", "20-week roadmap")} — {clientName}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {t(
              locale,
              "Esta tabla se alimenta desde la tabla Roadmap 20 semanas. Si editas allá, aquí se refleja.",
              "This table is fed from the 20-week Roadmap table. If you edit there, it shows here."
            )}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Link className="text-sm text-indigo-600 hover:underline" href={`/${locale}/wizard/${engagementId}/step-6-kpis`}>
            ← {t(locale, "Volver a KPI", "Back to KPI")}
          </Link>

          <Link
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            href={`/${locale}/wizard/${engagementId}/tables/roadmap-20w?from=step-7-roadmap`}
          >
            {t(locale, "Abrir tabla de Roadmap", "Open Roadmap table")}
          </Link>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {t(locale, "Roadmap presentado al cliente", "Client-facing roadmap")}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Estructura fija. Cambia el contenido, no el formato.",
                "Fixed structure. Content changes, not the format."
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">{t(locale, "Semana", "Week")}</th>
                <th className="py-2 pr-3">{t(locale, "Foco principal", "Main focus")}</th>
                <th className="py-2 pr-3">{t(locale, "Iniciativas / hitos", "Initiatives / milestones")}</th>
                <th className="py-2 pr-3">{t(locale, "Responsable", "Responsible")}</th>
                <th className="py-2 pr-0">{t(locale, "Notas", "Notes")}</th>
              </tr>
            </thead>

            <tbody>
              {weeks.length === 0 ? (
                <tr>
                  <td className="py-6 text-sm text-slate-500" colSpan={5}>
                    {t(
                      locale,
                      "Aún no hay semanas cargadas. Abre la tabla Roadmap 20 semanas para inicializar/editar.",
                      "No weeks yet. Open the 20-week Roadmap table to initialize/edit."
                    )}
                  </td>
                </tr>
              ) : (
                weeks.map((w) => (
                  <tr key={w.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-3 whitespace-nowrap font-semibold text-slate-900">
                      {t(locale, "Semana", "Week")} {w.week}
                    </td>
                    <td className="py-3 pr-3 text-slate-900 whitespace-pre-line">
                      {w.objective ?? "—"}
                    </td>
                    <td className="py-3 pr-3 text-slate-800 whitespace-pre-line">
                      {w.keyActivities ?? "—"}
                    </td>
                    <td className="py-3 pr-3 text-slate-800 whitespace-pre-line">
                      {/* Hoy no hay campo persona; mostramos ritual como “responsable operativo” temporal */}
                      {w.ritual ?? "—"}
                    </td>
                    <td className="py-3 pr-0 text-slate-800 whitespace-pre-line">
                      {w.deliverables ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-[11px] text-slate-500">
          {t(
            locale,
            "Nota: si quieres “Responsable” como persona (nombre/email) y no como ritual, agregamos un campo nuevo a RoadmapWeek.",
            "Note: if you want “Responsible” as a person (name/email) and not a ritual, we’ll add a new field to RoadmapWeek."
          )}
        </div>
      </section>
    </main>
  );
}
