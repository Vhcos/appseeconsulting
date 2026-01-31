import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNpsInviteEmail } from "@/lib/nps/sendNpsInviteEmail";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const to = String(body.to || "").trim().toLowerCase();
  const fullName = String(body.fullName || "Contacto").trim();
  const locale = String(body.locale || "es").trim() || "es";
  const semesterKey = String(body.semesterKey || "2026S1").trim();

  if (!to) {
    return Response.json({ ok: false, error: "Falta 'to'." }, { status: 400 });
  }

  // Token demo fijo (para pruebas repetibles)
  const token = String(body.token || "TEST_TOKEN_DEMO").trim();

  // Crea/actualiza invitación (para que NO dependa de Prisma Studio)
  // OJO: esto asume que NpsInvite tiene campo token UNIQUE.
  await prisma.npsInvite.upsert({
    where: { token },
    create: {
      token,
      email: to,
      fullName,
      semesterKey,
      // Si tu modelo tiene expiración, puedes setearlo acá.
      // expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
    update: {
      email: to,
      fullName,
      semesterKey,
    },
  });

  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const inviteUrl = `${base}/${locale}/nps/${token}`;

  const data = await sendNpsInviteEmail({ to, fullName, inviteUrl, semesterKey });

  return Response.json({ ok: true, inviteUrl, data });
}
