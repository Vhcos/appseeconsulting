import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function requireAdmin(req: NextRequest): string | null {
  const secret = (process.env.WEEKLY_REPORT_ADMIN_TOKEN || "").trim();
  if (!secret) return "Falta configurar WEEKLY_REPORT_ADMIN_TOKEN en el entorno.";
  const got = (req.headers.get("x-admin-token") || "").trim();
  if (!got || got !== secret) return "No autorizado.";
  return null;
}

export async function GET(req: NextRequest) {
  const adminErr = requireAdmin(req);
  if (adminErr) return NextResponse.json({ ok: false, error: adminErr }, { status: 401 });

  const q = req.nextUrl.searchParams;
  const engagementId = q.get("engagementId")?.trim();
  const faenaId = q.get("faenaId")?.trim() || undefined;
  const semaforo = q.get("semaforo")?.trim() as any;
  const status = q.get("status")?.trim() as any;
  const weekKey = q.get("weekKey")?.trim() || undefined;

  if (!engagementId) {
    return NextResponse.json({ ok: false, error: "engagementId requerido" }, { status: 400 });
  }

  const where: any = { engagementId };
  if (faenaId) where.faenaId = faenaId;
  if (weekKey) where.weekKey = weekKey;
  if (semaforo) where.semaforo = semaforo;
  if (status) where.status = status;

  const rows = await prisma.weeklyFaenaReport.findMany({
    where,
    orderBy: [{ weekStart: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: { faena: true },
  });

  return NextResponse.json({ ok: true, rows });
}
