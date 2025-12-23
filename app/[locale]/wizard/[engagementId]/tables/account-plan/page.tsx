import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import WizardStepsNav from "@/components/see/WizardStepsNav";
import { getHelpVideo, youtubeEmbedUrl, youtubeWatchUrl } from "@/lib/see/helpVideos";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function readString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const v = sp[key];
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v)) return (v[0] ?? "").trim() || null;
  return null;
}

function sanitizeSegment(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.includes("/") || s.includes("\\") || s.includes("..")) return null;
  if (s.length > 80) return null;
  return s;
}

function inferFromReferer(ref: string | null, locale: string, engagementId: string): string | null {
  if (!ref) return null;

  const marker = `/${locale}/wizard/${engagementId}/`;
  const idx = ref.indexOf(marker);
  if (idx === -1) return null;

  const rest = ref.slice(idx + marker.length);
  const seg = rest.split(/[?#/]/)[0] ?? "";
  if (!seg) return null;

  if (seg === "tables") return "tables";
  if (seg.startsWith("step-")) return seg;

  return null;
}

function mapToNavStep(from: string | null): string {
  if (!from) return "step-0-engagement";
  if (from === "step-0-contexto") return "step-0-engagement";
  if (from === "step-2-encuesta" || from === "step-2b-entrevistas") return "step-2-diagnostico-360";
  if (from.startsWith("step-")) return from;
  return "step-0-engagement";
}

function normalizeMaybeNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

const STATUS_OPTIONS_ES = [
  "Por iniciar",
  "En curso",
  "Bloqueado",
  "En negociación",
  "Cerrado",
] as const;

async function createAP(
  engagementId: string,
  locale: string,
  formData: FormData,
) {
  "use server";

  const account = normalizeMaybeNull(formData.get("account"));
  const goal12m = normalizeMaybeNull(formData.get("goal12m"));
  const decisionMakers = normalizeMaybeNull(formData.get("decisionMakers"));
  const competitors = normalizeMaybeNull(formData.get("competitors"));
  const mainPain = normalizeMaybeNull(formData.get("mainPain"));
  const valueProp = normalizeMaybeNull(formData.get("valueProp"));
  const agenda8w = normalizeMaybeNull(formData.get("agenda8w"));
  const nextStep = normalizeMaybeNull(formData.get("nextStep"));
  const status = normalizeMaybeNull(formData.get("status"));

  await prisma.accountPlanRow.create({
    data: {
      engagementId,
      account,
      goal12m,
      decisionMakers,
      competitors,
      mainPain,
      valueProp,
      agenda8w,
      nextStep,
      status,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/account-plan`);
}

async function deleteAP(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.accountPlanRow.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/account-plan`);
}

export default async function AccountPlanPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams?: SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = (searchParams ? await searchParams : {}) as Record<
    string,
    string | string[] | undefined
  >;

  const fromParam = sanitizeSegment(readString(sp, "from"));
  const fromRef = sanitizeSegment(inferFromReferer((await headers()).get("referer"), locale, engagementId));
  const from = fromParam || fromRef || "tables";

  const backHref =
    from && from !== "tables"
      ? `/${locale}/wizard/${engagementId}/${from}`
      : `/${locale}/wizard/${engagementId}/tables`;

  const navStep = mapToNavStep(from);

  const rows = await prisma.accountPlanRow.findMany({
    where: { engagementId },
    orderBy: [{ account: "asc" }, { id: "desc" }],
  });

  const video = getHelpVideo("account-plan");
  const hasVideo = Boolean(video.youtubeId);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Plan por cuenta (cliente)", "Plan per account (client)")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Plan de cuenta", "Account plan")}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            {t(
              locale,
              "Piensa en esto como una mini-ficha para ganar y renovar un cliente. Nada de palabras raras: solo claridad.",
              "Think of this as a mini-sheet to win and renew a client. No jargon: just clarity.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← {t(locale, "Volver", "Back")}
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <WizardStepsNav
          locale={locale}
          engagementId={engagementId}
          currentStep={navStep}
        />
      </div>

      {/* Bloque video (estilo aret3) */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-900">
              {t(locale, "Mira esto antes de llenar", "Watch this before filling")}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                `Tiempo estimado: ${video.minutes} min. Si lo ves completo, llenas esto mucho más rápido.`,
                `Estimated time: ${video.minutes} min. If you watch it, you'll fill this faster.`,
              )}
            </p>
          </div>

          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">
            {t(locale, "Tip: escribe como si se lo explicaras a alguien nuevo en tu empresa.", "Tip: write as if explaining it to a new teammate.")}
          </span>
        </div>

        {hasVideo ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="aspect-video w-full">
                <iframe
                  className="h-full w-full"
                  src={youtubeEmbedUrl(video.youtubeId as string)}
                  title={t(locale, video.titleEs, video.titleEn)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-900">
                {t(locale, "Cómo responder", "How to answer")}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                <li>{t(locale, "Si no sabes algo, déjalo en blanco.", "If you don't know something, leave it blank.")}</li>
                <li>{t(locale, "Usa frases cortas. Ideal: 1 idea por línea.", "Use short phrases. Ideally: 1 idea per line.")}</li>
                <li>{t(locale, "Esto se usa para coordinar acciones, no para escribir bonito.", "This is for coordinating actions, not for fancy writing.")}</li>
              </ul>

              <Link
                href={youtubeWatchUrl(video.youtubeId as string)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                {t(locale, "Ver en YouTube", "Watch on YouTube")} →
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-700">
            <p className="font-medium text-slate-900">
              {t(locale, "Video aún no cargado.", "Video not set yet.")}
            </p>
            <p className="mt-1 text-slate-600">
              {t(
                locale,
                "Cuando tengas el video en YouTube, agrega el youtubeId en lib/see/helpVideos.ts (account-plan).",
                "When you have the YouTube video, add the youtubeId in lib/see/helpVideos.ts (account-plan).",
              )}
            </p>
          </div>
        )}
      </section>

      {/* Form + tabla */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "Nueva cuenta", "New account")}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Si no sabes algo, déjalo en blanco. Mejor una ficha simple que cero ficha.",
                "If you don't know something, leave it blank. A simple sheet is better than none.",
              )}
            </p>
          </div>

          <Link
            href={`/${locale}/wizard/${engagementId}/tables`}
            className="text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            {t(locale, "Ver todas las tablas", "View all tables")}
          </Link>
        </div>

        <form
          action={createAP.bind(null, engagementId, locale)}
          className="mt-4 grid gap-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Cuenta (cliente / faena / contrato)", "Account (client / site / contract)")}
              </label>
              <input
                name="account"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Minera X – Faena Norte", "e.g. Mine X – North site")}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Un nombre que cualquiera reconozca.", "A name anyone on the team will recognize.")}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Estado", "Status")}
              </label>
              <select
                name="status"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                defaultValue=""
              >
                <option value="">
                  {t(locale, "Por iniciar", "Not started")}
                </option>
                {STATUS_OPTIONS_ES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                {t(locale, "Solo para saber en qué estamos.", "Just to know where we are.")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "¿Qué queremos lograr en 12 meses?", "What do we want in 12 months?")}
              </label>
              <textarea
                name="goal12m"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: Renovar 2 contratos + subir precio 8% + sumar 1 frente adicional",
                  "e.g. Renew 2 contracts + raise price 8% + add 1 additional workfront",
                )}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Ideal: 1 frase con número o resultado.", "Ideally: 1 sentence with a number or outcome.")}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "¿Con quién compites?", "Who do you compete with?")}
              </label>
              <textarea
                name="competitors"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: Proveedor A (precio), Proveedor B (relación)",
                  "e.g. Vendor A (price), Vendor B (relationship)",
                )}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Aunque sea “mismo rubro”, algo escribe.", "Even if it's “same industry”, write something.")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "¿Quién decide? (nombres/roles)", "Who decides? (names/roles)")}
              </label>
              <textarea
                name="decisionMakers"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: Superintendente Operaciones (firma) · HSEC (valida) · Abastecimiento (compra)",
                  "e.g. Ops superintendent (signs) · HSE (validates) · Procurement (buys)",
                )}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "No necesitas organigrama: solo roles clave.", "No need for an org chart: just key roles.")}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "¿Qué les duele hoy?", "What hurts today?")}
              </label>
              <textarea
                name="mainPain"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: Variabilidad del servicio + auditorías HSEC + presión por ahorro de agua",
                  "e.g. Service variability + HSE audits + pressure to save water",
                )}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Escribe el dolor como lo diría el cliente.", "Write the pain as the client would say it.")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "¿Cómo los ayudamos? (en una frase)", "How do we help? (one sentence)")}
              </label>
              <textarea
                name="valueProp"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: Mantengo caminos operables con menos agua y evidencia defendible para auditoría",
                  "e.g. Keep roads operable with less water and defensible audit evidence",
                )}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Si no cabe en una frase, está muy largo.", "If it doesn’t fit in one sentence, it’s too long.")}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-900">
                {t(locale, "Ejemplo rápido (mini)", "Quick example (mini)")}
              </p>
              <p className="mt-2 text-xs text-slate-700">
                {t(
                  locale,
                  "Cuenta: Faena Norte · Objetivo 12m: renovar + subir precio · Próximo paso: reunión con sponsor.",
                  "Account: North site · 12m goal: renew + raise price · Next step: sponsor meeting.",
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Plan 8 semanas (3–5 hitos)", "8-week plan (3–5 milestones)")}
              </label>
              <textarea
                name="agenda8w"
                rows={5}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej:\n- Semana 1: reunión con sponsor + mapa de decisores\n- Semana 2: piloto Data Pack (1 página)\n- Semana 4: propuesta de renovación",
                  "e.g.\n- Week 1: sponsor meeting + decision map\n- Week 2: pilot Data Pack (1 page)\n- Week 4: renewal proposal",
                )}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Piensa en hitos, no en tareas infinitas.", "Think milestones, not endless tasks.")}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Próxima acción concreta", "Next concrete action")}
              </label>
              <textarea
                name="nextStep"
                rows={5}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: Agendar visita a terreno con Operaciones (fecha X)",
                  "e.g. Schedule a field visit with Operations (date X)",
                )}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Una acción que se pueda hacer esta semana.", "One action you can do this week.")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              {t(locale, "Guardar cuenta", "Save account")}
            </button>

            <Link
              href={`/${locale}/wizard/${engagementId}/tables`}
              className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              {t(locale, "Ver todas las tablas", "View all tables")}
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {t(locale, "Cuentas registradas", "Registered accounts")}
          </h3>
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "Esto no es para escribir perfecto: es para que el equipo sepa qué hacer y por qué.",
              "This isn't for perfect writing: it's so the team knows what to do and why.",
            )}
          </p>
        </div>

        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                {[
                  t(locale, "Cuenta", "Account"),
                  t(locale, "Objetivo 12m", "12m goal"),
                  t(locale, "Quién decide", "Decision makers"),
                  t(locale, "Dolor", "Pain"),
                  t(locale, "Cómo ayudamos", "How we help"),
                  t(locale, "Plan 8 semanas", "8-week plan"),
                  t(locale, "Próximo paso", "Next step"),
                  t(locale, "Estado", "Status"),
                  t(locale, "Acción", "Action"),
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  <td className="min-w-[180px] px-3 py-2 align-top text-[11px] text-slate-900">
                    {r.account ?? ""}
                  </td>
                  <td className="min-w-[180px] px-3 py-2 align-top text-[11px] text-slate-700">
                    {r.goal12m ?? ""}
                  </td>
                  <td className="min-w-[180px] px-3 py-2 align-top text-[11px] text-slate-700">
                    {r.decisionMakers ?? ""}
                  </td>
                  <td className="min-w-[140px] px-3 py-2 align-top text-[11px] text-slate-700">
                    {r.mainPain ?? ""}
                  </td>
                  <td className="min-w-[180px] px-3 py-2 align-top text-[11px] text-slate-700">
                    {r.valueProp ?? ""}
                  </td>
                  <td className="min-w-[180px] px-3 py-2 align-top text-[11px] text-slate-700 whitespace-pre-line">
                    {r.agenda8w ?? ""}
                  </td>
                  <td className="min-w-[160px] px-3 py-2 align-top text-[11px] text-slate-700">
                    {r.nextStep ?? ""}
                  </td>
                  <td className="min-w-[120px] px-3 py-2 align-top text-[11px] text-slate-700">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                      {r.status ?? t(locale, "—", "—")}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top text-[11px]">
                    <form
                      action={deleteAP.bind(null, r.id, engagementId, locale)}
                    >
                      <button
                        type="submit"
                        className="text-[11px] font-semibold text-slate-600 hover:text-rose-600"
                      >
                        {t(locale, "Eliminar", "Delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-6 text-sm text-slate-500"
                  >
                    {t(
                      locale,
                      "Aún no hay cuentas registradas. Crea la primera arriba (aunque sea simple).",
                      "No accounts yet. Create the first one above (even if it's simple).",
                    )}
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
