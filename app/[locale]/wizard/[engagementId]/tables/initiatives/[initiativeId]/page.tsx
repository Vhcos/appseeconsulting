// app/[locale]/wizard/[engagementId]/tables/initiatives/[initiativeId]/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BscPerspective } from "@prisma/client";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string; initiativeId: string }>;
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

function perspectiveLabel(locale: string, p: BscPerspective) {
  const map: Record<BscPerspective, { es: string; en: string }> = {
    FINANCIAL: { es: "Finanzas", en: "Financial" },
    CUSTOMER: { es: "Cliente", en: "Customer" },
    INTERNAL_PROCESS: { es: "Operación", en: "Internal process" },
    LEARNING_GROWTH: { es: "Equipo", en: "Learning & growth" },
  };
  return t(locale, map[p].es, map[p].en);
}

function toIsoDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function InitiativeEditPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams?: SearchParams | SearchParamsPromise;
}) {
  const { locale, engagementId, initiativeId } = await params;
  const sp = (searchParams ? await searchParams : {}) as SearchParams;

  const from = readString(sp, "from") || "tables";
  const backHref = `/${locale}/wizard/${engagementId}/tables/initiatives?from=${from}`;

  const [initiative, kpis] = await Promise.all([
    prisma.initiative.findFirst({
      where: { id: initiativeId, engagementId },
      include: { kpi: { select: { id: true, nameEs: true, nameEn: true } } },
    }),
    prisma.kpi.findMany({
      where: { engagementId },
      select: { id: true, nameEs: true, nameEn: true, perspective: true },
      orderBy: [{ perspective: "asc" }, { nameEs: "asc" }],
    }),
  ]);

  if (!initiative) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-slate-700">{t(locale, "Iniciativa no encontrada.", "Initiative not found.")}</p>
        <Link className="mt-3 inline-flex text-xs text-indigo-600 hover:underline" href={backHref}>
          ← {t(locale, "Volver", "Back")}
        </Link>
      </main>
    );
  }

  async function updateInitiative(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const owner = String(formData.get("owner") ?? "").trim();
    if (!title || !owner) return;

    const problem = String(formData.get("problem") ?? "").trim() || null;
    const definitionDone = String(formData.get("definitionDone") ?? "").trim() || null;
    const status = String(formData.get("status") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;
    const dependencies = String(formData.get("dependencies") ?? "").trim() || null;

    const kpiIdRaw = String(formData.get("kpiId") ?? "").trim();
    const kpiId = kpiIdRaw ? kpiIdRaw : null;

    const perspectiveRaw = String(formData.get("perspective") ?? "").trim();
    const perspective = (Object.values(BscPerspective).includes(perspectiveRaw as any)
      ? (perspectiveRaw as BscPerspective)
      : BscPerspective.INTERNAL_PROCESS);

    const impact = clamp1to5(parseIntMaybe(formData.get("impact")));
    const effort = clamp1to5(parseIntMaybe(formData.get("effort")));
    const risk = clamp1to5(parseIntMaybe(formData.get("risk")));

    const startDateRaw = String(formData.get("startDate") ?? "").trim();
    const endDateRaw = String(formData.get("endDate") ?? "").trim();
    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const endDate = endDateRaw ? new Date(endDateRaw) : null;

    const safeStart = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;
    const safeEnd = endDate && !Number.isNaN(endDate.getTime()) ? endDate : null;

    await prisma.initiative.update({
      where: { id: initiativeId },
      data: {
        title,
        owner,
        perspective,
        kpiId,
        problem,
        definitionDone,
        status,
        notes,
        dependencies,
        impact,
        effort,
        risk,
        startDate: safeStart,
        endDate: safeEnd,
      },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/tables/initiatives`);
    revalidatePath(`/${locale}/wizard/${engagementId}/tables/initiatives/${initiativeId}`);
    redirect(backHref);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Tabla", "Table")} · {t(locale, "Editar iniciativa", "Edit initiative")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{initiative.title}</h1>
          <p className="mt-1 text-xs text-slate-600">{t(locale, "Ajusta y guarda. Vuelves a la tabla al finalizar.", "Edit and save. You’ll return to the table.")}</p>
        </div>

        <Link className="text-sm text-indigo-600 hover:underline" href={backHref}>
          ← {t(locale, "Volver", "Back")}
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={updateInitiative} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Título", "Title")} <span className="text-rose-600">*</span>
            </label>
            <input
              name="title"
              required
              defaultValue={initiative.title ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Dueño", "Owner")} <span className="text-rose-600">*</span>
            </label>
            <input
              name="owner"
              required
              defaultValue={initiative.owner ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Área", "Area")}</label>
            <select
              name="perspective"
              defaultValue={initiative.perspective}
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
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Problema (1 frase)", "Problem (1 sentence)")}</label>
            <input
              name="problem"
              defaultValue={initiative.problem ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Hecho cuando…", "Done when…")}</label>
            <input
              name="definitionDone"
              defaultValue={initiative.definitionDone ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "KPI asociado", "Linked KPI")}</label>
            <select
              name="kpiId"
              defaultValue={initiative.kpiId ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">{t(locale, "— Ninguno", "— None")}</option>
              {kpis.map((k) => (
                <option key={k.id} value={k.id}>
                  {t(locale, k.nameEs, k.nameEn)} · {perspectiveLabel(locale, k.perspective)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Estado", "Status")}</label>
            <select
              name="status"
              defaultValue={initiative.status ?? "Por iniciar"}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="Por iniciar">{t(locale, "Por iniciar", "Not started")}</option>
              <option value="En curso">{t(locale, "En curso", "In progress")}</option>
              <option value="Bloqueada">{t(locale, "Bloqueada", "Blocked")}</option>
              <option value="Hecha">{t(locale, "Hecha", "Done")}</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Inicio", "Start")}</label>
            <input
              name="startDate"
              type="date"
              defaultValue={toIsoDateInput(initiative.startDate)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Fin", "End")}</label>
            <input
              name="endDate"
              type="date"
              defaultValue={toIsoDateInput(initiative.endDate)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Impacto (1–5)", "Impact (1–5)")}</label>
            <select
              name="impact"
              defaultValue={initiative.impact ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">{t(locale, "—", "—")}</option>
              <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Esfuerzo (1–5)", "Effort (1–5)")}</label>
            <select
              name="effort"
              defaultValue={initiative.effort ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">{t(locale, "—", "—")}</option>
              <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Riesgo (1–5)", "Risk (1–5)")}</label>
            <select
              name="risk"
              defaultValue={initiative.risk ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">{t(locale, "—", "—")}</option>
              <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Dependencias", "Dependencies")}</label>
            <input
              name="dependencies"
              defaultValue={initiative.dependencies ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Notas", "Notes")}</label>
            <input
              name="notes"
              defaultValue={initiative.notes ?? ""}
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
