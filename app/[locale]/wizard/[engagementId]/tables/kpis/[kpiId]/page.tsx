// app/[locale]/wizard/[engagementId]/tables/kpis/[kpiId]/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BscPerspective, KpiBasis, KpiDirection, KpiFrequency } from "@prisma/client";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string; kpiId: string }>;
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

    const qp = sanitizeSegment(u.searchParams.get("from") ?? "");
    if (qp) return qp;

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

function perspectiveLabel(locale: string, p: BscPerspective) {
  const map: Record<BscPerspective, { es: string; en: string }> = {
    FINANCIAL: { es: "Finanzas", en: "Financial" },
    CUSTOMER: { es: "Cliente", en: "Customer" },
    INTERNAL_PROCESS: { es: "Operación", en: "Internal process" },
    LEARNING_GROWTH: { es: "Equipo", en: "Learning & growth" },
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

export default async function KpiEditPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams?: SearchParams | SearchParamsPromise;
}) {
  const { locale, engagementId, kpiId } = await params;
  const sp = (searchParams ? await searchParams : {}) as SearchParams;

  const fromParam = sanitizeSegment(readString(sp, "from"));
  const fromRef = sanitizeSegment(inferFromReferer((await headers()).get("referer"), locale, engagementId));
  const from = fromParam || fromRef || "tables";

  const backHref = `/${locale}/wizard/${engagementId}/tables/kpis?from=${from}`;

  const kpi = await prisma.kpi.findFirst({
    where: { id: kpiId, engagementId },
    select: {
      id: true,
      nameEs: true,
      nameEn: true,
      perspective: true,
      frequency: true,
      direction: true,
      basis: true, // ✅
      unit: true,
      targetValue: true,
      targetText: true,
      ownerUserId: true,
      descriptionEs: true,
      descriptionEn: true,
    },
  });

  if (!kpi) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-slate-700">{t(locale, "KPI no encontrado.", "KPI not found.")}</p>
        <Link className="mt-3 inline-flex text-xs text-indigo-600 hover:underline" href={backHref}>
          ← {t(locale, "Volver", "Back")}
        </Link>
      </main>
    );
  }

  let ownerEmail = "";
  if (kpi.ownerUserId) {
    const u = await prisma.user.findUnique({ where: { id: kpi.ownerUserId }, select: { email: true } });
    ownerEmail = u?.email ?? "";
  }

  async function updateKpi(formData: FormData) {
    "use server";

    const nameEs = String(formData.get("nameEs") ?? "").trim();
    if (!nameEs) return;

    const nameEnInput = String(formData.get("nameEn") ?? "").trim();

    const perspectiveRaw = String(formData.get("perspective") ?? "").trim();
    const perspective = (Object.values(BscPerspective).includes(perspectiveRaw as any)
      ? (perspectiveRaw as BscPerspective)
      : BscPerspective.INTERNAL_PROCESS);

    const frequencyRaw = String(formData.get("frequency") ?? "").trim();
    const frequency = (Object.values(KpiFrequency).includes(frequencyRaw as any)
      ? (frequencyRaw as KpiFrequency)
      : KpiFrequency.MONTHLY);

    const directionRaw = String(formData.get("direction") ?? "").trim();
    const direction = (Object.values(KpiDirection).includes(directionRaw as any)
      ? (directionRaw as KpiDirection)
      : KpiDirection.HIGHER_IS_BETTER);

    // ✅ Base (A/L) – default A
    const basisRaw = String(formData.get("basis") ?? "").trim().toUpperCase();
    const basis: KpiBasis = basisRaw === "L" ? "L" : "A";

    const unit = String(formData.get("unit") ?? "").trim() || null;

    const targetValueRaw = String(formData.get("targetValue") ?? "").trim();
    const targetValue = targetValueRaw ? (targetValueRaw as any) : null;

    const targetText = String(formData.get("targetText") ?? "").trim() || null;

    const ownerEmailInput = String(formData.get("ownerEmail") ?? "").trim();
    let ownerUserId: string | null = null;
    if (ownerEmailInput) {
      const u = await prisma.user.findFirst({ where: { email: ownerEmailInput } });
      ownerUserId = u?.id ?? null;
    }

    const actionText = String(formData.get("actionText") ?? "").trim() || null;

    const nameEnFinal = locale === "en" ? (nameEnInput || nameEs) : nameEs;

    const descriptionEs = locale === "en" ? null : actionText;
    const descriptionEn = locale === "en" ? actionText : null;

    await prisma.kpi.update({
      where: { id: kpiId },
      data: {
        nameEs,
        nameEn: nameEnFinal,
        perspective,
        frequency,
        direction,
        basis, // ✅
        unit,
        targetValue,
        targetText,
        ownerUserId,
        descriptionEs,
        descriptionEn,
      },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/tables/kpis`);
    revalidatePath(`/${locale}/wizard/${engagementId}/tables`);
    revalidatePath(`/${locale}/wizard/${engagementId}/tables/kpis/${kpiId}`);

    redirect(backHref);
  }

  const showEnglish = locale === "en";
  const actionShown = locale === "en" ? (kpi.descriptionEn ?? "") : (kpi.descriptionEs ?? "");
  const basis = (kpi.basis ?? "A") as KpiBasis;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Tabla", "Table")} · {t(locale, "Editar KPI", "Edit KPI")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{kpi.nameEs}</h1>
          <p className="mt-1 text-xs text-slate-600">
            {t(locale, "Ajusta y guarda. Vuelves a la tabla al finalizar.", "Edit and save. You’ll return to the table.")}
          </p>
        </div>

        <Link className="text-sm text-indigo-600 hover:underline" href={backHref}>
          ← {t(locale, "Volver", "Back")}
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={updateKpi} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Nombre", "Name")} <span className="text-rose-600">*</span>
            </label>
            <input
              name="nameEs"
              required
              defaultValue={kpi.nameEs ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          {showEnglish ? (
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-800">{t(locale, "Nombre (EN) (opcional)", "Name (EN) (optional)")}</label>
              <input
                name="nameEn"
                defaultValue={kpi.nameEn ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <p className="mt-1 text-[11px] text-slate-500">{t(locale, "Si lo dejas vacío, copiamos ES.", "If empty, we copy ES.")}</p>
            </div>
          ) : null}

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Perspectiva", "Perspective")}</label>
            <select
              name="perspective"
              defaultValue={kpi.perspective}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              {Object.values(BscPerspective).map((p) => (
                <option key={p} value={p}>
                  {perspectiveLabel(locale, p)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Frecuencia", "Frequency")}</label>
            <select
              name="frequency"
              defaultValue={kpi.frequency}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              {Object.values(KpiFrequency).map((f) => (
                <option key={f} value={f}>
                  {freqLabel(locale, f)}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Dirección", "Direction")}</label>
            <select
              name="direction"
              defaultValue={kpi.direction}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              {Object.values(KpiDirection).map((d) => (
                <option key={d} value={d}>
                  {dirLabel(locale, d)}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ Base A/L */}
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Base", "Basis")}</label>
            <select
              name="basis"
              defaultValue={basis}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="A">{basisLabel(locale, "A")}</option>
              <option value="L">{basisLabel(locale, "L")}</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              {t(
                locale,
                "A = YTD-AVG (Year to Date Average). L = LTM/TTM (Last/Trailing Twelve Months).",
                "A = YTD-AVG (Year to Date Average). L = LTM/TTM (Last/Trailing Twelve Months)."
              )}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Unidad (opcional)", "Unit (optional)")}</label>
            <input
              name="unit"
              defaultValue={kpi.unit ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Responsable (email) (opcional)", "Owner (email) (optional)")}</label>
            <input
              name="ownerEmail"
              defaultValue={ownerEmail}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {t(locale, "Si no existe ese usuario, quedará vacío.", "If that user doesn’t exist, it stays empty.")}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Meta numérica (opcional)", "Numeric target (optional)")}</label>
            <input
              name="targetValue"
              defaultValue={kpi.targetValue == null ? "" : String(kpi.targetValue)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Meta en texto (opcional)", "Text target (optional)")}</label>
            <input
              name="targetText"
              defaultValue={kpi.targetText ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Acción (opcional)", "Action (optional)")}</label>
            <input
              name="actionText"
              defaultValue={actionShown}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3">
            <Link className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" href={backHref}>
              {t(locale, "Cancelar", "Cancel")}
            </Link>

            <button type="submit" className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              {t(locale, "Guardar cambios", "Save changes")}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
