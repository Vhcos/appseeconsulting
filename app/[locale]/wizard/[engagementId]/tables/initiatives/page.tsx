//app/[locale]/wizard/[engagementId]/tables/initiatives/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BscPerspective } from "@prisma/client";

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
  return Math.round(n);
}

function clamp1to5(n: number | null): number | null {
  if (n == null) return null;
  return Math.min(5, Math.max(1, n));
}

function parseDateMaybe(v: FormDataEntryValue | null): Date | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy}`;
}

function perspectiveLabel(locale: string, p: BscPerspective) {
  const map: Record<BscPerspective, { es: string; en: string }> = {
    FINANCIAL: { es: "Finanzas", en: "Financial" },
    CUSTOMER: { es: "Cliente", en: "Customer" },
    INTERNAL_PROCESS: { es: "Operación", en: "Internal process" },
    LEARNING_GROWTH: { es: "Equipo", en: "Learning & growth" },
  };
  return t(locale, map[p].es, map[p].en);
}

function ierLabel(locale: string, n: number | null | undefined): string {
  if (n == null) return "—";
  if (n <= 2) return t(locale, "Bajo", "Low");
  if (n === 3) return t(locale, "Medio", "Medium");
  return t(locale, "Alto", "High");
}

/** ===========================
 * CSV IMPORT (robusto: ; o ,)
 * =========================== */

function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  const comma = (headerLine.match(/,/g) ?? []).length;
  const semi = (headerLine.match(/;/g) ?? []).length;
  const tab = (headerLine.match(/\t/g) ?? []).length;
  if (semi >= comma && semi >= tab) return ";";
  if (tab >= comma && tab >= semi) return "\t";
  return ",";
}

function parseCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === delim) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function mapPerspective(raw: string | null | undefined): BscPerspective {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return BscPerspective.INTERNAL_PROCESS;

  if (s === "financial" || s === "finanzas" || s === "financiera") return BscPerspective.FINANCIAL;
  if (s === "customer" || s === "cliente" || s === "clientes") return BscPerspective.CUSTOMER;
  if (s.includes("internal") || s.includes("proceso") || s.includes("operación") || s.includes("operacion"))
    return BscPerspective.INTERNAL_PROCESS;
  if (s.includes("learning") || s.includes("aprendiz") || s.includes("equipo") || s.includes("crecimiento"))
    return BscPerspective.LEARNING_GROWTH;

  if (s.includes("fin")) return BscPerspective.FINANCIAL;
  if (s.includes("clie")) return BscPerspective.CUSTOMER;
  if (s.includes("proc") || s.includes("oper")) return BscPerspective.INTERNAL_PROCESS;
  if (s.includes("equip") || s.includes("aprend")) return BscPerspective.LEARNING_GROWTH;

  return BscPerspective.INTERNAL_PROCESS;
}

function buildNotes(parts: Array<string | null | undefined>): string | null {
  const clean = parts.map((x) => (x ?? "").trim()).filter(Boolean);
  return clean.length ? clean.join(" · ") : null;
}

function normalizeTextKey(s: string): string {
  // lower + sin tildes + solo letras/números/espacios, colapsa espacios
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function parseHorizonWeeks(raw: string): number | null {
  // "0-8 semanas" -> 8, "8 semanas" -> 8, "2 a 6 semanas" -> 6
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return null;
  const nums = Array.from(s.matchAll(/(\d+)\s*/g)).map((m) => Number(m[1]));
  if (!nums.length) return null;
  const max = Math.max(...nums.filter((n) => Number.isFinite(n)));
  return Number.isFinite(max) ? max : null;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

type ImportRow = {
  id_ref?: string;
  title?: string;
  perspective?: string;
  owner?: string;
  horizon?: string;
  kpi?: string;
  status?: string;
  notes?: string;
  kpi_name?: string;
  kpi_id?: string;
  start_date?: string;
  end_date?: string;
  impact?: string;
  effort?: string;
  risk?: string;
};

function parseCsvToObjects(text: string): { rows: ImportRow[]; error?: string } {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return { rows: [], error: "CSV vacío o sin filas." };

  const delim = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delim).map(normalizeHeader);

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delim);
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = (cols[j] ?? "").trim();

    rows.push({
      id_ref: obj["id_ref"] || obj["id"] || "",
      title: obj["title"] || obj["titulo"] || "",
      perspective: obj["perspective"] || obj["area"] || "",
      owner: obj["owner"] || obj["dueño"] || obj["dueno"] || "",
      horizon: obj["horizon"] || obj["horizonte"] || "",
      kpi: obj["kpi"] || "",
      status: obj["status"] || obj["estado"] || "",
      notes: obj["notes"] || obj["nota"] || "",
      kpi_name: obj["kpi_name"] || obj["kpiname"] || "",
      kpi_id: obj["kpi_id"] || obj["kpiid"] || "",
      start_date: obj["start_date"] || obj["startdate"] || obj["inicio"] || obj["start"] || "",
      end_date: obj["end_date"] || obj["enddate"] || obj["fin"] || obj["end"] || "",
      impact: obj["impact"] || obj["i"] || "",
      effort: obj["effort"] || obj["e"] || "",
      risk: obj["risk"] || obj["r"] || "",
    });
  }

  return { rows };
}

export default async function InitiativesPage({
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
  const from = fromParam || fromRef || "step-6-portafolio";

  const backHref =
    from === "tables" ? `/${locale}/wizard/${engagementId}/tables` : `/${locale}/wizard/${engagementId}/${from}`;

  const imported = readString(sp, "imported");
  const failed = readString(sp, "failed");
  const importError = readString(sp, "importError");

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

  const kpis = await prisma.kpi.findMany({
    where: { engagementId },
    select: { id: true, nameEs: true, nameEn: true, perspective: true, frequency: true },
    orderBy: [{ perspective: "asc" }, { nameEs: "asc" }],
  });

  async function createInitiative(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const owner = String(formData.get("owner") ?? "").trim();
    const problem = String(formData.get("problem") ?? "").trim() || null;
    const definitionDone = String(formData.get("definitionDone") ?? "").trim() || null;

    const status = String(formData.get("status") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    const kpiIdRaw = String(formData.get("kpiId") ?? "").trim();
    const kpiId = kpiIdRaw ? kpiIdRaw : null;

    const perspectiveRaw = String(formData.get("perspective") ?? "").trim();
    const perspective = (Object.values(BscPerspective).includes(perspectiveRaw as any)
      ? (perspectiveRaw as BscPerspective)
      : BscPerspective.INTERNAL_PROCESS);

    const impact = clamp1to5(parseIntMaybe(formData.get("impact")));
    const effort = clamp1to5(parseIntMaybe(formData.get("effort")));
    const risk = clamp1to5(parseIntMaybe(formData.get("risk")));

    const startDate = parseDateMaybe(formData.get("startDate"));
    const endDate = parseDateMaybe(formData.get("endDate"));

    const dependencies = String(formData.get("dependencies") ?? "").trim() || null;

    if (!title || !owner) return;

    await prisma.initiative.create({
      data: {
        engagementId,
        title,
        owner,
        perspective,
        kpiId,
        problem,
        definitionDone,
        status,
        impact,
        effort,
        risk,
        startDate,
        endDate,
        dependencies,
        notes,
      },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/tables/initiatives`);
    revalidatePath(`/${locale}/wizard/${engagementId}/step-0-contexto`);
  }

  async function importInitiativesCsv(formData: FormData) {
    "use server";

    const replaceAll = String(formData.get("replaceAll") ?? "") === "1";
    if (replaceAll) {
      await prisma.initiative.deleteMany({ where: { engagementId } });
    }

    const file = formData.get("csv") as File | null;
    if (!file) {
      const qs = new URLSearchParams({ imported: "0", failed: "0", importError: "No seleccionaste archivo." });
      redirect(`/${locale}/wizard/${engagementId}/tables/initiatives?from=${from}&${qs.toString()}`);
    }

    if (file.size > 2_000_000) {
      const qs = new URLSearchParams({ imported: "0", failed: "0", importError: "CSV demasiado grande (max 2MB)." });
      redirect(`/${locale}/wizard/${engagementId}/tables/initiatives?from=${from}&${qs.toString()}`);
    }

    const ab = await file.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(ab);

    const parsed = parseCsvToObjects(text);
    if (parsed.error) {
      const qs = new URLSearchParams({ imported: "0", failed: "0", importError: parsed.error });
      redirect(`/${locale}/wizard/${engagementId}/tables/initiatives?from=${from}&${qs.toString()}`);
    }

    const rows = parsed.rows ?? [];
    if (!rows.length) {
      const qs = new URLSearchParams({ imported: "0", failed: "0", importError: "No se detectaron filas." });
      redirect(`/${locale}/wizard/${engagementId}/tables/initiatives?from=${from}&${qs.toString()}`);
    }

    // IMPORTANT: NO usar "kpis" del render. Volvemos a consultarlo dentro de la server action.
    const kpisDb = await prisma.kpi.findMany({
      where: { engagementId },
      select: { id: true, nameEs: true, nameEn: true },
    });

    const kpiByKey = new Map<string, string>();
    for (const k of kpisDb) {
      const es = normalizeTextKey((k.nameEs ?? "").trim());
      const en = normalizeTextKey((k.nameEn ?? "").trim());
      if (es) kpiByKey.set(es, k.id);
      if (en) kpiByKey.set(en, k.id);
    }

    function resolveKpiId(row: ImportRow): string | null {
      const kpiIdRaw = (row.kpi_id ?? "").trim();
      if (kpiIdRaw && kpisDb.some((k) => k.id === kpiIdRaw)) return kpiIdRaw;

      const nameCandidate = ((row.kpi_name ?? "") || (row.kpi ?? "")).trim();
      if (!nameCandidate) return null;

      const key = normalizeTextKey(nameCandidate);
      if (!key) return null;

      // 1) exact match
      const exact = kpiByKey.get(key);
      if (exact) return exact;

      // 2) match por "contiene": si el texto del CSV incluye un nombre de KPI existente
      // (ej: "Margen bruto / % Plus-Premium" vs "Margen bruto")
      // Evitamos ser demasiado agresivos: buscamos el match más largo.
      let bestId: string | null = null;
      let bestLen = 0;
      for (const [kKey, kId] of kpiByKey.entries()) {
        if (kKey.length < 4) continue;
        if (key.includes(kKey) || kKey.includes(key)) {
          const len = Math.min(kKey.length, key.length);
          if (len > bestLen) {
            bestLen = len;
            bestId = kId;
          }
        }
      }
      return bestId;
    }

    let ok = 0;
    let fail = 0;

    for (const r of rows) {
      const title = (r.title ?? "").trim();
      const owner = (r.owner ?? "").trim();
      if (!title || !owner) {
        fail++;
        continue;
      }

      const perspective = mapPerspective(r.perspective);
      const status = (r.status ?? "").trim() || "Por iniciar";
      const kpiId = resolveKpiId(r);

      // Fechas: si vienen en CSV, se usan; si no, pero viene horizon "0-8 semanas", se calcula endDate.
      const startRaw = (r.start_date ?? "").trim();
      const endRaw = (r.end_date ?? "").trim();
      const startDate = startRaw ? new Date(startRaw) : null;
      const endDate = endRaw ? new Date(endRaw) : null;

      let safeStart: Date | null = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;
      let safeEnd: Date | null = endDate && !Number.isNaN(endDate.getTime()) ? endDate : null;

      const horizonTxt = (r.horizon ?? "").trim();
      if (!safeStart && !safeEnd && horizonTxt) {
        const weeks = parseHorizonWeeks(horizonTxt);
        if (weeks != null) {
          safeStart = new Date();
          safeEnd = addDays(safeStart, weeks * 7);
        }
      }

      const impact = clamp1to5(r.impact ? Number(r.impact) : null);
      const effort = clamp1to5(r.effort ? Number(r.effort) : null);
      const risk = clamp1to5(r.risk ? Number(r.risk) : null);

      const notes = buildNotes([
        r.notes ?? null,
        (r.id_ref ?? "").trim() ? `Ref: ${(r.id_ref ?? "").trim()}` : null,
        horizonTxt ? `Horizonte: ${horizonTxt}` : null,
        // solo guardamos "KPI texto" si NO se logró linkear un kpiId (para debug útil)
        !kpiId && (r.kpi ?? "").trim() ? `KPI texto: ${(r.kpi ?? "").trim()}` : null,
      ]);

      await prisma.initiative.create({
        data: {
          engagementId,
          title,
          owner,
          perspective,
          status,
          notes,
          kpiId,
          startDate: safeStart,
          endDate: safeEnd,
          impact,
          effort,
          risk,
        },
      });

      ok++;
    }

    revalidatePath(`/${locale}/wizard/${engagementId}/tables/initiatives`);
    revalidatePath(`/${locale}/wizard/${engagementId}/tables`);
    revalidatePath(`/${locale}/wizard/${engagementId}/step-0-contexto`);

    const qs = new URLSearchParams();
    qs.set("from", from);
    qs.set("imported", String(ok));
    qs.set("failed", String(fail));
    redirect(`/${locale}/wizard/${engagementId}/tables/initiatives?${qs.toString()}`);
  }

  async function deleteInitiative(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return;

    await prisma.initiative.delete({ where: { id } });

    revalidatePath(`/${locale}/wizard/${engagementId}/tables/initiatives`);
    revalidatePath(`/${locale}/wizard/${engagementId}/step-0-contexto`);
  }

  const initiatives = await prisma.initiative.findMany({
    where: { engagementId },
    orderBy: [{ startDate: "asc" }, { title: "asc" }],
    include: { kpi: { select: { id: true, nameEs: true, nameEn: true } } },
  });

  function extractHorizonFromNotes(notes: string | null | undefined): string {
    const s = (notes ?? "").trim();
    if (!s) return "";
    const m = s.match(/Horizonte:\s*([^·]+)(?:·|$)/i);
    return m ? (m[1] ?? "").trim() : "";
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Tabla", "Table")} · {t(locale, "Iniciativas (cosas que haremos)", "Initiatives (things we’ll do)")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Iniciativas", "Initiatives")} — {clientName}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {t(
              locale,
              "Una iniciativa es una acción grande (pero aterrizada). Piensa: “esto es lo que haremos para mover la aguja”. No es teoría. Es trabajo real.",
              "An initiative is a concrete action. Think: “this is what we’ll do to move results”. Not theory—real work.",
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

      {/* IMPORT CSV */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-900">{t(locale, "Importar iniciativas (CSV)", "Import initiatives (CSV)")}</p>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Sube un CSV y crea todas las iniciativas de una. Mínimo requerido: title + owner. Acepta separador coma o punto y coma (;).",
                "Upload a CSV and bulk-create initiatives. Minimum: title + owner. Accepts comma or semicolon (;).",
              )}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {t(
                locale,
                "Header recomendado: id_ref,title,perspective,owner,horizon,start_date,end_date,kpi_name,kpi_id,status,impact,effort,risk,notes",
                "Recommended header: id_ref,title,perspective,owner,horizon,start_date,end_date,kpi_name,kpi_id,status,impact,effort,risk,notes",
              )}
            </p>

            {importError ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {t(locale, "Error:", "Error:")} {importError}
              </div>
            ) : null}

            {imported || failed ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {t(locale, "Resultado:", "Result:")}{" "}
                <span className="font-semibold">
                  {t(locale, "Importadas", "Imported")}: {imported || "0"}
                </span>{" "}
                ·{" "}
                <span className="font-semibold">
                  {t(locale, "Fallidas", "Failed")}: {failed || "0"}
                </span>
              </div>
            ) : null}
          </div>

          <form action={importInitiativesCsv} className="flex flex-col items-end gap-2">
            <input
              type="file"
              name="csv"
              accept=".csv,text/csv"
              className="block w-[260px] text-xs text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-900 hover:file:bg-slate-200"
            />
            <button className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700">
              {t(locale, "Importar CSV", "Import CSV")}
            </button>
             <label className="flex items-center gap-2 text-xs text-slate-700">
               <input type="checkbox" name="replaceAll" value="1" />
                 Reemplazar todas las iniciativas existentes antes de importar
             </label>
          </form>
        </div>
      </section>

      {/* Video (placeholder) */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-900">{t(locale, "Mira esto antes de llenar (2 min)", "Watch this before filling (2 min)")}</p>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Cuando tengamos el video en YouTube, lo linkeamos aquí para que cualquiera sepa qué escribir (sin dudas).",
                "When we have the YouTube video, we’ll link it here so anyone knows what to write (no doubts).",
              )}
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-600 md:w-[420px]">
            {t(
              locale,
              "Video aún no cargado. (Después lo reemplazamos por un embed de YouTube.)",
              "Video not loaded yet. (Later we’ll replace with a YouTube embed.)",
            )}
          </div>
        </div>
      </section>

      {/* Formulario */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Nueva iniciativa", "New initiative")}</h2>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Regla simple: título claro + dueño. Lo demás ayuda, pero no bloquea.",
                "Simple rule: clear title + owner. Everything else helps, but won’t block you.",
              )}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <div className="font-semibold">{t(locale, "Ejemplo mini", "Mini example")}</div>
            <div className="mt-1">
              {t(
                locale,
                "Título: “Piloto 2 km + medición polvo” · Dueño: “Operaciones” · Hecho cuando: “2 km operando 30 días + reporte KPI”",
                'Title: “2km pilot + dust measurement” · Owner: “Ops” · Done when: “2km running 30 days + KPI report”',
              )}
            </div>
          </div>
        </div>

        <form action={createInitiative} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Título (qué haremos)", "Title (what we’ll do)")} <span className="text-rose-600">*</span>
            </label>
            <input
              name="title"
              required
              placeholder={t(locale, "Ej: Piloto 2 km + medición de polvo (con evidencia)", "Ex: 2km pilot + dust measurement (with evidence)")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <p className="mt-1 text-[11px] text-slate-500">{t(locale, "Si alguien lo lee en 5 segundos, debe entenderlo.", "If someone reads it in 5 seconds, they should get it.")}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Dueño (quién lo empuja)", "Owner (who drives it)")} <span className="text-rose-600">*</span>
            </label>
            <input
              name="owner"
              required
              placeholder={t(locale, "Ej: Operaciones / Comercial / HSEC", "Ex: Ops / Sales / HSE")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Área (para ordenar)", "Area (to organize)")}</label>
            <select
              name="perspective"
              defaultValue={BscPerspective.INTERNAL_PROCESS}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              {Object.values(BscPerspective).map((p) => (
                <option key={p} value={p}>
                  {perspectiveLabel(locale, p)}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">{t(locale, "¿Qué problema resuelve? (1 frase)", "What problem does it solve? (1 sentence)")}</label>
            <input
              name="problem"
              placeholder={t(locale, "Ej: Reducir polvo sin aumentar detenciones ni costos", "Ex: Reduce dust without increasing downtime or costs")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Hecho cuando… (definición de éxito, 1 frase)", "Done when… (success definition, 1 sentence)")}</label>
            <input
              name="definitionDone"
              placeholder={t(locale, "Ej: 30 días operando + evidencia + KPI en verde", "Ex: 30 days running + evidence + KPI green")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "KPI asociado (si aplica)", "Linked KPI (optional)")}</label>
            <select
              name="kpiId"
              defaultValue=""
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">{t(locale, "— Ninguno", "— None")}</option>
              {kpis.map((k) => (
                <option key={k.id} value={k.id}>
                  {t(locale, k.nameEs, k.nameEn)} · {perspectiveLabel(locale, k.perspective)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">{t(locale, "Si no hay KPI, no pasa nada. Igual sirve.", "No KPI? No problem. Still useful.")}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Estado", "Status")}</label>
            <select
              name="status"
              defaultValue="Por iniciar"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="Por iniciar">{t(locale, "Por iniciar", "Not started")}</option>
              <option value="En curso">{t(locale, "En curso", "In progress")}</option>
              <option value="Bloqueada">{t(locale, "Bloqueada", "Blocked")}</option>
              <option value="Hecha">{t(locale, "Hecha", "Done")}</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Inicio (opcional)", "Start (optional)")}</label>
            <input name="startDate" type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Fin (opcional)", "End (optional)")}</label>
            <input name="endDate" type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          </div>

          <div className="md:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              <span className="font-semibold">{t(locale, "I/E/R:", "I/E/R:")}</span>{" "}
              {t(
                locale,
                "Impacto = cuánto mueve el resultado; Esfuerzo = costo interno; Riesgo = incertidumbre/dep. Para hacerlo operativo: 1–2 Bajo, 3 Medio, 4–5 Alto.",
                "Impact = how much it moves results; Effort = internal cost; Risk = uncertainty/deps. Practical mapping: 1–2 Low, 3 Medium, 4–5 High.",
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Impacto (1–5)", "Impact (1–5)")}</label>
            <select name="impact" defaultValue="" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
              <option value="">{t(locale, "—", "—")}</option>
              <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Esfuerzo (1–5)", "Effort (1–5)")}</label>
            <select name="effort" defaultValue="" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
              <option value="">{t(locale, "—", "—")}</option>
              <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Riesgo (1–5)", "Risk (1–5)")}</label>
            <select name="risk" defaultValue="" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
              <option value="">{t(locale, "—", "—")}</option>
              <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Dependencias (si hay)", "Dependencies (if any)")}</label>
            <input
              name="dependencies"
              placeholder={t(locale, "Ej: Permisos / proveedor / aprobación HSEC", "Ex: Permits / supplier / HSE approval")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Notas (opcional)", "Notes (optional)")}</label>
            <input
              name="notes"
              placeholder={t(locale, "Ej: Dejar evidencia (fotos, mediciones, reporte)", "Ex: Keep evidence (photos, measurements, report)")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              {t(locale, "Guardar iniciativa", "Save initiative")}
            </button>

            <Link className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" href={`/${locale}/wizard/${engagementId}/tables`}>
              {t(locale, "Ver todas las tablas", "See all tables")}
            </Link>

            <span className="ml-auto text-xs text-slate-500">
              {t(locale, "Total:", "Total:")} {initiatives.length}
            </span>
          </div>
        </form>
      </section>

      {/* Tabla */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{t(locale, "Iniciativas registradas", "Registered initiatives")}</h3>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Esto después alimenta el Roadmap y el Informe. Por ahora: que quede claro qué haremos y quién lo empuja.",
                "This will feed the Roadmap and Report. For now: make it clear what we’ll do and who drives it.",
              )}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {t(locale, "Tip:", "Tip:")} {t(locale, "impacto alto + esfuerzo bajo = quick win.", "high impact + low effort = quick win.")}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">{t(locale, "Iniciativa", "Initiative")}</th>
                <th className="py-2 pr-3">{t(locale, "Área", "Area")}</th>
                <th className="py-2 pr-3">{t(locale, "Dueño", "Owner")}</th>
                <th className="py-2 pr-3">{t(locale, "KPI", "KPI")}</th>
                <th className="py-2 pr-3">{t(locale, "Estado", "Status")}</th>
                <th className="py-2 pr-3">{t(locale, "Fechas", "Dates")}</th>
                <th className="py-2 pr-3">{t(locale, "I/E/R", "I/E/R")}</th>
                <th className="py-2 pr-0 text-right">{t(locale, "Acción", "Action")}</th>
              </tr>
            </thead>
            <tbody>
              {initiatives.length === 0 ? (
                <tr>
                  <td className="py-6 text-sm text-slate-500" colSpan={8}>
                    {t(locale, "Aún no hay iniciativas. Agrega la primera arriba o importa un CSV.", "No initiatives yet. Add one above or import a CSV.")}
                  </td>
                </tr>
              ) : (
                initiatives.map((it) => {
                  const horizon = !it.startDate && !it.endDate ? extractHorizonFromNotes(it.notes) : "";
                  const datesTxt = horizon ? horizon : `${fmtDate(it.startDate)} → ${fmtDate(it.endDate)}`;

                  return (
                    <tr key={it.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-900">{it.title}</div>

                        {(it.problem ?? "").trim() && (
                          <div className="mt-1 text-[11px] text-slate-600">
                            {t(locale, "Problema:", "Problem:")} {it.problem}
                          </div>
                        )}
                        {(it.definitionDone ?? "").trim() && (
                          <div className="mt-1 text-[11px] text-slate-600">
                            {t(locale, "Hecho cuando:", "Done when:")} {it.definitionDone}
                          </div>
                        )}
                        {(it.dependencies ?? "").trim() && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            {t(locale, "Dep:", "Deps:")} {it.dependencies}
                          </div>
                        )}
                        {(it.notes ?? "").trim() && <div className="mt-1 text-[11px] text-slate-500">{it.notes}</div>}
                      </td>

                      <td className="py-3 pr-3 whitespace-nowrap text-slate-800">{perspectiveLabel(locale, it.perspective)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap text-slate-800">{it.owner ?? "—"}</td>
                      <td className="py-3 pr-3 text-slate-800">{it.kpi ? t(locale, it.kpi.nameEs, it.kpi.nameEn) : "—"}</td>

                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {(it.status ?? "").trim() ? it.status : t(locale, "—", "—")}
                        </span>
                      </td>

                      <td className="py-3 pr-3 whitespace-nowrap text-slate-800">{datesTxt}</td>

                      <td className="py-3 pr-3 whitespace-nowrap text-slate-700">
                        {it.impact ?? "—"} / {it.effort ?? "—"} / {it.risk ?? "—"}
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {ierLabel(locale, it.impact)} · {ierLabel(locale, it.effort)} · {ierLabel(locale, it.risk)}
                        </div>
                      </td>

                      <td className="py-3 pr-0 text-right">
                        <div className="flex justify-end gap-3">
                          <Link
                            className="text-xs font-semibold text-indigo-600 hover:underline"
                            href={`/${locale}/wizard/${engagementId}/tables/initiatives/${it.id}?from=${from}`}
                          >
                            {t(locale, "Editar", "Edit")}
                          </Link>

                          <form action={deleteInitiative}>
                            <input type="hidden" name="id" value={it.id} />
                            <button className="text-xs font-semibold text-rose-600 hover:underline">{t(locale, "Eliminar", "Delete")}</button>
                          </form>
                        </div>
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
