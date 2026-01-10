import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PDF semanal: ESPAÑOL fijo.
 */
function pick(obj: any, keys: string[], fallback: any = null) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

function pickDeep(obj: any, keys: string[], fallback: any = null) {
  // 1) directo
  const d = pick(obj, keys, undefined);
  if (d !== undefined) return d;

  // 2) comunes anidados (por si guardaste formulario en JSON)
  const candidates = [obj?.data, obj?.payload, obj?.raw, obj?.answers, obj?.form, obj?.meta].filter(Boolean);
  for (const c of candidates) {
    const v = pick(c, keys, undefined);
    if (v !== undefined) return v;
  }

  return fallback;
}

function toDate(v: any): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function fmtDateOnly(v: any) {
  const d = toDate(v);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function fmtDateTime(v: any) {
  const d = toDate(v);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function stripQuotes(s: string) {
  // quita comillas “"200"” o "'200'"
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

function mapCodeToEs(raw: any): string {
  if (raw === null || raw === undefined || raw === "") return "—";

  // arrays pasan por mapMaybeList (no aquí)
  const s0 = stripQuotes(String(raw));
  const s = s0.trim();
  if (!s) return "—";

  // si es número, devolver tal cual
  if (/^-?\d+(\.\d+)?$/.test(s)) return s;

  const u = s.toUpperCase();

  const map: Record<string, string> = {
    // Semáforo
    GREEN: "Verde",
    RED: "Rojo",
    AMBER: "Amarillo",
    YELLOW: "Amarillo",

    // Estado envío
    SUBMITTED: "Enviado",
    DRAFT: "Borrador",
    LOCKED: "Cerrado",

    // Reporte/Data Pack
    LATE: "Atrasado",
    ON_TIME: "A tiempo",
    UP_TO_DATE: "A tiempo",
    MISSING_DATA: "Falta de datos",

    // Causas / categorías típicas
    CLIENT_RESTRICTION: "Restricción del cliente",
    WEATHER: "Clima",
    EQUIPMENT: "Equipos",
    INPUTS: "Insumos",
    PURCHASING: "Compras",
    OPERATIONS: "Operación",
    SAFETY: "Seguridad",
    QUALITY: "Calidad",

    // Sí/No comunes en string
    YES: "Sí",
    NO: "No",
    TRUE: "Sí",
    FALSE: "No",
    NA: "No aplica",
    N_A: "No aplica",
    "N/A": "No aplica",
  };

  if (map[u]) return map[u];

  const u2 = u.replace(/\s+/g, "_");
  if (map[u2]) return map[u2];

  return s;
}

function mapMaybeList(raw: any): string {
  if (raw === null || raw === undefined || raw === "") return "—";

  if (Array.isArray(raw)) {
    const parts = raw.map((x) => mapCodeToEs(x)).filter(Boolean);
    return parts.length ? parts.join(" · ") : "—";
  }

  const s = stripQuotes(String(raw)).trim();
  if (!s) return "—";

  // si viene "A,B,C"
  if (s.includes(",")) {
    const parts = s
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => mapCodeToEs(p));
    return parts.length ? parts.join(" · ") : "—";
  }

  return mapCodeToEs(s);
}

function yn(v: any) {
  if (v === true) return "Sí";
  if (v === false) return "No";
  if (v === null || v === undefined || v === "") return "—";

  const u = stripQuotes(String(v)).trim().toUpperCase();
  if (u === "YES" || u === "TRUE" || u === "SI" || u === "SÍ") return "Sí";
  if (u === "NO" || u === "FALSE") return "No";

  return mapCodeToEs(v);
}

function sanitizeFilename(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const styles = StyleSheet.create({
  page: { padding: 22, fontSize: 10, fontFamily: "Helvetica", color: "#0F172A" },

  h1: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  meta: { fontSize: 10, color: "#475569", marginBottom: 12 },

  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 10, marginBottom: 6 },

  band: {
    borderWidth: 2,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
  },

  bandRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  bandLabel: { fontSize: 9, fontWeight: 700, color: "#64748B" },
  bandValue: { fontSize: 10, fontWeight: 700 },

  pills: { flexDirection: "row", alignItems: "center", gap: 6 },

  pillGreen: { color: "#047857" },
  pillAmber: { color: "#B45309" },
  pillRed: { color: "#B91C1C" },
  pillGray: { color: "#334155" },

  cardsWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 8 },
  card: {
    width: "48%",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  cardTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8 },

  // fila normal (2 columnas) con ancho controlado para evitar “choques”
  kv: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 },
  k: { fontSize: 9, fontWeight: 700, color: "#64748B", width: "55%" },
  v: { fontSize: 10, fontWeight: 700, textAlign: "right", width: "45%" },

  // fila multilinea (label arriba, texto abajo)
  kvMulti: { flexDirection: "column", marginBottom: 6 },
  vMulti: { fontSize: 10, fontWeight: 700, marginTop: 2, lineHeight: 1.25 },
});

