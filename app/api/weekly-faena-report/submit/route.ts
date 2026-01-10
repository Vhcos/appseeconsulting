import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { makeWeekKey } from "@/lib/weeklyFaena";

const PayloadSchema = z.object({
  adminName: z.string().trim().max(120).optional().nullable(),
  adminEmail: z.string().trim().email().optional().nullable(),

  dotacionPromedio: z.number().int().min(0).optional().nullable(),
  turn: z.enum(["DAY", "NIGHT", "MIXED", "NA"]).optional().nullable(),

  m2Planificados: z.number().min(0).optional().nullable(),
  m2Ejecutados: z.number().min(0).optional().nullable(),
  causasDesvio: z.array(z.enum(["WEATHER","CLIENT_RESTRICTION","EQUIPMENT","INPUTS","HSEC","COORDINATION","OTHER"])).optional().nullable(),
  causasDesvioOther: z.string().trim().max(200).optional().nullable(),

  turnosPlanificados: z.number().int().min(0).optional().nullable(),
  turnosEntregados: z.number().int().min(0).optional().nullable(),
  detencionesHubo: z.boolean().optional().nullable(),
  detencionesEventos: z.number().int().min(0).optional().nullable(),
  detencionesHoras: z.number().min(0).optional().nullable(),
  detencionCausaPrincipal: z.enum(["EQUIPMENT","INPUTS","CLIENT","SAFETY","WEATHER","OTHER"]).optional().nullable(),

  sinRetrabajos: z.boolean().optional().nullable(),
  sinNoConformidades: z.boolean().optional().nullable(),
  retrabajosN: z.number().int().min(0).optional().nullable(),
  noConformidadesN: z.number().int().min(0).optional().nullable(),
  accionCorrectivaRegistrada: z.enum(["YES","NO","NA"]).optional().nullable(),

  horasHombre: z.number().min(0).optional().nullable(),
  incidentesCasi: z.number().int().min(0).optional().nullable(),
  lesionesRegistrables: z.number().int().min(0).optional().nullable(),
  accionesHsecCerradas: z.number().int().min(0).optional().nullable(),
  sinEventosHsec: z.boolean().optional().nullable(),
  referenciaEventoHsec: z.string().trim().max(200).optional().nullable(),

  reporteClienteEstado: z.enum(["ON_TIME","LATE","NOT_APPLICABLE"]).optional().nullable(),
  reporteClienteAtrasoCausa: z.enum(["MISSING_DATA","INTERNAL_APPROVAL","CLIENT","SYSTEM_TECH","OTHER"]).optional().nullable(),
  dataPackMesEstado: z.enum(["UP_TO_DATE","LATE","NOT_APPLICABLE"]).optional().nullable(),

  contratoAnexosOk: z.boolean().optional().nullable(),
  planCierreOk: z.boolean().optional().nullable(),
  evidenciasOk: z.boolean().optional().nullable(),
  reportesArchivadosOk: z.boolean().optional().nullable(),
  bitacoraDetencionesOk: z.boolean().optional().nullable(),
  registroCalidadOk: z.boolean().optional().nullable(),

  semaforo: z.enum(["GREEN","YELLOW","RED"]),
  requiereApoyo: z.boolean().optional().nullable(),
  tiposApoyo: z.array(z.enum(["PURCHASING","MAINTENANCE","HSEC","DATA_TECH","COMMERCIAL_CLIENT","OTHER"])).optional().nullable(),
  tiposApoyoOther: z.string().trim().max(200).optional().nullable(),

  comentario: z.string().trim().max(800).optional().nullable(),
});

