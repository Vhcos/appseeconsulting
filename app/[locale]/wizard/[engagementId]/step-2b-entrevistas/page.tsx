import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ProgressStatus } from "@prisma/client";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

const STATUS_OPTIONS: {
  value: ProgressStatus;
  labelEs: string;
  labelEn: string;
}[] = [
  { value: "NOT_STARTED", labelEs: "No iniciado", labelEn: "Not started" },
  { value: "OFF_TRACK", labelEs: "Desviado", labelEn: "Off track" },
  { value: "IN_PROGRESS", labelEs: "Progresando", labelEn: "In progress" },
  { value: "ON_TRACK", labelEs: "Según lo planificado", labelEn: "On track" },
];

type RoleKey =
  | "DIRECTORIO"
  | "CEO"
  | "COO"
  | "HSEC"
  | "COMMERCIAL"
  | "DATA_PRODUCT"
  | "FINANCE"
  | "CLIENT";

const ROLE_LABELS: Record<RoleKey, { es: string; en: string }> = {
  DIRECTORIO: { es: "Directorio", en: "Board" },
  CEO: { es: "CEO (Gerente General)", en: "CEO (General Manager)" },
  COO: { es: "COO (Operaciones)", en: "COO (Operations)" },
  HSEC: { es: "HSEC", en: "HSEC" },
  COMMERCIAL: { es: "Comercial", en: "Commercial" },
  DATA_PRODUCT: { es: "Data & Producto", en: "Data & Product" },
  FINANCE: { es: "Finanzas (CFO)", en: "Finance (CFO)" },
  CLIENT: { es: "Entrevista a cliente", en: "Client interview" },
};

type ChecklistItem = {
  code: string;
  order: number;
  promptEs: string;
  promptEn: string;
};

const BASE_ITEMS: ChecklistItem[] = [
  { code: "C2.1", order: 1, promptEs: "¿Qué hace que el cliente pague por nosotros (sin eslóganes)?", promptEn: "What makes the client pay us (no slogans)?" },
  { code: "C2.2", order: 2, promptEs: "¿Dónde ganamos y dónde perdemos (últimos 6 meses)?", promptEn: "Where do we win and lose (last 6 months)?" },
  { code: "C2.3", order: 3, promptEs: "¿Qué es lo más frágil hoy para crecer sin romper calidad/seguridad?", promptEn: "What is most fragile today when scaling without breaking quality/safety?" },
  { code: "C2.4", order: 4, promptEs: "¿Qué 3 cambios harías en 90 días?", promptEn: "What 3 changes would you make in 90 days?" },
  { code: "C2.5", order: 5, promptEs: "¿Qué no es negociable?", promptEn: "What is non-negotiable?" },
  { code: "C2.6", order: 6, promptEs: "¿Qué KPI te preocupa más y por qué?", promptEn: "Which KPI worries you most and why?" },
];

