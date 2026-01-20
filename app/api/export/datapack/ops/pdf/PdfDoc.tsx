import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type OpsPdfInput = {
  locale: "es" | "en";

  // Encabezado (líneas ya armadas)
  clientFaenaLine: string;
  periodLine: string;
  zoneLine: string;
  counterpartLine: string;
  ownerLine: string;

  // Datos desde WeeklyFaenaReport (sin inventar)
  m2Plan?: any;
  m2Real?: any;
  causasDesvio?: any;

  detencionesHoras?: any;
  detencionCausa?: any;

  incidentesCasi?: any;
  lesionesRegistrables?: any;
  referenciaEventoHsec?: any;

  // Punto 4 (editorial)
  ajustePropuesto?: string;
  porQue?: string;
  queNecesitoDelMandante?: string;
};

function t(locale: "es" | "en", es: string, en: string) {
  return locale === "en" ? en : es;
}

function fmtNum(v: any, digits = 0): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("es-CL", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function mapCode(locale: "es" | "en", raw: any) {
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

    CLIENT: { es: "Mandante", en: "Client" },
    SAFETY: { es: "Seguridad", en: "Safety" },
  };

  return dict[u] ? t(locale, dict[u].es, dict[u].en) : s;
}

function mapList(locale: "es" | "en", v: any): string {
  if (!v) return "—";
  if (Array.isArray(v)) {
    const parts = v.map((x) => mapCode(locale, x)).filter(Boolean);
    return parts.length ? parts.join(" + ") : "—";
  }
  // si viene "A,B,C"
  const s = String(v).trim();
  if (!s) return "—";
  if (s.includes(",")) {
    return s
      .split(",")
      .map((x) => mapCode(locale, x.trim()))
      .filter(Boolean)
      .join(" + ");
  }
  return mapCode(locale, s);
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontSize: 11,
    fontFamily: "Times-Roman",
    lineHeight: 1.25,
  },

  title: { fontSize: 20, fontFamily: "Times-Bold", marginBottom: 10 },
  meta: { fontSize: 12, marginBottom: 2 },
  metaBold: { fontFamily: "Times-Bold" },

  sectionTitle: { fontSize: 18, fontFamily: "Times-Bold", marginTop: 18, marginBottom: 10 },

  table: { marginTop: 6, marginBottom: 6 },
  trHead: { flexDirection: "row", marginBottom: 6 },
  tr: { flexDirection: "row", marginBottom: 10 },

  colKpi: { width: "44%" },
  colPlan: { width: "14%", textAlign: "right" },
  colReal: { width: "14%", textAlign: "right" },
  colBrecha: { width: "14%", textAlign: "right" },
  colCom: { width: "14%", textAlign: "left" },

  th: { fontSize: 12, fontFamily: "Times-Bold" },
  td: { fontSize: 12 },

  bullets: { marginTop: 2, marginLeft: 18 },
  bullet: { fontSize: 12, marginBottom: 4 },

  para: { fontSize: 12, marginBottom: 6 },
});

