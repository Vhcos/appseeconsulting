import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getHelpVideo } from "@/lib/see/helpVideos";

export const dynamic = "force-dynamic";

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

async function createActionItem(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const task = String(formData.get("task") ?? "").trim();
  if (!task) return;

  const owner = String(formData.get("owner") ?? "").trim() || null;

  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const dueDate = dueDateRaw ? new Date(`${dueDateRaw}T00:00:00.000Z`) : null;

  const status = String(formData.get("status") ?? "").trim() || null;
  const blocker = String(formData.get("blocker") ?? "").trim() || null;
  const comments = String(formData.get("comments") ?? "").trim() || null;

  await prisma.actionItem.create({
    data: { engagementId, task, owner, dueDate, status, blocker, comments },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/actions`);
}

async function deleteActionItem(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.actionItem.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/actions`);
}

export default async function ActionsPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const help = getHelpVideo(locale, "actions");

  const rows = await prisma.actionItem.findMany({
    where: { engagementId },
    orderBy: [{ dueDate: "desc" }, { id: "desc" }],
  });

  const headers = [
    t(locale, "Tarea", "Task"),
    t(locale, "Dueño", "Owner"),
    t(locale, "Fecha", "Date"),
    t(locale, "Estado", "Status"),
    t(locale, "Bloqueador", "Blocker"),
    t(locale, "Comentarios", "Comments"),
    t(locale, "Acción", "Action"),
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      {/* FIX: WizardStepsNav usa currentStep, no activeKey */}

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Gobernanza · Seguimiento", "Governance · Follow-up")}
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {t(locale, "Acciones", "Actions")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Esto es la lista semanal: qué se hace, quién lo hace y qué lo está frenando.",
              "This is the weekly list: what gets done, who owns it, and what's blocking it."
            )}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← {t(locale, "Volver", "Back")}
        </Link>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {t(locale, "Mira esto antes de llenar", "Watch this before filling")}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {t(locale, "Tiempo estimado:", "Estimated time:")}{" "}
              <span className="font-medium">{help.eta ?? "-"}</span>
            </div>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {t(locale, "Tip:", "Tip:")}{" "}
            {t(locale, "una acción = algo que se puede hacer esta semana.", "one action = something doable this week.")}
          </div>
        </div>

        <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {help.youtubeId ? (
            <iframe
              className="h-full w-full"
              src={help.embedUrl}
              title={help.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-600">
              {t(
                locale,
                "Video aún no cargado. Cuando tengas el link de YouTube, agregamos el youtubeId en lib/see/helpVideos.ts.",
                "Video not set yet. Once you have the YouTube link, we add the youtubeId in lib/see/helpVideos.ts."
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">
            {t(locale, "Nueva acción", "New action")}
          </h2>

          <Link
            href={`/${locale}/wizard/${engagementId}/tables`}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {t(locale, "Ver todas las tablas", "See all tables")}
          </Link>
        </div>

        <form action={createActionItem.bind(null, engagementId, locale)} className="mt-3 grid gap-3">
          <div className="grid gap-2 md:grid-cols-3">
            <label className="md:col-span-2">
              <div className="text-sm font-medium text-slate-900">{t(locale, "Qué hay que hacer", "What needs to be done")}</div>
              <input
                name="task"
                required
                placeholder={t(locale, "Ej: Agendar reunión con Operaciones para validar piloto", "E.g., Schedule meeting with Ops to validate pilot")}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            <label>
              <div className="text-sm font-medium text-slate-900">{t(locale, "Estado", "Status")}</div>
              <input
                name="status"
                placeholder={t(locale, "Ej: Por iniciar / En curso / Listo", "E.g., Not started / In progress / Done")}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <label>
              <div className="text-sm font-medium text-slate-900">{t(locale, "Dueño", "Owner")}</div>
              <input
                name="owner"
                placeholder={t(locale, "Ej: Juan (Operaciones)", "E.g., Juan (Operations)")}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            <label>
              <div className="text-sm font-medium text-slate-900">{t(locale, "Fecha", "Date")}</div>
              <input name="dueDate" type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>

            <label>
              <div className="text-sm font-medium text-slate-900">{t(locale, "Bloqueador (si hay)", "Blocker (if any)")}</div>
              <input
                name="blocker"
                placeholder={t(locale, "Ej: Falta aprobación / falta datos", "E.g., Pending approval / missing data")}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label>
            <div className="text-sm font-medium text-slate-900">{t(locale, "Comentario corto", "Short comment")}</div>
            <textarea
              name="comments"
              rows={3}
              placeholder={t(locale, "Ej: Si no aprueban antes del viernes, se mueve una semana.", "E.g., If not approved by Friday, shifts one week.")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {t(locale, "Guardar acción", "Save action")}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-4">
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">{t(locale, "Acciones registradas", "Saved actions")}</h3>
          <div className="text-xs text-slate-500">
            {t(locale, "Total:", "Total:")} <span className="font-medium">{rows.length}</span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={`${i}-${h}`}
                    className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="min-w-[280px] px-3 py-2 font-medium text-slate-900">{r.task}</td>
                  <td className="min-w-[160px] px-3 py-2 text-slate-700">{r.owner ?? ""}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{fmtDate(r.dueDate)}</td>
                  <td className="min-w-[140px] px-3 py-2 text-slate-700">{r.status ?? ""}</td>
                  <td className="min-w-[200px] px-3 py-2 text-slate-700">{r.blocker ?? ""}</td>
                  <td className="min-w-[260px] px-3 py-2 text-slate-700">{r.comments ?? ""}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <form action={deleteActionItem.bind(null, r.id, engagementId, locale)}>
                      <button type="submit" className="text-sm font-semibold text-rose-600 hover:text-rose-700">
                        {t(locale, "Eliminar", "Delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={headers.length} className="px-4 py-6 text-center text-sm text-slate-600">
                    {t(locale, "Aún no hay acciones. Crea la primera arriba.", "No actions yet. Create the first one above.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
