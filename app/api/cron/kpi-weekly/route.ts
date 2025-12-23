import { PrismaClient } from "@prisma/client";
export const runtime = "nodejs";

const prisma = new PrismaClient();

export async function GET() {
  const active = await prisma.engagement.count({ where: { status: "ACTIVE" } });
  return Response.json({ ok: true, cron: "kpi-weekly", activeEngagements: active });
}

