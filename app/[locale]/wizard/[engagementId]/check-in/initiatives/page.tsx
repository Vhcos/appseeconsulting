import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckInNav from "@/components/see/CheckInNav";
import ProgressField from "@/components/see/ProgressField";
import { BscPerspective } from "@prisma/client";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<{ period?: string; accountId?: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function sanitizeSegment(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.includes("/") || s.includes("\\") || s.includes("..")) return null;
  if (s.length > 120) return null;
  return s;
}

function defaultMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function prevMonthKey(periodKey: string) {
  const [yStr, mStr] = periodKey.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = new Date(y, m - 2, 1);
  return defaultMonthKey(d);
}

function stepKey(periodKey: string, scopeKey: string) {
  return `checkin-initiatives:${scopeKey}:${periodKey}`;
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
  const cleaned = raw
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of cleaned) {
    const key = u.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

function pill(cls: string) {
  return ["inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold", cls].join(" ");
}

function btnSoft() {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold",
    "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50",
    "transition-all active:scale-[0.98]",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
  ].join(" ");
}

function btnPrimary() {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold",
    "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 ring-1 ring-indigo-600/10",
    "transition-all active:scale-[0.98]",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
  ].join(" ");
}

function btnDark() {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold",
    "bg-slate-900 text-white shadow-sm hover:bg-slate-700 ring-1 ring-slate-900/10",
    "transition-all active:scale-[0.98]",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
  ].join(" ");
}

function perspectiveLabel(locale: string, p: BscPerspective) {
  const map: Record<BscPerspective, { es: string; en: string }> = {
    FINANCIAL: { es: "Finanzas", en: "Financial" },
    CUSTOMER: { es: "Clientes", en: "Customer" },
    INTERNAL_PROCESS: { es: "Operación", en: "Operations" },
    LEARNING_GROWTH: { es: "Procesos", en: "Processes" },
  };
  return t(locale, map[p].es, map[p].en);
}

const P_ORDER: BscPerspective[] = ["FINANCIAL", "CUSTOMER", "INTERNAL_PROCESS", "LEARNING_GROWTH"];
function pRank(p: BscPerspective) {
  const i = P_ORDER.indexOf(p);
  return i === -1 ? 999 : i;
}

function normalizeStatus(s: string | null | undefined) {
  return (s ?? "").trim();
}

