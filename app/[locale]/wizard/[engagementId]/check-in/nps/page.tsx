// app/[locale]/wizard/[engagementId]/check-in/nps/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import CheckInNav from "@/components/see/CheckInNav";
import type { Prisma } from "@prisma/client";
import crypto from "crypto";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<{
  imported?: string;
  failed?: string;
  importError?: string;
  replaceAll?: string;

  semesterKey?: string;
  invitesCreated?: string;
  invitesSkipped?: string;
  invitesError?: string;
}>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function sanitizeSegment(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.includes("/") || s.includes("\\") || s.includes("..")) return null;
  if (s.length > 180) return null;
  return s;
}

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

function isValidEmail(s: string): boolean {
  const x = s.trim().toLowerCase();
  if (!x) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

type ContactRow = {
  fullName: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  title?: string | null;
  roleCode?: string | null;
  roleName?: string | null;
  unitCode?: string | null;
  unitName?: string | null;
};

function parseContactsCsv(text: string): { rows: ContactRow[]; error?: string } {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return { rows: [], error: "CSV vacío o sin filas." };

  const delim = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delim).map(normalizeHeader);

  const rows: ContactRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delim);
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = (cols[j] ?? "").trim();

    const fullName = obj["full_name"] || obj["nombre"] || obj["name"] || "";
    const email = (obj["email"] || obj["correo"] || "").trim();

    const roleCode =
      obj["role_code"] || obj["rol_codigo"] || obj["rol_code"] || obj["rol"] || obj["role"] || "";
    const roleName = obj["role_name"] || obj["rol_nombre"] || obj["cargo"] || "";

    const unitCode =
      obj["unit_code"] || obj["unidad"] || obj["faena"] || obj["contrato"] || obj["unit"] || "";
    const unitName = obj["unit_name"] || obj["unidad_nombre"] || obj["faena_nombre"] || "";

    rows.push({
      fullName: fullName.trim(),
      email: email.trim(),
      company: (obj["company"] || obj["empresa"] || "").trim() || null,
      phone: (obj["phone"] || obj["telefono"] || "").trim() || null,
      title: (obj["title"] || obj["titulo"] || "").trim() || null,
      roleCode: roleCode.trim() || null,
      roleName: roleName.trim() || null,
      unitCode: unitCode.trim() || null,
      unitName: unitName.trim() || null,
    });
  }

  return { rows };
}

function buildRedirectUrl(
  locale: string,
  engagementId: string,
  params: Record<string, string | number | null | undefined>
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    qs.set(k, String(v));
  }
  return `/${locale}/wizard/${engagementId}/check-in/nps?${qs.toString()}`;
}

// Semestre por defecto: YYYY S1 (ene-jun) / S2 (jul-dic)
function defaultSemesterKey(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const s = m <= 6 ? "S1" : "S2";
  return `${y}${s}`;
}

function normalizeSemesterKey(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim().toUpperCase();
  if (!s) return null;
  // formato: 2026S1 / 2026S2
  if (!/^\d{4}S[12]$/.test(s)) return null;
  return s;
}

function makeToken() {
  // token URL-safe, corto, no adivinado fácilmente
  return crypto.randomBytes(16).toString("hex");
}

// ================================
// SERVER ACTIONS
// ================================

