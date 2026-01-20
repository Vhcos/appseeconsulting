import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function fmtNum(v: any, digits = 0): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("es-CL", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function fmtPct(v: any, digits = 0): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `${n.toFixed(digits)}%`;
}

function mapCode(locale: string, raw: any) {
  if (raw === null || raw === undefined || raw === "") return "—";
  const s = String(raw).trim();
  if (!s) return "—";

  const u = s.toUpperCase();
  const dict: Record<string, { es: string; en: string }> = {
    WEATHER: { es: "Clima", en: "Weather" },
    CLIENT_RESTRICTION: { es: "Restricción del mandante", en: "Client restriction" },
    EQUIPMENT: { es: "Equipos", en: "Equipment" },
    INPUTS: { es: "Insumos", en: "Inputs" },
    HSEC: { es: "HSEC", en: "HSEC" },
    COORDINATION: { es: "Coordinación", en: "Coordination" },
    OTHER: { es: "Otro", en: "Other" },
  };

  return dict[u] ? t(locale, dict[u].es, dict[u].en) : s;
}

function mapList(locale: string, v: any): string {
  if (!v) return "—";
  if (Array.isArray(v)) {
    const parts = v.map((x) => mapCode(locale, x)).filter(Boolean);
    return parts.length ? parts.join(" + ") : "—";
  }
  if (typeof v === "string" && v.includes(",")) {
    const parts = v
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => mapCode(locale, x));
    return parts.length ? parts.join(" + ") : "—";
  }
  return mapCode(locale, v);
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Times-Roman" },
  title: { fontSize: 22, fontFamily: "Times-Bold", marginBottom: 12 },
  meta: { marginBottom: 2 },
  h: { fontSize: 16, fontFamily: "Times-Bold", marginTop: 18, marginBottom: 10 },
  table: { display: "flex", width: "100%", marginTop: 6 },
  tr: { flexDirection: "row", paddingVertical: 6 },
  th: { fontFamily: "Times-Bold" },
  c1: { width: "38%" },
  c2: { width: "12%", textAlign: "right" },
  c3: { width: "12%", textAlign: "right" },
  c4: { width: "12%", textAlign: "right" },
  c5: { width: "26%", paddingLeft: 10 },
  bullet: { marginLeft: 14, marginBottom: 3 },
  bold: { fontFamily: "Times-Bold" },
  para: { marginTop: 4, lineHeight: 1.25 },
});

export type OpsPdfInput = {
  locale: "es" | "en";
  clientFaenaLine: string;
  periodLine: string;
  zoneLine: string;
  counterpartLine: string;
  ownerLine: string;

  m2Plan?: any;
  m2Real?: any;
  causasDesvio?: any;
  detencionesHoras?: any;
  detencionCausa?: any;
  incidentesCasi?: any;
  lesionesRegistrables?: any;
  referenciaEventoHsec?: any;

  recommendation?: string;
};

