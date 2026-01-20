import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pick(obj: any, keys: string[], fallback: any = null) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

function pickDeep(obj: any, keys: string[], fallback: any = null) {
  const d = pick(obj, keys, undefined);
  if (d !== undefined) return d;

  const candidates = [obj?.data, obj?.payload, obj?.raw, obj?.answers, obj?.form, obj?.meta].filter(Boolean);
  for (const c of candidates) {
    const v = pick(c, keys, undefined);
    if (v !== undefined) return v;
  }
  return fallback;
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "" || v === "—") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fmtNum(v: any): string {
  const n = toNum(v);
  if (n === null) return "—";
  return n.toLocaleString("es-CL", { maximumFractionDigits: 0 });
}

function fmtPct(real: any, plan: any): string {
  const r = toNum(real);
  const p = toNum(plan);
  if (r === null || p === null || p === 0) return "—";
  return `${Math.round((r / p) * 100)}%`;
}

function fmtDelta(real: any, plan: any): string {
  const r = toNum(real);
  const p = toNum(plan);
  if (r === null || p === null) return "—";
  const d = r - p;
  if (!Number.isFinite(d)) return "—";
  return d === 0 ? "0" : String(d);
}

function stripQuotes(s: string) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

function mapCodeToEs(raw: any): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  const s0 = stripQuotes(String(raw));
  const s = s0.trim();
  if (!s) return "—";

  if (/^-?\d+(\.\d+)?$/.test(s)) return s;

  const u = s.toUpperCase();
  const map: Record<string, string> = {
    WEATHER: "Clima",
    CLIENT_RESTRICTION: "Restricción del cliente",
    EQUIPMENT: "Equipos",
    INPUTS: "Insumos",
    PURCHASING: "Compras",
    OPERATIONS: "Operación",
    SAFETY: "Seguridad",
    QUALITY: "Calidad",
    NA: "No aplica",
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

function stepKey(reportId: string) {
  return `datapack-ops:${reportId}`;
}

type OpsEditorialV1 = {
  ajustePropuesto?: string;
  porQue?: string;
  queNecesitoDelMandante?: string;
};

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

  card: {
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  cardTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8 },

  kv: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 },
  k: { fontSize: 9, fontWeight: 700, color: "#64748B", width: "55%" },
  v: { fontSize: 10, fontWeight: 700, textAlign: "right", width: "45%" },

  kvMulti: { flexDirection: "column", marginBottom: 6 },
  vMulti: { fontSize: 10, fontWeight: 700, marginTop: 2, lineHeight: 1.25 },
});

