import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string; reportId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function pick(obj: any, keys: string[], fallback: any = null) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return fallback;
}

function pickDeep(obj: any, keys: string[], fallback: any = null) {
  const direct = pick(obj, keys, undefined);
  if (direct !== undefined) return direct;

  const candidates = [obj?.data, obj?.payload, obj?.meta, obj?.raw, obj?.answers, obj?.form].filter(Boolean);
  for (const c of candidates) {
    const v = pick(c, keys, undefined);
    if (v !== undefined) return v;
  }
  return fallback;
}

function toDateMaybe(v: any): Date | null {
  if (!v || v === "—") return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function fmtDay(locale: string, d: any) {
  const date = toDateMaybe(d);
  if (!date) return "—";
  const loc = locale === "en" ? "en-US" : "es-CL";
  return new Intl.DateTimeFormat(loc, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "America/Santiago",
  }).format(date);
}

function fmtDateTime(locale: string, d: any) {
  const date = toDateMaybe(d);
  if (!date) return "—";
  const loc = locale === "en" ? "en-US" : "es-CL";
  return new Intl.DateTimeFormat(loc, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(date);
}

function mapCode(locale: string, raw: any) {
  if (raw === null || raw === undefined || raw === "") return "—";
  if (typeof raw === "boolean") return t(locale, raw ? "Sí" : "No", raw ? "Yes" : "No");

  const s = String(raw).trim();
  if (!s) return "—";

  // Si vienen números como string
  if (/^-?\d+(\.\d+)?$/.test(s)) return s;

  const u = s.toUpperCase();

  const dict: Record<string, { es: string; en: string }> = {
    // Semáforo
    GREEN: { es: "Verde", en: "Green" },
    YELLOW: { es: "Amarillo", en: "Yellow" },
    RED: { es: "Rojo", en: "Red" },

    // Estado envío
    DRAFT: { es: "Borrador", en: "Draft" },
    SUBMITTED: { es: "Enviado", en: "Submitted" },

    // Data pack / reporte cliente
    UP_TO_DATE: { es: "A tiempo", en: "Up to date" },
    ON_TIME: { es: "A tiempo", en: "On time" },
    LATE: { es: "Atrasado", en: "Late" },
    MISSING_DATA: { es: "Sin datos", en: "Missing data" },

    // Causas / categorías típicas
    CLIENT_RESTRICTION: { es: "Restricción del cliente", en: "Client restriction" },
    EQUIPMENT: { es: "Equipos", en: "Equipment" },
    INPUTS: { es: "Insumos", en: "Inputs" },
    WEATHER: { es: "Clima", en: "Weather" },
    PURCHASING: { es: "Compras", en: "Purchasing" },

    // Sí/No/NA
    NA: { es: "No aplica", en: "N/A" },
    YES: { es: "Sí", en: "Yes" },
    NO: { es: "No", en: "No" },
  };

  return dict[u] ? t(locale, dict[u].es, dict[u].en) : s;
}

// Traduce strings tipo "WEATHER,CLIENT_RESTRICTION,..." a "Clima · Restricción del cliente · ..."
function mapMaybeList(locale: string, v: any) {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) {
    const parts = v.map((x) => mapCode(locale, x)).filter(Boolean);
    return parts.length ? parts.join(" · ") : "—";
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return "—";
    if (s.includes(",")) {
      const parts = s
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => mapCode(locale, p));
      return parts.length ? parts.join(" · ") : "—";
    }
    return mapCode(locale, s);
  }
  return mapCode(locale, v);
}

function semaforoPillClass(semaforoRaw: any) {
  const u = String(semaforoRaw || "").toUpperCase();
  const base = "inline-flex items-center rounded-full border-2 px-2 py-0.5 text-xs font-semibold";
  if (u.includes("GREEN") || u.includes("VERD")) return `${base} border-emerald-300 bg-emerald-50 text-emerald-900`;
  if (u.includes("YELLOW") || u.includes("AMAR")) return `${base} border-amber-300 bg-amber-50 text-amber-900`;
  if (u.includes("RED") || u.includes("ROJ")) return `${base} border-red-300 bg-red-50 text-red-900`;
  return `${base} border-slate-300 bg-slate-50 text-slate-800`;
}

