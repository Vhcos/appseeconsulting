//  app/[locale]/wizard/[engagementId]/step-2b-entrevistas/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import WizardStepsNav from "@/components/see/WizardStepsNav";
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

type ChecklistItem = {
  code: string;
  titleEs: string;
  titleEn: string;
  descriptionEs?: string;
  descriptionEn?: string;
};

type ChecklistSection = {
  key: string;
  titleEs: string;
  titleEn: string;
  items: ChecklistItem[];
};

const INTERVIEW_CHECKLIST_MASTER: ChecklistSection[] = [
  {
    key: "C1",
    titleEs: "C.1 Estructura recomendada (45–60 min)",
    titleEn: "C.1 Recommended structure (45–60 min)",
    items: [
      {
        code: "C1.1",
        titleEs: "10 min: contexto y objetivos de la entrevista.",
        titleEn: "10 min: context and interview objectives.",
      },
      {
        code: "C1.2",
        titleEs: "30–40 min: preguntas.",
        titleEn: "30–40 min: questions.",
      },
      {
        code: "C1.3",
        titleEs: "10 min: evidencias a enviar + compromisos y fechas.",
        titleEn: "10 min: evidence to send + commitments and dates.",
      },
    ],
  },
  {
    key: "C2_BASE",
    titleEs: "C.2 Guión base (para cualquier rol)",
    titleEn: "C.2 Base script (for any role)",
    items: [
      {
        code: "C2.1",
        titleEs: "¿Qué hace que el cliente pague por nosotros (sin eslóganes)?",
        titleEn: "What makes the client pay us (no slogans)?",
      },
      {
        code: "C2.2",
        titleEs: "¿Dónde ganamos y dónde perdemos (últimos 6 meses)?",
        titleEn: "Where do we win and where do we lose (last 6 months)?",
      },
      {
        code: "C2.3",
        titleEs: "¿Qué es lo más frágil hoy para crecer sin romper calidad/seguridad?",
        titleEn: "What is most fragile today to grow without breaking quality/safety?",
      },
      {
        code: "C2.4",
        titleEs: "¿Qué 3 cambios harías en 90 días?",
        titleEn: "What 3 changes would you make in 90 days?",
      },
      {
        code: "C2.5",
        titleEs: "¿Qué no es negociable?",
        titleEn: "What is non-negotiable?",
      },
      {
        code: "C2.6",
        titleEs: "¿Qué KPI te preocupa más y por qué?",
        titleEn: "Which KPI worries you most and why?",
      },
    ],
  },
  {
    key: "DIR",
    titleEs: "Directorio",
    titleEn: "Board / Directory",
    items: [
      {
        code: "DIR.1",
        titleEs: "Define éxito 12 y 36 meses (con números).",
        titleEn: "Define success at 12 and 36 months (with numbers).",
      },
      {
        code: "DIR.2",
        titleEs: "Prioridad: margen vs participación vs expansión vs tecnología (orden).",
        titleEn: "Priority: margin vs share vs expansion vs technology (rank).",
      },
      {
        code: "DIR.3",
        titleEs: "Riesgos no negociables.",
        titleEn: "Non-negotiable risks.",
      },
      {
        code: "DIR.4",
        titleEs: "Inversión aceptable (personas, data, partners).",
        titleEn: "Acceptable investment (people, data, partners).",
      },
      {
        code: "DIR.5",
        titleEs: "Qué iniciativas hay que matar aunque duelan.",
        titleEn: "Which initiatives must be killed even if it hurts.",
      },
    ],
  },
  {
    key: "CEO",
    titleEs: "CEO (Gerente General)",
    titleEn: "CEO (General Manager)",
    items: [
      {
        code: "CEO.1",
        titleEs: "¿Dónde se cae la máquina: venta, implementación, operación, cobranza?",
        titleEn: "Where does the machine break: sales, implementation, operations, collections?",
      },
      {
        code: "CEO.2",
        titleEs: "¿Qué valor mueve renovación de verdad: agua, continuidad, cumplimiento, data?",
        titleEn: "What value truly drives renewal: water, continuity, compliance, data?",
      },
      {
        code: "CEO.3",
        titleEs: "5 cuentas/faenas “must win” y por qué.",
        titleEn: "5 must-win accounts/sites and why.",
      },
      {
        code: "CEO.4",
        titleEs: "¿Qué no escala hoy y por qué (personas, procesos, data, seguridad)?",
        titleEn: "What doesn't scale today and why (people, process, data, safety)?",
      },
      {
        code: "CEO.5",
        titleEs: "¿Qué estándar mínimo instalable en 60 días?",
        titleEn: "What minimum standard can be installed in 60 days?",
      },
    ],
  },
  {
    key: "COO",
    titleEs: "COO (Operaciones)",
    titleEn: "COO (Operations)",
    items: [
      {
        code: "COO.1",
        titleEs: "Variables que más mueven el polvo en terreno (velocidad/tráfico/mantención/clima).",
        titleEn: "Variables that most impact dust on site (speed/traffic/maintenance/weather).",
      },
      {
        code: "COO.2",
        titleEs: "Qué se puede estandarizar vs qué debe ser a medida (y el límite).",
        titleEn: "What can be standardized vs customized (and the limit).",
      },
      {
        code: "COO.3",
        titleEs: "Dónde se genera retrabajo y su costo.",
        titleEn: "Where rework is created and its cost.",
      },
      {
        code: "COO.4",
        titleEs: "Capacidad real (m²/mes) por dotación/equipos y cuellos de botella.",
        titleEn: "Real capacity (m²/month) by staffing/equipment and bottlenecks.",
      },
      {
        code: "COO.5",
        titleEs: "3 métricas operativas que revisarías semanalmente.",
        titleEn: "3 operational metrics you'd review weekly.",
      },
    ],
  },
  {
    key: "HSEC",
    titleEs: "HSEC",
    titleEn: "HSEC",
    items: [
      {
        code: "HSEC.1",
        titleEs: "Controles críticos y cómo se verifican (documental + terreno).",
        titleEn: "Critical controls and how they are verified (documents + field).",
      },
      {
        code: "HSEC.2",
        titleEs: "Brechas vs estándar gran minería.",
        titleEn: "Gaps vs large mining standard.",
      },
      {
        code: "HSEC.3",
        titleEs: "Evidencia que entregamos y evidencia faltante.",
        titleEn: "Evidence we deliver vs missing evidence.",
      },
      {
        code: "HSEC.4",
        titleEs: "Flujo incidentes/casi-incidentes: tiempos, responsables, acciones correctivas.",
        titleEn: "Incidents/near-misses flow: timing, owners, corrective actions.",
      },
      {
        code: "HSEC.5",
        titleEs: "Qué estándar mínimo instalable en 60 días.",
        titleEn: "What minimum standard can be installed in 60 days.",
      },
    ],
  },
  {
    key: "COM",
    titleEs: "Comercial",
    titleEn: "Commercial",
    items: [
      {
        code: "COM.1",
        titleEs: "Mapa real de decisores por cuenta (Ops/HSEC/Abastecimiento/Gerencia).",
        titleEn: "Real decision-maker map per account (Ops/HSEC/Procurement/Management).",
      },
      {
        code: "COM.2",
        titleEs: "Por qué perdimos las últimas 5 oportunidades (hechos).",
        titleEn: "Why we lost the last 5 opportunities (facts).",
      },
      {
        code: "COM.3",
        titleEs: "Qué prueba convierte piloto en contrato.",
        titleEn: "What proof converts a pilot into a contract.",
      },
      {
        code: "COM.4",
        titleEs: "Cómo defendemos precio sin guerra de precios.",
        titleEn: "How we defend price without a price war.",
      },
      {
        code: "COM.5",
        titleEs: "Qué canal acelera: contratistas/partners/venta directa.",
        titleEn: "Which channel accelerates: contractors/partners/direct sales.",
      },
    ],
  },
  {
    key: "DATA",
    titleEs: "Data & Producto",
    titleEn: "Data & Product",
    items: [
      {
        code: "DATA.1",
        titleEs: "Qué se mide, cómo, frecuencia, calidad y trazabilidad.",
        titleEn: "What is measured, how, frequency, quality and traceability.",
      },
      {
        code: "DATA.2",
        titleEs: "Qué quiere Operación vs Alta Dirección (son 2 reportes).",
        titleEn: "What Operations wants vs Senior Management (two reports).",
      },
      {
        code: "DATA.3",
        titleEs: "Qué KPI es auditable hoy y con qué evidencia.",
        titleEn: "Which KPI is auditable today and with what evidence.",
      },
      {
        code: "DATA.4",
        titleEs: "Top 5 mejoras (impacto/esfuerzo).",
        titleEn: "Top 5 improvements (impact/effort).",
      },
      {
        code: "DATA.5",
        titleEs: "Cómo se vuelve producto cobrable la data (pack, upsell, estándar).",
        titleEn: "How data becomes a billable product (pack, upsell, standard).",
      },
    ],
  },
  {
    key: "CFO",
    titleEs: "Finanzas (CFO)",
    titleEn: "Finance (CFO)",
    items: [
      {
        code: "CFO.1",
        titleEs: "Rentabilidad por contrato y drivers de costo.",
        titleEn: "Profitability per contract and cost drivers.",
      },
      {
        code: "CFO.2",
        titleEs: "Capital de trabajo y cobranzas como cuello de botella.",
        titleEn: "Working capital and collections as bottleneck.",
      },
      {
        code: "CFO.3",
        titleEs: "Contratos grandes pero malos (por qué).",
        titleEn: "Big but bad contracts (why).",
      },
      {
        code: "CFO.4",
        titleEs: "Inversiones con payback (retorno) claro.",
        titleEn: "Investments with clear payback.",
      },
      {
        code: "CFO.5",
        titleEs: "Supuestos críticos para cumplir meta anual.",
        titleEn: "Critical assumptions to hit the annual target.",
      },
    ],
  },
  {
    key: "CLIENT",
    titleEs: "C.3 Entrevista a cliente (30 min)",
    titleEn: "C.3 Client interview (30 min)",
    items: [
      {
        code: "CLIENT.1",
        titleEs: "¿Qué es éxito para ustedes: agua, continuidad, cumplimiento, costo, seguridad, data?",
        titleEn: "What is success for you: water, continuity, compliance, cost, safety, data?",
      },
      {
        code: "CLIENT.2",
        titleEs: "¿Qué indicador usarían para defender renovación interna?",
        titleEn: "Which indicator would you use to defend internal renewal?",
      },
      {
        code: "CLIENT.3",
        titleEs: "¿Qué les hace perder tiempo con proveedores?",
        titleEn: "What makes you lose time with suppliers?",
      },
      {
        code: "CLIENT.4",
        titleEs: "¿Qué debería mejorar para ampliar alcance (más m²/frentes)?",
        titleEn: "What should improve to expand scope (more m²/fronts)?",
      },
      {
        code: "CLIENT.5",
        titleEs: "¿Qué formato de reporte les sirve (operación vs alta dirección)?",
        titleEn: "Which report format helps you (operations vs senior management)?",
      },
    ],
  },
];

