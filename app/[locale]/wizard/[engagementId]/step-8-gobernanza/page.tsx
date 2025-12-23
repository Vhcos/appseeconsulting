import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getHelpVideo } from "@/lib/see/helpVideos";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function fmtDate(d?: Date | null) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function StepGobernanzaPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const [actions, decisions, raciRows] = await Promise.all([
    prisma.actionItem.findMany({
      where: { engagementId },
      orderBy: [{ dueDate: "asc" }, { id: "desc" }],
      take: 8,
    }),
    prisma.decision.findMany({
      where: { engagementId },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 6,
    }),
    prisma.raciRow.findMany({
      where: { engagementId },
      orderBy: [{ initiativeName: "asc" }],
      take: 6,
    }),
  ]);

  const video = getHelpVideo(locale, "step-8-gobernanza");

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">{t(locale, "Paso 8 — Gobernanza y seguimiento", "Step 8 — Governance & follow-up")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t(
            locale,
            "Aquí se corre la semana: decisiones, acciones, dueños y bloqueos.",
            "Run the week here: decisions, actions, owners and blockers."
          )}
        </p>
      </div>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {t(locale, "Mira esto antes de seguir", "Watch this before continuing")}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {video.helper ?? ""}
              {video.eta ? (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {t(locale, "Tiempo estimado:", "Estimated time:")} {video.eta}
                </span>
              ) : null}
            </div>
          </div>

          <Link
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            href={`/${locale}/wizard/${engagementId}/tables`}
          >
            {t(locale, "Ver todas las tablas", "All tables")}
          </Link>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-dashed border-slate-300">
          {video.youtubeId ? (
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-600">
              <div className="font-medium text-slate-800">{t(locale, "Video aún no cargado.", "Video not set yet.")}</div>
              <div className="mt-1">
                {t(
                  locale,
                  "Cuando tengas el video en YouTube, agrega el youtubeId en lib/see/helpVideos.ts (step-8-gobernanza).",
                  "When you have the video on YouTube, add the youtubeId in lib/see/helpVideos.ts (step-8-gobernanza)."
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Link
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
          href={`/${locale}/wizard/${engagementId}/tables/decisions?from=step-8-gobernanza`}
        >
          <div className="text-sm font-semibold text-slate-900">{t(locale, "Decisiones", "Decisions")}</div>
          <div className="mt-1 text-sm text-slate-600">
            {t(locale, "Acuerdos clave con responsable.", "Key agreements with an owner.")}
          </div>
          <div className="mt-3 text-xs text-slate-500">{t(locale, "Abrir tabla →", "Open table →")}</div>
        </Link>

        <Link
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
          href={`/${locale}/wizard/${engagementId}/tables/actions?from=step-8-gobernanza`}
        >
          <div className="text-sm font-semibold text-slate-900">{t(locale, "Acciones", "Actions")}</div>
          <div className="mt-1 text-sm text-slate-600">
            {t(locale, "La semana real: tareas, fechas y bloqueos.", "The real week: tasks, dates and blockers.")}
          </div>
          <div className="mt-3 text-xs text-slate-500">{t(locale, "Abrir tabla →", "Open table →")}</div>
        </Link>

        <Link
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
          href={`/${locale}/wizard/${engagementId}/tables/raci?from=step-8-gobernanza`}
        >
          <div className="text-sm font-semibold text-slate-900">{t(locale, "RACI", "RACI")}</div>
          <div className="mt-1 text-sm text-slate-600">
            {t(locale, "Quién ejecuta y quién aprueba por iniciativa.", "Who executes and who approves per initiative.")}
          </div>
          <div className="mt-3 text-xs text-slate-500">{t(locale, "Abrir tabla →", "Open table →")}</div>
        </Link>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
          <div className="text-sm font-semibold text-slate-900">{t(locale, "Últimas acciones", "Latest actions")}</div>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700">{t(locale, "Acción", "Action")}</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700">{t(locale, "Dueño", "Owner")}</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700">{t(locale, "Fecha", "Date")}</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700">{t(locale, "Estado", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="min-w-[260px] border-b border-slate-100 px-3 py-2">{a.task}</td>
                    <td className="min-w-[140px] border-b border-slate-100 px-3 py-2">{a.owner ?? ""}</td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">{fmtDate(a.dueDate)}</td>
                    <td className="min-w-[120px] border-b border-slate-100 px-3 py-2">{a.status ?? ""}</td>
                  </tr>
                ))}
                {actions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                      {t(locale, "Aún no hay acciones.", "No actions yet.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">{t(locale, "Decisiones recientes", "Recent decisions")}</div>
          <div className="mt-3 space-y-2">
            {decisions.map((d) => (
              <div key={d.id} className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-semibold text-slate-500">{fmtDate(d.date)}</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{d.decision}</div>
                <div className="mt-1 text-xs text-slate-600">{d.responsible ?? ""}</div>
              </div>
            ))}
            {decisions.length === 0 && (
              <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
                {t(locale, "Aún no hay decisiones.", "No decisions yet.")}
              </div>
            )}
          </div>

          <div className="mt-3">
            <div className="text-xs text-slate-500">{t(locale, "RACI (vista rápida)", "RACI (quick view)")}</div>
            <div className="mt-2 space-y-2">
              {raciRows.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="text-sm font-medium text-slate-900">{r.initiativeName}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    <span className="font-semibold">R:</span> {r.responsible ?? "—"}{" "}
                    <span className="ml-2 font-semibold">A:</span> {r.approver ?? "—"}
                  </div>
                </div>
              ))}
              {raciRows.length === 0 && (
                <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
                  {t(locale, "Aún no hay RACI.", "No RACI yet.")}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
