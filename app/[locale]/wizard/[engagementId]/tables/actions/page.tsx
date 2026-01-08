import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getHelpVideo } from "@/lib/see/helpVideos";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function readString(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  if (!v) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

function sanitizeSegment(seg: string) {
  const s = (seg ?? "").trim();
  if (!s) return "";
  if (!/^[a-zA-Z0-9\-\/]+$/.test(s)) return "";
  return s;
}

function inferFromReferer(referer: string | null, locale: string, engagementId: string) {
  if (!referer) return "";
  try {
    const u = new URL(referer);
    const prefix = `/${locale}/wizard/${engagementId}/`;
    if (!u.pathname.startsWith(prefix)) return "";
    const rest = u.pathname.slice(prefix.length);
    return rest.split("/")[0] ?? "";
  } catch {
    return "";
  }
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

export default async function ActionsPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams?: SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = (searchParams ? await searchParams : {}) as Record<string, string | string[] | undefined>;

  const fromParam = sanitizeSegment(readString(sp, "from"));
  const fromRef = sanitizeSegment(inferFromReferer((await headers()).get("referer"), locale, engagementId));
  const from = fromParam || fromRef || "tables";

  const backHref =
    from === "tables"
      ? `/${locale}/wizard/${engagementId}/tables`
      : `/${locale}/wizard/${engagementId}/${from}`;

  const help = getHelpVideo(locale, "actions");

  const rows = await prisma.actionItem.findMany({
    where: { engagementId },
    orderBy: [{ dueDate: "desc" }, { id: "desc" }],
  });

  const peopleSet = new Set<string>();
  rows.forEach((r) => (r.owner ?? "").trim() && peopleSet.add((r.owner ?? "").trim()));
  const people = Array.from(peopleSet).sort((a, b) => a.localeCompare(b));

  const headersRow = [
    t(locale, "Tarea", "Task"),
    t(locale, "Responsable", "Responsible"),
    t(locale, "Fecha", "Date"),
    t(locale, "Estado", "Status"),
    t(locale, "Bloqueador", "Blocker"),
    t(locale, "Comentarios", "Comments"),
    t(locale, "Acción", "Action"),
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Gobernanza · Seguimiento", "Governance · Follow-up")}
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{t(locale, "Acciones", "Actions")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Lista semanal: qué se hace, quién es responsable y qué lo está frenando.",
              "Weekly list: what gets done, who is responsible, and what's blocking it."
            )}
          </p>
        </div>

        <Link href={backHref} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← {t(locale, "Volver", "Back")}
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">{t(locale, "Mira esto antes de llenar", "Watch this before filling")}</div>
            <div className="mt-1 text-xs text-slate-600">
              {t(locale, "Tiempo estimado:", "Estimated time:")} <span className="font-medium">{help.eta ?? "-"}</span>
            </div>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {t(locale, "Tip:", "Tip:")} {t(locale, "una acción = algo que se puede ejecutar esta semana.", "one action = something doable this week.")}
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-dashed border-slate-300">
          {help.youtubeId ? (
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${help.youtubeId}`}
                title={help.title}
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
                  "Cuando tengas el video en YouTube, agrega el youtubeId en lib/see/helpVideos.ts (actions).",
                  "When you have the video on YouTube, add the youtubeId in lib/see/helpVideos.ts (actions)."
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">{t(locale, "Nueva acción", "New action")}</h2>

          <Link href={`/${locale}/wizard/${engagementId}/tables`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            {t(locale, "Ver todas las tablas", "See all tables")}
          </Link>
        </div>

        <datalist id="people-actions">
          {people.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>

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
              <select name="status" defaultValue="Por iniciar" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="Por iniciar">{t(locale, "Por iniciar", "Not started")}</option>
                <option value="En curso">{t(locale, "En curso", "In progress")}</option>
                <option value="Bloqueado">{t(locale, "Bloqueado", "Blocked")}</option>
                <option value="Listo">{t(locale, "Listo", "Done")}</option>
                <option value="Cancelado">{t(locale, "Cancelado", "Cancelled")}</option>
              </select>
            </label>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <label>
              <div className="text-sm font-medium text-slate-900">{t(locale, "Responsable", "Responsible")}</div>
              <input
                name="owner"
                list="people-actions"
                placeholder={t(locale, "Ej: Juan (Operaciones)", "E.g., John (Operations)")}
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
            <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
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
                {headersRow.map((h, i) => (
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
                  <td colSpan={headersRow.length} className="px-4 py-6 text-center text-sm text-slate-600">
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