function statusColor(semaforoRaw: any) {
  const s = String(semaforoRaw ?? "").toUpperCase();
  if (s.includes("GREEN") || s.includes("VERD")) return styles.pillGreen;
  if (s.includes("AMBER") || s.includes("YELLOW") || s.includes("AMAR")) return styles.pillAmber;
  if (s.includes("RED") || s.includes("ROJ")) return styles.pillRed;
  return styles.pillGray;
}

function BandRow({ label, value }: { label: string; value: string }) {
  return React.createElement(
    View,
    { style: styles.bandRow },
    React.createElement(Text, { style: styles.bandLabel }, label),
    React.createElement(Text, { style: styles.bandValue }, value)
  );
}

type Row = { k: string; v: string; multiline?: boolean };

function Card({ title, rows }: { title: string; rows: Row[] }) {
  return React.createElement(
    View,
    { style: styles.card },
    React.createElement(Text, { style: styles.cardTitle }, title),
    ...rows.map((r, i) => {
      if (r.multiline) {
        return React.createElement(
          View,
          { key: `${title}_${i}`, style: styles.kvMulti },
          React.createElement(Text, { style: styles.k }, r.k),
          React.createElement(Text, { style: styles.vMulti }, r.v || "—")
        );
      }
      return React.createElement(
        View,
        { key: `${title}_${i}`, style: styles.kv },
        React.createElement(Text, { style: styles.k }, r.k),
        React.createElement(Text, { style: styles.v }, r.v || "—")
      );
    })
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // aunque venga locale=en, lo ignoramos: este PDF es español fijo
    const engagementId = String(searchParams.get("engagementId") || "").trim();
    const reportId = String(searchParams.get("reportId") || "").trim();

    if (!engagementId || !reportId) {
      return NextResponse.json({ ok: false, error: "Missing engagementId/reportId" }, { status: 400 });
    }

    const r = await (prisma as any).weeklyFaenaReport.findUnique({
      where: { id: reportId },
      include: { faena: true, engagement: true },
    });

    if (!r) {
      return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });
    }

    const engagementName = String(pick(r?.engagement, ["name"], engagementId));
    const unitName = String(pick(r?.faena, ["name", "nombre"], "—"));

    const weekStart = pick(r, ["weekStart", "week_start", "semanaInicio", "semana_inicio"], null);
    const weekEnd = pick(r, ["weekEnd", "week_end", "semanaFin", "semana_fin"], null);

    const semaforoRaw = pick(r, ["semaforo", "trafficLight", "traffic_light"], null);
    const estadoRaw = pick(r, ["status", "state"], null);

    const submittedAt = pick(r, ["submittedAt", "submitted_at"], null);

    // Email y Responsable (en el formulario aparece como “Administrador responsable”)
    const submittedByEmail =
      pickDeep(r, ["submittedByEmail", "submitted_by_email", "adminEmail", "admin_email", "email"], null) ??
      pick(r?.faena, ["adminEmail", "admin_email"], null);

    const submittedByName =
      pickDeep(r, [
        "submittedByName",
        "submitted_by_name",
        "adminName",
        "admin_name",
        "responsable",
        "responsableName",
        "administradorResponsable",
        "administratorName",
        "administratorResponsible",
      ], null) ??
      pick(r?.faena, ["adminName", "admin_name"], null);

    const semaforoTxt = mapCodeToEs(semaforoRaw);
    const estadoTxt = mapCodeToEs(estadoRaw);

    const metaLine = `Engagement: ${engagementName} · Unidad operativa: ${unitName} · ${fmtDateOnly(weekStart)} – ${fmtDateOnly(weekEnd)}`;

    // helpers para valores
    const V = (x: any) => mapMaybeList(x);
    const S = (x: any) => (x === null || x === undefined || x === "" ? "—" : mapMaybeList(x));

    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },

        React.createElement(Text, { style: styles.h1 }, "Reporte semanal"),
        React.createElement(Text, { style: styles.meta }, metaLine),

        React.createElement(Text, { style: styles.sectionTitle }, "Estado"),
        React.createElement(
          View,
          { style: styles.band },
          React.createElement(
            View,
            { style: styles.pills },
            React.createElement(Text, { style: [styles.bandValue, statusColor(semaforoRaw)] }, semaforoTxt),
            React.createElement(Text, { style: styles.bandValue }, "·"),
            React.createElement(Text, { style: styles.bandValue }, estadoTxt)
          ),
          React.createElement(View, { style: { height: 8 } }),
          React.createElement(BandRow, { label: "Enviado", value: fmtDateTime(submittedAt) }),
          React.createElement(BandRow, { label: "Email", value: submittedByEmail ? String(submittedByEmail) : "—" }),
          React.createElement(BandRow, { label: "Responsable", value: submittedByName ? String(submittedByName) : "—" })
        ),

        React.createElement(Text, { style: styles.sectionTitle }, "Detalle"),
        React.createElement(
          View,
          { style: styles.cardsWrap },

          React.createElement(Card, {
            title: "Identificación",
            rows: [
              { k: "Turno", v: S(pickDeep(r, ["turno", "shift"], "—")) },
              { k: "Dotación promedio", v: S(pickDeep(r, ["dotacionPromedio", "dotacion_promedio", "avgHeadcount"], "—")) },
              { k: "Semana inicio", v: fmtDateOnly(weekStart) },
              { k: "Semana fin", v: fmtDateOnly(weekEnd) },
            ],
          }),

          React.createElement(Card, {
            title: "Plan vs Real",
            rows: [
              { k: "m² planificados", v: S(pickDeep(r, ["m2Planificados", "m2_planificados"], "—")) },
              { k: "m² ejecutados", v: S(pickDeep(r, ["m2Ejecutados", "m2_ejecutados"], "—")) },
              { k: "Causas desvío", v: V(pickDeep(r, ["causasDesvio", "causas_desvio"], "—")), multiline: true },
            ],
          }),

          React.createElement(Card, {
            title: "Disponibilidad",
            rows: [
              { k: "Turnos planificados", v: S(pickDeep(r, ["turnosPlanificados", "turnos_planificados"], "—")) },
              { k: "Turnos entregados", v: S(pickDeep(r, ["turnosEntregados", "turnos_entregados"], "—")) },
              { k: "Hubo detenciones", v: yn(pickDeep(r, ["detencionesHubo", "detenciones_hubo"], null)) },
              { k: "Eventos", v: S(pickDeep(r, ["detencionesEventos", "detenciones_eventos"], "—")) },
              { k: "Horas", v: S(pickDeep(r, ["detencionesHoras", "detenciones_horas"], "—")) },
              { k: "Causa principal", v: V(pickDeep(r, ["detencionCausaPrincipal", "detencion_causa_principal"], "—")), multiline: true },
            ],
          }),

          React.createElement(Card, {
            title: "Calidad",
            rows: [
              { k: "Sin retrabajos", v: yn(pickDeep(r, ["sinRetrabajos", "sin_retrabajos"], null)) },
              { k: "Sin no conformidades", v: yn(pickDeep(r, ["sinNoConformidades", "sin_no_conformidades"], null)) },
              { k: "Retrabajos (n)", v: S(pickDeep(r, ["retrabajosN", "retrabajos_n"], "—")) },
              { k: "No conformidades (n)", v: S(pickDeep(r, ["noConformidadesN", "no_conformidades_n"], "—")) },
              { k: "Acción correctiva", v: V(pickDeep(r, ["accionCorrectivaRegistrada", "accion_correctiva_registrada"], "—")) },
            ],
          }),

          React.createElement(Card, {
            title: "Seguridad (inputs)",
            rows: [
              { k: "Horas-hombre", v: S(pickDeep(r, ["horasHombre", "horas_hombre"], "—")) },
              { k: "Incidentes (casi)", v: S(pickDeep(r, ["incidentesCasi", "incidentes_casi"], "—")) },
              { k: "Lesiones registrables", v: S(pickDeep(r, ["lesionesRegistrables", "lesiones_registrables"], "—")) },
              { k: "Acciones HSEC cerradas", v: S(pickDeep(r, ["accionesHsecCerradas", "acciones_hsec_cerradas"], "—")) },
              { k: "Sin eventos", v: yn(pickDeep(r, ["sinEventosHsec", "sin_eventos_hsec"], null)) },
              { k: "Referencia", v: V(pickDeep(r, ["referenciaEventoHsec", "referencia_evento_hsec"], "—")), multiline: true },
            ],
          }),

          React.createElement(Card, {
            title: "Reporte / Data Pack",
            rows: [
              { k: "Reporte cliente", v: V(pickDeep(r, ["reporteClienteEstado", "reporte_cliente_estado"], "—")) },
              { k: "Causa atraso", v: V(pickDeep(r, ["reporteClienteAtrasoCausa", "reporte_cliente_atraso_causa"], "—")), multiline: true },
              { k: "Data pack mes", v: V(pickDeep(r, ["dataPackMesEstado", "data_pack_mes_estado"], "—")) },
            ],
          }),

          React.createElement(Card, {
            title: "Carpeta auditable",
            rows: [
              { k: "Contrato/anexos", v: yn(pickDeep(r, ["contratoAnexosOk", "contrato_anexos_ok"], null)) },
              { k: "Plan de cierre", v: yn(pickDeep(r, ["planCierreOk", "plan_cierre_ok"], null)) },
              { k: "Evidencias", v: yn(pickDeep(r, ["evidenciasOk", "evidencias_ok"], null)) },
              { k: "Reportes archivados", v: yn(pickDeep(r, ["reportesArchivadosOk", "reportes_archivados_ok"], null)) },
              { k: "Bitácora detenciones", v: yn(pickDeep(r, ["bitacoraDetencionesOk", "bitacora_detenciones_ok"], null)) },
              { k: "Registro calidad", v: yn(pickDeep(r, ["registroCalidadOk", "registro_calidad_ok"], null)) },
            ],
          }),

          React.createElement(Card, {
            title: "Semáforo / Escalamiento",
            rows: [
              { k: "Requiere apoyo", v: yn(pickDeep(r, ["requiereApoyo", "requiere_apoyo"], null)) },
              { k: "Tipos apoyo", v: V(pickDeep(r, ["tiposApoyo", "tipos_apoyo"], "—")), multiline: true },
              { k: "Comentario", v: String(pickDeep(r, ["comentario", "comment"], "—") ?? "—"), multiline: true },
            ],
          })
        )
      )
    );

    const raw = await pdf(doc).toBuffer();

    let body: BodyInit;
    if (raw && typeof (raw as any).getReader === "function") {
      const ab = await new Response(raw as any).arrayBuffer();
      body = new Uint8Array(ab);
    } else {
      body = raw as unknown as BodyInit;
    }

    const fileUnit = sanitizeFilename(unitName || "unidad");
    const fileDate = sanitizeFilename(fmtDateOnly(weekStart).replace(/\s+/g, "-"));
    const filename = `reporte-semanal-${fileUnit}-${fileDate}.pdf`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[export weekly report pdf] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
