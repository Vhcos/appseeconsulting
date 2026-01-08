import Link from "next/link";
import { revalidatePath } from "next/cache";
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

function norm(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

function isDoneActionStatus(s?: string | null) {
  const v = norm(s);
  return v === "listo" || v === "done" || v === "cerrada" || v === "completado" || v === "completed";
}

function isBlockedAction(a: { status?: string | null; blocker?: string | null }) {
  return Boolean((a.blocker ?? "").trim()) || norm(a.status).includes("bloque");
}

function isPendingDecisionStatus(s?: string | null) {
  const v = norm(s);
  return v === "" || v === "pendiente" || v === "en curso" || v === "in progress" || v === "pending";
}

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDaysUtc(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
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

  revalidatePath(`/${locale}/wizard/${engagementId}/step-8-gobernanza`);
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/actions`);
}

async function updateActionStatus(id: string, engagementId: string, locale: string, formData: FormData) {
  "use server";
  const status = String(formData.get("status") ?? "").trim() || null;
  await prisma.actionItem.update({ where: { id }, data: { status } });
  revalidatePath(`/${locale}/wizard/${engagementId}/step-8-gobernanza`);
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/actions`);
}

async function clearActionBlocker(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.actionItem.update({ where: { id }, data: { blocker: null } });
  revalidatePath(`/${locale}/wizard/${engagementId}/step-8-gobernanza`);
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/actions`);
}

async function bumpActionDueDate(id: string, engagementId: string, locale: string, days: number) {
  "use server";

  const row = await prisma.actionItem.findUnique({ where: { id } });
  if (!row) return;

  const base = row.dueDate ?? new Date();
  const next = addDaysUtc(base, days);

  await prisma.actionItem.update({ where: { id }, data: { dueDate: next } });

  revalidatePath(`/${locale}/wizard/${engagementId}/step-8-gobernanza`);
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/actions`);
}

