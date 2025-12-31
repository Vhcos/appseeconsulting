import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
  if (s.length > 120) return null;
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

function normalizeMaybeNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function parseDecimalMaybeNull(v: FormDataEntryValue | null): Prisma.Decimal | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;

  // Acepta "1.234,56" y "1234.56"
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.\-]/g, "");

  if (!cleaned || cleaned === "." || cleaned === "-" || cleaned === "-.") return null;

  try {
    return new Prisma.Decimal(cleaned);
  } catch {
    return null;
  }
}

function fmtDecimal(d: Prisma.Decimal | null | undefined, digits = 2) {
  if (!d) return "";
  try {
    const n = Number(d.toString());
    if (!Number.isFinite(n)) return d.toString();
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
  } catch {
    return String(d);
  }
}

async function createUE(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const accountId = normalizeMaybeNull(formData.get("accountId"));

  // Validación suave: si viene accountId, que exista y sea del engagement
  let accountPlanRowId: string | null = null;
  if (accountId) {
    const ok = await prisma.accountPlanRow.findFirst({
      where: { id: accountId, engagementId },
      select: { id: true },
    });
    if (ok) accountPlanRowId = ok.id;
  }

  const clientSite = normalizeMaybeNull(formData.get("clientSite"));
  const modality = normalizeMaybeNull(formData.get("modality"));

  const m2Month = parseDecimalMaybeNull(formData.get("m2Month"));
  const priceUsdM2 = parseDecimalMaybeNull(formData.get("priceUsdM2"));
  let revenueUsdMonth = parseDecimalMaybeNull(formData.get("revenueUsdMonth"));

  // Si no ponen ingresos pero sí m2 y precio, lo calculamos
  if (!revenueUsdMonth && m2Month && priceUsdM2) {
    revenueUsdMonth = m2Month.mul(priceUsdM2);
  }

  const directCosts = normalizeMaybeNull(formData.get("directCosts"));
  const margin = normalizeMaybeNull(formData.get("margin"));
  const marginPct = normalizeMaybeNull(formData.get("marginPct"));
  const risks = normalizeMaybeNull(formData.get("risks"));
  const evidence = normalizeMaybeNull(formData.get("evidence"));

  await prisma.unitEconomicsRow.create({
    data: {
      engagementId,
      accountPlanRowId,
      clientSite,
      modality,
      m2Month,
      priceUsdM2,
      revenueUsdMonth,
      directCosts,
      margin,
      marginPct,
      risks,
      evidence,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/unit-economics`);
}

async function deleteUE(id: string, engagementId: string, locale: string) {
  "use server";
  // Más seguro que delete({where:{id}}) por si alguien intenta borrar cross-engagement
  await prisma.unitEconomicsRow.deleteMany({ where: { id, engagementId } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/unit-economics`);
}

export default async function UnitEconomicsPage({
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

  const accountIdParam = sanitizeSegment(readString(sp, "accountId"));

  const accounts = await prisma.accountPlanRow.findMany({
    where: { engagementId },
    select: { id: true, account: true },
    orderBy: [{ account: "asc" }, { id: "asc" }],
  });

  const accountIdIsValid = accountIdParam ? accounts.some((a) => a.id === accountIdParam) : false;

  // Default: primera unidad si existe; si no, queda null (sin scope)
  const selectedAccountId = accountIdIsValid
    ? (accountIdParam as string)
    : (accounts[0]?.id ?? null);

  const selectedAccountLabel =
    selectedAccountId
      ? (accounts.find((a) => a.id === selectedAccountId)?.account?.trim() || t(locale, "Unidad sin nombre", "Unnamed unit"))
      : t(locale, "Sin unidad", "No unit");

  const backHref =
    from && from !== "tables"
      ? `/${locale}/wizard/${engagementId}/${from}${selectedAccountId ? `?accountId=${encodeURIComponent(selectedAccountId)}` : ""}`
      : `/${locale}/wizard/${engagementId}/tables${selectedAccountId ? `?accountId=${encodeURIComponent(selectedAccountId)}` : ""}`;

  const whereScope: any = { engagementId };
  if (selectedAccountId) whereScope.accountPlanRowId = selectedAccountId;

  const rows = await prisma.unitEconomicsRow.findMany({
    where: whereScope,
    orderBy: [{ id: "desc" }],
  });

  const video = getHelpVideo("unit-economics");
  const hasVideo = Boolean(video.youtubeId);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Unit economics (simple)", "Unit economics (simple)")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Unit Economics", "Unit Economics")}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            {t(
              locale,
              "Esto sirve para entender si un contrato “da plata” y por qué. Lo llenas con estimaciones razonables: nadie te va a auditar aquí.",
              "This helps you understand if a contract is profitable and why. Fill it with reasonable estimates—no one is auditing you here.",
            )}
          </p>

          {/* Selector de unidad */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  {t(locale, "Unidad (scope)", "Unit (scope)")}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {t(
                    locale,
                    "Este Unit Economics queda guardado por unidad (AccountPlanRow).",
                    "This Unit Economics is saved per unit (AccountPlanRow).",
                  )}
                </p>
              </div>

              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">
                {t(locale, "Seleccionada:", "Selected:")} {selectedAccountLabel}
              </span>
            </div>

            {accounts.length > 0 ? (
              <form method="get" className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="from" value={from === "tables" ? "tables" : from} />
                <label className="text-xs font-semibold text-slate-900">
                  {t(locale, "Cambiar unidad", "Change unit")}
                </label>
                <select
                  name="accountId"
                  defaultValue={selectedAccountId ?? ""}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account?.trim() || t(locale, "Unidad sin nombre", "Unnamed unit")}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {t(locale, "Aplicar", "Apply")}
                </button>
              </form>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-700">
                <p className="font-medium text-slate-900">
                  {t(locale, "Aún no hay unidades creadas.", "No units created yet.")}
                </p>
                <p className="mt-1 text-slate-600">
                  {t(
                    locale,
                    "Crea al menos 1 unidad (AccountPlanRow) para que esta tabla quede ordenada por faena/obra/centro de costo.",
                    "Create at least 1 unit (AccountPlanRow) so this table is organized by site/project/cost center.",
                  )}
                </p>
              </div>
            )}
          </div>
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

      {/* Bloque video */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-900">
              {t(locale, "Mira esto antes de llenar", "Watch this before filling")}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                `Tiempo estimado: ${video.minutes} min. Si lo ves, llenas esto 2x más rápido.`,
                `Estimated time: ${video.minutes} min. Watch it and you'll fill this 2x faster.`,
              )}
            </p>
          </div>

          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">
            {t(locale, "Tip: no busques perfección, busca orden.", "Tip: aim for order, not perfection.")}
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
                {t(locale, "Cómo responder (simple)", "How to answer (simple)")}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                <li>{t(locale, "Si no tienes USD exactos, estima.", "If you don’t have exact USD, estimate.")}</li>
                <li>{t(locale, "Si pones m²/mes y USD/m², el ingreso mensual se calcula solo.", "If you set m²/month and USD/m², monthly revenue is auto-calculated.")}</li>
                <li>{t(locale, "Costos directos: escribe bullets (agua, químicos, equipos, mano de obra, etc.).", "Direct costs: write bullets (water, chemicals, equipment, labor, etc.).")}</li>
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
                "Cuando tengas el video en YouTube, agrega el youtubeId en lib/see/helpVideos.ts (unit-economics).",
                "When you have the YouTube video, add the youtubeId in lib/see/helpVideos.ts (unit-economics).",
              )}
            </p>
          </div>
        )}
      </section>

      {/* Form */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "Nueva fila (contrato / faena)", "New row (contract / site)")}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Una fila = una modalidad o contrato. Si el cliente tiene 2 modalidades, crea 2 filas.",
                "One row = one modality or contract. If the client has 2 modalities, create 2 rows.",
              )}
            </p>
          </div>

          <Link
            href={`/${locale}/wizard/${engagementId}/tables${selectedAccountId ? `?accountId=${encodeURIComponent(selectedAccountId)}` : ""}`}
            className="text-xs font-medium text-slate-700 hover:text-slate-900"
          >
            {t(locale, "Ver todas las tablas", "View all tables")}
          </Link>
        </div>

        <form action={createUE.bind(null, engagementId, locale)} className="mt-4 grid gap-4">
          <input type="hidden" name="accountId" value={selectedAccountId ?? ""} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Cliente / Faena / Sitio", "Client / Site")}
              </label>
              <input
                name="clientSite"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Los Bronces – Camino principal", "e.g., Los Bronces – Main road")}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Que cualquiera entienda de qué contrato hablamos.", "So anyone knows which contract this is.")}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Modalidad", "Modality")}
              </label>
              <input
                name="modality"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Supresión polvo + monitoreo", "e.g., Dust suppression + monitoring")}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Cómo se vende: por m², por tramo, por mes, etc.", "How it's sold: per m², per section, per month, etc.")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "m² por mes", "m² per month")}
              </label>
              <input
                name="m2Month"
                inputMode="decimal"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: 120.000", "e.g., 120000")}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Si no aplica, déjalo vacío.", "If not applicable, leave blank.")}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Precio USD por m²", "Price USD per m²")}
              </label>
              <input
                name="priceUsdM2"
                inputMode="decimal"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: 0,18", "e.g., 0.18")}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Puedes escribir con coma o punto.", "You can use comma or dot.")}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Ingreso USD mensual (opcional)", "Monthly revenue USD (optional)")}
              </label>
              <input
                name="revenueUsdMonth"
                inputMode="decimal"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Si lo dejas vacío, se calcula", "Leave blank to auto-calc")}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Se calcula como m²/mes × USD/m².", "Calculated as m²/month × USD/m².")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Costos directos (en bullets)", "Direct costs (bullets)")}
              </label>
              <textarea
                name="directCosts"
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "- Mano de obra\n- Equipos / Mantención\n- Agua / Químicos\n- Combustible / Transporte",
                  "- Labor\n- Equipment / Maintenance\n- Water / Chemicals\n- Fuel / Transport",
                )}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "No necesitas exactitud contable, solo orden.", "No accounting precision required—just clarity.")}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-900">
                {t(locale, "Ejemplo mini (números)", "Mini example (numbers)")}
              </p>
              <p className="mt-2 text-xs text-slate-700">
                {t(
                  locale,
                  "m²/mes 120.000 × USD/m² 0,18 ≈ USD 21.600/mes.",
                  "m²/month 120,000 × USD/m² 0.18 ≈ USD 21,600/month.",
                )}
              </p>
              <p className="mt-2 text-[11px] text-slate-600">
                {t(locale, "Con esto ya puedes discutir margen y riesgos.", "This is enough to discuss margin and risks.")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Margen (nota corta)", "Margin (short note)")}
              </label>
              <textarea
                name="margin"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Buen margen si optimizamos turnos + logística", "e.g., Good margin if we optimize shifts + logistics")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Margen % (si lo sabes)", "Margin % (if you know it)")}
              </label>
              <input
                name="marginPct"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: 35%", "e.g., 35%")}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Si no lo sabes, déjalo vacío.", "If you don’t know it, leave blank.")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Riesgos (2–4 bullets)", "Risks (2–4 bullets)")}
              </label>
              <textarea
                name="risks"
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "- Subida costo insumos\n- Restricción agua\n- Variabilidad clima\n- Accesos / permisos",
                  "- Input cost increase\n- Water restrictions\n- Weather variability\n- Access / permits",
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Evidencia (links / docs / datos)", "Evidence (links / docs / data)")}
              </label>
              <textarea
                name="evidence"
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: Informe piloto · Fotos · KPI polvo · Registro consumo agua",
                  "e.g., Pilot report · Photos · Dust KPI · Water consumption log",
                )}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              {t(locale, "Guardar fila", "Save row")}
            </button>

            <Link
              href={`/${locale}/wizard/${engagementId}/tables${selectedAccountId ? `?accountId=${encodeURIComponent(selectedAccountId)}` : ""}`}
              className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              {t(locale, "Ver todas las tablas", "View all tables")}
            </Link>

            <span className="ml-auto text-[11px] text-slate-500">
              {t(locale, "Filas:", "Rows:")} {rows.length}
            </span>
          </div>
        </form>
      </section>

      {/* Tabla */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {t(locale, "Filas registradas", "Saved rows")}
          </h3>
          <p className="text-xs text-slate-500">
            {t(locale, "Esto te permite discutir precio, margen y riesgos sin enredos.", "This helps you discuss price, margin, and risks clearly.")}
          </p>
        </div>

        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1100px] border-collapse text-left text-xs">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                {[
                  t(locale, "Cliente/Sitio", "Client/Site"),
                  t(locale, "Modalidad", "Modality"),
                  t(locale, "m²/mes", "m²/month"),
                  t(locale, "USD/m²", "USD/m²"),
                  t(locale, "USD/mes", "USD/month"),
                  t(locale, "Costos directos", "Direct costs"),
                  t(locale, "Margen", "Margin"),
                  t(locale, "Margen %", "Margin %"),
                  t(locale, "Riesgos", "Risks"),
                  t(locale, "Evidencia", "Evidence"),
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
                <tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="min-w-[190px] px-3 py-2 align-top text-[11px] text-slate-900">
                    {r.clientSite ?? ""}
                  </td>
                  <td className="min-w-[170px] px-3 py-2 align-top text-[11px] text-slate-700">
                    {r.modality ?? ""}
                  </td>
                  <td className="min-w-[110px] px-3 py-2 align-top text-[11px] text-slate-700">
                    {fmtDecimal(r.m2Month as any, 0)}
                  </td>
                  <td className="min-w-[110px] px-3 py-2 align-top text-[11px] text-slate-700">
                    {fmtDecimal(r.priceUsdM2 as any, 4)}
                  </td>
                  <td className="min-w-[120px] px-3 py-2 align-top text-[11px] text-slate-700">
                    {fmtDecimal(r.revenueUsdMonth as any, 2)}
                  </td>
                  <td className="min-w-[220px] px-3 py-2 align-top text-[11px] text-slate-700 whitespace-pre-line">
                    {r.directCosts ?? ""}
                  </td>
                  <td className="min-w-[170px] px-3 py-2 align-top text-[11px] text-slate-700">
                    {r.margin ?? ""}
                  </td>
                  <td className="min-w-[90px] px-3 py-2 align-top text-[11px] text-slate-700">
                    {r.marginPct ?? ""}
                  </td>
                  <td className="min-w-[200px] px-3 py-2 align-top text-[11px] text-slate-700 whitespace-pre-line">
                    {r.risks ?? ""}
                  </td>
                  <td className="min-w-[200px] px-3 py-2 align-top text-[11px] text-slate-700 whitespace-pre-line">
                    {r.evidence ?? ""}
                  </td>
                  <td className="px-3 py-2 align-top text-[11px]">
                    <form action={deleteUE.bind(null, r.id, engagementId, locale)}>
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
                  <td colSpan={11} className="px-4 py-6 text-sm text-slate-500">
                    {t(
                      locale,
                      "Aún no hay filas. Crea la primera con un contrato real (aunque sea con números estimados).",
                      "No rows yet. Create the first one with a real contract (even with estimates).",
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
