// app/[locale]/wizard/[engagementId]/tables/roadmap-20w/[roadmapWeekId]/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string; roadmapWeekId: string }>;
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

export default async function RoadmapWeekEditPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams?: SearchParams | SearchParamsPromise;
}) {
  const { locale, engagementId, roadmapWeekId } = await params;
  const sp = (searchParams ? await searchParams : {}) as SearchParams;

  const from = readString(sp, "from") || "tables";
  const backHref = `/${locale}/wizard/${engagementId}/tables/roadmap-20w?from=${from}`;

  const weekRow = await prisma.roadmapWeek.findFirst({
    where: { id: roadmapWeekId, engagementId },
  });

  if (!weekRow) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-slate-700">{t(locale, "Semana no encontrada.", "Week not found.")}</p>
        <Link className="mt-3 inline-flex text-xs text-indigo-600 hover:underline" href={backHref}>
          ← {t(locale, "Volver", "Back")}
        </Link>
      </main>
    );
  }

  async function updateWeek(formData: FormData) {
    "use server";

    const objective = String(formData.get("objective") ?? "").trim() || null;
    const keyActivities = String(formData.get("keyActivities") ?? "").trim() || null;
    const deliverables = String(formData.get("deliverables") ?? "").trim() || null;
    const kpiFocus = String(formData.get("kpiFocus") ?? "").trim() || null;
    const ritual = String(formData.get("ritual") ?? "").trim() || null;

    await prisma.roadmapWeek.update({
      where: { id: roadmapWeekId },
      data: { objective, keyActivities, deliverables, kpiFocus, ritual },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/tables/roadmap-20w`);
    revalidatePath(`/${locale}/wizard/${engagementId}/tables/roadmap-20w/${roadmapWeekId}`);
    revalidatePath(`/${locale}/wizard/${engagementId}/step-7-roadmap`);
    redirect(backHref);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Tabla", "Table")} · {t(locale, "Editar semana", "Edit week")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Semana", "Week")} {weekRow.week}
          </h1>
          <p className="mt-1 text-xs text-slate-600">{t(locale, "Ajusta y guarda. Vuelves a la tabla al finalizar.", "Edit and save. You’ll return to the table.")}</p>
        </div>

        <Link className="text-sm text-indigo-600 hover:underline" href={backHref}>
          ← {t(locale, "Volver", "Back")}
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={updateWeek} className="grid gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Objetivo", "Objective")}</label>
            <input
              name="objective"
              defaultValue={weekRow.objective ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Actividades clave", "Key activities")}</label>
            <textarea
              name="keyActivities"
              rows={4}
              defaultValue={weekRow.keyActivities ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Entregables", "Deliverables")}</label>
            <textarea
              name="deliverables"
              rows={3}
              defaultValue={weekRow.deliverables ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "KPI foco", "KPI focus")}</label>
            <input
              name="kpiFocus"
              defaultValue={weekRow.kpiFocus ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">{t(locale, "Ritual", "Ritual")}</label>
            <input
              name="ritual"
              defaultValue={weekRow.ritual ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
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