async function createDecision(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const decision = String(formData.get("decision") ?? "").trim();
  if (!decision) return;

  const dateRaw = String(formData.get("date") ?? "").trim();
  const date = dateRaw ? new Date(`${dateRaw}T00:00:00.000Z`) : null;

  const options = String(formData.get("options") ?? "").trim() || null;
  const recommendation = String(formData.get("recommendation") ?? "").trim() || null;
  const responsible = String(formData.get("responsible") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.decision.create({
    data: { engagementId, date, decision, options, recommendation, responsible, status, notes },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/step-8-gobernanza`);
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/decisions`);
}

async function decisionToAction(decisionId: string, engagementId: string, locale: string) {
  "use server";

  const d = await prisma.decision.findUnique({ where: { id: decisionId } });
  if (!d) return;

  const task = d.decision;
  const owner = d.responsible ?? null;

  // sugerencia: si la decisión tiene fecha, le ponemos +7 días; si no, queda vacío
  const dueDate = d.date ? addDaysUtc(d.date, 7) : null;

  await prisma.actionItem.create({
    data: {
      engagementId,
      task,
      owner,
      dueDate,
      status: "Por iniciar",
      blocker: null,
      comments: d.notes ?? null,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/step-8-gobernanza`);
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/actions`);
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/decisions`);
}

export default async function StepGobernanzaPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const today = startOfTodayUtc();
  const in7 = addDaysUtc(today, 7);

  const [actions, decisions, raciRows] = await Promise.all([
    prisma.actionItem.findMany({
      where: { engagementId },
      orderBy: [{ dueDate: "asc" }, { id: "desc" }],
      take: 50,
    }),
    prisma.decision.findMany({
      where: { engagementId },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 30,
    }),
    prisma.raciRow.findMany({
      where: { engagementId },
      orderBy: [{ initiativeName: "asc" }],
      take: 30,
    }),
  ]);

  const blocked = actions.filter((a) => !isDoneActionStatus(a.status) && isBlockedAction(a));
  const overdue = actions.filter((a) => a.dueDate && a.dueDate < today && !isDoneActionStatus(a.status));
  const next7 = actions.filter((a) => a.dueDate && a.dueDate >= today && a.dueDate <= in7 && !isDoneActionStatus(a.status));

  const pendingDecisions = decisions.filter((d) => isPendingDecisionStatus(d.status));
  const raciMissing = raciRows.filter((r) => !(r.responsible ?? "").trim() || !(r.approver ?? "").trim());

  const peopleSet = new Set<string>();
  actions.forEach((a) => (a.owner ?? "").trim() && peopleSet.add((a.owner ?? "").trim()));
  decisions.forEach((d) => (d.responsible ?? "").trim() && peopleSet.add((d.responsible ?? "").trim()));
  raciRows.forEach((r) => {
    (r.responsible ?? "").trim() && peopleSet.add((r.responsible ?? "").trim());
    (r.approver ?? "").trim() && peopleSet.add((r.approver ?? "").trim());
    (r.consulted ?? "").trim() && peopleSet.add((r.consulted ?? "").trim());
    (r.informed ?? "").trim() && peopleSet.add((r.informed ?? "").trim());
  });
  const people = Array.from(peopleSet).sort((a, b) => a.localeCompare(b));

  const video = getHelpVideo(locale, "step-8-gobernanza");

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "Paso 9 — Gobernanza semanal (reunión)", "Step 9 — Weekly governance (meeting)")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Abre esto en la reunión y sal con decisiones claras, acciones con responsable y bloqueos escritos.",
              "Open this in the meeting and leave with clear decisions, owned actions and written blockers."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            href={`/${locale}/wizard/${engagementId}/tables`}
          >
            {t(locale, "Ver todas las tablas", "All tables")}
          </Link>
        </div>
      </div>

      {/* Resumen reunión */}
      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(locale, "Bloqueos", "Blockers")}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{blocked.length}</div>
          <div className="mt-1 text-sm text-slate-600">{t(locale, "Acciones frenadas hoy.", "Actions blocked today.")}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(locale, "Vencidas", "Overdue")}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{overdue.length}</div>
          <div className="mt-1 text-sm text-slate-600">{t(locale, "Hay que cerrar o reprogramar.", "Close or reschedule.")}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(locale, "Decisiones pendientes", "Pending decisions")}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{pendingDecisions.length}</div>
          <div className="mt-1 text-sm text-slate-600">{t(locale, "Acuerdos que no se han cerrado.", "Agreements not closed.")}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(locale, "RACI incompleto", "Incomplete RACI")}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{raciMissing.length}</div>
          <div className="mt-1 text-sm text-slate-600">{t(locale, "Sin Responsable o Aprobador.", "Missing R or A.")}</div>
        </div>
      </section>

      {/* Video */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">{t(locale, "Guía rápida", "Quick guide")}</div>
            <div className="mt-1 text-sm text-slate-600">
              {video.helper ?? ""}
              {video.eta ? (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {t(locale, "Tiempo estimado:", "Estimated time:")} {video.eta}
                </span>
              ) : null}
            </div>
          </div>
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

      {/* Tablero */}
      <section className="mt-4 grid gap-3 md:grid-cols-3">
        {/* Acciones */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{t(locale, "Acciones (la semana)", "Actions (the week)")}</div>
              <div className="mt-1 text-xs text-slate-500">
                {t(locale, "Primero bloqueos, luego vencidas, luego próximas 7 días.", "Blockers first, then overdue, then next 7 days.")}
              </div>
            </div>
            <Link className="text-sm text-indigo-700 hover:underline" href={`/${locale}/wizard/${engagementId}/tables/actions?from=step-8-gobernanza`}>
              {t(locale, "Abrir tabla", "Open table")} →
            </Link>
          </div>

          {/* Nueva acción inline */}
          <div className="mt-3 rounded-xl border border-slate-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(locale, "Nueva acción", "New action")}</div>

            <form action={createActionItem.bind(null, engagementId, locale)} className="mt-3 grid gap-2">
              <div className="grid gap-2 md:grid-cols-3">
                <label className="md:col-span-2">
                  <div className="text-sm font-medium text-slate-800">{t(locale, "Qué hay que hacer", "What needs to be done")}</div>
                  <input
                    name="task"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder={t(locale, "Ej: Enviar minuta a gerencia", "e.g. Send minutes to management")}
                  />
                </label>

                <label>
                  <div className="text-sm font-medium text-slate-800">{t(locale, "Estado", "Status")}</div>
                  <select
                    name="status"
                    defaultValue="Por iniciar"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  >
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
                  <div className="text-sm font-medium text-slate-800">{t(locale, "Responsable", "Responsible")}</div>
                  <input
                    name="owner"
                    list="people-list"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder={t(locale, "Ej: Juan", "e.g. John")}
                  />
                </label>

                <label>
                  <div className="text-sm font-medium text-slate-800">{t(locale, "Fecha", "Date")}</div>
                  <input
                    name="dueDate"
                    type="date"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>

                <label>
                  <div className="text-sm font-medium text-slate-800">{t(locale, "Bloqueador (si hay)", "Blocker (if any)")}</div>
                  <input
                    name="blocker"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder={t(locale, "Ej: falta aprobación / falta dato", "e.g. pending approval / missing input")}
                  />
                </label>
              </div>

              <label>
                <div className="text-sm font-medium text-slate-800">{t(locale, "Comentario corto", "Short comment")}</div>
                <input
                  name="comments"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder={t(locale, "Ej: se define en comité el jueves", "e.g. decided in committee Thursday")}
                />
              </label>

              <div className="flex gap-2">
                <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" type="submit">
                  {t(locale, "Guardar", "Save")}
                </button>
              </div>
            </form>
          </div>

          <datalist id="people-list">
            {people.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>

          {/* Listas clave */}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {/* Bloqueadas */}
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">{t(locale, "Bloqueos activos", "Active blockers")}</div>
                <div className="text-xs text-slate-500">{blocked.length}</div>
              </div>

              <div className="mt-2 space-y-2">
                {blocked.slice(0, 6).map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-200 p-2">
                    <div className="text-sm font-medium text-slate-900">{a.task}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {t(locale, "Responsable:", "Responsible:")} {a.owner ?? "—"} · {t(locale, "Fecha:", "Date:")}{" "}
                      {a.dueDate ? fmtDate(a.dueDate) : "—"}
                    </div>

                    {(a.blocker ?? "").trim() ? (
                      <div className="mt-1 text-xs text-rose-700">
                        <span className="font-semibold">{t(locale, "Bloqueador:", "Blocker:")}</span> {a.blocker}
                      </div>
                    ) : null}

                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action={updateActionStatus.bind(null, a.id, engagementId, locale)}>
                        <select
                          name="status"
                          defaultValue={a.status ?? "Bloqueado"}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="Por iniciar">{t(locale, "Por iniciar", "Not started")}</option>
                          <option value="En curso">{t(locale, "En curso", "In progress")}</option>
                          <option value="Bloqueado">{t(locale, "Bloqueado", "Blocked")}</option>
                          <option value="Listo">{t(locale, "Listo", "Done")}</option>
                          <option value="Cancelado">{t(locale, "Cancelado", "Cancelled")}</option>
                        </select>{" "}
                        <button className="ml-2 text-xs font-semibold text-indigo-700 hover:underline" type="submit">
                          {t(locale, "Actualizar", "Update")}
                        </button>
                      </form>

                      <form action={clearActionBlocker.bind(null, a.id, engagementId, locale)}>
                        <button className="text-xs font-semibold text-slate-700 hover:underline" type="submit">
                          {t(locale, "Quitar bloqueador", "Clear blocker")}
                        </button>
                      </form>

                      <form action={bumpActionDueDate.bind(null, a.id, engagementId, locale, 7)}>
                        <button className="text-xs font-semibold text-slate-700 hover:underline" type="submit">
                          +7d
                        </button>
                      </form>
                    </div>
                  </div>
                ))}

                {blocked.length === 0 && (
                  <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
                    {t(locale, "No hay bloqueos activos.", "No active blockers.")}
                  </div>
                )}
              </div>
            </div>

            {/* Próximas 7 días / vencidas */}
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-900">{t(locale, "Próximas 7 días", "Next 7 days")}</div>
              <div className="mt-2 space-y-2">
                {next7.slice(0, 6).map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-200 p-2">
                    <div className="text-sm font-medium text-slate-900">{a.task}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {t(locale, "Responsable:", "Responsible:")} {a.owner ?? "—"} · {t(locale, "Fecha:", "Date:")}{" "}
                      {a.dueDate ? fmtDate(a.dueDate) : "—"}
                    </div>

                    <div className="mt-2">
                      <form action={updateActionStatus.bind(null, a.id, engagementId, locale)}>
                        <select
                          name="status"
                          defaultValue={a.status ?? "Por iniciar"}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="Por iniciar">{t(locale, "Por iniciar", "Not started")}</option>
                          <option value="En curso">{t(locale, "En curso", "In progress")}</option>
                          <option value="Bloqueado">{t(locale, "Bloqueado", "Blocked")}</option>
                          <option value="Listo">{t(locale, "Listo", "Done")}</option>
                          <option value="Cancelado">{t(locale, "Cancelado", "Cancelled")}</option>
                        </select>{" "}
                        <button className="ml-2 text-xs font-semibold text-indigo-700 hover:underline" type="submit">
                          {t(locale, "Actualizar", "Update")}
                        </button>
                      </form>
                    </div>
                  </div>
                ))}

                {next7.length === 0 && (
                  <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
                    {t(locale, "No hay acciones en los próximos 7 días.", "No actions in the next 7 days.")}
                  </div>
                )}
              </div>

              <div className="mt-4 text-sm font-semibold text-slate-900">{t(locale, "Vencidas", "Overdue")}</div>
              <div className="mt-2 space-y-2">
                {overdue.slice(0, 4).map((a) => (
                  <div key={a.id} className="rounded-xl border border-rose-200 bg-rose-50 p-2">
                    <div className="text-sm font-medium text-slate-900">{a.task}</div>
                    <div className="mt-1 text-xs text-slate-700">
                      {t(locale, "Responsable:", "Responsible:")} {a.owner ?? "—"} · {t(locale, "Fecha:", "Date:")}{" "}
                      {a.dueDate ? fmtDate(a.dueDate) : "—"}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <form action={bumpActionDueDate.bind(null, a.id, engagementId, locale, 7)}>
                        <button className="text-xs font-semibold text-slate-700 hover:underline" type="submit">
                          {t(locale, "Reprogramar +7d", "Reschedule +7d")}
                        </button>
                      </form>
                      <form action={updateActionStatus.bind(null, a.id, engagementId, locale)}>
                        <input type="hidden" name="status" value="Listo" />
                        <button className="text-xs font-semibold text-indigo-700 hover:underline" type="submit">
                          {t(locale, "Marcar listo", "Mark done")}
                        </button>
                      </form>
                    </div>
                  </div>
                ))}

                {overdue.length === 0 && (
                  <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
                    {t(locale, "No hay acciones vencidas.", "No overdue actions.")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Decisiones + RACI */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">{t(locale, "Decisiones", "Decisions")}</div>
            <Link className="text-sm text-indigo-700 hover:underline" href={`/${locale}/wizard/${engagementId}/tables/decisions?from=step-8-gobernanza`}>
              {t(locale, "Abrir tabla", "Open table")} →
            </Link>
          </div>

          {/* Nueva decisión inline */}
          <div className="mt-3 rounded-xl border border-slate-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(locale, "Nueva decisión", "New decision")}</div>

            <form action={createDecision.bind(null, engagementId, locale)} className="mt-3 grid gap-2">
              <label>
                <div className="text-sm font-medium text-slate-800">{t(locale, "Decisión (1 frase)", "Decision (1 sentence)")}</div>
                <input
                  name="decision"
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder={t(locale, "Ej: Aprobamos piloto 8 semanas", "e.g. Approve pilot for 8 weeks")}
                />
              </label>

              <div className="grid gap-2 md:grid-cols-2">
                <label>
                  <div className="text-sm font-medium text-slate-800">{t(locale, "Fecha", "Date")}</div>
                  <input
                    name="date"
                    type="date"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
                <label>
                  <div className="text-sm font-medium text-slate-800">{t(locale, "Estado", "Status")}</div>
                  <select
                    name="status"
                    defaultValue="Pendiente"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="Pendiente">{t(locale, "Pendiente", "Pending")}</option>
                    <option value="En curso">{t(locale, "En curso", "In progress")}</option>
                    <option value="Cerrada">{t(locale, "Cerrada", "Done")}</option>
                  </select>
                </label>
              </div>

              <label>
                <div className="text-sm font-medium text-slate-800">{t(locale, "Responsable", "Responsible")}</div>
                <input
                  name="responsible"
                  list="people-list"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder={t(locale, "Ej: Gerencia / Operaciones", "e.g. Management / Ops")}
                />
              </label>

              <label>
                <div className="text-sm font-medium text-slate-800">{t(locale, "Nota corta", "Short note")}</div>
                <input
                  name="notes"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder={t(locale, "Ej: se valida con finanzas el viernes", "e.g. validate with finance on Friday")}
                />
              </label>

              <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" type="submit">
                {t(locale, "Guardar", "Save")}
              </button>
            </form>
          </div>

          {/* Pendientes */}
          <div className="mt-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(locale, "Pendientes", "Pending")}</div>
            <div className="mt-2 space-y-2">
              {pendingDecisions.slice(0, 6).map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs font-semibold text-slate-500">{fmtDate(d.date)}</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{d.decision}</div>
                  <div className="mt-1 text-xs text-slate-600">{d.responsible ?? ""}</div>

                  <div className="mt-2 flex gap-2">
                    <form action={decisionToAction.bind(null, d.id, engagementId, locale)}>
                      <button className="text-xs font-semibold text-indigo-700 hover:underline" type="submit">
                        {t(locale, "Convertir en acción", "Convert to action")}
                      </button>
                    </form>
                  </div>
                </div>
              ))}

              {pendingDecisions.length === 0 && (
                <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
                  {t(locale, "No hay decisiones pendientes.", "No pending decisions.")}
                </div>
              )}
            </div>
          </div>

          {/* RACI rápido */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">RACI</div>
              <Link className="text-sm text-indigo-700 hover:underline" href={`/${locale}/wizard/${engagementId}/tables/raci?from=step-8-gobernanza`}>
                {t(locale, "Abrir tabla", "Open table")} →
              </Link>
            </div>

            <div className="mt-2 space-y-2">
              {raciRows.slice(0, 6).map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="text-sm font-medium text-slate-900">{r.initiativeName}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    <span className="font-semibold">R:</span> {r.responsible ?? "—"}{" "}
                    <span className="ml-2 font-semibold">A:</span> {r.approver ?? "—"}
                  </div>

                  {!(r.responsible ?? "").trim() || !(r.approver ?? "").trim() ? (
                    <div className="mt-2 text-xs font-semibold text-rose-700">
                      {t(locale, "Falta R o A (hay riesgo de “nadie decide / nadie ejecuta”).", "Missing R or A (risk: nobody decides / nobody executes).")}
                    </div>
                  ) : null}
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