type StoredItemState = {
  status?: ProgressStatus;
  owner?: string | null;
  dueDate?: string | null; // YYYY-MM-DD
  hasData?: boolean;
  notes?: string | null;
};

type StoredChecklist = {
  items?: Record<string, StoredItemState>;
};

async function getChecklist(engagementId: string): Promise<StoredChecklist> {
  const wp = await prisma.wizardProgress.findUnique({
    where: {
      engagementId_stepKey: {
        engagementId,
        stepKey: "step-2b-entrevistas-checklist",
      },
    },
    select: { notes: true },
  });

  if (!wp?.notes) return {};
  try {
    return JSON.parse(wp.notes) as StoredChecklist;
  } catch {
    return {};
  }
}

async function saveChecklist(engagementId: string, payload: StoredChecklist) {
  await prisma.wizardProgress.upsert({
    where: {
      engagementId_stepKey: {
        engagementId,
        stepKey: "step-2b-entrevistas-checklist",
      },
    },
    update: { notes: JSON.stringify(payload) },
    create: {
      engagementId,
      stepKey: "step-2b-entrevistas-checklist",
      notes: JSON.stringify(payload),
    },
  });
}

export default async function Step2bEntrevistasPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  const stored = await getChecklist(engagementId);
  const storedItems = stored.items ?? {};
  const hasChecklist = Object.keys(storedItems).length > 0;

  async function initChecklist() {
    "use server";
    const base: StoredChecklist = { items: {} };

    for (const section of INTERVIEW_CHECKLIST_MASTER) {
      for (const item of section.items) {
        base.items![item.code] = {
          status: "NOT_STARTED",
          owner: null,
          dueDate: null,
          hasData: false,
          notes: null,
        };
      }
    }

    await saveChecklist(engagementId, base);
    revalidatePath(`/${locale}/wizard/${engagementId}/step-2b-entrevistas`);
  }

  async function updateChecklistItem(formData: FormData) {
    "use server";
    const code = String(formData.get("code") ?? "").trim();
    if (!code) return;

    const statusRaw = formData.get("status");
    const status =
      statusRaw && typeof statusRaw === "string"
        ? (statusRaw as ProgressStatus)
        : undefined;

    const owner = (formData.get("owner") as string | null)?.trim() || null;
    const dueDateStr = (formData.get("dueDate") as string | null)?.trim() || "";
    const notes = (formData.get("notes") as string | null)?.trim() || null;
    const hasData = formData.get("hasData") === "on";

    const current = await getChecklist(engagementId);
    const items = current.items ?? {};
    items[code] = {
      status: status ?? items[code]?.status ?? "NOT_STARTED",
      owner,
      dueDate: dueDateStr ? dueDateStr : null,
      hasData,
      notes,
    };

    await saveChecklist(engagementId, { items });
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
      label: t(locale, "2A Encuesta interna", "2A Internal survey"),
      active: false,
    },
    {
      href: `/${locale}/wizard/${engagementId}/step-2b-entrevistas`,
      label: t(locale, "2B Entrevistas", "2B Interviews"),
      active: true,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <WizardStepsNav
        locale={locale}
        engagementId={engagementId}
        currentStep="step-2b-entrevistas"
      />

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

      <section className="mt-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          {t(locale, "Entrevistas (Anexo 2B)", "Interviews (Annex 2B)")}
        </h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">
          {t(
            locale,
            "Este checklist convierte el Anexo 2B en ejecución: define qué se preguntó, quién lo lidera, para cuándo, y qué evidencia quedó comprometida.",
            "This checklist turns Annex 2B into execution: what was asked, who owns it, by when, and what evidence was committed.",
          )}
        </p>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {t(
                locale,
                "Checklist de entrevistas (por rol)",
                "Interview checklist (by role)",
              )}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Cada fila debería tener al menos estado, responsable y fecha objetivo.",
                "Each row should have at least status, owner and target date.",
              )}
            </p>
          </div>

          {!hasChecklist && (
            <form action={initChecklist}>
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                {t(
                  locale,
                  "Crear checklist de entrevistas",
                  "Create interview checklist",
                )}
              </button>
            </form>
          )}
        </div>

        {hasChecklist ? (
          <div className="mt-6 space-y-6">
            {INTERVIEW_CHECKLIST_MASTER.map((section) => (
              <section
                key={section.key}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  {t(locale, section.titleEs, section.titleEn)}
                </h3>

                <div className="mt-3 grid grid-cols-6 gap-3 text-[11px] font-medium text-slate-500">
                  <div>{t(locale, "Ítem", "Item")}</div>
                  <div>{t(locale, "Estado", "Status")}</div>
                  <div>{t(locale, "Responsable", "Owner")}</div>
                  <div>{t(locale, "Fecha objetivo", "Target date")}</div>
                  <div>{t(locale, "¿Listo?", "Ready?")}</div>
                  <div>{t(locale, "Notas / Guardar", "Notes / Save")}</div>
                </div>

                <div className="mt-2 space-y-2">
                  {section.items.map((item) => {
                    const st = storedItems[item.code] ?? {};
                    return (
                      <form
                        key={item.code}
                        action={updateChecklistItem}
                        className="grid grid-cols-6 gap-3 items-start rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                      >
                        <input type="hidden" name="code" value={item.code} />

                        <div className="text-xs text-slate-800">
                          <div className="font-medium">
                            {item.code} — {t(locale, item.titleEs, item.titleEn)}
                          </div>
                          {(item.descriptionEs || item.descriptionEn) && (
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {t(
                                locale,
                                item.descriptionEs ?? "",
                                item.descriptionEn ?? "",
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <select
                            name="status"
                            defaultValue={st.status ?? "NOT_STARTED"}
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
                            placeholder={t(
                              locale,
                              "Ej: Consultor / Líder de área",
                              "E.g. Consultant / Area lead",
                            )}
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
                            id={`hasData-${item.code}`}
                            type="checkbox"
                            name="hasData"
                            defaultChecked={st.hasData ?? false}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <label
                            htmlFor={`hasData-${item.code}`}
                            className="text-slate-700"
                          >
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
                              "Ej: Quedó comprometido enviar evidencia X antes del viernes.",
                              "E.g. Evidence X committed by Friday.",
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
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            {t(
              locale,
              "Todavía no has creado el checklist de entrevistas. Usa el botón de arriba para generarlo.",
              "You have not created the interview checklist yet. Use the button above to generate it.",
            )}
          </p>
        )}
      </section>
    </main>
  );
}