async function importContactsCsv(engagementId: string, locale: string, formData: FormData) {
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
    const parsed = parseContactsCsv(csvText);
    if (parsed.error) {
      redirect(buildRedirectUrl(locale, engagementId, { imported: 0, failed: 0, importError: parsed.error }));
    }

    const rows = parsed.rows;

    if (replaceAll) {
      await prisma.npsContact.deleteMany({ where: { engagementId } });
    }

    // dedupe por email dentro del CSV (último gana)
    const byEmail = new Map<string, ContactRow>();
    for (const r of rows) {
      const email = (r.email ?? "").trim().toLowerCase();
      if (!email) continue;
      byEmail.set(email, r);
    }

    let imported = 0;
    let failed = 0;

    for (const [emailLower, r] of byEmail.entries()) {
      const fullName = (r.fullName ?? "").trim();
      const email = (r.email ?? "").trim();

      if (!fullName || !isValidEmail(email)) {
        failed++;
        continue;
      }

      // unit: si viene unit_code, buscamos/creamos AccountPlanRow
      let unitId: string | null = null;
      const unitCode = (r.unitCode ?? "").trim();
      if (unitCode) {
        const existing = await prisma.accountPlanRow.findFirst({
          where: { engagementId, account: { equals: unitCode, mode: "insensitive" } },
          select: { id: true },
        });

        if (existing) {
          unitId = existing.id;
        } else {
          const created = await prisma.accountPlanRow.create({
            data: { engagementId, account: unitCode },
            select: { id: true },
          });
          unitId = created.id;
        }
      }

      // role: si viene role_code, buscamos/creamos NpsRole
      let roleId: string | null = null;
      const roleCode = (r.roleCode ?? "").trim();
      if (roleCode) {
        const existingRole = await prisma.npsRole.findFirst({
          where: { engagementId, code: { equals: roleCode, mode: "insensitive" } },
          select: { id: true },
        });

        if (existingRole) {
          roleId = existingRole.id;
        } else {
          const roleName = (r.roleName ?? "").trim() || roleCode;
          const createdRole = await prisma.npsRole.create({
            data: { engagementId, code: roleCode, name: roleName },
            select: { id: true },
          });
          roleId = createdRole.id;
        }
      }

      try {
        await prisma.npsContact.upsert({
          where: { engagementId_email: { engagementId, email: emailLower } },
          create: {
            engagementId,
            fullName,
            email: emailLower,
            company: r.company ?? null,
            phone: r.phone ?? null,
            title: r.title ?? null,
            roleId,
            unitId,
          },
          update: {
            fullName,
            company: r.company ?? null,
            phone: r.phone ?? null,
            title: r.title ?? null,
            roleId,
            unitId,
            isActive: true,
          },
        });

        imported++;
      } catch {
        failed++;
      }
    }

    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/nps`);
    revalidatePath(`/${locale}/wizard/${engagementId}/check-in`);
    redirect(buildRedirectUrl(locale, engagementId, { imported, failed }));
  } catch (e: any) {
    const digest = (e as any)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;

    const msg = e instanceof Error ? e.message : "Error desconocido importando CSV.";
    redirect(buildRedirectUrl(locale, engagementId, { imported: 0, failed: 0, importError: msg.slice(0, 160) }));
  }
}

async function generateInvites(engagementId: string, locale: string, formData: FormData) {
  "use server";

  try {
    const semRaw = String(formData.get("semesterKey") ?? "");
    const semesterKey = normalizeSemesterKey(semRaw) ?? defaultSemesterKey();

    // Contactos activos
    const contacts = await prisma.npsContact.findMany({
      where: { engagementId, isActive: true },
      select: { email: true, fullName: true },
      orderBy: { updatedAt: "desc" },
    });

    if (contacts.length === 0) {
      redirect(buildRedirectUrl(locale, engagementId, {
        semesterKey,
        invitesCreated: 0,
        invitesSkipped: 0,
        invitesError: "No hay contactos activos. Importa un CSV primero.",
      }));
    }

    // Ya existentes para este semestre + engagement (para evitar duplicados)
    const existing = await prisma.npsInvite.findMany({
      where: { engagementId, semesterKey },
      select: { email: true },
    });

    const existingSet = new Set(existing.map((x) => x.email.toLowerCase()));

    let created = 0;
    let skipped = 0;

    for (const c of contacts) {
      const email = c.email.toLowerCase();
      if (existingSet.has(email)) {
        skipped++;
        continue;
      }

      await prisma.npsInvite.create({
        data: {
          engagementId,
          semesterKey,
          email,
          fullName: c.fullName ?? null,
          token: makeToken(),
          status: "SENT", // “listo para enviar” (aunque no enviamos correo aquí)
          inviteUrl: `/${locale}/nps/`, // base (el link real se arma con token en UI)
        },
      });

      created++;
    }

    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/nps`);
    redirect(buildRedirectUrl(locale, engagementId, {
      semesterKey,
      invitesCreated: created,
      invitesSkipped: skipped,
    }));
  } catch (e: any) {
    const digest = (e as any)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;

    const msg = e instanceof Error ? e.message : "Error desconocido generando invitaciones.";
    redirect(buildRedirectUrl(locale, engagementId, {
      invitesCreated: 0,
      invitesSkipped: 0,
      invitesError: msg.slice(0, 160),
    }));
  }
}

// ================================
// PAGE
// ================================