const SubmitSchema = z.object({
  token: z.string().min(10),
  payload: PayloadSchema,
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = SubmitSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "payload inválido", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, payload } = parsed.data;

  const tokenRow = await prisma.weeklyFaenaReportToken.findUnique({
    where: { token },
    include: { report: true },
  });

  if (!tokenRow) {
    return NextResponse.json({ ok: false, error: "token no encontrado" }, { status: 404 });
  }

  if (tokenRow.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "token expirado" }, { status: 410 });
  }

  // Validaciones condicionales del prompt
  if (payload.detencionesHubo === true) {
    if (payload.detencionesEventos == null || payload.detencionesHoras == null || !payload.detencionCausaPrincipal) {
      return NextResponse.json(
        { ok: false, error: "Si hubo detenciones, debes completar eventos, horas y causa principal." },
        { status: 400 }
      );
    }
  }

  if (payload.reporteClienteEstado === "LATE" && !payload.reporteClienteAtrasoCausa) {
    return NextResponse.json(
      { ok: false, error: "Si el reporte del cliente está con atraso, debes indicar la causa." },
      { status: 400 }
    );
  }

  const weekKey = makeWeekKey(tokenRow.weekStart);

  const report = tokenRow.report
    ? await prisma.weeklyFaenaReport.update({
        where: { id: tokenRow.report.id },
        data: {
          weekKey,
          status: "SUBMITTED",
          submittedAt: new Date(),

          adminName: payload.adminName ?? null,
          adminEmail: payload.adminEmail ?? null,

          dotacionPromedio: payload.dotacionPromedio ?? null,
          turn: payload.turn ?? null,

          m2Planificados: payload.m2Planificados != null ? String(payload.m2Planificados) : null,
          m2Ejecutados: payload.m2Ejecutados != null ? String(payload.m2Ejecutados) : null,
          causasDesvio: payload.causasDesvio ?? [],
          causasDesvioOther: payload.causasDesvioOther ?? null,

          turnosPlanificados: payload.turnosPlanificados ?? null,
          turnosEntregados: payload.turnosEntregados ?? null,
          detencionesHubo: payload.detencionesHubo ?? null,
          detencionesEventos: payload.detencionesEventos ?? null,
          detencionesHoras: payload.detencionesHoras != null ? String(payload.detencionesHoras) : null,
          detencionCausaPrincipal: payload.detencionCausaPrincipal ?? null,

          sinRetrabajos: payload.sinRetrabajos ?? null,
          sinNoConformidades: payload.sinNoConformidades ?? null,
          retrabajosN: payload.retrabajosN ?? null,
          noConformidadesN: payload.noConformidadesN ?? null,
          accionCorrectivaRegistrada: payload.accionCorrectivaRegistrada ?? null,

          horasHombre: payload.horasHombre != null ? String(payload.horasHombre) : null,
          incidentesCasi: payload.incidentesCasi ?? null,
          lesionesRegistrables: payload.lesionesRegistrables ?? null,
          accionesHsecCerradas: (payload as any).acciones_hsec_cerradas ?? (payload.accionesHsecCerradas ?? null),
          sinEventosHsec: payload.sinEventosHsec ?? null,
          referenciaEventoHsec: payload.referenciaEventoHsec ?? null,

          reporteClienteEstado: payload.reporteClienteEstado ?? null,
          reporteClienteAtrasoCausa: payload.reporteClienteAtrasoCausa ?? null,
          dataPackMesEstado: payload.dataPackMesEstado ?? null,

          contratoAnexosOk: payload.contratoAnexosOk ?? null,
          planCierreOk: payload.planCierreOk ?? null,
          evidenciasOk: payload.evidenciasOk ?? null,
          reportesArchivadosOk: payload.reportesArchivadosOk ?? null,
          bitacoraDetencionesOk: payload.bitacoraDetencionesOk ?? null,
          registroCalidadOk: payload.registroCalidadOk ?? null,

          semaforo: payload.semaforo,
          requiereApoyo: payload.requiereApoyo ?? null,
          tiposApoyo: payload.tiposApoyo ?? [],
          tiposApoyoOther: payload.tiposApoyoOther ?? null,

          comentario: payload.comentario ?? null,
        },
      })
    : await prisma.weeklyFaenaReport.create({
        data: {
          engagementId: tokenRow.engagementId,
          faenaId: tokenRow.faenaId,
          weekStart: tokenRow.weekStart,
          weekEnd: tokenRow.weekEnd,
          weekKey,
          status: "SUBMITTED",
          submittedAt: new Date(),
          semaforo: payload.semaforo,
          tokenId: tokenRow.id,
        },
      });

  await prisma.weeklyFaenaReportToken.update({
    where: { id: tokenRow.id },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ ok: true, reportId: report.id });
}
