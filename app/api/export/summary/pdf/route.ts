import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { BscPerspective, KpiDirection, KpiBasis } from "@prisma/client";
import { buildMonthKeysBack, computeEvaluatedValue } from "@/lib/see/kpiEval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function toNumber(x: unknown): number | null {
  if (x == null) return null;
  const n = typeof x === "number" ? x : Number(String(x));
  return Number.isFinite(n) ? n : null;
}

function computeIsGreen(direction: KpiDirection, evaluated: number | null, target: number | null) {
  if (evaluated == null) return false;
  if (target == null) return true;
  return direction === "HIGHER_IS_BETTER" ? evaluated >= target : evaluated <= target;
}

// Gap “bueno”: positivo = mejor que meta (para ambos sentidos)
function gapVsTarget(direction: KpiDirection, evaluated: number | null, target: number | null) {
  if (evaluated == null || target == null) return null;
  return direction === "HIGHER_IS_BETTER" ? evaluated - target : target - evaluated;
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

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  meta: { fontSize: 10, color: "#555", marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 10, marginBottom: 6 },

  table: { borderWidth: 1, borderColor: "#E5E7EB" },
  trHead: { flexDirection: "row", backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderColor: "#E5E7EB" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#F1F5F9" },
  th: { padding: 6, fontWeight: 700 },
  td: { padding: 6 },

  cKpi: { width: "40%" },
  cPrev: { width: "10%", textAlign: "right" },
  cActual: { width: "10%", textAlign: "right" },
  cEval: { width: "10%", textAlign: "right" },
  cGap: { width: "10%", textAlign: "right" },
  cTarget: { width: "10%", textAlign: "right" },
  cStatus: { width: "10%", textAlign: "right" },

  pillGreen: { color: "#047857", fontWeight: 700 },
  pillAmber: { color: "#B45309", fontWeight: 700 },
  pillGray: { color: "#64748B", fontWeight: 700 },

  bullet: { marginBottom: 2, lineHeight: 1.25 },
});

type KpiRow = {
  name: string;
  perspective: BscPerspective;
  prev: string;
  actual: string;
  evaluated: string;
  gap: string;
  target: string;
  status: "OK" | "ATENCION" | "SIN_DATO";
};

type InitiativeRow = {
  title: string;
  progressPct: number | null;
  status: string | null;
  notes: string | null;
  blockers: string | null;
};

