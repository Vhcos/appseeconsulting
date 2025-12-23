import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import WizardStepsNav from "@/components/see/WizardStepsNav";
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

function fmtDate(d?: Date | null) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/decisions`);
}

async function deleteDecision(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.decision.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/decisions`);
}

export default async function DecisionsPage({
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

  const rows = await prisma.decision.findMany({
    where: { engagementId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  const video = getHelpVideo(locale, "decisions");

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <WizardStepsNav locale={locale} engagementId={engagementId} currentStep="step-0-engagement" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Gobernanza", "Governance")}
          </div>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Decisiones (acuerdos clave)", "Decisions (key agreements)")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Esto evita el típico: “yo pensé que…”. Una decisión = un acuerdo claro con responsable.",
              "Prevents the classic: “I thought…”. One decision = one clear agreement with an owner."
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

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {t(locale, "Mira esto antes de llenar", "Watch this before filling")}
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
          <div className="text-xs text-slate-500">
            {t(locale, "Tip:", "Tip:")} {t(locale, "una decisión en 1 frase + responsable.", "one sentence + responsible.")}
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
                  "Cuando tengas el video en YouTube, agrega el youtubeId en lib/see/helpVideos.ts (decisions).",
                  "When you have the video on YouTube, add the youtubeId in lib/see/helpVideos.ts (decisions)."
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Nueva decisión", "New decision")}</h2>

        <form action={createDecision.bind(null, engagementId, locale)} className="mt-4 grid gap-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Decisión", "Decision")}</label>
              <input
                name="decision"
                required
                placeholder={t(locale, "Ej: Mantener piloto 8 semanas antes de escalar", "e.g. Run pilot 8 weeks before scaling")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Fecha", "Date")}</label>
              <input
                name="date"
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Opciones (si aplica)", "Options (if any)")}</label>
              <input
                name="options"
                placeholder={t(locale, "Ej: A/B/C", "e.g. A/B/C")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Recomendación (si aplica)", "Recommendation (if any)")}</label>
              <input
                name="recommendation"
                placeholder={t(locale, "Ej: Elegir B por costo y tiempo", "e.g. Pick B for cost & time")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Responsable", "Responsible")}</label>
              <input
                name="responsible"
                placeholder={t(locale, "Ej: Gerente Operaciones", "e.g. Ops Manager")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Estado", "Status")}</label>
              <select
                name="status"
                defaultValue="Pendiente"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="Pendiente">{t(locale, "Pendiente", "Pending")}</option>
                <option value="En curso">{t(locale, "En curso", "In progress")}</option>
                <option value="Cerrada">{t(locale, "Cerrada", "Done")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-800">{t(locale, "Notas (corto)", "Notes (short)")}</label>
            <input
              name="notes"
              placeholder={t(locale, "Ej: se valida con finanzas el viernes", "e.g. validate with finance on Friday")}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="flex gap-2">
            <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" type="submit">
              {t(locale, "Guardar", "Save")}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{t(locale, "Decisiones registradas", "Saved decisions")}</h3>
          <div className="text-xs text-slate-500">
            {t(locale, "Total:", "Total:")} {rows.length}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  t(locale, "Fecha", "Date"),
                  t(locale, "Decisión", "Decision"),
                  t(locale, "Opciones", "Options"),
                  t(locale, "Recomendación", "Recommendation"),
                  t(locale, "Responsable", "Responsible"),
                  t(locale, "Estado", "Status"),
                  t(locale, "Notas", "Notes"),
                  t(locale, "Acción", "Action"),
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">{fmtDate(r.date)}</td>
                  <td className="min-w-[260px] border-b border-slate-100 px-3 py-2">{r.decision}</td>
                  <td className="min-w-[220px] border-b border-slate-100 px-3 py-2">{r.options ?? ""}</td>
                  <td className="min-w-[220px] border-b border-slate-100 px-3 py-2">{r.recommendation ?? ""}</td>
                  <td className="min-w-[160px] border-b border-slate-100 px-3 py-2">{r.responsible ?? ""}</td>
                  <td className="min-w-[120px] border-b border-slate-100 px-3 py-2">{r.status ?? ""}</td>
                  <td className="min-w-[220px] border-b border-slate-100 px-3 py-2">{r.notes ?? ""}</td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                    <form action={deleteDecision.bind(null, r.id, engagementId, locale)}>
                      <button className="text-xs font-semibold text-rose-600 hover:underline" type="submit">
                        {t(locale, "Eliminar", "Delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">
                    {t(locale, "Aún no hay decisiones.", "No decisions yet.")}
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
