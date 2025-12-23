// app/[locale]/wizard/[engagementId]/check-in/initiatives/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BscPerspective } from "@prisma/client";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<{ period?: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function perspectiveLabel(locale: string, p: BscPerspective) {
  const map: Record<BscPerspective, { es: string; en: string }> = {
    FINANCIAL: { es: "Finanzas", en: "Financial" },
    CUSTOMER: { es: "Clientes", en: "Customer" },
    INTERNAL_PROCESS: { es: "Procesos internos", en: "Internal process" },
    LEARNING_GROWTH: { es: "Aprendizaje y crecimiento", en: "Learning & growth" },
  };
  return t(locale, map[p].es, map[p].en);
}

function defaultMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function stepKey(periodKey: string) {
  return `checkin-initiatives:${periodKey}`;
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type InitiativeSnapshotItem = {
  initiativeId: string;
  progressPct: number | null;
  status: string | null;
  notes: string | null;
  blockers: string | null;
  evidenceUrls: string[];
};

type InitiativeSnapshot = {
  items: InitiativeSnapshotItem[];
};

function toPct(x: string): number | null {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.max(0, Math.min(100, Math.round(n)));
  return clamped;
}

function parseUrls(raw: string): string[] {
  return raw
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function CheckInInitiativesPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams: SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = await searchParams;

  const periodKey = sp.period && /^\d{4}-\d{2}$/.test(sp.period) ? sp.period : defaultMonthKey();

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: { id: true },
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

  const initiatives = await prisma.initiative.findMany({
    where: { engagementId },
    select: { id: true, title: true, perspective: true, owner: true, status: true, notes: true },
    orderBy: [{ perspective: "asc" }, { title: "asc" }],
  });

  const wp = await prisma.wizardProgress.findUnique({
    where: { engagementId_stepKey: { engagementId, stepKey: stepKey(periodKey) } },
    select: { notes: true },
  });

  const snapshot = safeJsonParse<InitiativeSnapshot>(wp?.notes, { items: [] });
  const snapById = new Map(snapshot.items.map((it) => [it.initiativeId, it]));

  async function save(formData: FormData) {
    "use server";

    const p = String(formData.get("periodKey") ?? "").trim();
    const safePeriod = /^\d{4}-\d{2}$/.test(p) ? p : defaultMonthKey();

    const ids = formData.getAll("initiativeId").map(String).filter(Boolean);

    const items: InitiativeSnapshotItem[] = [];

    for (const id of ids) {
      const progressRaw = String(formData.get(`progress_${id}`) ?? "").trim();
      const status = String(formData.get(`status_${id}`) ?? "").trim() || null;
      const notes = String(formData.get(`notes_${id}`) ?? "").trim() || null;
      const blockers = String(formData.get(`blockers_${id}`) ?? "").trim() || null;
      const urlsRaw = String(formData.get(`evidence_${id}`) ?? "").trim();

      const progressPct = progressRaw ? toPct(progressRaw) : null;
      const evidenceUrls = urlsRaw ? parseUrls(urlsRaw) : [];

      // 1) dejamos estado "actual" en Initiative (último estado)
      await prisma.initiative.update({
        where: { id },
        data: {
          status,
          notes: notes || null,
        },
      });

      // 2) evidencias: se guardan como Evidence ligada a initiativeId (histórico real)
      if (evidenceUrls.length) {
        await prisma.evidence.createMany({
          data: evidenceUrls.map((url) => ({
            initiativeId: id,
            url,
            label: `[${safePeriod}]`,
          })),
        });
      }

      items.push({ initiativeId: id, progressPct, status, notes, blockers, evidenceUrls });
    }

    // 3) snapshot por período: WizardProgress
    await prisma.wizardProgress.upsert({
      where: { engagementId_stepKey: { engagementId, stepKey: stepKey(safePeriod) } },
      create: {
        engagementId,
        stepKey: stepKey(safePeriod),
        completedAt: new Date(),
        notes: JSON.stringify({ items } satisfies InitiativeSnapshot),
      },
      update: {
        completedAt: new Date(),
        notes: JSON.stringify({ items } satisfies InitiativeSnapshot),
      },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/initiatives`);
    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/summary`);
    revalidatePath(`/${locale}/wizard/${engagementId}/dashboard`);
    redirect(`/${locale}/wizard/${engagementId}/check-in/initiatives?period=${safePeriod}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Check-in iniciativas", "Initiatives check-in")}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">
              {t(locale, "Período:", "Period:")} {periodKey}
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Guardamos estado actual en Initiative y el historial del período en WizardProgress. Evidencias quedan en Evidence.",
                "We store current state in Initiative and period history in WizardProgress. Evidences go to Evidence.",
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/wizard/${engagementId}/check-in?period=${periodKey}`}
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              ← {t(locale, "Volver", "Back")}
            </Link>
            <Link
              href={`/${locale}/wizard/${engagementId}/check-in/summary?period=${periodKey}`}
              className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              {t(locale, "Ver resumen →", "View summary →")}
            </Link>
          </div>
        </div>

        {initiatives.length === 0 ? (
          <p className="mt-6 text-xs text-slate-600">{t(locale, "No hay iniciativas creadas aún.", "No initiatives yet.")}</p>
        ) : (
          <form action={save} className="mt-6 space-y-4">
            <input type="hidden" name="periodKey" value={periodKey} />

            <div className="grid gap-3">
              {initiatives.map((it) => {
                const snap = snapById.get(it.id);

                return (
                  <div key={it.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <input type="hidden" name="initiativeId" value={it.id} />

                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{it.title}</div>
                        <div className="mt-1 text-[11px] text-slate-600">
                          {perspectiveLabel(locale, it.perspective)}
                          {it.owner ? ` · ${it.owner}` : ""}
                        </div>
                        {(snap?.progressPct != null || snap?.status) && (
                          <div className="mt-1 text-[11px] text-slate-600">
                            {t(locale, "Último check-in:", "Last check-in:")}{" "}
                            {snap?.progressPct != null ? `${snap.progressPct}%` : "—"}
                            {snap?.status ? ` · ${snap.status}` : ""}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-6">
                      <div className="md:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-700">{t(locale, "Progreso %", "Progress %")}</label>
                        <input
                          name={`progress_${it.id}`}
                          defaultValue={snap?.progressPct != null ? String(snap.progressPct) : ""}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                          placeholder="0–100"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700">{t(locale, "Status", "Status")}</label>
                        <input
                          name={`status_${it.id}`}
                          defaultValue={snap?.status ?? it.status ?? ""}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                          placeholder={t(locale, "Ej: En curso / Bloqueada / Lista", "e.g. In progress / Blocked / Done")}
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-700">{t(locale, "Notas", "Notes")}</label>
                        <input
                          name={`notes_${it.id}`}
                          defaultValue={snap?.notes ?? it.notes ?? ""}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                          placeholder={t(locale, "Qué se avanzó, qué falta…", "What changed, what's next…")}
                        />
                      </div>

                      <div className="md:col-span-6">
                        <label className="block text-[11px] font-semibold text-slate-700">{t(locale, "Bloqueos", "Blockers")}</label>
                        <input
                          name={`blockers_${it.id}`}
                          defaultValue={snap?.blockers ?? ""}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                          placeholder={t(locale, "Dependencias, aprobaciones, data faltante…", "Dependencies, approvals, missing data…")}
                        />
                      </div>

                      <div className="md:col-span-6">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          {t(locale, "Evidencias (URLs, separadas por coma o salto de línea)", "Evidence (URLs, comma or newline separated)")}
                        </label>
                        <textarea
                          name={`evidence_${it.id}`}
                          rows={2}
                          defaultValue={snap?.evidenceUrls?.length ? snap.evidenceUrls.join("\n") : ""}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                {t(locale, "Guardar iniciativas", "Save initiatives")}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