function buildPdfDoc(args: {
  locale: string;
  engagementName: string;
  periodKey: string;
  prevKey: string;
  scopeLabel: string;
  kpiRows: KpiRow[];
  initiatives: InitiativeRow[];
  highlights: string;
  nextActions: string;
}) {
  const { locale, engagementName, periodKey, prevKey, scopeLabel, kpiRows, initiatives, highlights, nextActions } = args;

  const statusTxt = (s: KpiRow["status"]) => {
    if (s === "OK") return t(locale, "OK", "OK");
    if (s === "ATENCION") return t(locale, "Atención", "Attention");
    return t(locale, "Sin dato", "No data");
  };

  const statusStyle = (s: KpiRow["status"]) => {
    if (s === "OK") return styles.pillGreen;
    if (s === "ATENCION") return styles.pillAmber;
    return styles.pillGray;
  };

  const lines = (raw: string) =>
    (raw || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.h1 }, t(locale, "Resumen de Check-in", "Check-in Summary")),
      React.createElement(Text, { style: styles.meta }, `${engagementName} · ${periodKey} (vs ${prevKey}) · ${scopeLabel}`),

      React.createElement(Text, { style: styles.sectionTitle }, t(locale, "KPIs (resumen)", "KPIs (summary)")),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.trHead },
          React.createElement(Text, { style: [styles.th, styles.cKpi] }, t(locale, "KPI", "KPI")),
          React.createElement(Text, { style: [styles.th, styles.cPrev] }, t(locale, "Prev", "Prev")),
          React.createElement(Text, { style: [styles.th, styles.cActual] }, t(locale, "Actual", "Actual")),
          React.createElement(Text, { style: [styles.th, styles.cEval] }, t(locale, "Evaluado", "Evaluated")),
          React.createElement(Text, { style: [styles.th, styles.cGap] }, "Δ"),
          React.createElement(Text, { style: [styles.th, styles.cTarget] }, t(locale, "Meta", "Target")),
          React.createElement(Text, { style: [styles.th, styles.cStatus] }, t(locale, "Estado", "Status")),
        ),
        ...kpiRows.map((r, i) =>
          React.createElement(
            View,
            { key: String(i), style: styles.tr },
            React.createElement(
              Text,
              { style: [styles.td, styles.cKpi] },
              `${r.name}\n${perspectiveLabel(locale, r.perspective)}`
            ),
            React.createElement(Text, { style: [styles.td, styles.cPrev] }, r.prev),
            React.createElement(Text, { style: [styles.td, styles.cActual] }, r.actual),
            React.createElement(Text, { style: [styles.td, styles.cEval] }, r.evaluated),
            React.createElement(Text, { style: [styles.td, styles.cGap] }, r.gap),
            React.createElement(Text, { style: [styles.td, styles.cTarget] }, r.target),
            React.createElement(Text, { style: [styles.td, styles.cStatus, statusStyle(r.status)] }, statusTxt(r.status)),
          )
        )
      ),

      React.createElement(Text, { style: styles.sectionTitle }, t(locale, "Iniciativas", "Initiatives")),
      ...(initiatives.length
        ? initiatives.slice(0, 20).map((it, idx) =>
            React.createElement(
              View,
              { key: `i_${idx}`, style: { marginBottom: 6 } },
              React.createElement(
                Text,
                { style: { fontWeight: 700 } },
                `${it.title} ${it.progressPct != null ? `(${it.progressPct}%)` : ""} ${it.status ? `· ${it.status}` : ""}`
              ),
              it.notes ? React.createElement(Text, { style: styles.bullet }, `• ${it.notes}`) : null,
              it.blockers ? React.createElement(Text, { style: [styles.bullet, { color: "#B45309" }] }, `• ${t(locale, "Bloqueos", "Blockers")}: ${it.blockers}`) : null,
            )
          )
        : [React.createElement(Text, { key: "none", style: { color: "#64748B" } }, t(locale, "Sin iniciativas registradas en el período.", "No initiatives logged for this period."))]),

      React.createElement(Text, { style: styles.sectionTitle }, t(locale, "Resumen ejecutivo", "Executive summary")),
      ...lines(highlights).map((l, i) => React.createElement(Text, { key: `h_${i}`, style: styles.bullet }, `• ${l}`)),

      React.createElement(Text, { style: styles.sectionTitle }, t(locale, "Próximas acciones", "Next actions")),
      ...lines(nextActions).map((l, i) => React.createElement(Text, { key: `n_${i}`, style: styles.bullet }, `• ${l}`)),
    )
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const locale = (searchParams.get("locale") || "es").toLowerCase();
    const engagementId = String(searchParams.get("engagementId") || "").trim();
    const periodKey = (searchParams.get("period") || "").trim();
    const safePeriod = /^\d{4}-\d{2}$/.test(periodKey) ? periodKey : defaultMonthKey();
    const prevKey = prevMonthKey(safePeriod);

    const accountId = sanitizeSegment(searchParams.get("accountId"));
    const scopeKey = accountId ? `UNIT:${accountId}` : "GLOBAL";
    const scopeLabel = accountId ? t(locale, "Unidad", "Unit") + `: ${accountId}` : "GLOBAL";

    if (!engagementId) {
      return NextResponse.json({ ok: false, error: "Missing engagementId" }, { status: 400 });
    }

    const engagement = await prisma.engagement.findUnique({
      where: { id: engagementId },
      select: { id: true, name: true },
    });

    if (!engagement) {
      return NextResponse.json({ ok: false, error: "Engagement not found" }, { status: 404 });
    }

    const kpis = await prisma.kpi.findMany({
      where: { engagementId },
      select: {
        id: true,
        nameEs: true,
        nameEn: true,
        perspective: true,
        unit: true,
        targetValue: true,
        direction: true,
        basis: true,
      },
    });

    const ids = kpis.map((k) => k.id);
    const seriesKeys = buildMonthKeysBack(safePeriod, 12);

    const seriesRows = ids.length
      ? await prisma.kpiValue.findMany({
          where: {
            kpiId: { in: ids },
            scopeKey,
            periodKey: { in: seriesKeys },
          },
          select: { kpiId: true, periodKey: true, value: true },
        })
      : [];

    const rowByKpiPeriod = new Map<string, typeof seriesRows[number]>();
    for (const r of seriesRows) rowByKpiPeriod.set(`${r.kpiId}:${r.periodKey}`, r);

    // summary saved
    const wpSummary = await prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: `checkin-summary:${scopeKey}:${safePeriod}` } },
      select: { notes: true },
    });

    const summarySaved = (() => {
      if (!wpSummary?.notes) return {};
      try { return JSON.parse(wpSummary.notes) as { highlights?: string; nextActions?: string }; }
      catch { return {}; }
    })();

    // initiatives snapshot
    const wpInit = await prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey: `checkin-initiatives:${scopeKey}:${safePeriod}` } },
      select: { notes: true },
    });

    const initSnapshot = (() => {
      if (!wpInit?.notes) return { items: [] as any[] };
      try { return JSON.parse(wpInit.notes) as { items: any[] }; }
      catch { return { items: [] as any[] }; }
    })();

    const initIds = Array.from(new Set((initSnapshot.items || []).map((x: any) => String(x.initiativeId)).filter(Boolean)));
    const initTitles = initIds.length
      ? await prisma.initiative.findMany({ where: { id: { in: initIds } }, select: { id: true, title: true } })
      : [];
    const titleById = new Map(initTitles.map((x) => [x.id, x.title]));

    const initiatives: InitiativeRow[] = (initSnapshot.items || []).map((x: any) => ({
      title: titleById.get(String(x.initiativeId)) || String(x.initiativeId),
      progressPct: typeof x.progressPct === "number" ? x.progressPct : null,
      status: x.status ? String(x.status) : null,
      notes: x.notes ? String(x.notes) : null,
      blockers: x.blockers ? String(x.blockers) : null,
    }));

    // Build KPI rows like your “imagen 2”: sin notas, sin regla, con Evaluado y Δ vs Meta
    const kpiRows: KpiRow[] = kpis.map((k) => {
      const curRow = rowByKpiPeriod.get(`${k.id}:${safePeriod}`);
      const prevRow = rowByKpiPeriod.get(`${k.id}:${prevKey}`);

      const curActual = curRow?.value != null ? toNumber(curRow.value.toString()) : null;
      const prevActual = prevRow?.value != null ? toNumber(prevRow.value.toString()) : null;

      const targetNum = k.targetValue == null ? null : Number(String(k.targetValue));
      const safeTarget = Number.isFinite(targetNum) ? targetNum : null;

      const series = seriesKeys.map((pk) => {
        const r = rowByKpiPeriod.get(`${k.id}:${pk}`);
        const v = r?.value != null ? toNumber(r.value.toString()) : null;
        return { periodKey: pk, value: v };
      });

      const evaluatedNow = computeEvaluatedValue(k.basis as KpiBasis, series, safePeriod);
      const gap = gapVsTarget(k.direction as KpiDirection, evaluatedNow, safeTarget);

      const isGreen = computeIsGreen(k.direction as KpiDirection, evaluatedNow, safeTarget);

      const status: KpiRow["status"] =
        evaluatedNow == null ? "SIN_DATO" : isGreen ? "OK" : "ATENCION";

      return {
        name: t(locale, k.nameEs || "KPI", k.nameEn || "KPI"),
        perspective: k.perspective,
        prev: prevActual != null ? String(prevActual) : "—",
        actual: curActual != null ? String(curActual) : "—",
        evaluated: evaluatedNow != null ? String(evaluatedNow) : "—",
        gap: gap != null ? String(gap) : "—",
        target: safeTarget != null ? String(safeTarget) : "—",
        status,
      };
    });

    const doc = buildPdfDoc({
      locale,
      engagementName: engagement.name || "Engagement",
      periodKey: safePeriod,
      prevKey,
      scopeLabel,
      kpiRows,
      initiatives,
      highlights: summarySaved.highlights || "",
      nextActions: summarySaved.nextActions || "",
    });

    const raw = await pdf(doc).toBuffer();

// Normalizamos para que TS quede feliz en build (BodyInit)
let body: BodyInit;
if (raw && typeof (raw as any).getReader === "function") {
  // raw es ReadableStream -> lo convertimos a Uint8Array
  const ab = await new Response(raw as any).arrayBuffer();
  body = new Uint8Array(ab);
} else {
  // raw ya es Buffer/Uint8Array/ArrayBuffer según runtime
  body = raw as unknown as BodyInit;
}

return new NextResponse(body, {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    // deja tus headers tal cual estaban
  },
});

  } catch (err: any) {
    console.error("[export summary pdf] error:", err);
    const msg = err?.message || "Unknown error";
    return NextResponse.json(
      { ok: false, error: msg, hint: "Mira la consola del dev server para el stacktrace completo." },
      { status: 500 }
    );
  }
}
