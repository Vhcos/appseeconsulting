import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import WizardStepsNav from "@/components/see/WizardStepsNav";
import { getHelpVideo } from "@/lib/see/helpVideos";
import { BscPerspective, KpiDirection, KpiFrequency } from "@prisma/client";

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

function perspectiveLabel(locale: string, p: BscPerspective) {
  const map: Record<BscPerspective, { es: string; en: string }> = {
    FINANCIAL: { es: "Financiera", en: "Financial" },
    CUSTOMER: { es: "Cliente", en: "Customer" },
    INTERNAL_PROCESS: { es: "Proceso interno", en: "Internal process" },
    LEARNING_GROWTH: { es: "Aprendizaje y crecimiento", en: "Learning & growth" },
  };
  return t(locale, map[p].es, map[p].en);
}

function freqLabel(locale: string, f: KpiFrequency) {
  const map: Record<KpiFrequency, { es: string; en: string }> = {
    WEEKLY: { es: "Semanal", en: "Weekly" },
    MONTHLY: { es: "Mensual", en: "Monthly" },
    QUARTERLY: { es: "Trimestral", en: "Quarterly" },
    YEARLY: { es: "Anual", en: "Yearly" },
    ADHOC: { es: "A demanda", en: "Ad-hoc" },
  };
  return t(locale, map[f].es, map[f].en);
}

function dirLabel(locale: string, d: KpiDirection) {
  const map: Record<KpiDirection, { es: string; en: string }> = {
    HIGHER_IS_BETTER: { es: "Más alto es mejor", en: "Higher is better" },
    LOWER_IS_BETTER: { es: "Más bajo es mejor", en: "Lower is better" },
  };
  return t(locale, map[d].es, map[d].en);
}

