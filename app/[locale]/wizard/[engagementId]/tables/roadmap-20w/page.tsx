import Link from "next/link";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

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

function inferFromReferer(
  referer: string | null,
  locale: string,
  engagementId: string
): string {
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

const ROADMAP_TEMPLATE: Array<{
  week: string;
  objective: string;
  keyActivities: string;
  deliverables: string;
  kpiFocus: string;
  ritual: string;
}> = [
  {
    week: "1",
    objective: "Kickoff + data room operativo",
    keyActivities:
      "Alinear alcance/éxito; pedir insumos críticos; agenda entrevistas; definir semáforo y responsable",
    deliverables: "Plan semana 1 + checklist data room + calendario entrevistas",
    kpiFocus: "% insumos críticos comprometidos",
    ritual: "Comité semanal (45–60 min)",
  },
  {
    week: "2",
    objective: "Diagnóstico preliminar 360 v0",
    keyActivities:
      "Entrevistas clave (GG/Operaciones/HSEC/Comercial/Data); encuesta interna; levantar dolores por audiencia",
    deliverables: "Diagnóstico 360 v0 (1–2 páginas)",
    kpiFocus: "# entrevistas + tasa respuesta",
    ritual: "Comité semanal",
  },
  {
    week: "3",
    objective: "Línea base operacional y de evidencia",
    keyActivities:
      "Mapear método before/after; QA/QC; revisar reportes actuales al cliente; identificar brechas de trazabilidad",
    deliverables: "Mapa de evidencia + brechas de medición",
    kpiFocus: "% KPI auditables hoy",
    ritual: "Comité semanal",
  },
  {
    week: "4",
    objective: "Foto comercial real (pipeline + win/loss)",
    keyActivities:
      "Levantar pipeline por faena; revisar últimas 5 ganadas/perdidas; mapear decisores (Ops/HSEC/Abastecimiento/GG)",
    deliverables: "Mapa de cuentas + win/loss v0",
    kpiFocus: "# oportunidades con decisor identificado",
    ritual: "Comité semanal",
  },
  {
    week: "5",
    objective: "Taller 1: Visión/Misión/Objetivos",
    keyActivities: "Preparar prework; correr taller; acordar 5–7 objetivos con número y fecha",
    deliverables: "1 página visión/misión + objetivos",
    kpiFocus: "# objetivos acordados (5–7)",
    ritual: "Taller (2h) + comité semanal",
  },
  {
    week: "6",
    objective: "Taller 2: FODA (con evidencia)",
    keyActivities:
      "FODA con regla cada punto con evidencia; definir implicancias + stop doing",
    deliverables: "FODA top 5 por cuadrante + stop doing",
    kpiFocus: "% items con evidencia",
    ritual: "Taller (2h) + comité semanal",
  },
  {
    week: "7",
    objective: "Tesis comercial (relato vendible)",
    keyActivities:
      "Definir qué hacemos / para quién / por qué ganamos; mensajes por stakeholder; propuesta de valor por audiencia",
    deliverables: "Tesis comercial v1 + mensajes por audiencia",
    kpiFocus: "1 relato aprobado (sí/no)",
    ritual: "Comité semanal",
  },
  {
    week: "8",
    objective: "Taller 3: BSC (Cuadro de Mando Integral)",
    keyActivities:
      "Diseñar ≤15 KPI; definir fórmula/fuente/frecuencia/dueño; metas 3 y 12 meses",
    deliverables: "Diccionario KPI v1",
    kpiFocus: "# KPI definidos (≤15)",
    ritual: "Taller (2–3h) + comité semanal",
  },
  {
    week: "9",
    objective: "Taller 4: Iniciativas + priorización",
    keyActivities:
      "Construir 20–30 iniciativas; priorizar impacto/esfuerzo/riesgo; seleccionar top 10",
    deliverables: "Portafolio top 10 + definición de terminado",
    kpiFocus: "# iniciativas priorizadas",
    ritual: "Taller (2h) + comité semanal",
  },
  {
    week: "10",
    objective: "Roadmap aprobado + sistema de ejecución v1",
    keyActivities:
      "Armar Gantt 20 semanas; dependencias; recursos estimados; instalar semáforo estándar",
    deliverables: "Roadmap 20 semanas v1 + semáforo",
    kpiFocus: "% iniciativas con dueño/fecha",
    ritual: "Comité semanal",
  },
  {
    week: "11",
    objective: "Cierre de diseño: packs definidos (sin piloto aún)",
    keyActivities:
      "Diseñar one-pager; estructura de propuesta; qué recibe el cliente/mes; diseño Data Pack por audiencia (conceptual)",
    deliverables: "One-pager v1 + propuesta v1 (diseño)",
    kpiFocus: "# piezas diseñadas (no ejecutadas)",
    ritual: "Comité semanal",
  },
  {
    week: "12",
    objective: "Cierre de diseño: oferta + gobierno listos para operar",
    keyActivities:
      "Diseñar oferta 3 niveles + lógica precio; playbook licitaciones v1; definir rituales, minutas y tablero PMO",
    deliverables: "Oferta 3 niveles v1 + playbook v1 + pack PMO v0",
    kpiFocus: "% artefactos listos para Go-live",
    ritual: "Comité semanal",
  },
  {
    week: "13",
    objective: "Implementación guiada: PMO Go-live",
    keyActivities:
      "Emitir reporte semanal 1 página; abrir action log; fijar KPIs en tablero; primeras decisiones",
    deliverables: "Tablero PMO v1 + 1er reporte semanal",
    kpiFocus: "1 reporte emitido (sí/no)",
    ritual: "Comité semanal",
  },
  {
    week: "14",
    objective: "Implementación guiada: Data Pack v1 en cancha",
    keyActivities:
      "Aplicar Data Pack (Operación + Alta Dirección) en 1 cliente; ajustar narrativa; cerrar brechas de datos",
    deliverables: "Data Pack v1 aplicado + mejoras v1.1",
    kpiFocus: "# clientes con pack aplicado",
    ritual: "Comité semanal",
  },
  {
    week: "15",
    objective: "Implementación guiada: Caso de éxito con ROI",
    keyActivities:
      "Elegir caso; consolidar before/after; validar supuestos; armar versión directorios",
    deliverables: "Caso de éxito v1 (publicable)",
    kpiFocus: "1 caso validado (sí/no)",
    ritual: "Comité semanal",
  },
  {
    week: "16",
    objective: "Implementación guiada: Account plans en ejecución",
    keyActivities:
      "Definir 2–3 cuentas foco; agenda 8 semanas; preparación reuniones decisor; propuesta + pack",
    deliverables: "2–3 account plans v1",
    kpiFocus: "# reuniones con decisor",
    ritual: "Comité semanal",
  },
  {
    week: "17",
    objective: "Implementación guiada: Playbook licitaciones en uso",
    keyActivities:
      "Repositorio activo; checklist usado; win/loss post-mortem de 1 proceso real",
    deliverables: "1 licitación con checklist + 1 win/loss real",
    kpiFocus: "% procesos con post-mortem",
    ritual: "Comité semanal",
  },
  {
    week: "18",
    objective: "Implementación guiada: Revisión mensual BSC + ajustes",
    keyActivities:
      "Revisar KPI vs meta; ajustar iniciativas; pedir decisiones de recursos (personas/tiempo)",
    deliverables: "Pack mensual BSC v1 + decisiones",
    kpiFocus: "# decisiones cerradas",
    ritual: "Comité mensual (90 min)",
  },
  {
    week: "19",
    objective: "Implementación guiada: cerrar 3 brechas críticas",
    keyActivities:
      "Ejecutar quick wins; reforzar adopción interna; asegurar continuidad de rituales",
    deliverables: "Top 3 brechas: estado final + plan",
    kpiFocus: "% avance quick wins",
    ritual: "Comité semanal",
  },
  {
    week: "20",
    objective: "Cierre + paquete directorio",
    keyActivities:
      "Consolidar resultados; roadmap próximo trimestre; 3 decisiones solicitadas; continuidad PMO",
    deliverables: "Pack directorio + roadmap siguiente ciclo",
    kpiFocus: "5 KPI clave con semáforo",
    ritual: "Directorio / Steering (60–90 min)",
  },
];

export default async function Roadmap20wPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams?: SearchParams | SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = (searchParams ? await searchParams : {}) as SearchParams;

  const fromParam = sanitizeSegment(readString(sp, "from"));
  const fromRef = sanitizeSegment(
    inferFromReferer((await headers()).get("referer"), locale, engagementId)
  );
  const from = fromParam || fromRef || "step-7-roadmap";

  const backHref =
    from === "tables"
      ? `/${locale}/wizard/${engagementId}/tables`
      : `/${locale}/wizard/${engagementId}/${from}`;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: { id: true, name: true, contextCompanyName: true },
  });

  if (!engagement) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-sm">
          {t(locale, "Engagement no encontrado.", "Engagement not found.")}
        </p>
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

  // Auto-seed: si NO hay semanas todavía, creamos la plantilla 1–20
  const existingCount = await prisma.roadmapWeek.count({ where: { engagementId } });
  if (existingCount === 0) {
    await prisma.roadmapWeek.createMany({
      data: ROADMAP_TEMPLATE.map((w) => ({
        engagementId,
        week: w.week,
        objective: w.objective,
        keyActivities: w.keyActivities,
        deliverables: w.deliverables,
        kpiFocus: w.kpiFocus,
        ritual: w.ritual,
      })),
    });
  }

  async function upsertWeek(formData: FormData) {
    "use server";

    const week = String(formData.get("week") ?? "").trim();
    if (!week) return;

    const objective = String(formData.get("objective") ?? "").trim() || null;
    const keyActivities = String(formData.get("keyActivities") ?? "").trim() || null;
    const deliverables = String(formData.get("deliverables") ?? "").trim() || null;
    const kpiFocus = String(formData.get("kpiFocus") ?? "").trim() || null;
    const ritual = String(formData.get("ritual") ?? "").trim() || null;

    const existing = await prisma.roadmapWeek.findFirst({
      where: { engagementId, week },
      select: { id: true },
    });

    if (existing) {
      await prisma.roadmapWeek.update({
        where: { id: existing.id },
        data: { objective, keyActivities, deliverables, kpiFocus, ritual },
      });
    } else {
      await prisma.roadmapWeek.create({
        data: { engagementId, week, objective, keyActivities, deliverables, kpiFocus, ritual },
      });
    }

    revalidatePath(`/${locale}/wizard/${engagementId}/tables/roadmap-20w`);
    revalidatePath(`/${locale}/wizard/${engagementId}/step-7-roadmap`);
  }

  const weeks = await prisma.roadmapWeek.findMany({
    where: { engagementId },
    orderBy: [{ week: "asc" }],
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Tabla", "Table")} · {t(locale, "Roadmap 20 semanas", "20-week roadmap")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Roadmap (calendario)", "Roadmap (calendar)")} — {clientName}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {t(
              locale,
              "Esto es el calendario que le mostrarías a un cliente. Una semana = objetivo + actividades + entregables + KPI foco + ritual. Sin frases raras: solo claridad.",
              "This is the calendar you’d show a client. One week = objective + activities + deliverables + KPI focus + ritual. No jargon—just clarity."
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

      {/* Video (placeholder) */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-900">
              {t(locale, "Mira esto antes de editar (2 min)", "Watch this before editing (2 min)")}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Cuando tengamos el video en YouTube, lo linkeamos aquí (cómo llenar sin perder tiempo).",
                "When we have the YouTube video, we’ll link it here (how to fill fast, no wasted time)."
              )}
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-600 md:w-[420px]">
            {t(
              locale,
              "Video aún no cargado. (Después lo reemplazamos por un embed de YouTube.)",
              "Video not loaded yet. (Later we’ll replace with a YouTube embed.)"
            )}
          </div>
        </div>
      </section>

      {/* Form simple (editar una semana) */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "Editar una semana", "Edit one week")}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "No escribas perfecto. Es para que cualquiera entienda qué pasa esa semana.",
                "Don’t write perfect. It’s so anyone understands what happens that week."
              )}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <div className="font-semibold">{t(locale, "Tip", "Tip")}</div>
            <div className="mt-1">
              {t(
                locale,
                "Entregables = cosas concretas. Si no se puede “mostrar”, no es entregable.",
                "Deliverables = tangible outputs. If you can’t show it, it’s not a deliverable."
              )}
            </div>
          </div>
        </div>

        <form action={upsertWeek} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Semana", "Week")}
            </label>
            <select
              name="week"
              defaultValue="1"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              {Array.from({ length: 20 }).map((_, i) => {
                const w = String(i + 1);
                return (
                  <option key={w} value={w}>
                    {t(locale, "Semana", "Week")} {w}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Ritual", "Ritual")}
            </label>
            <input
              name="ritual"
              placeholder={t(locale, "Ej: Comité semanal (45–60 min)", "Ex: Weekly committee (45–60 min)")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Objetivo", "Objective")}
            </label>
            <input
              name="objective"
              placeholder={t(locale, "Ej: Roadmap aprobado + sistema de ejecución v1", "Ex: Roadmap approved + execution system v1")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Actividades clave", "Key activities")}
            </label>
            <textarea
              name="keyActivities"
              rows={3}
              placeholder={t(locale, "Lista corta. Qué se hace (no poesía).", "Short list. What gets done (no fluff).")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "Entregables", "Deliverables")}
            </label>
            <textarea
              name="deliverables"
              rows={2}
              placeholder={t(locale, "Ej: Roadmap 20 semanas v1 + semáforo", "Ex: 20-week roadmap v1 + traffic light")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-800">
              {t(locale, "KPI foco", "KPI focus")}
            </label>
            <input
              name="kpiFocus"
              placeholder={t(locale, "Ej: % iniciativas con dueño/fecha", "Ex: % initiatives with owner/date")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {t(locale, "Guardar semana", "Save week")}
            </button>

            <Link
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href={`/${locale}/wizard/${engagementId}/step-7-roadmap`}
            >
              {t(locale, "Ir al Step Roadmap", "Go to Roadmap step")}
            </Link>

            <span className="ml-auto text-xs text-slate-500">
              {t(locale, "Semanas:", "Weeks:")} {weeks.length}
            </span>
          </div>
        </form>
      </section>

      {/* Tabla calcada */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {t(locale, "Roadmap presentado al cliente", "Client-facing roadmap")}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Estructura fija. Cambia el contenido, no el formato.",
                "Fixed structure. Content changes, not the format."
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">{t(locale, "Semana", "Week")}</th>
                <th className="py-2 pr-3">{t(locale, "Objetivo", "Objective")}</th>
                <th className="py-2 pr-3">{t(locale, "Actividades clave", "Key activities")}</th>
                <th className="py-2 pr-3">{t(locale, "Entregables", "Deliverables")}</th>
                <th className="py-2 pr-3">{t(locale, "KPI foco", "KPI focus")}</th>
                <th className="py-2 pr-0">{t(locale, "Ritual", "Ritual")}</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.id} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-3 whitespace-nowrap font-semibold text-slate-900">
                    {w.week}
                  </td>
                  <td className="py-3 pr-3 text-slate-900">{w.objective ?? "—"}</td>
                  <td className="py-3 pr-3 text-slate-800 whitespace-pre-line">{w.keyActivities ?? "—"}</td>
                  <td className="py-3 pr-3 text-slate-800 whitespace-pre-line">{w.deliverables ?? "—"}</td>
                  <td className="py-3 pr-3 text-slate-800">{w.kpiFocus ?? "—"}</td>
                  <td className="py-3 pr-0 text-slate-800">{w.ritual ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