export function renderOpsPdf(props: OpsPdfInput): React.ReactElement<any> {
  const { locale } = props;

  const m2PlanN = props.m2Plan === null || props.m2Plan === undefined ? null : Number(props.m2Plan);
  const m2RealN = props.m2Real === null || props.m2Real === undefined ? null : Number(props.m2Real);

  const m2Brecha =
    Number.isFinite(m2PlanN as any) && Number.isFinite(m2RealN as any) ? (m2RealN as number) - (m2PlanN as number) : null;

  const cumplimientoReal =
    Number.isFinite(m2PlanN as any) && (m2PlanN as number) > 0 && Number.isFinite(m2RealN as any)
      ? ((m2RealN as number) / (m2PlanN as number)) * 100
      : null;

  const cumplimientoBrecha = cumplimientoReal === null ? null : cumplimientoReal - 100;

  const detH = props.detencionesHoras === null || props.detencionesHoras === undefined ? null : Number(props.detencionesHoras);
  const continuidadPlan = 168;
  const continuidadReal = Number.isFinite(detH as any) ? continuidadPlan - (detH as number) : null;
  const continuidadBrecha = continuidadReal === null ? null : continuidadReal - continuidadPlan;

  const incCasi = props.incidentesCasi === null || props.incidentesCasi === undefined ? null : Number(props.incidentesCasi);
  const lesReg = props.lesionesRegistrables === null || props.lesionesRegistrables === undefined ? null : Number(props.lesionesRegistrables);
  const incidenciasReal = (Number.isFinite(incCasi as any) ? (incCasi as number) : 0) + (Number.isFinite(lesReg as any) ? (lesReg as number) : 0);

  const causasTxt = mapList(locale, props.causasDesvio);
  const detCauseTxt = mapCode(locale, props.detencionCausa);

  // 👇 CERO JSX: para evitar cualquier conflicto de tipos con Turbopack/TS
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      React.createElement(Text, { style: styles.title }, t(locale, "Data Pack Operación (borrador)", "Ops Data Pack (draft)")),

      React.createElement(
        Text,
        { style: styles.meta },
        React.createElement(Text, { style: styles.bold }, t(locale, "Cliente/Faena: ", "Client/Site: ")),
        props.clientFaenaLine
      ),
      React.createElement(
        Text,
        { style: styles.meta },
        React.createElement(Text, { style: styles.bold }, t(locale, "Periodo: ", "Period: ")),
        props.periodLine
      ),
      React.createElement(
        Text,
        { style: styles.meta },
        React.createElement(Text, { style: styles.bold }, t(locale, "Zona/Caminos: ", "Zone/Roads: ")),
        props.zoneLine
      ),
      React.createElement(
        Text,
        { style: styles.meta },
        React.createElement(Text, { style: styles.bold }, t(locale, "Contraparte mandante: ", "Client counterpart: ")),
        props.counterpartLine
      ),
      React.createElement(
        Text,
        { style: styles.meta },
        React.createElement(Text, { style: styles.bold }, t(locale, "Responsable CASIA: ", "CASIA owner: ")),
        props.ownerLine
      ),

      React.createElement(Text, { style: styles.h }, t(locale, "1) KPIs operativos (plan vs real)", "1) Operational KPIs (plan vs actual)")),

      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: [styles.tr, { paddingTop: 0 }] },
          React.createElement(Text, { style: [styles.th, styles.c1] }, t(locale, "KPI", "KPI")),
          React.createElement(Text, { style: [styles.th, styles.c2] }, t(locale, "Plan", "Plan")),
          React.createElement(Text, { style: [styles.th, styles.c3] }, t(locale, "Real", "Actual")),
          React.createElement(Text, { style: [styles.th, styles.c4] }, t(locale, "Brecha", "Gap")),
          React.createElement(Text, { style: [styles.th, styles.c5] }, t(locale, "Comentario (causa)", "Comment (cause)"))
        ),

        React.createElement(
          View,
          { style: styles.tr },
          React.createElement(Text, { style: styles.c1 }, t(locale, "m² tratados", "m² treated")),
          React.createElement(Text, { style: styles.c2 }, fmtNum(props.m2Plan)),
          React.createElement(Text, { style: styles.c3 }, fmtNum(props.m2Real)),
          React.createElement(Text, { style: styles.c4 }, m2Brecha === null ? "—" : fmtNum(m2Brecha)),
          React.createElement(Text, { style: styles.c5 }, causasTxt)
        ),

        React.createElement(
          View,
          { style: styles.tr },
          React.createElement(Text, { style: styles.c1 }, t(locale, "Cumplimiento del plan", "Plan compliance")),
          React.createElement(Text, { style: styles.c2 }, fmtPct(100, 0)),
          React.createElement(Text, { style: styles.c3 }, cumplimientoReal === null ? "—" : fmtPct(cumplimientoReal, 0)),
          React.createElement(Text, { style: styles.c4 }, cumplimientoBrecha === null ? "—" : `${cumplimientoBrecha.toFixed(0)} pp`),
          React.createElement(Text, { style: styles.c5 }, causasTxt)
        ),

        React.createElement(
          View,
          { style: styles.tr },
          React.createElement(Text, { style: styles.c1 }, t(locale, "Continuidad (hrs sin interrupción atribuible)", "Continuity (hrs without attributable stoppage)")),
          React.createElement(Text, { style: styles.c2 }, fmtNum(continuidadPlan)),
          React.createElement(Text, { style: styles.c3 }, continuidadReal === null ? "—" : fmtNum(continuidadReal)),
          React.createElement(Text, { style: styles.c4 }, continuidadBrecha === null ? "—" : fmtNum(continuidadBrecha)),
          React.createElement(Text, { style: styles.c5 }, detH ? `${t(locale, "Detenciones:", "Stoppage:")} ${fmtNum(detH)}h · ${detCauseTxt}` : "—")
        ),

        React.createElement(
          View,
          { style: styles.tr },
          React.createElement(Text, { style: styles.c1 }, t(locale, "Incidencias (#)", "Incidents (#)")),
          React.createElement(Text, { style: styles.c2 }, "—"),
          React.createElement(Text, { style: styles.c3 }, Number.isFinite(incidenciasReal as any) ? fmtNum(incidenciasReal) : "—"),
          React.createElement(Text, { style: styles.c4 }, "—"),
          React.createElement(Text, { style: styles.c5 }, props.referenciaEventoHsec ? String(props.referenciaEventoHsec) : "—")
        )
      ),

      React.createElement(Text, { style: styles.h }, t(locale, "2) Eventos relevantes (qué movió la aguja)", "2) Relevant events (what moved the needle)")),
      React.createElement(Text, { style: styles.bullet }, `• ${t(locale, "Desvíos:", "Deviations:")} ${causasTxt}`),
      React.createElement(Text, { style: styles.bullet }, `• ${t(locale, "Detenciones:", "Stoppages:")} ${detH ? `${fmtNum(detH)}h · ${detCauseTxt}` : "—"}`),
      React.createElement(Text, { style: styles.bullet }, `• ${t(locale, "HSEC:", "HSEC:")} ${props.referenciaEventoHsec ? String(props.referenciaEventoHsec) : "—"}`),

      React.createElement(Text, { style: styles.h }, t(locale, "3) Incidencias y acciones correctivas", "3) Incidents and corrective actions")),
      React.createElement(
        Text,
        { style: styles.para },
        t(
          locale,
          "Este apartado se completa con el registro estructurado de incidencias (siguiente iteración). En MVP se referencia a HSEC/Calidad desde el reporte semanal.",
          "This section will be completed from structured incident logs (next iteration). In MVP it references HSEC/Quality from the weekly report."
        )
      ),

      React.createElement(Text, { style: styles.h }, t(locale, "4) Recomendación operativa concreta (próximo ajuste)", "4) Concrete operational recommendation (next adjustment)")),
      React.createElement(Text, { style: styles.para }, props.recommendation?.trim() ? props.recommendation.trim() : "—")
    )
  );
}