function statusPillClass(statusRaw: any) {
  const u = String(statusRaw || "").toUpperCase();
  const base = "inline-flex items-center rounded-full border-2 px-2 py-0.5 text-xs font-semibold";
  if (u.includes("SUBMITTED") || u.includes("ENVI")) return `${base} border-indigo-300 bg-indigo-50 text-indigo-900`;
  if (u.includes("DRAFT") || u.includes("BORR")) return `${base} border-slate-300 bg-slate-50 text-slate-800`;
  return `${base} border-slate-300 bg-slate-50 text-slate-800`;
}

function Row({ locale, k, v }: { locale: string; k: string; v: any }) {
  const value = mapMaybeList(locale, v);
  const isLong = typeof value === "string" && value.length > 40;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-xs font-semibold text-slate-700">{k}</div>
      <div className={["text-sm font-semibold text-slate-900", isLong ? "max-w-[55%] text-right break-words" : "text-right"].join(" ")}>
        {value}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

export default async function ReportDetail({ params }: { params: ParamsPromise }) {
  const { locale, engagementId, reportId } = await params;

  const r = await (prisma as any).weeklyFaenaReport.findUnique({
    where: { id: reportId },
    include: { faena: true, engagement: true },
  });

  if (!r) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <p className="text-sm text-slate-700">{t(locale, "Reporte no encontrado.", "Report not found.")}</p>
        <Link
          href={`/${locale}/wizard/${engagementId}/check-in/faena-semanal`}
          className="mt-3 inline-flex items-center rounded-full border-2 border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          {t(locale, "← Volver", "← Back")}
        </Link>
      </main>
    );
  }

  const weekStart = pick(r, ["weekStart", "week_start", "semanaInicio", "semana_inicio"], null);
  const weekEnd = pick(r, ["weekEnd", "week_end", "semanaFin", "semana_fin"], null);

  const semaforoRaw = pick(r, ["semaforo", "trafficLight", "traffic_light"], "—");
  const statusRaw = pick(r, ["status", "state"], "—");
  const submittedAt = pick(r, ["submittedAt", "submitted_at"], null);

  const submittedByEmail =
    pickDeep(r, ["submittedByEmail", "submitted_by_email", "adminEmail", "admin_email", "email"], null) ??
    pick(r?.faena, ["adminEmail", "admin_email"], null);

  const submittedByName =
    pickDeep(r, ["submittedByName", "submitted_by_name", "adminName", "admin_name", "responsable", "responsableName", "administradorResponsable", "administratorName"], null) ??
    pick(r?.faena, ["adminName", "admin_name"], null);

  const faenaName = pick(r?.faena, ["name", "nombre"], "—");
  const engagementName = pick(r?.engagement, ["name"], engagementId);

  const pdfHref = `/api/export/weekly-report/pdf?locale=${encodeURIComponent(locale)}&engagementId=${encodeURIComponent(
    engagementId
  )}&reportId=${encodeURIComponent(reportId)}`;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t(locale, "Detalle reporte semanal", "Weekly report detail")}</h1>
          <p className="mt-1 text-sm text-slate-700">
            {t(locale, "Unidad operativa:", "Site:")} <span className="font-semibold text-slate-900">{faenaName}</span> ·{" "}
            {t(locale, "Semana:", "Week:")}{" "}
            <span className="font-semibold text-slate-900">
              {fmtDay(locale, weekStart)} – {fmtDay(locale, weekEnd)}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {t(locale, "Engagement:", "Engagement:")} <span className="font-semibold">{engagementName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={pdfHref}
            className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            {t(locale, "Descargar PDF", "Download PDF")}
          </Link>

          <Link
            href={`/${locale}/wizard/${engagementId}/check-in/faena-semanal`}
            className="inline-flex items-center rounded-full border-2 border-slate-300 px-3 py-1 text-xs font-bold text-slate-800 hover:bg-slate-50"
          >
            {t(locale, "← Volver a listado", "← Back to list")}
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-xs font-bold text-slate-700">{t(locale, "Semáforo", "Status light")}</div>
            <div className="mt-1">
              <span className={semaforoPillClass(semaforoRaw)}>{mapMaybeList(locale, semaforoRaw)}</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700">{t(locale, "Estado", "State")}</div>
            <div className="mt-1">
              <span className={statusPillClass(statusRaw)}>{mapMaybeList(locale, statusRaw)}</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700">{t(locale, "Enviado", "Submitted")}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{fmtDateTime(locale, submittedAt)}</div>
            <div className="mt-1 text-xs text-slate-700">
              {t(locale, "Email:", "Email:")} {submittedByEmail || "—"}
              <br />
              {t(locale, "Responsable:", "Owner:")} {submittedByName || "—"}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <Card title={t(locale, "Identificación", "Identification")}>
          <Row locale={locale} k={t(locale, "Turno", "Shift")} v={pickDeep(r, ["turno", "shift"], "—")} />
          <Row locale={locale} k={t(locale, "Dotación promedio", "Avg. headcount")} v={pickDeep(r, ["dotacionPromedio", "dotacion_promedio", "avgHeadcount"], "—")} />
          <Row locale={locale} k={t(locale, "Semana inicio", "Week start")} v={fmtDay(locale, weekStart)} />
          <Row locale={locale} k={t(locale, "Semana fin", "Week end")} v={fmtDay(locale, weekEnd)} />
        </Card>

        <Card title={t(locale, "Plan vs Real", "Plan vs Actual")}>
          <Row locale={locale} k={t(locale, "m² planificados", "Planned m²")} v={pickDeep(r, ["m2Planificados", "m2_planificados"], "—")} />
          <Row locale={locale} k={t(locale, "m² ejecutados", "Executed m²")} v={pickDeep(r, ["m2Ejecutados", "m2_ejecutados"], "—")} />
          <Row locale={locale} k={t(locale, "Causas desvío", "Deviation causes")} v={pickDeep(r, ["causasDesvio", "causas_desvio"], "—")} />
        </Card>

        <Card title={t(locale, "Disponibilidad", "Availability")}>
          <Row locale={locale} k={t(locale, "Turnos planificados", "Planned shifts")} v={pickDeep(r, ["turnosPlanificados", "turnos_planificados"], "—")} />
          <Row locale={locale} k={t(locale, "Turnos entregados", "Delivered shifts")} v={pickDeep(r, ["turnosEntregados", "turnos_entregados"], "—")} />
          <Row locale={locale} k={t(locale, "Hubo detenciones", "Had stoppages")} v={pickDeep(r, ["detencionesHubo", "detenciones_hubo"], "—")} />
          <Row locale={locale} k={t(locale, "Eventos", "Events")} v={pickDeep(r, ["detencionesEventos", "detenciones_eventos"], "—")} />
          <Row locale={locale} k={t(locale, "Horas", "Hours")} v={pickDeep(r, ["detencionesHoras", "detenciones_horas"], "—")} />
          <Row locale={locale} k={t(locale, "Causa principal", "Main cause")} v={pickDeep(r, ["detencionCausaPrincipal", "detencion_causa_principal"], "—")} />
        </Card>

        <Card title={t(locale, "Calidad", "Quality")}>
          <Row locale={locale} k={t(locale, "Sin retrabajos", "No rework")} v={pickDeep(r, ["sinRetrabajos", "sin_retrabajos"], "—")} />
          <Row locale={locale} k={t(locale, "Sin no conformidades", "No nonconformities")} v={pickDeep(r, ["sinNoConformidades", "sin_no_conformidades"], "—")} />
          <Row locale={locale} k={t(locale, "Retrabajos (n)", "Reworks (n)")} v={pickDeep(r, ["retrabajosN", "retrabajos_n"], "—")} />
          <Row locale={locale} k={t(locale, "No conformidades (n)", "Nonconformities (n)")} v={pickDeep(r, ["noConformidadesN", "no_conformidades_n"], "—")} />
          <Row locale={locale} k={t(locale, "Acción correctiva", "Corrective action")} v={pickDeep(r, ["accionCorrectivaRegistrada", "accion_correctiva_registrada"], "—")} />
        </Card>

        <Card title={t(locale, "Seguridad (inputs)", "Safety (inputs)")}>
          <Row locale={locale} k={t(locale, "Horas-hombre", "Man-hours")} v={pickDeep(r, ["horasHombre", "horas_hombre"], "—")} />
          <Row locale={locale} k={t(locale, "Incidentes (casi)", "Near misses")} v={pickDeep(r, ["incidentesCasi", "incidentes_casi"], "—")} />
          <Row locale={locale} k={t(locale, "Lesiones registrables", "Recordable injuries")} v={pickDeep(r, ["lesionesRegistrables", "lesiones_registrables"], "—")} />
          <Row locale={locale} k={t(locale, "Acciones HSEC cerradas", "Closed HSEC actions")} v={pickDeep(r, ["accionesHsecCerradas", "acciones_hsec_cerradas"], "—")} />
          <Row locale={locale} k={t(locale, "Sin eventos", "No events")} v={pickDeep(r, ["sinEventosHsec", "sin_eventos_hsec"], "—")} />
          <Row locale={locale} k={t(locale, "Referencia", "Reference")} v={pickDeep(r, ["referenciaEventoHsec", "referencia_evento_hsec"], "—")} />
        </Card>

        <Card title={t(locale, "Reporte / Data Pack", "Client report / Data pack")}>
          <Row locale={locale} k={t(locale, "Reporte cliente", "Client report")} v={pickDeep(r, ["reporteClienteEstado", "reporte_cliente_estado"], "—")} />
          <Row locale={locale} k={t(locale, "Causa atraso", "Delay cause")} v={pickDeep(r, ["reporteClienteAtrasoCausa", "reporte_cliente_atraso_causa"], "—")} />
          <Row locale={locale} k={t(locale, "Data pack mes", "Monthly data pack")} v={pickDeep(r, ["dataPackMesEstado", "data_pack_mes_estado"], "—")} />
        </Card>

        <Card title={t(locale, "Carpeta auditable", "Audit folder")}>
          <Row locale={locale} k={t(locale, "Contrato/anexos", "Contract/annexes")} v={pickDeep(r, ["contratoAnexosOk", "contrato_anexos_ok"], "—")} />
          <Row locale={locale} k={t(locale, "Plan de cierre", "Closeout plan")} v={pickDeep(r, ["planCierreOk", "plan_cierre_ok"], "—")} />
          <Row locale={locale} k={t(locale, "Evidencias", "Evidence")} v={pickDeep(r, ["evidenciasOk", "evidencias_ok"], "—")} />
          <Row locale={locale} k={t(locale, "Reportes archivados", "Archived reports")} v={pickDeep(r, ["reportesArchivadosOk", "reportes_archivados_ok"], "—")} />
          <Row locale={locale} k={t(locale, "Bitácora detenciones", "Stoppage log")} v={pickDeep(r, ["bitacoraDetencionesOk", "bitacora_detenciones_ok"], "—")} />
          <Row locale={locale} k={t(locale, "Registro calidad", "Quality log")} v={pickDeep(r, ["registroCalidadOk", "registro_calidad_ok"], "—")} />
        </Card>

        <Card title={t(locale, "Semáforo / Escalamiento", "Status / Escalation")}>
          <Row locale={locale} k={t(locale, "Requiere apoyo", "Needs support")} v={pickDeep(r, ["requiereApoyo", "requiere_apoyo"], "—")} />
          <Row locale={locale} k={t(locale, "Tipos apoyo", "Support types")} v={pickDeep(r, ["tiposApoyo", "tipos_apoyo"], "—")} />
          <Row locale={locale} k={t(locale, "Comentario", "Comment")} v={pickDeep(r, ["comentario", "comment"], "—")} />
        </Card>
      </section>

      <details className="mt-6 rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-bold text-slate-900">
          {t(locale, "Ver datos crudos (debug)", "View raw data (debug)")}
        </summary>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
{JSON.stringify(r, null, 2)}
        </pre>
      </details>
    </main>
  );
}