const ROLE_ITEMS: Record<RoleKey, ChecklistItem[]> = {
  DIRECTORIO: [
    ...BASE_ITEMS,
    { code: "DIR.1", order: 101, promptEs: "Define éxito 12 y 36 meses (con números).", promptEn: "Define success at 12 and 36 months (with numbers)." },
    { code: "DIR.2", order: 102, promptEs: "Prioridad: margen vs participación vs expansión vs tecnología (orden).", promptEn: "Priority: margin vs share vs expansion vs technology (ranked)." },
    { code: "DIR.3", order: 103, promptEs: "Riesgos no negociables.", promptEn: "Non-negotiable risks." },
    { code: "DIR.4", order: 104, promptEs: "Inversión aceptable (personas, data, partners).", promptEn: "Acceptable investment (people, data, partners)." },
    { code: "DIR.5", order: 105, promptEs: "Qué iniciativas hay que matar aunque duelan.", promptEn: "Which initiatives must be killed even if painful." },
  ],
  CEO: [
    ...BASE_ITEMS,
    { code: "CEO.1", order: 201, promptEs: "¿Dónde se cae la máquina: venta, implementación, operación, cobranza?", promptEn: "Where does the machine break: sales, implementation, operations, collections?" },
    { code: "CEO.2", order: 202, promptEs: "¿Qué valor mueve renovación de verdad: agua, continuidad, cumplimiento, data?", promptEn: "What truly drives renewals: water, continuity, compliance, data?" },
    { code: "CEO.3", order: 203, promptEs: "5 cuentas/faenas “must win” y por qué.", promptEn: "5 “must win” accounts/sites and why." },
    { code: "CEO.4", order: 204, promptEs: "¿Qué no escala hoy y por qué (personas, procesos, data, seguridad)?", promptEn: "What doesn’t scale today and why (people, process, data, safety)?" },
  ],
  COO: [
    ...BASE_ITEMS,
    { code: "COO.1", order: 301, promptEs: "Variables que más mueven el polvo en terreno (velocidad/tráfico/mantención/clima).", promptEn: "Variables that most impact dust onsite (speed/traffic/maintenance/weather)." },
    { code: "COO.2", order: 302, promptEs: "Qué se puede estandarizar vs qué debe ser a medida (y el límite).", promptEn: "What can be standardized vs must be custom (and the limit)." },
    { code: "COO.3", order: 303, promptEs: "Dónde se genera retrabajo y su costo.", promptEn: "Where rework happens and its cost." },
    { code: "COO.4", order: 304, promptEs: "Capacidad real (m²/mes) por dotación/equipos y cuellos de botella.", promptEn: "Real capacity (m²/month) by crews/equipment and bottlenecks." },
    { code: "COO.5", order: 305, promptEs: "3 métricas operativas que revisarías semanalmente.", promptEn: "3 operational metrics you’d review weekly." },
  ],
  HSEC: [
    ...BASE_ITEMS,
    { code: "HSEC.1", order: 401, promptEs: "Controles críticos y cómo se verifican (documental + terreno).", promptEn: "Critical controls and how they are verified (docs + field)." },
    { code: "HSEC.2", order: 402, promptEs: "Brechas vs estándar gran minería.", promptEn: "Gaps vs large-mining standard." },
    { code: "HSEC.3", order: 403, promptEs: "Evidencia que entregamos y evidencia faltante.", promptEn: "Evidence we deliver and evidence missing." },
    { code: "HSEC.4", order: 404, promptEs: "Flujo incidentes/casi-incidentes: tiempos, responsables, acciones correctivas.", promptEn: "Incidents/near-misses flow: times, owners, corrective actions." },
    { code: "HSEC.5", order: 405, promptEs: "Qué estándar mínimo instalable en 60 días.", promptEn: "Minimum standard installable in 60 days." },
  ],
  COMMERCIAL: [
    ...BASE_ITEMS,
    { code: "COM.1", order: 501, promptEs: "Mapa real de decisores por cuenta (Ops/HSEC/Abastecimiento/Gerencia).", promptEn: "Real decision-maker map per account (Ops/HSEC/Procurement/Management)." },
    { code: "COM.2", order: 502, promptEs: "Por qué perdimos las últimas 5 oportunidades (hechos).", promptEn: "Why we lost the last 5 opportunities (facts)." },
    { code: "COM.3", order: 503, promptEs: "Qué prueba convierte piloto en contrato.", promptEn: "What proof converts pilot into contract." },
    { code: "COM.4", order: 504, promptEs: "Cómo defendemos precio sin guerra de precios.", promptEn: "How we defend price without price wars." },
    { code: "COM.5", order: 505, promptEs: "Qué canal acelera: contratistas/partners/venta directa.", promptEn: "Which channel accelerates: contractors/partners/direct sales." },
  ],
  DATA_PRODUCT: [
    ...BASE_ITEMS,
    { code: "DATA.1", order: 601, promptEs: "Qué se mide, cómo, frecuencia, calidad y trazabilidad.", promptEn: "What is measured, how, frequency, quality and traceability." },
    { code: "DATA.2", order: 602, promptEs: "Qué quiere Operación vs Alta Dirección (son 2 reportes).", promptEn: "What Ops vs senior management want (two different reports)." },
    { code: "DATA.3", order: 603, promptEs: "Qué KPI es auditable hoy y con qué evidencia.", promptEn: "Which KPI is auditable today and with what evidence." },
    { code: "DATA.4", order: 604, promptEs: "Top 5 mejoras (impacto/esfuerzo).", promptEn: "Top 5 improvements (impact/effort)." },
    { code: "DATA.5", order: 605, promptEs: "Cómo se vuelve producto cobrable la data (pack, upsell, estándar).", promptEn: "How data becomes a billable product (pack, upsell, standard)." },
  ],
  FINANCE: [
    ...BASE_ITEMS,
    { code: "FIN.1", order: 701, promptEs: "Rentabilidad por contrato y drivers de costo.", promptEn: "Profitability per contract and cost drivers." },
    { code: "FIN.2", order: 702, promptEs: "Capital de trabajo y cobranzas como cuello de botella.", promptEn: "Working capital and collections as bottleneck." },
    { code: "FIN.3", order: 703, promptEs: "Contratos grandes pero malos (por qué).", promptEn: "Big but bad contracts (why)." },
    { code: "FIN.4", order: 704, promptEs: "Inversiones con payback claro.", promptEn: "Investments with clear payback." },
    { code: "FIN.5", order: 705, promptEs: "Supuestos críticos para cumplir meta anual.", promptEn: "Critical assumptions to hit annual target." },
  ],
  CLIENT: [
    { code: "CL.1", order: 1, promptEs: "¿Qué es éxito para ustedes: agua, continuidad, cumplimiento, costo, seguridad, data?", promptEn: "What is success for you: water, continuity, compliance, cost, safety, data?" },
    { code: "CL.2", order: 2, promptEs: "¿Qué indicador usarían para defender renovación interna?", promptEn: "Which indicator would you use to defend an internal renewal?" },
    { code: "CL.3", order: 3, promptEs: "¿Qué les hace perder tiempo con proveedores?", promptEn: "What makes you lose time with suppliers?" },
    { code: "CL.4", order: 4, promptEs: "¿Qué debería mejorar para ampliar alcance (más m²/frentes)?", promptEn: "What should improve to expand scope (more m²/fronts)?" },
    { code: "CL.5", order: 5, promptEs: "¿Qué formato de reporte les sirve (operación vs alta dirección)?", promptEn: "Which report format helps (operations vs senior management)?" },
  ],
};

