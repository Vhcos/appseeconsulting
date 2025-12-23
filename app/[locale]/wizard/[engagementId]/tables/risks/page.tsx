import Link from "next/link";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import WizardStepsNav from "@/components/see/WizardStepsNav";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParams = Record<string, string | string[] | undefined>;
type SearchParamsPromise = Promise<SearchParams>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function readString(sp: SearchParams, key: string): string {
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] ?? "";
  return "";
}

function sanitizeSegment(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  // segmentos seguros tipo: step-0-contexto, tables, etc.
  if (!/^[a-zA-Z0-9\-]+$/.test(s)) return "";
  return s;
}

function inferFromReferer(referer: string | null, locale: string, engagementId: string): string {
  if (!referer) return "";
  try {
    const u = new URL(referer);
    const prefix = `/${locale}/wizard/${engagementId}/`;
    if (!u.pathname.startsWith(prefix)) return "";
    const rest = u.pathname.slice(prefix.length);
    const seg = rest.split("/")[0] ?? "";
    if (!seg) return "";
    if (seg === "tables") return "tables";
    if (seg.startsWith("step-")) return seg;
    return "";
  } catch {
    return "";
  }
}

function parseIntMaybe(v: FormDataEntryValue | null): number | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  return i;
}

function parseDateMaybe(v: FormDataEntryValue | null): Date | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function riskScore(prob: number | null, impact: number | null): number | null {
  if (prob == null || impact == null) return null;
  return prob * impact;
}