export default async function NpsCheckInPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams?: SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = (searchParams ? await searchParams : {}) as Record<string, string | undefined>;

  const imported = sanitizeSegment(sp.imported ?? null);
  const failed = sanitizeSegment(sp.failed ?? null);
  const importError = sanitizeSegment(sp.importError ?? null);

  const semFromQuery = normalizeSemesterKey(sp.semesterKey ?? null);
  const semesterKey = semFromQuery ?? defaultSemesterKey();

  const invitesCreated = sanitizeSegment(sp.invitesCreated ?? null);
  const invitesSkipped = sanitizeSegment(sp.invitesSkipped ?? null);
  const invitesError = sanitizeSegment(sp.invitesError ?? null);

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: { id: true, name: true },
  });

  if (!engagement) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-slate-700">{t(locale, "No existe este engagement.", "Engagement not found.")}</p>
        <Link className="mt-4 inline-flex text-xs text-indigo-600 hover:text-indigo-500" href={`/${locale}/wizard`}>
          ← {t(locale, "Volver", "Back")}
        </Link>
      </main>
    );
  }

  const contacts: Prisma.NpsContactGetPayload<{ include: { role: true; unit: true } }>[] =
    await prisma.npsContact.findMany({
      where: { engagementId },
      orderBy: [{ updatedAt: "desc" }],
      include: { role: true, unit: true },
      take: 250,
    });

  // Invitaciones del semestre seleccionado (sin asumir encuesta completa; tu schema actual es NpsInvite + NpsResponse)
  const invites = await prisma.npsInvite.findMany({
    where: { engagementId, semesterKey },
    include: { responses: true },
    orderBy: [{ respondedAt: "desc" }, { email: "asc" }],
    take: 500,
  });

  const respondedN = invites.filter((i) => (i.responses?.length ?? 0) > 0 || i.respondedAt).length;

  const reportsHref = `/${locale}/reportes/nps?engagementId=${encodeURIComponent(engagementId)}&semesterKey=${encodeURIComponent(semesterKey)}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">NPS</p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">
              {engagement.name || t(locale, "Compromiso", "Engagement")} · {t(locale, "Encuesta NPS", "NPS Survey")}
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Flujo: (1) Importar CSV → (2) Definir semestre → (3) Generar invitaciones → (4) Responder con token → (5) Reportes.",
                "Flow: (1) Import CSV → (2) Set semester → (3) Generate invites → (4) Answer via token → (5) Reports."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/wizard/${engagementId}/check-in`}
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-all active:scale-[0.98]"
            >
              ← {t(locale, "Volver a Check-in", "Back to Check-in")}
            </Link>

            <Link
              href={reportsHref}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              {t(locale, "Ver reportes", "View reports")}
            </Link>
          </div>
        </div>

        <div className="mt-4">
          <CheckInNav locale={locale} engagementId={engagementId} />
        </div>

        {/* SEMESTRE + INVITES */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900">{t(locale, "Semestre (reportabilidad)", "Semester (reporting)")}</p>
              <p className="mt-1 text-xs text-slate-600">
                {t(locale, "Formato: 2026S1 o 2026S2. Este valor agrupa invitaciones y reportes.", "Format: 2026S1 or 2026S2. This groups invites and reports.")}
              </p>
            </div>

            <form
              action={generateInvites.bind(null, engagementId, locale)}
              method="POST"
              className="flex flex-col gap-2 md:flex-row md:items-end"
            >
              <div>
                <label className="text-xs font-medium text-slate-800">{t(locale, "semesterKey", "semesterKey")}</label>
                <input
                  name="semesterKey"
                  defaultValue={semesterKey}
                  placeholder="2026S1"
                  className="mt-1 block w-[160px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all active:scale-[0.98]"
              >
                {t(locale, "Generar invitaciones", "Generate invites")}
              </button>

              <Link
                href={reportsHref}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                {t(locale, "Abrir reportes", "Open reports")}
              </Link>
            </form>
          </div>

          {invitesError ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <div className="font-semibold">{t(locale, "Error", "Error")}</div>
              <div className="mt-1">{invitesError}</div>
            </div>
          ) : null}

          {invitesCreated !== null && invitesSkipped !== null && !invitesError ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <div className="font-semibold">{t(locale, "Invitaciones listas", "Invites ready")}</div>
              <div className="mt-1">
                {t(locale, "Creadas:", "Created:")} <b>{invitesCreated}</b> · {t(locale, "Saltadas (ya existían):", "Skipped (already existed):")} <b>{invitesSkipped}</b>
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-700">
            <span>
              {t(locale, "Semestre activo:", "Active semester:")} <b>{semesterKey}</b>
            </span>
            <span className="text-slate-400">·</span>
            <span>
              {t(locale, "Invitaciones:", "Invites:")} <b>{invites.length}</b>
            </span>
            <span className="text-slate-400">·</span>
            <span>
              {t(locale, "Respondidas:", "Responded:")} <b>{respondedN}</b>
            </span>
          </div>
        </div>

        {/* IMPORT + CONTACTOS */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* IMPORT */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-900">{t(locale, "Importar contactos (CSV)", "Import contacts (CSV)")}</p>
              <Link
                className="text-xs font-semibold text-indigo-700 hover:underline"
                href={`/api/wizard/${engagementId}/check-in/nps/contacts/template`}
              >
                {t(locale, "Descargar template", "Download template")}
              </Link>
            </div>

            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Sube un CSV (máx 2MB). Campos mínimos: full_name, email. Recomendado: unit_code (faena/contrato) y role_code.",
                "Upload a CSV (max 2MB). Minimum: full_name, email. Recommended: unit_code (site/contract) and role_code."
              )}
            </p>

            {importError ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <div className="font-semibold">{t(locale, "Error", "Error")}</div>
                <div className="mt-1">{importError}</div>
              </div>
            ) : null}

            {imported !== null && failed !== null && !importError ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <div className="font-semibold">{t(locale, "Importación lista", "Import completed")}</div>
                <div className="mt-1">
                  {t(locale, "Importados:", "Imported:")} <b>{imported}</b> · {t(locale, "Fallidos:", "Failed:")} <b>{failed}</b>
                </div>
              </div>
            ) : null}

            <form
              action={importContactsCsv.bind(null, engagementId, locale)}
              method="POST"
              encType="multipart/form-data"
              className="mt-4 space-y-3"
            >
              <div>
                <label className="text-sm font-medium text-slate-800">{t(locale, "Archivo CSV (máx 2MB)", "CSV file (max 2MB)")}</label>
                <input
                  name="file"
                  type="file"
                  accept=".csv,text/csv"
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" name="replaceAll" className="h-4 w-4 rounded border-slate-300" />
                {t(locale, "Reemplazar todos los contactos de este cliente (peligroso)", "Replace all contacts for this client (danger)")}
              </label>

              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all active:scale-[0.98]"
              >
                {t(locale, "Importar (CSV)", "Import (CSV)")}
              </button>
            </form>
          </div>

          {/* LISTA CONTACTOS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-900">
              {t(locale, "Contactos cargados", "Loaded contacts")}{" "}
              <span className="text-slate-500">({contacts.length})</span>
            </p>

            <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 font-semibold text-slate-700">{t(locale, "Nombre", "Name")}</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Email</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">{t(locale, "Unidad", "Unit")}</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">{t(locale, "Rol", "Role")}</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{c.fullName}</div>
                        <div className="text-[11px] text-slate-500">
                          {c.company || ""}
                          {c.title ? ` · ${c.title}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{c.email}</td>
                      <td className="px-3 py-2 text-slate-700">{c.unit?.account || "—"}</td>
                      <td className="px-3 py-2 text-slate-700">{c.role?.name || "—"}</td>
                    </tr>
                  ))}

                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                        {t(locale, "Aún no hay contactos. Importa un CSV a la izquierda.", "No contacts yet. Import a CSV on the left.")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              {t(
                locale,
                "Luego: define semestre y genera invitaciones (arriba). El envío de email lo dejamos manual.",
                "Next: set semester and generate invites (above). Email sending stays manual."
              )}
            </p>
          </div>
        </div>

        {/* INVITES LIST */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-xs font-semibold text-slate-900">
              {t(locale, "Invitaciones del semestre", "Semester invites")}{" "}
              <span className="text-slate-500">({invites.length})</span>
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={reportsHref}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                {t(locale, "Ver gráficos y tablas", "View charts & tables")}
              </Link>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 font-semibold text-slate-700">{t(locale, "Contacto", "Contact")}</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Email</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">{t(locale, "Estado", "Status")}</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">{t(locale, "Respondió", "Answered")}</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">{t(locale, "Acción", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => {
                  const answered = (i.responses?.length ?? 0) > 0 || i.respondedAt;
                  const link = `/${locale}/nps/${i.token}`;
                  return (
                    <tr key={i.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{i.fullName || "—"}</div>
                        <div className="text-[11px] text-slate-500">{semesterKey}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{i.email}</td>
                      <td className="px-3 py-2 text-slate-700">{i.status}</td>
                      <td className="px-3 py-2">
                        {answered ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            {t(locale, "Sí", "Yes")}
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                            {t(locale, "No", "No")}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Link className="text-indigo-700 hover:underline font-semibold" href={link} target="_blank">
                          {t(locale, "Abrir encuesta", "Open survey")} →
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {invites.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      {t(
                        locale,
                        "No hay invitaciones para este semestre. Usa “Generar invitaciones” arriba.",
                        "No invites for this semester. Use “Generate invites” above."
                      )}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            {t(
              locale,
              "Importante: aquí solo generamos tokens y guardamos NpsInvite. El envío de email no se dispara automáticamente.",
              "Important: this only creates tokens and stores NpsInvite. Email sending is not automatic."
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
