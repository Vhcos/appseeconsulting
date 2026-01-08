// app/[locale]/wizard/[engagementId]/tables/kpis/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getHelpVideo } from "@/lib/see/helpVideos";
import { BscPerspective, KpiBasis, KpiDirection, KpiFrequency } from "@prisma/client";

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
    INTERNAL_PROCESS: { es: "Procesos internos", en: "Internal process" },
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

function basisLabel(locale: string, b: KpiBasis) {
  const map: Record<KpiBasis, { es: string; en: string }> = {
    A: { es: "A (YTD-AVG)", en: "A (YTD-AVG)" },
    L: { es: "L (LTM/TTM)", en: "L (LTM/TTM)" },
  };
  return t(locale, map[b].es, map[b].en);
}

function isNextRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as any).digest === "string" &&
    (e as any).digest.startsWith("NEXT_REDIRECT")
  );
}

/**
 * Valida y normaliza número como string.
 * - acepta "10", "10.5", "10,5"
 * - devuelve string con punto decimal o null si inválido
 */
function normalizeNumericString(raw: string): string | null {
  const s0 = (raw ?? "").trim();
  if (!s0) return null;
  const s = s0.replace(/\s+/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return s;
}

/* =========================
   CSV helpers (sin libs)
   ========================= */

function stripBom(s: string) {
  if (!s) return s;
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function detectDelimiter(headerLine: string) {
  const candidates = [",", ";", "\t"];
  const score = (d: string) => {
    let count = 0;
    for (let i = 0; i < headerLine.length; i++) if (headerLine[i] === d) count++;
    return count;
  };
  let best = candidates[0];
  let bestScore = score(best);
  for (const d of candidates.slice(1)) {
    const s = score(d);
    if (s > bestScore) {
      best = d;
      bestScore = s;
    }
  }
  return best;
}

function parseCsvLine(line: string, delimiter: string) {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((v) => v.trim());
}

function normalizeHeader(s: string) {
  const raw = (s ?? "").trim();
  if (!raw) return "";
  const noAccents = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return noAccents
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

type KpiCsvRow = {
  nameEs: string;
  nameEn: string;
  perspective: BscPerspective | null;
  frequency: KpiFrequency | null;
  direction: KpiDirection | null;
  basis: KpiBasis | null; // ✅ NUEVO
  unit: string | null;
  targetValue: string | null; // NUMERICA
  targetText: string | null; // DETALLE
  ownerEmail: string | null;
  actionText: string | null; // se guarda en descriptionEs/En
};

function mapBasisCsv(v: string): KpiBasis | null {
  const raw0 = (v ?? "").trim();
  if (!raw0) return null;

  const raw = raw0.toUpperCase().replace(/\s+/g, "").replace(/_/g, "-");

  if (raw === "A") return "A";
  if (raw === "L") return "L";

  // variantes comunes
  if (raw.includes("YTD")) return "A"; // YTD (Year to Date)
  if (raw.includes("AVG")) return "A"; // AVG (Average)
  if (raw.includes("YTD-AVG")) return "A";

  if (raw.includes("LTM")) return "L"; // LTM (Last Twelve Months)
  if (raw.includes("TTM")) return "L"; // TTM (Trailing Twelve Months)
  if (raw.includes("LTM/TTM")) return "L";

  return null;
}

function mapPerspectiveCsv(v: string): BscPerspective | null {
  const raw = (v ?? "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase() as BscPerspective;
  if (["FINANCIAL", "CUSTOMER", "INTERNAL_PROCESS", "LEARNING_GROWTH"].includes(upper)) return upper;

  const norm = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (["financiera", "finanzas", "financial", "fin"].includes(norm)) return "FINANCIAL";
  if (["financiera/operacional", "financiera / operacional", "operacional", "operacional/financiera"].includes(norm))
    return "FINANCIAL";

  if (["cliente", "clientes", "customer", "client"].includes(norm)) return "CUSTOMER";

  if (
    [
      "proceso_interno",
      "procesos_internos",
      "proceso interno",
      "procesos internos",
      "procesos",
      "internal process",
      "internal_process",
    ].includes(norm)
  )
    return "INTERNAL_PROCESS";

  if (
    [
      "aprendizaje_y_crecimiento",
      "aprendizaje y crecimiento",
      "learning & growth",
      "learning and growth",
      "learning_growth",
    ].includes(norm)
  )
    return "LEARNING_GROWTH";

  return null;
}

function mapFrequencyCsv(v: string): KpiFrequency | null {
  const raw = (v ?? "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase() as KpiFrequency;
  if (["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "ADHOC"].includes(upper)) return upper;

  const norm = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const hasWeekly = norm.includes("semanal") || norm.includes("weekly") || norm.includes("semana");
  const hasMonthly = norm.includes("mensual") || norm.includes("monthly") || norm.includes("mes");
  const hasQuarterly = norm.includes("trimestral") || norm.includes("quarterly") || norm.includes("trimestre");
  const hasYearly = norm.includes("anual") || norm.includes("yearly") || norm.includes("ano") || norm.includes("año");
  const hasAdhoc =
    norm.includes("a demanda") || norm.includes("adhoc") || norm.includes("ad hoc") || norm.includes("ad-hoc");

  if (hasWeekly) return "WEEKLY";
  if (hasMonthly) return "MONTHLY";
  if (hasQuarterly) return "QUARTERLY";
  if (hasYearly) return "YEARLY";
  if (hasAdhoc) return "ADHOC";

  return null;
}

function mapDirectionCsv(v: string): KpiDirection | null {
  const raw = (v ?? "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase() as KpiDirection;
  if (["HIGHER_IS_BETTER", "LOWER_IS_BETTER"].includes(upper)) return upper;

  if (raw.includes("↓")) return "LOWER_IS_BETTER";
  if (raw.includes("↑")) return "HIGHER_IS_BETTER";

  const norm = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (["mas alto es mejor", "higher is better", "higher", "up"].includes(norm)) return "HIGHER_IS_BETTER";
  if (["mas bajo es mejor", "lower is better", "lower", "down"].includes(norm)) return "LOWER_IS_BETTER";

  return null;
}

function pickFirstNonEmpty(...vals: string[]) {
  for (const v of vals) {
    const s = (v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function parseCsvToKpiRows(csvTextRaw: string): { rows: KpiCsvRow[]; headerKeys: string[] } {
  const csvText = stripBom(csvTextRaw ?? "");
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { rows: [], headerKeys: [] };

  const delimiter = detectDelimiter(lines[0]);
  const header = parseCsvLine(lines[0], delimiter);
  const headerKeys = header.map(normalizeHeader);

  const canon = (k: string) => {
    const h = normalizeHeader(k);

    const aliases: Record<string, string> = {
      // nombre
      nombre: "name_es",
      name: "name_es",
      name_es: "name_es",
      nombre_es: "name_es",
      kpi: "name_es",
      kpi_es: "name_es",

      // EN
      name_en: "name_en",
      nombre_en: "name_en",
      kpi_en: "name_en",

      // enums
      perspectiva: "perspective",
      perspective: "perspective",

      frecuencia: "frequency",
      frequency: "frequency",

      direccion: "direction",
      direction: "direction",

      // ✅ base (A / L)
      base: "basis",
      basis: "basis",
      tipo: "basis",
      calc_basis: "basis",
      calculation_basis: "basis",
      periodo_base: "basis",
      base_calculo: "basis",

      // extras
      unidad: "unit",
      unit: "unit",

      // meta NUMERICA
      target_value: "target_value",
      meta_numerica: "target_value",
      meta_num: "target_value",
      target: "target_value",
      meta: "target_value",

      // detalle meta (texto)
      target_text: "target_text",
      meta_texto: "target_text",
      meta_text: "target_text",
      detalle_meta: "target_text",
      detalle_de_meta: "target_text",
      detalle_de_la_meta: "target_text",
      target_detail: "target_text",
      target_details: "target_text",

      // responsable
      responsable_email: "owner_email",
      owner_email: "owner_email",
      owner: "owner_email",
      responsable: "owner_email",

      // ACCION
      accion: "action_text",
      acción: "action_text",
      action: "action_text",
      accion_clave: "action_text",
      descripcion: "action_text",
      description: "action_text",
      description_es: "action_text",
      descripcion_es: "action_text",
    };

    return aliases[h] ?? h;
  };

  const colIndex: Record<string, number> = {};
  headerKeys.forEach((hk, idx) => {
    const c = canon(hk);
    if (colIndex[c] === undefined) colIndex[c] = idx;
  });

  const get = (cols: string[], values: string[]) => {
    for (const c of cols) {
      const idx = colIndex[c];
      if (idx === undefined) continue;
      const v = (values[idx] ?? "").trim();
      if (v) return v;
    }
    return "";
  };

  const out: KpiCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], delimiter);

    const nameEs = pickFirstNonEmpty(get(["name_es"], values));
    const nameEnRaw = get(["name_en"], values);

    const perspectiveRaw = get(["perspective"], values);
    const frequencyRaw = get(["frequency"], values);
    const directionRaw = get(["direction"], values);
    const basisRaw = get(["basis"], values);

    const unit = get(["unit"], values) || "";

    const targetValueRaw = get(["target_value"], values) || "";
    const targetValueNorm = targetValueRaw ? normalizeNumericString(targetValueRaw) : null;

    const targetText = get(["target_text"], values) || "";

    const ownerEmail = get(["owner_email"], values) || "";
    const actionText = get(["action_text"], values) || "";

    out.push({
      nameEs,
      nameEn: nameEnRaw,
      perspective: mapPerspectiveCsv(perspectiveRaw),
      frequency: mapFrequencyCsv(frequencyRaw),
      direction: mapDirectionCsv(directionRaw),
      basis: mapBasisCsv(basisRaw),
      unit: unit ? unit : null,
      targetValue: targetValueNorm ? targetValueNorm : null,
      targetText: targetText ? targetText : null,
      ownerEmail: ownerEmail ? ownerEmail : null,
      actionText: actionText ? actionText : null,
    });
  }

  return { rows: out, headerKeys };
}

function buildRedirectUrl(
  locale: string,
  engagementId: string,
  params: { imported?: number; failed?: number; importError?: string; createError?: string }
) {
  const base = `/${locale}/wizard/${engagementId}/tables/kpis`;
  const qs = new URLSearchParams();
  if (params.imported != null) qs.set("imported", String(params.imported));
  if (params.failed != null) qs.set("failed", String(params.failed));
  if (params.importError) qs.set("importError", params.importError.slice(0, 400));
  if (params.createError) qs.set("createError", params.createError.slice(0, 400));
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

/* =========================
   Actions
   ========================= */

async function createKpi(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const nameEs = String(formData.get("nameEs") ?? "").trim();
  if (!nameEs) return;

  const perspective = String(formData.get("perspective") ?? "").trim() as BscPerspective;
  const frequency = String(formData.get("frequency") ?? "").trim() as KpiFrequency;
  const direction = String(formData.get("direction") ?? "").trim() as KpiDirection;

  // ✅ Base (A/L) – default A
  const basisRaw = String(formData.get("basis") ?? "").trim().toUpperCase();
  const basis: KpiBasis = basisRaw === "L" ? "L" : "A";

  const unit = String(formData.get("unit") ?? "").trim() || null;

  const targetValueRaw = String(formData.get("targetValue") ?? "").trim();
  const targetValueNorm = targetValueRaw ? normalizeNumericString(targetValueRaw) : null;
  if (targetValueRaw && !targetValueNorm) {
    redirect(
      buildRedirectUrl(locale, engagementId, {
        createError: t(
          locale,
          "Meta inválida: debe ser numérica (ej: 10 o 10,5). El texto va en “Detalle de la meta”.",
          "Invalid target: must be numeric (e.g. 10 or 10.5). Text goes in “Target details”."
        ),
      })
    );
  }

  const targetText = String(formData.get("targetText") ?? "").trim() || null;

  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim();
  let ownerUserId: string | null = null;

  if (ownerEmail) {
    const u = await prisma.user.findFirst({ where: { email: ownerEmail } });
    ownerUserId = u?.id ?? null;
  }

  const actionText = String(formData.get("actionText") ?? "").trim() || null;

  const nameEnInput = String(formData.get("nameEn") ?? "").trim();
  const nameEnFinal = locale === "en" ? (nameEnInput || nameEs) : nameEs;

  const descriptionEs = locale === "en" ? null : actionText;
  const descriptionEn = locale === "en" ? actionText : null;

  await prisma.kpi.create({
    data: {
      engagementId,
      nameEs,
      nameEn: nameEnFinal,
      perspective,
      frequency,
      direction,
      basis, // ✅
      unit,
      targetValue: targetValueNorm ? (targetValueNorm as any) : null,
      targetText,
      ownerUserId,
      descriptionEs,
      descriptionEn,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/kpis`);
  revalidatePath(`/${locale}/wizard/${engagementId}/tables`);
}

async function deleteKpi(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.kpi.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/kpis`);
  revalidatePath(`/${locale}/wizard/${engagementId}/tables`);
}

async function importKpisCsv(engagementId: string, locale: string, formData: FormData) {
  "use server";

  try {
    const replaceAll = String(formData.get("replaceAll") ?? "") === "on";

    const file = formData.get("file") as File | null;
    if (!file) {
      redirect(buildRedirectUrl(locale, engagementId, { imported: 0, failed: 0, importError: "Falta archivo CSV." }));
    }

    if (file.size > 2 * 1024 * 1024) {
      redirect(buildRedirectUrl(locale, engagementId, { imported: 0, failed: 0, importError: "El CSV excede 2MB." }));
    }

    const csvText = await file.text();
    const parsed = parseCsvToKpiRows(csvText);
    const rows = parsed.rows;

    if (replaceAll) {
      await prisma.kpi.deleteMany({ where: { engagementId } });
    }

    const emails = Array.from(
      new Set(
        rows
          .map((r) => (r.ownerEmail ?? "").trim())
          .filter((e) => e.length > 0)
          .map((e) => e.toLowerCase())
      )
    );

    const users = emails.length
      ? await prisma.user.findMany({
          where: { email: { in: emails } },
          select: { id: true, email: true },
        })
      : [];

    const userByEmail = new Map(users.filter((u) => u.email).map((u) => [u.email!.toLowerCase(), u.id]));

    let imported = 0;
    let failed = 0;

    for (const r of rows) {
      const nameEs = (r.nameEs ?? "").trim();
      const perspective = r.perspective;
      const frequency = r.frequency;
      const direction = r.direction;

      if (!nameEs || !perspective || !frequency || !direction) {
        failed++;
        continue;
      }

      // ✅ default A si viene vacío o inválido
      const basis: KpiBasis = r.basis ?? "A";

      const nameEnFinal = locale === "en" ? ((r.nameEn ?? "").trim() || nameEs) : nameEs;

      const ownerEmail = (r.ownerEmail ?? "").trim().toLowerCase();
      const ownerUserId = ownerEmail ? userByEmail.get(ownerEmail) ?? null : null;

      const descriptionEs = locale === "en" ? null : r.actionText ?? null;
      const descriptionEn = locale === "en" ? r.actionText ?? null : null;

      try {
        await prisma.kpi.create({
          data: {
            engagementId,
            nameEs,
            nameEn: nameEnFinal,
            perspective,
            frequency,
            direction,
            basis, // ✅
            unit: r.unit ?? null,
            targetValue: (r.targetValue ?? null) as any,
            targetText: r.targetText ?? null,
            ownerUserId,
            descriptionEs,
            descriptionEn,
          },
        });
        imported++;
      } catch {
        failed++;
      }
    }

    revalidatePath(`/${locale}/wizard/${engagementId}/tables/kpis`);
    revalidatePath(`/${locale}/wizard/${engagementId}/tables`);
    revalidatePath(`/${locale}/wizard/${engagementId}`);

    redirect(buildRedirectUrl(locale, engagementId, { imported, failed }));
  } catch (e) {
    if (isNextRedirectError(e)) throw e;

    const msg = e instanceof Error ? e.message : "Error desconocido importando CSV.";
    redirect(buildRedirectUrl(locale, engagementId, { imported: 0, failed: 0, importError: msg }));
  }
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

  const imported = readString(sp, "imported");
  const failed = readString(sp, "failed");
  const importError = readString(sp, "importError");
  const createError = readString(sp, "createError");

  const showEnglishFields = locale === "en";

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">BSC</div>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{t(locale, "KPIs", "KPIs")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Pocos y buenos. Meta numérica (medible) + detalle opcional.",
              "Keep it few and strong. Numeric target (measurable) + optional details."
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

      {(createError || importError) && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <div className="font-semibold">{t(locale, "Ojo:", "Heads up:")}</div>
          <div className="mt-1">{createError || importError}</div>
        </div>
      )}

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
            {t(locale, "si no lo puedes medir con un número, no lo pongas como meta.", "if you can’t measure it with a number, don’t use it as target.")}
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

      {/* IMPORT / EXPORT */}
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Importar / Exportar", "Import / Export")}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {t(
                locale,
                "Importa KPIs desde CSV. Incluye Base (A/L): A = YTD-AVG (Year to Date Average), L = LTM/TTM (Last/Trailing Twelve Months). Si viene vacío, se asume A.",
                "Import KPIs from CSV. Includes Basis (A/L): A = YTD-AVG (Year to Date Average), L = LTM/TTM (Last/Trailing Twelve Months). If blank, defaults to A."
              )}
            </p>
          </div>

          <a
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            href={`/api/wizard/${engagementId}/tables/kpis/template`}
          >
            {t(locale, "Descargar CSV plantilla", "Download CSV template")}
          </a>
        </div>

        {(imported || failed) && !importError && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <div className="font-medium text-slate-800">
              {t(locale, "Resultado:", "Result:")}{" "}
              <span className="font-normal text-slate-700">
                {t(locale, "Importadas", "Imported")}: {imported || "0"} · {t(locale, "Fallidas", "Failed")}: {failed || "0"}
              </span>
            </div>
          </div>
        )}

        <form action={importKpisCsv.bind(null, engagementId, locale)} className="mt-4 grid gap-3">
          <div className="grid gap-2 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-800">{t(locale, "Archivo CSV (máx 2MB)", "CSV file (max 2MB)")}</label>
              <input
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="mt-1 text-xs text-slate-500">{t(locale, "Acepta separador: coma, punto y coma o tab.", "Accepts delimiter: comma, semicolon or tab.")}</div>
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <input name="replaceAll" type="checkbox" className="h-4 w-4" />
                {t(locale, "Reemplazar todo", "Replace all")}
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" type="submit">
              {t(locale, "Importar (CSV)", "Import (CSV)")}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Nuevo KPI", "New KPI")}</h2>

        <form action={createKpi.bind(null, engagementId, locale)} className="mt-4 grid gap-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Nombre", "Name")}</label>
              <input
                name="nameEs"
                required
                placeholder={t(locale, "Ej: Costo directo por m²", "e.g. Direct cost per m²")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {showEnglishFields ? (
              <div>
                <label className="text-sm font-medium text-slate-800">{t(locale, "Nombre (EN) (opcional)", "Name (EN) (optional)")}</label>
                <input
                  name="nameEn"
                  placeholder={t(locale, "Si lo dejas vacío, copiamos ES", "If empty, we copy ES")}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 md:grid-cols-4">
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
                {(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "ADHOC"] as KpiFrequency[]).map((f) => (
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
                {(["HIGHER_IS_BETTER", "LOWER_IS_BETTER"] as KpiDirection[]).map((d) => (
                  <option key={d} value={d}>
                    {dirLabel(locale, d)}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ Base A/L */}
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Base", "Basis")}</label>
              <select
                name="basis"
                defaultValue="A"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="A">{t(locale, "A (YTD-AVG)", "A (YTD-AVG)")}</option>
                <option value="L">{t(locale, "L (LTM/TTM)", "L (LTM/TTM)")}</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                {t(locale, "Si no estás segura, deja A.", "If unsure, keep A.")}
              </div>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Unidad (opcional)", "Unit (optional)")}</label>
              <input
                name="unit"
                placeholder={t(locale, "Ej: % / $ / días", "e.g. % / $ / days")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Responsable (email) (opcional)", "Owner (email) (optional)")}</label>
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
              <label className="text-sm font-medium text-slate-800">{t(locale, "Meta (numérica)", "Target (numeric)")}</label>
              <input
                name="targetValue"
                inputMode="decimal"
                placeholder={t(locale, "Ej: 10", "e.g. 10")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="mt-1 text-xs text-slate-500">
                {t(locale, "Debe ser número. El texto va en “Detalle de la meta”.", "Must be a number. Text goes in “Target details”.")}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-800">{t(locale, "Detalle de la meta (opcional)", "Target details (optional)")}</label>
              <input
                name="targetText"
                placeholder={t(locale, "Ej: 12m: -8% vs últimos 12 meses", "e.g. 12m: -8% vs last 12 months")}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="mt-1 text-xs text-slate-500">
                {t(locale, "Aquí va la regla/interpretación. No afecta el cálculo.", "Rule/interpretation. Doesn’t affect calculation.")}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-800">{t(locale, "Acción (opcional)", "Action (optional)")}</label>
            <input
              name="actionText"
              placeholder={t(locale, "Ej: SOP + planificación + control de productividad", "e.g. SOP + planning + productivity control")}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <div className="mt-1 text-xs text-slate-500">
              {t(locale, "Qué haremos para mover este KPI.", "What we’ll do to move this KPI.")}
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
          <Link
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            href={`/api/wizard/${engagementId}/tables/kpis/export.xlsx`}
          >
            Descargar XLSX
          </Link>
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
                  t(locale, "Base", "Basis"),
                  t(locale, "Unidad", "Unit"),
                  t(locale, "Meta", "Target"),
                  t(locale, "Detalle de la meta", "Target details"),
                  t(locale, "Acción", "Action"),
                  t(locale, "Eliminar", "Delete"),
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const actionShown = locale === "en" ? (r.descriptionEn ?? "") : (r.descriptionEs ?? "");
                const b = (r as any).basis as KpiBasis | undefined; // por si hay registros antiguos
                const basis = b ?? "A";
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="min-w-[260px] border-b border-slate-100 px-3 py-2">{t(locale, r.nameEs, r.nameEn)}</td>
                    <td className="min-w-[170px] border-b border-slate-100 px-3 py-2">{perspectiveLabel(locale, r.perspective)}</td>
                    <td className="min-w-[120px] border-b border-slate-100 px-3 py-2">{freqLabel(locale, r.frequency)}</td>
                    <td className="min-w-[170px] border-b border-slate-100 px-3 py-2">{dirLabel(locale, r.direction)}</td>

                    <td className="min-w-[140px] border-b border-slate-100 px-3 py-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {basisLabel(locale, basis)}
                      </span>
                    </td>

                    <td className="min-w-[120px] border-b border-slate-100 px-3 py-2">{r.unit ?? ""}</td>

                    <td className="min-w-[120px] border-b border-slate-100 px-3 py-2">
                      {r.targetValue != null ? String(r.targetValue) : ""}
                    </td>

                    <td className="min-w-[260px] border-b border-slate-100 px-3 py-2">{r.targetText ?? ""}</td>

                    <td className="min-w-[320px] border-b border-slate-100 px-3 py-2">{actionShown}</td>

                    <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Link
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                          href={`/${locale}/wizard/${engagementId}/tables/kpis/${r.id}`}
                        >
                          {t(locale, "Editar", "Edit")}
                        </Link>

                        <form action={deleteKpi.bind(null, r.id, engagementId, locale)}>
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
                  <td colSpan={10} className="px-3 py-6 text-center text-sm text-slate-500">
                    {t(locale, "Aún no hay KPIs.", "No KPIs yet.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          {t(locale, "Tip: luego en Iniciativas puedes amarrar cada iniciativa a un KPI.", "Tip: later in Initiatives you can link each initiative to a KPI.")}
        </div>
      </section>
    </main>
  );
}
