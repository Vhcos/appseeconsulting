import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeWeekKey } from "@/lib/weeklyFaena";

const OPTIONS = {
  causasDesvio: [
    { value: "WEATHER", labelEs: "Clima" },
    { value: "CLIENT_RESTRICTION", labelEs: "Restricciones cliente" },
    { value: "EQUIPMENT", labelEs: "Equipo" },
    { value: "INPUTS", labelEs: "Insumos" },
    { value: "HSEC", labelEs: "HSEC" },
    { value: "COORDINATION", labelEs: "Coordinación" },
    { value: "OTHER", labelEs: "Otro" },
  ],
  detentionCause: [
    { value: "EQUIPMENT", labelEs: "Equipo" },
    { value: "INPUTS", labelEs: "Insumos" },
    { value: "CLIENT", labelEs: "Cliente" },
    { value: "SAFETY", labelEs: "Seguridad" },
    { value: "WEATHER", labelEs: "Clima" },
    { value: "OTHER", labelEs: "Otro" },
  ],
  reporteClienteEstado: [
    { value: "ON_TIME", labelEs: "En plazo" },
    { value: "LATE", labelEs: "Con atraso" },
    { value: "NOT_APPLICABLE", labelEs: "No corresponde" },
  ],
  reporteClienteAtrasoCausa: [
    { value: "MISSING_DATA", labelEs: "Falta datos" },
    { value: "INTERNAL_APPROVAL", labelEs: "Aprobación interna" },
    { value: "CLIENT", labelEs: "Cliente" },
    { value: "SYSTEM_TECH", labelEs: "Sistema / tech" },
    { value: "OTHER", labelEs: "Otro" },
  ],
  dataPackEstado: [
    { value: "UP_TO_DATE", labelEs: "Al día" },
    { value: "LATE", labelEs: "Atrasado" },
    { value: "NOT_APPLICABLE", labelEs: "No aplica" },
  ],
  turn: [
    { value: "DAY", labelEs: "Día" },
    { value: "NIGHT", labelEs: "Noche" },
    { value: "MIXED", labelEs: "Mixto" },
    { value: "NA", labelEs: "No aplica" },
  ],
  semaforo: [
    { value: "GREEN", labelEs: "Verde" },
    { value: "YELLOW", labelEs: "Amarillo" },
    { value: "RED", labelEs: "Rojo" },
  ],
  accionCorrectiva: [
    { value: "YES", labelEs: "Sí" },
    { value: "NO", labelEs: "No" },
    { value: "NA", labelEs: "No aplica" },
  ],
  tiposApoyo: [
    { value: "PURCHASING", labelEs: "Compras" },
    { value: "MAINTENANCE", labelEs: "Mantención" },
    { value: "HSEC", labelEs: "HSEC" },
    { value: "DATA_TECH", labelEs: "Data / tech" },
    { value: "COMMERCIAL_CLIENT", labelEs: "Comercial / cliente" },
    { value: "OTHER", labelEs: "Otro" },
  ],
};

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "token requerido" }, { status: 400 });
  }

  const tokenRow = await prisma.weeklyFaenaReportToken.findUnique({
    where: { token },
    include: {
      faena: true,
      report: true,
    },
  });

  if (!tokenRow) {
    return NextResponse.json({ ok: false, error: "token no encontrado" }, { status: 404 });
  }

  if (tokenRow.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "token expirado" }, { status: 410 });
  }

  await prisma.weeklyFaenaReportToken.update({
    where: { id: tokenRow.id },
    data: { lastOpenedAt: new Date() },
  });

  let report = tokenRow.report;

  if (!report) {
    const weekKey = makeWeekKey(tokenRow.weekStart);

    report = await prisma.weeklyFaenaReport.create({
      data: {
        engagementId: tokenRow.engagementId,
        faenaId: tokenRow.faenaId,
        weekStart: tokenRow.weekStart,
        weekEnd: tokenRow.weekEnd,
        weekKey,
        status: "DRAFT",
        semaforo: "GREEN",
        tokenId: tokenRow.id,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    token: {
      token: tokenRow.token,
      weekStart: tokenRow.weekStart,
      weekEnd: tokenRow.weekEnd,
      expiresAt: tokenRow.expiresAt,
    },
    faena: {
      id: tokenRow.faena.id,
      name: tokenRow.faena.name,
      code: tokenRow.faena.code,
    },
    report,
    options: OPTIONS,
  });
}
