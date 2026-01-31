// app/api/nps/submit/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { NpsInviteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isInt(n: any) {
  return typeof n === "number" && Number.isInteger(n);
}

const ALLOWED_REASONS = new Set([
  "CONTROL_OPERATIVO",
  "PERFORMANCE_CAMINOS",
  "DATA_REPORTABILIDAD",
  "SEGURIDAD_HSEC",
  "RESPUESTA_EQUIPO",
  "OTRO",
]);

const ALLOWED_FOCUS = new Set([
  "MAYOR_PRESENCIA_EN_TERRENO",
  "MEJOR_TECNOLOGIA_INNOVACION",
  "MAS_DATOS_INSIGHTS",
  "GESTION_ADMINISTRATIVA",
  "MANTENER_ESTANDAR",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return json(400, { error: "Body inválido." });

    const token = typeof body.token === "string" ? body.token.trim() : "";
    const score = body.score;

    const reasonRaw = typeof body.reason === "string" ? body.reason.trim() : "";
    const focusRaw = typeof body.focus === "string" ? body.focus.trim() : "";
    const comment = typeof body.comment === "string" ? body.comment.trim() : null;

    if (!token) return json(400, { error: "Falta token." });
    if (!isInt(score) || score < 0 || score > 10) {
      return json(400, { error: "Score debe ser entero entre 0 y 10." });
    }

    const reason = reasonRaw && ALLOWED_REASONS.has(reasonRaw) ? reasonRaw : null;
    const focus = focusRaw && ALLOWED_FOCUS.has(focusRaw) ? focusRaw : null;

    const invite = await prisma.npsInvite.findUnique({
      where: { token },
      select: { id: true, respondedAt: true, status: true },
    });

    if (!invite) return json(404, { error: "Token no encontrado." });

    // Guardamos 1 respuesta por invite (tu schema: inviteId @unique en NpsResponse)
    const result = await prisma.$transaction(async (tx) => {
      const response = await tx.npsResponse.upsert({
        where: { inviteId: invite.id },
        create: {
          inviteId: invite.id,
          score,
          reason: reason as any,
          focus: focus as any,
          comment: comment || null,
          // opcional: ipHash/userAgent si quieres, pero tu schema ya los tiene (nullable)
          userAgent: req.headers.get("user-agent") || null,
        },
        update: {
          score,
          reason: reason as any,
          focus: focus as any,
          comment: comment || null,
          userAgent: req.headers.get("user-agent") || null,
          submittedAt: new Date(),
        },
        select: { id: true, submittedAt: true },
      });

      // Marcar invite como respondido
      await tx.npsInvite.update({
        where: { id: invite.id },
        data: {
          respondedAt: new Date(),
          status: NpsInviteStatus.RESPONDED,
        },
      });

      return response;
    });

    return json(200, { ok: true, responseId: result.id, submittedAt: result.submittedAt });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : "Error inesperado.";
    return json(500, { error: msg });
  }
}
