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

  const backHref =
    from === "tables"
      ? `/${locale}/wizard/${engagementId}/tables`
      : `/${locale}/wizard/${engagementId}/${from}`;

  const rows = await prisma.raciRow.findMany({
    where: { engagementId },
    orderBy: [{ initiativeName: "asc" }, { id: "desc" }],
  });

  const video = getHelpVideo(locale, "raci");

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <WizardStepsNav locale={locale} engagementId={engagementId} currentStep="step-0-engagement" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Gobernanza", "Governance")}
          </div>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{t(locale, "RACI por iniciativa", "RACI per initiative")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Esto es para que nadie quede en el aire: quién ejecuta, quién aprueba y a quién se informa.",
              "So nobody is left guessing: who executes, who approves, who is consulted and informed."
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
            {t(locale, "Tip:", "Tip:")}{" "}
            {t(locale, "si una persona aparece en todo, hay cuello de botella.", "if one person is everywhere, it’s a bottleneck.")}
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
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Nuevo RACI", "New RACI row")}</h2>

        <form action={createRaciRow.bind(null, engagementId, locale)} className="mt-4 grid gap-3">
          <div>
            <label className="text-sm font-medium text-slate-800">{t(locale, "Iniciativa", "Initiative")}</label>
            <input
              name="initiativeName"
              required
              placeholder={t(locale, "Ej: Piloto polvo en camino principal", "e.g. Dust pilot on main road")}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "R - Responsable (ejecuta)", "R - Responsible (executes)")}</label>
              <input
                name="responsible"
                placeholder={t(locale, "Ej: Operaciones", "e.g. Ops")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "A - Aprobador (decide)", "A - Approver (decides)")}</label>
              <input
                name="approver"
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
                placeholder={t(locale, "Ej: HSEC / Finanzas", "e.g. HSE / Finance")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "I - Informado", "I - Informed")}</label>
              <input
                name="informed"
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

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{t(locale, "Filas RACI registradas", "Saved RACI rows")}</h3>
          <div className="text-xs text-slate-500">
            {t(locale, "Total:", "Total:")} {rows.length}
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
                  <td className="min-w-[260px] border-b border-slate-100 px-3 py-2">{r.initiativeName}</td>
                  <td className="min-w-[140px] border-b border-slate-100 px-3 py-2">{r.responsible ?? ""}</td>
                  <td className="min-w-[140px] border-b border-slate-100 px-3 py-2">{r.approver ?? ""}</td>
                  <td className="min-w-[140px] border-b border-slate-100 px-3 py-2">{r.consulted ?? ""}</td>
                  <td className="min-w-[140px] border-b border-slate-100 px-3 py-2">{r.informed ?? ""}</td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                    <form action={deleteRaciRow.bind(null, r.id, engagementId, locale)}>
                      <button className="text-xs font-semibold text-rose-600 hover:underline" type="submit">
                        {t(locale, "Eliminar", "Delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                    {t(locale, "Aún no hay filas RACI.", "No RACI rows yet.")}
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
