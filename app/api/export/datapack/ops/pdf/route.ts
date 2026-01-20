import React from "react";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pdf } from "@react-pdf/renderer";
import { renderOpsPdf } from "./PdfDoc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function pick(obj: any, keys: string[], fallback: any = null) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return fallback;
}

function stepKey(reportId: string) {
  return `datapack-ops:${reportId}`;
}

type OpsEditorial = {
  recommendation?: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);

  const locale = (url.searchParams.get("locale") || "es").toLowerCase() === "en" ? "en" : "es";
  const engagementId = url.searchParams.get("engagementId")?.trim() || "";
  const reportId = url.searchParams.get("reportId")?.trim() || "";

  if (!engagementId || !reportId) {
    return NextResponse.json({ ok: false, error: "Missing engagementId or reportId" }, { status: 400 });
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

  const editorial = safeJsonParse<OpsEditorial>(wp?.notes, {});

  const faenaName = pick(r?.faena, ["name", "nombre"], "—");
  const engagementName = pick(r?.engagement, ["name"], engagementId);

  const weekStart = pick(r, ["weekStart", "week_start"], null);
  const weekEnd = pick(r, ["weekEnd", "week_end"], null);
  const weekKey = pick(r, ["weekKey", "week_key"], "—");

  const clientFaenaLine = `${engagementName} — ${faenaName}`;
  const periodLine = weekStart && weekEnd ? `${weekKey} (${String(weekStart).slice(0, 10)} – ${String(weekEnd).slice(0, 10)})` : String(weekKey);

  // MVP: si no existen campos en weekly, quedan en —
  const zoneLine = "—";
  const counterpartLine = "—";
  const ownerLine = "—";

  const doc = renderOpsPdf({
    locale,
    clientFaenaLine,
    periodLine,
    zoneLine,
    counterpartLine,
    ownerLine,

    m2Plan: pick(r, ["m2Planificados", "m2_planificados"], null),
    m2Real: pick(r, ["m2Ejecutados", "m2_ejecutados"], null),
    causasDesvio: pick(r, ["causasDesvio", "causas_desvio"], null),

    detencionesHoras: pick(r, ["detencionesHoras", "detenciones_horas"], null),
    detencionCausa: pick(r, ["detencionCausaPrincipal", "detencion_causa_principal"], null),

    incidentesCasi: pick(r, ["incidentesCasi", "incidentes_casi"], null),
    lesionesRegistrables: pick(r, ["lesionesRegistrables", "lesiones_registrables"], null),
    referenciaEventoHsec: pick(r, ["referenciaEventoHsec", "referencia_evento_hsec"], null),

    recommendation: editorial.recommendation || "",
  });

 const buf = await pdf(doc).toBuffer();

  // NextResponse: usa Uint8Array para evitar líos de BodyInit
  const body = buf instanceof Uint8Array ? buf : new Uint8Array(buf as any);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="datapack-ops-${reportId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