async function createKpi(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const nameEs = String(formData.get("nameEs") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim();

  const nameFinalEs = nameEs || "";
  const nameFinalEn = nameEn || nameFinalEs;

  if (!nameFinalEs) return;

  const perspective = String(formData.get("perspective") ?? "").trim() as BscPerspective;
  const frequency = String(formData.get("frequency") ?? "").trim() as KpiFrequency;
  const direction = String(formData.get("direction") ?? "").trim() as KpiDirection;

  const unit = String(formData.get("unit") ?? "").trim() || null;
  const descriptionEs = String(formData.get("descriptionEs") ?? "").trim() || null;
  const descriptionEn = String(formData.get("descriptionEn") ?? "").trim() || null;

  const targetValueRaw = String(formData.get("targetValue") ?? "").trim();
  const targetValue = targetValueRaw ? targetValueRaw : null;

  const targetText = String(formData.get("targetText") ?? "").trim() || null;

  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim();
  let ownerUserId: string | null = null;

  if (ownerEmail) {
    const u = await prisma.user.findFirst({ where: { email: ownerEmail } });
    ownerUserId = u?.id ?? null;
  }

  await prisma.kpi.create({
    data: {
      engagementId,
      nameEs: nameFinalEs,
      nameEn: nameFinalEn,
      descriptionEs,
      descriptionEn,
      perspective,
      frequency,
      direction,
      unit,
      targetValue: targetValue as any,
      targetText,
      ownerUserId,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/kpis`);
}

async function deleteKpi(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.kpi.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/kpis`);
}

export default async function KpisPage({
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

  const rows = await prisma.kpi.findMany({
    where: { engagementId },
    orderBy: [{ perspective: "asc" }, { id: "desc" }],
  });

  const video = getHelpVideo(locale, "kpis");

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <WizardStepsNav locale={locale} engagementId={engagementId} currentStep="step-0-engagement" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">BSC</div>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{t(locale, "KPIs", "KPIs")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(locale, "Pocos y buenos. Define frecuencia, dirección y una meta simple.", "Keep it few and strong. Set frequency, direction and a simple target.")}
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
            {t(locale, "Tip:", "Tip:")} {t(locale, "si no lo puedes medir, no lo pongas.", "if you can’t measure it, don’t add it.")}
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
                  "Cuando tengas el video en YouTube, agrega el youtubeId en lib/see/helpVideos.ts (kpis).",
                  "When you have the video on YouTube, add the youtubeId in lib/see/helpVideos.ts (kpis)."
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Nuevo KPI", "New KPI")}</h2>

        <form action={createKpi.bind(null, engagementId, locale)} className="mt-4 grid gap-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Nombre (ES)", "Name (ES)")}</label>
              <input
                name="nameEs"
                required
                placeholder={t(locale, "Ej: Cumplimiento de riego (semanal)", "e.g. Irrigation compliance (weekly)")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Nombre (EN) (opcional)", "Name (EN) (optional)")}</label>
              <input
                name="nameEn"
                placeholder={t(locale, "Si lo dejas vacío, copiamos ES", "If empty, we copy ES")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Perspectiva", "Perspective")}</label>
              <select
                name="perspective"
                defaultValue="CUSTOMER"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="FINANCIAL">{perspectiveLabel(locale, "FINANCIAL")}</option>
                <option value="CUSTOMER">{perspectiveLabel(locale, "CUSTOMER")}</option>
                <option value="INTERNAL_PROCESS">{perspectiveLabel(locale, "INTERNAL_PROCESS")}</option>
                <option value="LEARNING_GROWTH">{perspectiveLabel(locale, "LEARNING_GROWTH")}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Frecuencia", "Frequency")}</label>
              <select
                name="frequency"
                defaultValue="WEEKLY"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {(["WEEKLY","MONTHLY","QUARTERLY","YEARLY","ADHOC"] as KpiFrequency[]).map((f) => (
                  <option key={f} value={f}>
                    {freqLabel(locale, f)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Dirección", "Direction")}</label>
              <select
                name="direction"
                defaultValue="HIGHER_IS_BETTER"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {(["HIGHER_IS_BETTER","LOWER_IS_BETTER"] as KpiDirection[]).map((d) => (
                  <option key={d} value={d}>
                    {dirLabel(locale, d)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Unidad (opcional)", "Unit (optional)")}</label>
              <input
                name="unit"
                placeholder={t(locale, "Ej: % / USD / días", "e.g. % / USD / days")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Dueño (email) (opcional)", "Owner (email) (optional)")}</label>
              <input
                name="ownerEmail"
                placeholder={t(locale, "Ej: nombre@empresa.com", "e.g. name@company.com")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="mt-1 text-xs text-slate-500">
                {t(locale, "Si el usuario no existe, lo dejamos vacío por ahora.", "If the user doesn’t exist, we keep it empty for now.")}
              </div>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Meta numérica (opcional)", "Numeric target (optional)")}</label>
              <input
                name="targetValue"
                placeholder={t(locale, "Ej: 95", "e.g. 95")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Meta en texto (opcional)", "Text target (optional)")}</label>
              <input
                name="targetText"
                placeholder={t(locale, "Ej: ≥ 95% de cumplimiento", "e.g. ≥ 95% compliance")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Descripción (ES) (opcional)", "Description (ES) (optional)")}</label>
              <input
                name="descriptionEs"
                placeholder={t(locale, "Ej: % de semanas con riego ejecutado según plan", "e.g. % of weeks with irrigation executed as planned")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Descripción (EN) (opcional)", "Description (EN) (optional)")}</label>
              <input
                name="descriptionEn"
                placeholder={t(locale, "Si la dejas vacía, no pasa nada", "If empty, it’s okay")}
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
          <h3 className="text-sm font-semibold text-slate-900">{t(locale, "KPIs registrados", "Saved KPIs")}</h3>
          <div className="text-xs text-slate-500">
            {t(locale, "Total:", "Total:")} {rows.length}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  t(locale, "Nombre", "Name"),
                  t(locale, "Perspectiva", "Perspective"),
                  t(locale, "Frecuencia", "Frequency"),
                  t(locale, "Dirección", "Direction"),
                  t(locale, "Unidad", "Unit"),
                  t(locale, "Meta", "Target"),
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
                  <td className="min-w-[260px] border-b border-slate-100 px-3 py-2">{t(locale, r.nameEs, r.nameEn)}</td>
                  <td className="min-w-[160px] border-b border-slate-100 px-3 py-2">{perspectiveLabel(locale, r.perspective)}</td>
                  <td className="min-w-[120px] border-b border-slate-100 px-3 py-2">{freqLabel(locale, r.frequency)}</td>
                  <td className="min-w-[160px] border-b border-slate-100 px-3 py-2">{dirLabel(locale, r.direction)}</td>
                  <td className="min-w-[120px] border-b border-slate-100 px-3 py-2">{r.unit ?? ""}</td>
                  <td className="min-w-[160px] border-b border-slate-100 px-3 py-2">
                    {r.targetText ?? (r.targetValue ? String(r.targetValue) : "")}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                    <form action={deleteKpi.bind(null, r.id, engagementId, locale)}>
                      <button className="text-xs font-semibold text-rose-600 hover:underline" type="submit">
                        {t(locale, "Eliminar", "Delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                    {t(locale, "Aún no hay KPIs.", "No KPIs yet.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          {t(
            locale,
            "Tip: luego en Iniciativas puedes amarrar cada iniciativa a un KPI.",
            "Tip: later in Initiatives you can link each initiative to a KPI."
          )}
        </div>
      </section>
    </main>
  );
}