function statusOptions(locale: string) {
  return locale === "en"
    ? ["Not started", "In progress", "Blocked", "Done"]
    : ["No iniciado", "En curso", "Bloqueada", "Listo"];
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
  const prevKey = prevMonthKey(periodKey);

  const activeAccountId = sanitizeSegment(sp.accountId ?? null);
  const scopeKey = activeAccountId ? `UNIT:${activeAccountId}` : "GLOBAL";

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

  const unitLabel =
    activeAccountId
      ? (
          await prisma.accountPlanRow.findUnique({
            where: { id: activeAccountId },
            select: { account: true },
          })
        )?.account?.trim() || activeAccountId
      : "GLOBAL";

  const whereInit = activeAccountId
    ? { engagementId, OR: [{ accountPlanRowId: activeAccountId }, { accountPlanRowId: null }] }
    : { engagementId };

  const initiativesRaw = await prisma.initiative.findMany({
    where: whereInit,
    select: { id: true, title: true, perspective: true, owner: true, status: true, notes: true },
    orderBy: [{ perspective: "asc" }, { title: "asc" }],
  });

  const initiatives = [...initiativesRaw].sort((a, b) => {
    const pa = pRank(a.perspective);
    const pb = pRank(b.perspective);
    if (pa !== pb) return pa - pb;
    return a.title.localeCompare(b.title, "es");
  });

  const [wpCur, wpPrev] = await Promise.all([
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: stepKey(periodKey, scopeKey) } },
      select: { notes: true },
    }),
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: stepKey(prevKey, scopeKey) } },
      select: { notes: true },
    }),
  ]);

  const snapCur = safeJsonParse<InitiativeSnapshot>(wpCur?.notes, { items: [] });
  const snapPrev = safeJsonParse<InitiativeSnapshot>(wpPrev?.notes, { items: [] });

  const curById = new Map(snapCur.items.map((it) => [it.initiativeId, it]));
  const prevById = new Map(snapPrev.items.map((it) => [it.initiativeId, it]));

  let cntTotal = initiatives.length;
  let cntWithUpdate = 0;
  let cntBlocked = 0;
  let cntDone = 0;

  for (const it of initiatives) {
    const cur = curById.get(it.id);
    const prev = prevById.get(it.id);

    const curProg = cur?.progressPct ?? null;
    const prevProg = prev?.progressPct ?? null;

    const curStatus = normalizeStatus(cur?.status ?? it.status ?? null);
    const prevStatus = normalizeStatus(prev?.status ?? null);

    const curBlock = (cur?.blockers ?? "").trim();

    const changed =
      (curProg != null && prevProg != null && curProg !== prevProg) ||
      (curProg != null && prevProg == null) ||
      (curStatus && curStatus !== prevStatus) ||
      curBlock.length > 0 ||
      ((cur?.notes ?? "").trim().length > 0);

    if (changed) cntWithUpdate += 1;

    const isBlocked = /block|bloque/i.test(curStatus) || curBlock.length > 0;
    if (isBlocked) cntBlocked += 1;

    const isDone = curProg != null ? curProg >= 100 : /done|listo/i.test(curStatus);
    if (isDone) cntDone += 1;
  }

  async function save(formData: FormData) {
    "use server";

    const p = String(formData.get("periodKey") ?? "").trim();
    const safePeriod = /^\d{4}-\d{2}$/.test(p) ? p : defaultMonthKey();

    const accRaw = String(formData.get("accountId") ?? "").trim();
    const safeAccountId = sanitizeSegment(accRaw || null);
    const scopeKey = safeAccountId ? `UNIT:${safeAccountId}` : "GLOBAL";

    const ids = formData.getAll("initiativeId").map(String).filter(Boolean);

    const label = `[${safePeriod}] ${scopeKey}`;

    const items: InitiativeSnapshotItem[] = [];

    for (const id of ids) {
      const progressRaw = String(formData.get(`progress_${id}`) ?? "").trim();
      const status = String(formData.get(`status_${id}`) ?? "").trim() || null;
      const notes = String(formData.get(`notes_${id}`) ?? "").trim() || null;
      const blockers = String(formData.get(`blockers_${id}`) ?? "").trim() || null;
      const urlsRaw = String(formData.get(`evidence_${id}`) ?? "").trim();

      const progressPct = progressRaw ? toPct(progressRaw) : null;
      const evidenceUrls = urlsRaw ? parseUrls(urlsRaw) : [];

      await prisma.initiative.update({
        where: { id },
        data: {
          status,
          notes: notes || null,
        },
      });

      // evita duplicados por guardado: limpia y recrea por período/scope
      await prisma.evidence.deleteMany({
        where: { initiativeId: id, label },
      });

      if (evidenceUrls.length) {
        await prisma.evidence.createMany({
          data: evidenceUrls.map((url) => ({
            initiativeId: id,
            url,
            label,
          })),
        });
      }

      items.push({ initiativeId: id, progressPct, status, notes, blockers, evidenceUrls });
    }

    await prisma.wizardProgress.upsert({
      where: { engagementId_stepKey: { engagementId, stepKey: stepKey(safePeriod, scopeKey) } },
      create: {
        engagementId,
        stepKey: stepKey(safePeriod, scopeKey),
        completedAt: new Date(),
        notes: JSON.stringify({ items } satisfies InitiativeSnapshot),
      },
      update: {
        completedAt: new Date(),
        notes: JSON.stringify({ items } satisfies InitiativeSnapshot),
      },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/check-in`);
    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/initiatives`);
    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/summary`);
    revalidatePath(`/${locale}/wizard/${engagementId}/dashboard`);

    const qs = new URLSearchParams();
    qs.set("period", safePeriod);
    if (safeAccountId) qs.set("accountId", safeAccountId);
    redirect(`/${locale}/wizard/${engagementId}/check-in/initiatives?${qs.toString()}`);
  }

  const qsBase = new URLSearchParams();
  qsBase.set("period", periodKey);
  if (activeAccountId) qsBase.set("accountId", activeAccountId);
  const baseQs = qsBase.toString();

  const grouped = new Map<BscPerspective, typeof initiatives>();
  for (const p of P_ORDER) grouped.set(p, []);
  for (const it of initiatives) (grouped.get(it.perspective) ?? []).push(it);

  const opts = statusOptions(locale);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Check-in · Iniciativas", "Check-in · Initiatives")}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">
              {engagement.name || t(locale, "Engagement", "Engagement")}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span>
                {t(locale, "Período:", "Period:")} <span className="font-semibold">{periodKey}</span>
                <span className="text-slate-400"> ({t(locale, "vs", "vs")} {prevKey})</span>
              </span>

              <span className="text-slate-300">·</span>

              <span>
                {t(locale, "Unidad:", "Unit:")} <span className="font-semibold">{unitLabel}</span>
              </span>

              <span className="ml-2 inline-flex flex-wrap items-center gap-2">
                <span className={pill("bg-slate-100 text-slate-700")}>
                  {t(locale, "Total", "Total")}: {cntTotal}
                </span>
                <span className={pill("bg-slate-100 text-slate-700")}>
                  {t(locale, "Con update", "Updated")}: {cntWithUpdate}
                </span>
                <span className={pill("bg-amber-50 text-amber-800 ring-1 ring-amber-100")}>
                  {t(locale, "Bloqueadas", "Blocked")}: {cntBlocked}
                </span>
                <span className={pill("bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100")}>
                  {t(locale, "Listas", "Done")}: {cntDone}
                </span>
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-600">
              {t(
                locale,
                "Modo rápido: ajusta progreso y status arriba. Usa “Detalles” solo si hay bloqueos o evidencias.",
                "Quick mode: set progress and status. Use “Details” only for blockers/evidence."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/${locale}/wizard/${engagementId}/check-in?${baseQs}`} className={btnSoft()}>
              ← {t(locale, "Inicio", "Home")}
            </Link>

            <Link href={`/${locale}/wizard/${engagementId}/check-in/kpis?${baseQs}`} className={btnSoft()}>
              {t(locale, "Volver a KPIs", "Back to KPIs")}
            </Link>

            <Link href={`/${locale}/wizard/${engagementId}/check-in/summary?${baseQs}`} className={btnPrimary()}>
              {t(locale, "Ver resumen →", "View summary →")}
            </Link>
          </div>
        </div>

        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer select-none text-xs font-semibold text-slate-800">
            {t(locale, "Ver navegación del wizard", "Show wizard navigation")}
          </summary>
          <p className="mt-1 text-xs text-slate-600">
            {t(locale, "Útil si necesitas saltar a otras etapas.", "Use this if you need to jump to other stages.")}
          </p>
          <div className="mt-3">
            <CheckInNav locale={locale} engagementId={engagementId} />
          </div>
        </details>

        {initiatives.length === 0 ? (
          <p className="mt-6 text-xs text-slate-600">
            {t(locale, "No hay iniciativas creadas aún.", "No initiatives yet.")}
          </p>
        ) : (
          <form action={save} className="mt-6 space-y-6">
            <input type="hidden" name="periodKey" value={periodKey} />
            <input type="hidden" name="accountId" value={activeAccountId ?? ""} />

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href={`/${locale}/wizard/${engagementId}/check-in/summary?${baseQs}`} className={btnPrimary()}>
                {t(locale, "Siguiente: Resumen →", "Next: Summary →")}
              </Link>

              <button type="submit" className={btnDark()}>
                {t(locale, "Guardar iniciativas", "Save initiatives")}
              </button>
            </div>

            {P_ORDER.map((p) => {
              const list = grouped.get(p) ?? [];
              if (list.length === 0) return null;

              return (
                <section key={p} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">{perspectiveLabel(locale, p)}</h2>
                    <div className="text-[11px] text-slate-500">
                      {t(locale, "Tip:", "Tip:")} {t(locale, "si no cambió, déjalo tal cual.", "if nothing changed, leave it as-is.")}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {list.map((it) => {
                      const cur = curById.get(it.id);
                      const prev = prevById.get(it.id);

                      const prevProg = prev?.progressPct ?? null;
                      const prevStatus = normalizeStatus(prev?.status ?? null);

                      const curProg = cur?.progressPct ?? null;
                      const curStatus = normalizeStatus(cur?.status ?? it.status ?? null);

                      const blockers = (cur?.blockers ?? "").trim();
                      const hasDetailsDefault =
                        blockers.length > 0 ||
                        (cur?.evidenceUrls?.length ?? 0) > 0 ||
                        ((cur?.notes ?? "").trim().length > 0);

                      const statusValue = curStatus || "";
                      const optSet = new Set(opts);
                      const statusList = optSet.has(statusValue) || statusValue === "" ? opts : [statusValue, ...opts];

                      const done = (curProg != null && curProg >= 100) || /done|listo/i.test(curStatus);
                      const blocked = /block|bloque/i.test(curStatus) || blockers.length > 0;

                      return (
                        <div key={it.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <input type="hidden" name="initiativeId" value={it.id} />

                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-semibold text-slate-900">{it.title}</div>
                                {done ? (
                                  <span className={pill("bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100")}>
                                    {t(locale, "Lista", "Done")}
                                  </span>
                                ) : null}
                                {blocked ? (
                                  <span className={pill("bg-amber-50 text-amber-800 ring-1 ring-amber-100")}>
                                    {t(locale, "Bloqueada", "Blocked")}
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-1 text-[11px] text-slate-600">
                                {perspectiveLabel(locale, it.perspective)}
                                {it.owner ? ` · ${it.owner}` : ""}
                                {prevProg != null || prevStatus ? (
                                  <span className="text-slate-400">
                                    {" · "}
                                    {t(locale, "Prev:", "Prev:")} {prevProg != null ? `${prevProg}%` : "—"}
                                    {prevStatus ? ` · ${prevStatus}` : ""}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="grid w-full gap-2 md:w-[520px] md:grid-cols-6">
                              <div className="md:col-span-3">
                                <label className="block text-[11px] font-semibold text-slate-700">
                                  {t(locale, "Progreso", "Progress")}
                                </label>

                                <ProgressField
                                  name={`progress_${it.id}`}
                                  defaultValue={curProg}
                                />
                              </div>

                              <div className="md:col-span-3">
                                <label className="block text-[11px] font-semibold text-slate-700">{t(locale, "Status", "Status")}</label>
                                <select
                                  name={`status_${it.id}`}
                                  defaultValue={statusValue}
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                >
                                  <option value="">{t(locale, "—", "—")}</option>
                                  {statusList.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="md:col-span-6">
                                <label className="block text-[11px] font-semibold text-slate-700">{t(locale, "Notas (1 línea)", "Notes (1 line)")}</label>
                                <input
                                  name={`notes_${it.id}`}
                                  defaultValue={cur?.notes ?? it.notes ?? ""}
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                  placeholder={t(locale, "Qué se avanzó y qué sigue…", "What moved and what's next…")}
                                />
                              </div>
                            </div>
                          </div>

                          <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3" open={hasDetailsDefault}>
                            <summary className="cursor-pointer select-none text-xs font-semibold text-slate-800">
                              {t(locale, "Detalles (bloqueos y evidencias)", "Details (blockers & evidence)")}
                            </summary>

                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700">
                                  {t(locale, "Bloqueos", "Blockers")}
                                </label>
                                <input
                                  name={`blockers_${it.id}`}
                                  defaultValue={cur?.blockers ?? ""}
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                  placeholder={t(locale, "Dependencias, aprobaciones, data faltante…", "Dependencies, approvals, missing data…")}
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700">
                                  {t(locale, "Evidencias (URLs)", "Evidence (URLs)")}
                                </label>
                                <textarea
                                  name={`evidence_${it.id}`}
                                  rows={2}
                                  defaultValue={cur?.evidenceUrls?.length ? cur.evidenceUrls.join("\n") : ""}
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                  placeholder="https://..."
                                />
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {t(locale, "Separa por coma o salto de línea.", "Separate by comma or newline.")}
                                </p>
                              </div>
                            </div>
                          </details>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href={`/${locale}/wizard/${engagementId}/check-in/summary?${baseQs}`} className={btnPrimary()}>
                {t(locale, "Siguiente: Resumen →", "Next: Summary →")}
              </Link>

              <button type="submit" className={btnDark()}>
                {t(locale, "Guardar iniciativas", "Save initiatives")}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
