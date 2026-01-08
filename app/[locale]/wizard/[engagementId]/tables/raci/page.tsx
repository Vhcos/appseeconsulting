import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getHelpVideo } from "@/lib/see/helpVideos";

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

function uniqClean(list: string[]) {
  const set = new Set<string>();
  for (const raw of list) {
    const v = (raw ?? "").trim();
    if (!v) continue;
    set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function isMissingRA(r: { responsible?: string | null; approver?: string | null }) {
  const missingR = !(r.responsible ?? "").trim();
  const missingA = !(r.approver ?? "").trim();
  return { missingR, missingA, any: missingR || missingA };
}

async function createRaciRow(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const initiativeName = String(formData.get("initiativeName") ?? "").trim();
  if (!initiativeName) return;

  const responsible = String(formData.get("responsible") ?? "").trim() || null;
  const approver = String(formData.get("approver") ?? "").trim() || null;
  const consulted = String(formData.get("consulted") ?? "").trim() || null;
  const informed = String(formData.get("informed") ?? "").trim() || null;

  await prisma.raciRow.create({
    data: { engagementId, initiativeName, responsible, approver, consulted, informed },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/raci`);
}

async function updateRaciRow(id: string, engagementId: string, locale: string, formData: FormData) {
  "use server";

  const initiativeName = String(formData.get("initiativeName") ?? "").trim();
  if (!initiativeName) return; // no permitimos iniciativa vacía

  const responsible = String(formData.get("responsible") ?? "").trim() || null;
  const approver = String(formData.get("approver") ?? "").trim() || null;
  const consulted = String(formData.get("consulted") ?? "").trim() || null;
  const informed = String(formData.get("informed") ?? "").trim() || null;

  await prisma.raciRow.update({
    where: { id },
    data: { initiativeName, responsible, approver, consulted, informed },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/raci`);
}

async function deleteRaciRow(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.raciRow.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/raci`);
}

export default async function RaciPage({
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

  const only = readString(sp, "only"); // "", "missing"
  const showOnlyMissing = only === "missing";

  const backHref =
    from === "tables"
      ? `/${locale}/wizard/${engagementId}/tables`
      : `/${locale}/wizard/${engagementId}/${from}`;

  const [rowsAll, actions, decisions] = await Promise.all([
    prisma.raciRow.findMany({
      where: { engagementId },
      orderBy: [{ initiativeName: "asc" }, { id: "desc" }],
    }),
    prisma.actionItem.findMany({
      where: { engagementId },
      select: { owner: true },
      take: 200,
    }),
    prisma.decision.findMany({
      where: { engagementId },
      select: { responsible: true },
      take: 200,
    }),
  ]);

  const rows = showOnlyMissing ? rowsAll.filter((r) => isMissingRA(r).any) : rowsAll;

  const missingRCount = rowsAll.filter((r) => isMissingRA(r).missingR).length;
  const missingACount = rowsAll.filter((r) => isMissingRA(r).missingA).length;
  const missingAnyCount = rowsAll.filter((r) => isMissingRA(r).any).length;

  // Sugerencias: nombres/roles desde actions + decisions + RACI ya existente
  const peopleSuggestions = uniqClean([
    ...actions.map((a) => a.owner ?? ""),
    ...decisions.map((d) => d.responsible ?? ""),
    ...rowsAll.flatMap((r) => [r.responsible ?? "", r.approver ?? "", r.consulted ?? "", r.informed ?? ""]),
  ]);

  // Sugerencias de iniciativas: lo que ya existe
  const initiativeSuggestions = uniqClean(rowsAll.map((r) => r.initiativeName ?? ""));

  const video = getHelpVideo(locale, "raci");

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Gobernanza", "Governance")}
          </div>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "RACI por iniciativa", "RACI per initiative")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Una fila por iniciativa: quién ejecuta (R), quién decide (A), quién se consulta (C) y a quién se informa (I).",
              "One row per initiative: who executes (R), decides (A), is consulted (C) and informed (I)."
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link className="text-sm text-indigo-700 hover:underline" href={backHref}>
            ← {t(locale, "Volver", "Back")}
          </Link>
          <Link
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            href={`/${locale}/wizard/${engagementId}/tables`}
          >
            {t(locale, "Ver todas las tablas", "All tables")}
          </Link>
        </div>
      </div>

      {/* Resumen rápido */}
      <section className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(locale, "Total filas", "Total rows")}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{rowsAll.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(locale, "Falta R", "Missing R")}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{missingRCount}</div>
          <div className="mt-1 text-xs text-slate-600">{t(locale, "Sin Responsable (ejecuta).", "No Responsible (executes).")}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(locale, "Falta A", "Missing A")}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{missingACount}</div>
          <div className="mt-1 text-xs text-slate-600">{t(locale, "Sin Aprobador (decide).", "No Approver (decides).")}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(locale, "Incompletas", "Incomplete")}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{missingAnyCount}</div>
          <div className="mt-2 flex gap-2">
            <Link
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                !showOnlyMissing ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
              href={`/${locale}/wizard/${engagementId}/tables/raci`}
            >
              {t(locale, "Ver todo", "Show all")}
            </Link>
            <Link
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                showOnlyMissing ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
              href={`/${locale}/wizard/${engagementId}/tables/raci?only=missing`}
            >
              {t(locale, "Solo incompletas", "Only incomplete")}
            </Link>
          </div>
        </div>
      </section>

      {/* Video + reglas prácticas */}
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">{t(locale, "Mira esto antes de llenar", "Watch this before filling")}</div>
            <div className="mt-1 text-sm text-slate-600">
              {video.helper ?? ""}
              {video.eta ? (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {t(locale, "Tiempo estimado:", "Estimated time:")} {video.eta}
                </span>
              ) : null}
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {t(locale, "Tip:", "Tip:")}{" "}
            {t(locale, "idealmente 1 A por iniciativa; y siempre al menos 1 R.", "ideally 1 A per initiative; always at least 1 R.")}
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
                  "Cuando tengas el video en YouTube, agrega el youtubeId en lib/see/helpVideos.ts (raci).",
                  "When you have the video on YouTube, add the youtubeId in lib/see/helpVideos.ts (raci)."
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">{t(locale, "Cómo se usa en una reunión (rápido):", "How to use it in a meeting (fast):")}</div>
          <ul className="mt-2 list-disc pl-5">
            <li>
              <span className="font-semibold">R</span>: {t(locale, "quien ejecuta y mueve el tema.", "who executes and moves it forward.")}
            </li>
            <li>
              <span className="font-semibold">A</span>: {t(locale, "quien decide (si no hay A, nadie decide).", "who decides (no A = nobody decides).")}
            </li>
            <li>
              <span className="font-semibold">C</span>: {t(locale, "a quien le preguntas antes de decidir.", "who you consult before deciding.")}
            </li>
            <li>
              <span className="font-semibold">I</span>: {t(locale, "a quien solo le informas (no decide).", "who you only inform (doesn’t decide).")}
            </li>
          </ul>
        </div>
      </section>

      {/* Datalists */}
      <datalist id="people-suggestions">
        {peopleSuggestions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <datalist id="initiative-suggestions">
        {initiativeSuggestions.map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>

      {/* Crear */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Nuevo RACI", "New RACI row")}</h2>

        <form action={createRaciRow.bind(null, engagementId, locale)} className="mt-4 grid gap-3">
          <div>
            <label className="text-sm font-medium text-slate-800">{t(locale, "Iniciativa", "Initiative")}</label>
            <input
              name="initiativeName"
              required
              list="initiative-suggestions"
              placeholder={t(locale, "Ej: Piloto polvo en camino principal", "e.g. Dust pilot on main road")}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "R - Responsable (ejecuta)", "R - Responsible (executes)")}</label>
              <input
                name="responsible"
                list="people-suggestions"
                placeholder={t(locale, "Ej: Operaciones", "e.g. Ops")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "A - Aprobador (decide)", "A - Approver (decides)")}</label>
              <input
                name="approver"
                list="people-suggestions"
                placeholder={t(locale, "Ej: Gerencia", "e.g. Management")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "C - Consultado", "C - Consulted")}</label>
              <input
                name="consulted"
                list="people-suggestions"
                placeholder={t(locale, "Ej: HSEC / Finanzas", "e.g. HSE / Finance")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "I - Informado", "I - Informed")}</label>
              <input
                name="informed"
                list="people-suggestions"
                placeholder={t(locale, "Ej: Abastecimiento / Contratos", "e.g. Procurement / Contracts")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" type="submit">
              {t(locale, "Guardar", "Save")}
            </button>
          </div>
        </form>
      </section>

      {/* Tabla editable */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{t(locale, "Filas RACI registradas", "Saved RACI rows")}</h3>
          <div className="text-xs text-slate-500">
            {t(locale, "Mostrando:", "Showing:")} {rows.length} / {rowsAll.length}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  t(locale, "Iniciativa", "Initiative"),
                  "R",
                  "A",
                  "C",
                  "I",
                  t(locale, "Estado", "Status"),
                  t(locale, "Acciones", "Actions"),
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const miss = isMissingRA(r);
                const formId = `upd-${r.id}`;

                return (
                  <tr key={r.id} className={miss.any ? "bg-rose-50/60" : "hover:bg-slate-50"}>
                    <td className="min-w-[260px] border-b border-slate-100 px-3 py-2">
                      <input
                        name="initiativeName"
                        form={formId}
                        defaultValue={r.initiativeName}
                        list="initiative-suggestions"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </td>

                    <td className="min-w-[160px] border-b border-slate-100 px-3 py-2">
                      <input
                        name="responsible"
                        form={formId}
                        defaultValue={r.responsible ?? ""}
                        list="people-suggestions"
                        className={`w-full rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-200 ${
                          miss.missingR ? "border-rose-300 bg-rose-50" : "border-slate-300 bg-white"
                        }`}
                      />
                    </td>

                    <td className="min-w-[160px] border-b border-slate-100 px-3 py-2">
                      <input
                        name="approver"
                        form={formId}
                        defaultValue={r.approver ?? ""}
                        list="people-suggestions"
                        className={`w-full rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-200 ${
                          miss.missingA ? "border-rose-300 bg-rose-50" : "border-slate-300 bg-white"
                        }`}
                      />
                    </td>

                    <td className="min-w-[160px] border-b border-slate-100 px-3 py-2">
                      <input
                        name="consulted"
                        form={formId}
                        defaultValue={r.consulted ?? ""}
                        list="people-suggestions"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </td>

                    <td className="min-w-[160px] border-b border-slate-100 px-3 py-2">
                      <input
                        name="informed"
                        form={formId}
                        defaultValue={r.informed ?? ""}
                        list="people-suggestions"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </td>

                    <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                      {miss.any ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                          {t(locale, "Incompleto (falta R/A)", "Incomplete (missing R/A)")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          {t(locale, "OK", "OK")}
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                      <div className="flex flex-wrap gap-3">
                        <form id={formId} action={updateRaciRow.bind(null, r.id, engagementId, locale)}>
                          <button className="text-xs font-semibold text-indigo-700 hover:underline" type="submit">
                            {t(locale, "Guardar", "Save")}
                          </button>
                        </form>

                        <form action={deleteRaciRow.bind(null, r.id, engagementId, locale)}>
                          <button className="text-xs font-semibold text-rose-600 hover:underline" type="submit">
                            {t(locale, "Eliminar", "Delete")}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                    {showOnlyMissing
                      ? t(locale, "No quedan filas incompletas. 🎉", "No incomplete rows left. 🎉")
                      : t(locale, "Aún no hay filas RACI.", "No RACI rows yet.")}
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