function BandRow({ label, value }: { label: string; value: string }) {
  return React.createElement(
    View,
    { style: styles.bandRow },
    React.createElement(Text, { style: styles.bandLabel }, label),
    React.createElement(Text, { style: styles.bandValue }, value || "—")
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

    const localeRaw = String(searchParams.get("locale") || "es").trim().toLowerCase();
    const locale = localeRaw === "en" ? "en" : "es"; // por ahora no cambia labels (MVP)
    void locale;

    const engagementId = String(searchParams.get("engagementId") || "").trim();
    const reportId = String(searchParams.get("reportId") || "").trim();

    if (!engagementId || !reportId) {
      return NextResponse.json({ ok: false, error: "Missing engagementId/reportId" }, { status: 400 });
    }

    const r = await (prisma as any).weeklyFaenaReport.findUnique({
      where: { id: reportId },
      include: { faena: true, engagement: true },
    });

    if (!r || String(r.engagementId) !== String(engagementId)) {
      return NextResponse.json({ ok: false, error: "Weekly report not found" }, { status: 404 });
    }

    const wp = await prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: stepKey(reportId) } },
      select: { notes: true },
    });

    const editorial = safeJsonParse<OpsEditorialV1>(wp?.notes, {});

    const engagementName = String(pick(r?.engagement, ["name"], engagementId));
    const faenaName = String(pick(r?.faena, ["name", "nombre"], "—"));

    const weekStart = pick(r, ["weekStart", "week_start", "semanaInicio", "semana_inicio"], null);
    const weekEnd = pick(r, ["weekEnd", "week_end", "semanaFin", "semana_fin"], null);
    const weekKey = pick(r, ["weekKey", "week_key"], "—");

    // Datos operacionales desde WeeklyFaenaReport (sin inventar)
    const m2Plan = pickDeep(r, ["m2Planificados", "m2_planificados"], null);
    const m2Real = pickDeep(r, ["m2Ejecutados", "m2_ejecutados"], null);
    const causasDesvio = pickDeep(r, ["causasDesvio", "causas_desvio", "causasDesvioOther", "causas_desvio_other"], null);

    const detHoras = pickDeep(r, ["detencionesHoras", "detenciones_horas"], null);
    const detCausa = pickDeep(r, ["detencionCausaPrincipal", "detencion_causa_principal"], null);

    const incCasi = pickDeep(r, ["incidentesCasi", "incidentes_casi"], null);
    const lesReg = pickDeep(r, ["lesionesRegistrables", "lesiones_registrables"], null);
    const refHsec = pickDeep(r, ["referenciaEventoHsec", "referencia_evento_hsec"], null);

    const accionCorrectiva = pickDeep(r, ["accionCorrectivaRegistrada", "accion_correctiva_registrada"], null);
    const retrabajosN = pickDeep(r, ["retrabajosN", "retrabajos_n"], null);
    const noConfsN = pickDeep(r, ["noConformidadesN", "no_conformidades_n"], null);

    const clientFaenaLine = `${engagementName} — ${faenaName}`;
    const periodLine =
      weekStart && weekEnd ? `${weekKey} (${String(weekStart).slice(0, 10)} – ${String(weekEnd).slice(0, 10)})` : String(weekKey);

    // MVP: si aún no existen en tu modelo, quedan en "—"
    const zonaCaminos = "—";
    const contraparteMandante = "—";
    const responsableCasia = "—";

    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },

        React.createElement(Text, { style: styles.h1 }, "Data Pack semanal (operación)"),
        React.createElement(Text, { style: styles.meta }, `Cliente/Faena: ${clientFaenaLine} · Periodo: ${periodLine}`),

        React.createElement(Text, { style: styles.sectionTitle }, "Metadata"),
        React.createElement(
          View,
          { style: styles.band },
          React.createElement(BandRow, { label: "Zona/Caminos", value: String(zonaCaminos || "—") }),
          React.createElement(BandRow, { label: "Contraparte mandante", value: String(contraparteMandante || "—") }),
          React.createElement(BandRow, { label: "Responsable CASIA", value: String(responsableCasia || "—") })
        ),

        React.createElement(Text, { style: styles.sectionTitle }, "1) KPIs operativos (plan vs real)"),
        React.createElement(Card, {
          title: "Plan vs Real",
          rows: [
            { k: "m² planificados", v: fmtNum(m2Plan) },
            { k: "m² ejecutados", v: fmtNum(m2Real) },
            { k: "Brecha (m²)", v: fmtDelta(m2Real, m2Plan) },
            { k: "Cumplimiento", v: fmtPct(m2Real, m2Plan) },
            { k: "Causas desvío", v: mapMaybeList(causasDesvio), multiline: true },
          ],
        }),

        React.createElement(Text, { style: styles.sectionTitle }, "2) Eventos relevantes (qué movió la aguja)"),
        React.createElement(Card, {
          title: "Eventos",
          rows: [
            { k: "Detenciones (horas)", v: fmtNum(detHoras) },
            { k: "Causa principal", v: mapMaybeList(detCausa), multiline: true },
            { k: "Referencia HSEC", v: mapMaybeList(refHsec), multiline: true },
          ],
        }),

        React.createElement(Text, { style: styles.sectionTitle }, "3) Incidencias y acciones correctivas"),
        React.createElement(Card, {
          title: "Calidad / Seguridad",
          rows: [
            { k: "Incidentes (casi)", v: fmtNum(incCasi) },
            { k: "Lesiones registrables", v: fmtNum(lesReg) },
            { k: "Retrabajos (n)", v: fmtNum(retrabajosN) },
            { k: "No conformidades (n)", v: fmtNum(noConfsN) },
            { k: "Acción correctiva", v: mapMaybeList(accionCorrectiva), multiline: true },
          ],
        }),

        React.createElement(Text, { style: styles.sectionTitle }, "4) Recomendación operativa concreta (próximo ajuste)"),
        React.createElement(Card, {
          title: "Editorial (se edita en el Data Pack)",
          rows: [
            { k: "Ajuste propuesto", v: String(editorial.ajustePropuesto || "—"), multiline: true },
            { k: "Por qué", v: String(editorial.porQue || "—"), multiline: true },
            { k: "Qué necesito del mandante", v: String(editorial.queNecesitoDelMandante || "—"), multiline: true },
          ],
        })
      )
    );

    const raw = await pdf(doc).toBuffer();

    // MISMO bridge que Weekly Report (evita PDF vacío/dañado si viene como stream)
    let body: BodyInit;
    if (raw && typeof (raw as any).getReader === "function") {
      const ab = await new Response(raw as any).arrayBuffer();
      body = new Uint8Array(ab);
    } else {
      body = raw as unknown as BodyInit;
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="datapack-ops-${reportId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[export datapack ops pdf] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