export function buildOpsPdf(props: OpsPdfInput): React.ReactElement {
  const { locale } = props;

  const m2PlanN = props.m2Plan === null || props.m2Plan === undefined ? null : Number(String(props.m2Plan).replace(",", "."));
  const m2RealN = props.m2Real === null || props.m2Real === undefined ? null : Number(String(props.m2Real).replace(",", "."));

  const m2Brecha =
    Number.isFinite(m2PlanN as any) && Number.isFinite(m2RealN as any) ? (m2RealN as number) - (m2PlanN as number) : null;

  const cumplimientoReal =
    Number.isFinite(m2PlanN as any) && (m2PlanN as number) > 0 && Number.isFinite(m2RealN as any)
      ? ((m2RealN as number) / (m2PlanN as number)) * 100
      : null;

  const cumplimientoBrecha = cumplimientoReal === null ? null : cumplimientoReal - 100;

  const detH = props.detencionesHoras === null || props.detencionesHoras === undefined ? null : Number(String(props.detencionesHoras).replace(",", "."));
  const continuidadPlan = 168;
  const continuidadReal = Number.isFinite(detH as any) ? continuidadPlan - (detH as number) : null;
  const continuidadBrecha = continuidadReal === null ? null : continuidadReal - continuidadPlan;

  const incCasi = props.incidentesCasi === null || props.incidentesCasi === undefined ? null : Number(String(props.incidentesCasi).replace(",", "."));
  const lesReg =
    props.lesionesRegistrables === null || props.lesionesRegistrables === undefined ? null : Number(String(props.lesionesRegistrables).replace(",", "."));
  const incidenciasReal = (Number.isFinite(incCasi as any) ? (incCasi as number) : 0) + (Number.isFinite(lesReg as any) ? (lesReg as number) : 0);

  const causasTxt = mapList(locale, props.causasDesvio);
  const detCauseTxt = mapCode(locale, props.detencionCausa);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{t(locale, "Data Pack Operación (borrador)", "Ops Data Pack (draft)")}</Text>

        <Text style={styles.meta}>
          <Text style={styles.metaBold}>{t(locale, "Cliente/Faena: ", "Client/Site: ")}</Text>
          {props.clientFaenaLine}
        </Text>
        <Text style={styles.meta}>
          <Text style={styles.metaBold}>{t(locale, "Periodo: ", "Period: ")}</Text>
          {props.periodLine}
        </Text>
        <Text style={styles.meta}>
          <Text style={styles.metaBold}>{t(locale, "Zona/Caminos: ", "Zone/Roads: ")}</Text>
          {props.zoneLine || "—"}
        </Text>
        <Text style={styles.meta}>
          <Text style={styles.metaBold}>{t(locale, "Contraparte mandante: ", "Client counterpart: ")}</Text>
          {props.counterpartLine || "—"}
        </Text>
        <Text style={styles.meta}>
          <Text style={styles.metaBold}>{t(locale, "Responsable CASIA: ", "CASIA owner: ")}</Text>
          {props.ownerLine || "—"}
        </Text>

        <Text style={styles.sectionTitle}>{t(locale, "1) KPIs operativos (plan vs real)", "1) Operational KPIs (plan vs actual)")}</Text>

        <View style={styles.table}>
          <View style={styles.trHead}>
            <Text style={[styles.th, styles.colKpi]}>{t(locale, "KPI", "KPI")}</Text>
            <Text style={[styles.th, styles.colPlan]}>{t(locale, "Plan", "Plan")}</Text>
            <Text style={[styles.th, styles.colReal]}>{t(locale, "Real", "Actual")}</Text>
            <Text style={[styles.th, styles.colBrecha]}>{t(locale, "Brecha", "Gap")}</Text>
            <Text style={[styles.th, styles.colCom]}>{t(locale, "Comentario", "Comment")}</Text>
          </View>

          <View style={styles.tr}>
            <Text style={[styles.td, styles.colKpi]}>{t(locale, "m² tratados", "m² treated")}</Text>
            <Text style={[styles.td, styles.colPlan]}>{fmtNum(props.m2Plan)}</Text>
            <Text style={[styles.td, styles.colReal]}>{fmtNum(props.m2Real)}</Text>
            <Text style={[styles.td, styles.colBrecha]}>{m2Brecha === null ? "—" : fmtNum(m2Brecha)}</Text>
            <Text style={[styles.td, styles.colCom]}>{causasTxt}</Text>
          </View>

          <View style={styles.tr}>
            <Text style={[styles.td, styles.colKpi]}>{t(locale, "Cumplimiento del plan", "Plan compliance")}</Text>
            <Text style={[styles.td, styles.colPlan]}>100%</Text>
            <Text style={[styles.td, styles.colReal]}>{cumplimientoReal === null ? "—" : `${cumplimientoReal.toFixed(0)}%`}</Text>
            <Text style={[styles.td, styles.colBrecha]}>{cumplimientoBrecha === null ? "—" : `${cumplimientoBrecha.toFixed(0)} pp`}</Text>
            <Text style={[styles.td, styles.colCom]}>{causasTxt}</Text>
          </View>

          <View style={styles.tr}>
            <Text style={[styles.td, styles.colKpi]}>{t(locale, "Continuidad (hrs sin interrupción atribuible)", "Continuity (hrs without attributable stoppage)")}</Text>
            <Text style={[styles.td, styles.colPlan]}>{fmtNum(continuidadPlan)}</Text>
            <Text style={[styles.td, styles.colReal]}>{continuidadReal === null ? "—" : fmtNum(continuidadReal)}</Text>
            <Text style={[styles.td, styles.colBrecha]}>{continuidadBrecha === null ? "—" : fmtNum(continuidadBrecha)}</Text>
            <Text style={[styles.td, styles.colCom]}>
              {detH ? `${t(locale, "Detenciones:", "Stoppage:")} ${fmtNum(detH)}h · ` : ""}
              {detCauseTxt}
            </Text>
          </View>

          <View style={styles.tr}>
            <Text style={[styles.td, styles.colKpi]}>{t(locale, "Incidencias (#)", "Incidents (#)")}</Text>
            <Text style={[styles.td, styles.colPlan]}>—</Text>
            <Text style={[styles.td, styles.colReal]}>{Number.isFinite(incidenciasReal as any) ? fmtNum(incidenciasReal) : "—"}</Text>
            <Text style={[styles.td, styles.colBrecha]}>—</Text>
            <Text style={[styles.td, styles.colCom]}>{props.referenciaEventoHsec ? String(props.referenciaEventoHsec) : "—"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t(locale, "2) Eventos relevantes (qué movió la aguja)", "2) Relevant events (what moved the needle)")}</Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>• {t(locale, "Desvíos:", "Deviations:")} {causasTxt}</Text>
          <Text style={styles.bullet}>• {t(locale, "Detenciones:", "Stoppages:")} {detH ? `${fmtNum(detH)}h · ${detCauseTxt}` : "—"}</Text>
          <Text style={styles.bullet}>• {t(locale, "HSEC:", "HSEC:")} {props.referenciaEventoHsec ? String(props.referenciaEventoHsec) : "—"}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t(locale, "3) Incidencias y acciones correctivas", "3) Incidents and corrective actions")}</Text>
        <Text style={styles.para}>
          {t(
            locale,
            "MVP: este apartado referencia señales del reporte semanal (HSEC/Calidad). La versión siguiente se completa con incidencias estructuradas.",
            "MVP: this section references signals from the weekly report (HSEC/Quality). Next version will be completed with structured incident logs."
          )}
        </Text>

        <Text style={styles.sectionTitle}>{t(locale, "4) Recomendación operativa concreta (próximo ajuste)", "4) Concrete operational recommendation (next adjustment)")}</Text>
        <Text style={styles.para}>
          <Text style={styles.metaBold}>{t(locale, "Ajuste propuesto: ", "Proposed adjustment: ")}</Text>
          {props.ajustePropuesto?.trim() ? props.ajustePropuesto.trim() : "—"}
        </Text>
        <Text style={styles.para}>
          <Text style={styles.metaBold}>{t(locale, "Por qué: ", "Why: ")}</Text>
          {props.porQue?.trim() ? props.porQue.trim() : "—"}
        </Text>
        <Text style={styles.para}>
          <Text style={styles.metaBold}>{t(locale, "Qué necesito del mandante: ", "What I need from the client: ")}</Text>
          {props.queNecesitoDelMandante?.trim() ? props.queNecesitoDelMandante.trim() : "—"}
        </Text>
      </Page>
    </Document>
  );
}
