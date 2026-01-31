import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function hashIp(ip: string | null) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!token) return jsonError("Missing token", 400);

  const invite = await prisma.npsInvite.findUnique({
    where: { token },
    include: { responses: true },
  });

  if (!invite) return jsonError("Invite not found (token inválido)", 404);

  // 1 respuesta por invite (tu schema: inviteId @unique)
  const alreadySubmitted = (invite.responses?.length ?? 0) > 0 || !!invite.respondedAt;
  if (alreadySubmitted) return jsonError("Invite already submitted", 409);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const score = Number(body.score);
  if (!Number.isFinite(score) || score < 0 || score > 10) return jsonError("Invalid score (0-10)", 400);

  const reason = body.reason ?? null;
  const focus = body.focus ?? null;
  const comment = typeof body.comment === "string" ? body.comment.slice(0, 2000) : null;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.npsResponse.create({
        data: {
          inviteId: invite.id,
          score,
          reason,
          focus,
          comment,
          ipHash: hashIp(ip),
          userAgent,
          submittedAt: new Date(),
        },
      });

      await tx.npsInvite.update({
        where: { id: invite.id },
        data: { respondedAt: new Date(), status: "RESPONDED" },
      });
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    // Esto es CLAVE: ver el error real
    console.error("[NPS] POST save failed:", e);

    // Prisma enum inválido o constraints, etc.
    const msg =
      typeof e?.message === "string"
        ? e.message
        : "Unknown error saving response";

    // No lo dejes en 500 silencioso
    return jsonError(msg.slice(0, 400), 400);
  }
}