function riskLevelLabel(locale: string, score: number | null): string {
  if (score == null) return t(locale, "—", "—");
  if (score >= 16) return t(locale, "ALTO", "HIGH");
  if (score >= 9) return t(locale, "MEDIO", "MEDIUM");
  return t(locale, "BAJO", "LOW");
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy}`;
}

export default async function RisksPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams?: SearchParams | SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = (searchParams ? await searchParams : {}) as SearchParams;

  const fromParam = sanitizeSegment(readString(sp, "from"));
  const fromRef = sanitizeSegment(inferFromReferer((await headers()).get("referer"), locale, engagementId));
  const from = fromParam || fromRef || "step-0-contexto";

  const backHref =
    from === "tables"
      ? `/${locale}/wizard/${engagementId}/tables`
      : `/${locale}/wizard/${engagementId}/${from}`;

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

  async function createRisk(formData: FormData) {
    "use server";

    const risk = String(formData.get("risk") ?? "").trim();
    const owner = String(formData.get("owner") ?? "").trim();
    const mitigation = String(formData.get("mitigation") ?? "").trim();

    const probability = parseIntMaybe(formData.get("probability"));
    const impact = parseIntMaybe(formData.get("impact"));
    const status = String(formData.get("status") ?? "").trim() || null;
    const reviewDate = parseDateMaybe(formData.get("reviewDate"));
    const notes = String(formData.get("notes") ?? "").trim() || null;

    // mínimos para que sirva (sin burocracia)
    if (!risk || !owner || !mitigation || !reviewDate) return;

    // normalizar rango 1..5 si viene
    const p = probability != null ? Math.min(5, Math.max(1, probability)) : null;
    const i = impact != null ? Math.min(5, Math.max(1, impact)) : null;

    await prisma.risk.create({
      data: {
        engagementId,
        risk,
        owner,
        mitigation,
        probability: p,
        impact: i,
        status,
        reviewDate,
        notes,
      },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/tables/risks`);
    revalidatePath(`/${locale}/wizard/${engagementId}/step-0-contexto`);
  }

  async function deleteRisk(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return;

    await prisma.risk.delete({ where: { id } });

    revalidatePath(`/${locale}/wizard/${engagementId}/tables/risks`);
    revalidatePath(`/${locale}/wizard/${engagementId}/step-0-contexto`);
  }

  const risks = await prisma.risk.findMany({
    where: { engagementId },
    orderBy: [{ reviewDate: "asc" }, { risk: "asc" }],
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {/* Para que el “header de pasos” se vea consistente, marcamos Contexto como activo */}
      <WizardStepsNav locale={locale} engagementId={engagementId} currentStep="step-0-contexto" />

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Tabla", "Table")} · {t(locale, "Riesgos (obstáculos + plan B)", "Risks (obstacles + plan B)")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Riesgos", "Risks")} — {clientName}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {t(
              locale,
              "Piensa en esto como: “¿Qué podría salir mal y qué hacemos si pasa?”. Sin palabras raras. Lo importante: cada riesgo tiene dueño, nivel y una fecha para resolverlo o revisarlo.",
              "Think: “What could go wrong and what do we do if it happens?”. No jargon. Key: each risk has an owner, level, and a date to fix/review it."
            )}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Link className="text-sm text-indigo-600 hover:underline" href={backHref}>
            ← {t(locale, "Volver", "Back")}
          </Link>

          <Link
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            href={`/${locale}/wizard/${engagementId}/tables`}
          >
            {t(locale, "Ver todas las tablas", "See all tables")}
          </Link>
        </div>
      </div>

      {/* Video (placeholder) */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-900">
              {t(locale, "Mira esto antes de llenar (2 min)", "Watch this before filling (2 min)")}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Cuando tengamos el video en YouTube, lo linkeamos aquí para que cualquier persona lo entienda al tiro.",
                "When we have the YouTube video, we’ll link it here so anyone can get it fast."
              )}
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-600 md:w-[420px]">
            {t(
              locale,
              "Video aún no cargado. (Después lo reemplazamos por un embed de YouTube.)",
              "Video not loaded yet. (Later we’ll replace with a YouTube embed.)"
            )}
          </div>
        </div>
      </section>

      {/* Formulario */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "Nuevo riesgo", "New risk")}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Regla simple: 1 frase clara, un dueño, un plan B y una fecha. Eso es todo.",
                "Simple rule: 1 clear sentence, an owner, a plan B, and a date. That’s it."
              )}
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {t(locale, "Tip:", "Tip:")} {t(locale, "escribe como si se lo explicaras a alguien nuevo.", "write like you’re explaining it to a new teammate.")}
          </span>
        </div>

        <form action={createRisk} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "¿Qué podría salir mal?", "What could go wrong?")} <span className="text-rose-600">*</span>
            </label>
            <input
              name="risk"
              required
              placeholder={t(locale, "Ej: Se retrasa permiso de acceso y perdemos 2 semanas de operación", "Ex: Access permit delays and we lose 2 weeks")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {t(locale, "Una frase. Nada de párrafos.", "One sentence. No paragraphs.")}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Dueño (quién se hace cargo)", "Owner (who owns it)")} <span className="text-rose-600">*</span>
            </label>
            <input
              name="owner"
              required
              placeholder={t(locale, "Ej: Jefe de Operaciones / HSEC / Comercial", "Ex: Ops lead / HSE / Sales")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {t(locale, "Si no hay dueño, nadie lo mueve.", "No owner = nobody moves it.")}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Fecha objetivo (revisar / resolver)", "Target date (review / fix)")}{" "}
              <span className="text-rose-600">*</span>
            </label>
            <input
              name="reviewDate"
              type="date"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {t(locale, "Una fecha realista.", "Pick a realistic date.")}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Probabilidad (1–5)", "Probability (1–5)")}
            </label>
            <select
              name="probability"
              defaultValue=""
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">{t(locale, "— (opcional)", "— (optional)")}</option>
              <option value="1">{t(locale, "1 · Baja", "1 · Low")}</option>
              <option value="2">{t(locale, "2", "2")}</option>
              <option value="3">{t(locale, "3 · Media", "3 · Medium")}</option>
              <option value="4">{t(locale, "4", "4")}</option>
              <option value="5">{t(locale, "5 · Alta", "5 · High")}</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Impacto (1–5)", "Impact (1–5)")}
            </label>
            <select
              name="impact"
              defaultValue=""
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">{t(locale, "— (opcional)", "— (optional)")}</option>
              <option value="1">{t(locale, "1 · Bajo", "1 · Low")}</option>
              <option value="2">{t(locale, "2", "2")}</option>
              <option value="3">{t(locale, "3 · Medio", "3 · Medium")}</option>
              <option value="4">{t(locale, "4", "4")}</option>
              <option value="5">{t(locale, "5 · Alto", "5 · High")}</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Mitigación / Plan B (en una frase)", "Mitigation / Plan B (one sentence)")}{" "}
              <span className="text-rose-600">*</span>
            </label>
            <input
              name="mitigation"
              required
              placeholder={t(locale, "Ej: Tener proveedor alternativo pre-aprobado + stock mínimo 2 semanas", "Ex: Pre-approve backup supplier + keep 2-week minimum stock")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {t(locale, "Si no cabe en una frase, está muy largo.", "If it doesn’t fit in one sentence, it’s too long.")}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Estado", "Status")}
            </label>
            <select
              name="status"
              defaultValue="Abierto"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="Abierto">{t(locale, "Abierto", "Open")}</option>
              <option value="En control">{t(locale, "En control", "Under control")}</option>
              <option value="Cerrado">{t(locale, "Cerrado", "Closed")}</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Notas (opcional)", "Notes (optional)")}
            </label>
            <input
              name="notes"
              placeholder={t(locale, "Ej: Depende de contrato marco / de permiso HSEC", "Ex: Depends on master agreement / HSE permit")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {t(locale, "Guardar riesgo", "Save risk")}
            </button>

            <Link
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href={`/${locale}/wizard/${engagementId}/tables`}
            >
              {t(locale, "Ver todas las tablas", "See all tables")}
            </Link>

            <span className="ml-auto text-xs text-slate-500">
              {t(locale, "Total:", "Total:")} {risks.length}
            </span>
          </div>
        </form>
      </section>

      {/* Tabla */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {t(locale, "Riesgos registrados", "Registered risks")}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Esto no es para escribir perfecto: es para que el equipo sepa qué podría pasar y qué haríamos.",
                "Not for perfect writing: it’s so the team knows what could happen and what we’d do."
              )}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {t(locale, "Nivel =", "Level =")} {t(locale, "Probabilidad × Impacto", "Probability × Impact")}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">{t(locale, "Riesgo", "Risk")}</th>
                <th className="py-2 pr-3">{t(locale, "Dueño", "Owner")}</th>
                <th className="py-2 pr-3">{t(locale, "Nivel", "Level")}</th>
                <th className="py-2 pr-3">{t(locale, "Plan B", "Plan B")}</th>
                <th className="py-2 pr-3">{t(locale, "Fecha", "Date")}</th>
                <th className="py-2 pr-3">{t(locale, "Estado", "Status")}</th>
                <th className="py-2 pr-0 text-right">{t(locale, "Acción", "Action")}</th>
              </tr>
            </thead>
            <tbody>
              {risks.length === 0 ? (
                <tr>
                  <td className="py-6 text-sm text-slate-500" colSpan={7}>
                    {t(locale, "Aún no hay riesgos. Agrega el primero arriba.", "No risks yet. Add the first one above.")}
                  </td>
                </tr>
              ) : (
                risks.map((r) => {
                  const score = riskScore(r.probability, r.impact);
                  const lvl = riskLevelLabel(locale, score);
                  const scoreTxt = score == null ? "—" : String(score);

                  return (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-900">{r.risk}</div>
                        {(r.notes ?? "").trim() && (
                          <div className="mt-1 text-[11px] text-slate-600">{r.notes}</div>
                        )}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap text-slate-800">
                        {r.owner ?? "—"}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="inline-flex items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                            {lvl}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {scoreTxt}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {t(locale, "P:", "P:")} {r.probability ?? "—"} · {t(locale, "I:", "I:")} {r.impact ?? "—"}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-slate-800">
                        {r.mitigation ?? "—"}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap text-slate-800">
                        {fmtDate(r.reviewDate)}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {(r.status ?? "").trim() ? r.status : t(locale, "—", "—")}
                        </span>
                      </td>
                      <td className="py-3 pr-0 text-right">
                        <form action={deleteRisk}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-xs font-semibold text-rose-600 hover:underline">
                            {t(locale, "Eliminar", "Delete")}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