type ChecklistState = {
  status?: ProgressStatus;
  owner?: string;
  dueDate?: string; // YYYY-MM-DD
  hasData?: boolean;
  notes?: string;
};

type Step2BNotes = {
  items?: Partial<Record<RoleKey, Record<string, ChecklistState>>>;
};

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default async function Step2BEntrevistasPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const stepKey = "step-2b-entrevistas";

  const progress = await prisma.wizardProgress.findUnique({
    where: { engagementId_stepKey: { engagementId, stepKey } },
    select: { notes: true },
  });

  const notes = safeJsonParse<Step2BNotes>(progress?.notes, { items: {} });
  const itemsState = notes.items ?? {};

  async function updateItem(formData: FormData) {
    "use server";

    const locale = String(formData.get("locale") ?? "es");
    const engagementId = String(formData.get("engagementId") ?? "");
    const role = String(formData.get("role") ?? "") as RoleKey;
    const code = String(formData.get("code") ?? "");
    if (!engagementId || !role || !code) return;

    const statusRaw = String(formData.get("status") ?? "") as ProgressStatus;
    const owner = String(formData.get("owner") ?? "").trim() || "";
    const dueDate = String(formData.get("dueDate") ?? "").trim() || "";
    const notesText = String(formData.get("notes") ?? "").trim() || "";
    const hasData = formData.get("hasData") === "on";

    const existing = await prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey } },
      select: { notes: true },
    });

    const current = safeJsonParse<Step2BNotes>(existing?.notes, { items: {} });
    const next: Step2BNotes = { items: { ...(current.items ?? {}) } };

    const roleMap = { ...(next.items?.[role] ?? {}) };
    roleMap[code] = {
      status: statusRaw || "NOT_STARTED",
      owner: owner || undefined,
      dueDate: dueDate || undefined,
      hasData,
      notes: notesText || undefined,
    };

    next.items = { ...(next.items ?? {}), [role]: roleMap };

    await prisma.wizardProgress.upsert({
      where: { engagementId_stepKey: { engagementId, stepKey } },
      update: { notes: JSON.stringify(next) },
      create: { engagementId, stepKey, notes: JSON.stringify(next) },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/step-2b-entrevistas`);
  }

  const miniTabs = [
    {
      href: `/${locale}/wizard/${engagementId}/step-2-diagnostico-360`,
      label: t(locale, "2 Diagnóstico 360", "2 360° diagnosis"),
      active: false,
    },
    {
      href: `/${locale}/wizard/${engagementId}/step-2-encuesta`,
      label: t(locale, "2 Encuesta", "2 Survey"),
      active: false,
    },
    {
      href: `/${locale}/wizard/${engagementId}/step-2b-entrevistas`,
      label: t(locale, "2B Entrevistas", "2B Interviews"),
      active: true,
    },
  ];

  const label = (es: string, en: string) => (locale === "en" ? en : es);

  const roleKeys = Object.keys(ROLE_LABELS) as RoleKey[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mt-4 flex flex-wrap gap-2">
        {miniTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
              tab.active
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <header className="mb-6 mt-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
            {t(locale, "Etapa 2B · Entrevistas", "Step 2B · Interviews")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Checklist de entrevistas por rol (Anexo 2B)", "Role-based interview checklist (Annex 2B)")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Calco del Data Room: por cada pregunta defines estado, responsable, fecha objetivo y notas. Esto alimenta el Diagnóstico 360°.",
              "Data Room clone: for each question set status, owner, target date and notes. This feeds the 360° diagnosis.",
            )}
          </p>

          <Link
            href={`/${locale}/wizard/${engagementId}/step-2-diagnostico-360`}
            className="mt-2 inline-flex text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← {t(locale, "Volver al Diagnóstico 360°", "Back to 360° diagnosis")}
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
          <p className="font-medium text-slate-800">{t(locale, "Estructura recomendada", "Recommended structure")}</p>
          <ul className="mt-1 list-disc pl-4 text-[11px]">
            <li>{t(locale, "10 min: contexto y objetivos.", "10 min: context and objectives.")}</li>
            <li>{t(locale, "30–40 min: preguntas.", "30–40 min: questions.")}</li>
            <li>{t(locale, "10 min: evidencias + compromisos y fechas.", "10 min: evidence + commitments and dates.")}</li>
          </ul>
        </div>
      </header>

      <section className="space-y-6">
        {roleKeys.map((role) => {
          const items = ROLE_ITEMS[role].slice().sort((a, b) => a.order - b.order);
          const stateForRole = itemsState[role] ?? {};

          const doneCount = items.reduce((acc, it) => acc + ((stateForRole[it.code]?.hasData ?? false) ? 1 : 0), 0);

          return (
            <section key={role} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">{label(ROLE_LABELS[role].es, ROLE_LABELS[role].en)}</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
                  {t(locale, "Listo", "Done")}: {doneCount}/{items.length}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-6 gap-3 text-[11px] font-medium text-slate-500">
                <div>{t(locale, "Pregunta", "Question")}</div>
                <div>{t(locale, "Estado", "Status")}</div>
                <div>{t(locale, "Responsable", "Owner")}</div>
                <div>{t(locale, "Fecha objetivo", "Target date")}</div>
                <div>{t(locale, "¿Listo?", "Ready?")}</div>
                <div>{t(locale, "Notas / Guardar", "Notes / Save")}</div>
              </div>

              <div className="mt-2 space-y-2">
                {items.map((it) => {
                  const st = stateForRole[it.code] ?? {};
                  return (
                    <form
                      key={it.code}
                      action={updateItem}
                      className="grid grid-cols-6 gap-3 items-start rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="engagementId" value={engagementId} />
                      <input type="hidden" name="role" value={role} />
                      <input type="hidden" name="code" value={it.code} />

                      <div className="text-xs text-slate-800">
                        <div className="font-medium">{it.code}</div>
                        <div className="mt-0.5 text-[11px] text-slate-600">
                          {label(it.promptEs, it.promptEn)}
                        </div>
                      </div>

                      <div>
                        <select
                          name="status"
                          defaultValue={(st.status as ProgressStatus) ?? "NOT_STARTED"}
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {t(locale, opt.labelEs, opt.labelEn)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          name="owner"
                          defaultValue={st.owner ?? ""}
                          placeholder={t(locale, "Ej: Consultor / Entrevistado", "E.g. Consultant / Interviewee")}
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        />
                      </div>

                      <div>
                        <input
                          type="date"
                          name="dueDate"
                          defaultValue={st.dueDate ?? ""}
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <input
                          id={`hasData-${role}-${it.code}`}
                          type="checkbox"
                          name="hasData"
                          defaultChecked={st.hasData ?? false}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <label htmlFor={`hasData-${role}-${it.code}`} className="text-slate-700">
                          {t(locale, "Listo", "Ready")}
                        </label>
                      </div>

                      <div className="flex flex-col gap-2">
                        <textarea
                          name="notes"
                          defaultValue={st.notes ?? ""}
                          rows={2}
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                          placeholder={t(
                            locale,
                            "Ej: evidencias a pedir, frases clave, compromisos.",
                            "E.g. evidence to request, key quotes, commitments.",
                          )}
                        />
                        <button
                          type="submit"
                          className="self-end rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
                        >
                          {t(locale, "Guardar", "Save")}
                        </button>
                      </div>
                    </form>
                  );
                })}
              </div>
            </section>
          );
        })}
      </section>

      <p className="mt-4 text-[11px] text-slate-500">
        {t(
          locale,
          "Tip: marca 'Listo' cuando tengas respuestas + evidencia/compromisos. Esto después se resume en el Diagnóstico 360°.",
          "Tip: mark 'Ready' when you have answers + evidence/commitments. This later gets summarized in the 360° diagnosis.",
        )}
      </p>
    </main>
  );
}
