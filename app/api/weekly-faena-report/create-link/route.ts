import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { addDaysUtc, generateTokenString, makeWeekKey, safeBaseUrl, toUtcDateOnly } from "@/lib/weeklyFaena";

const BodySchema = z.object({
  engagementId: z.string().min(10),
  faenaId: z.string().min(10),
  weekStart: z.string().min(8), // "YYYY-MM-DD" ideal
  weekEnd: z.string().min(8).optional(),
  expiresInDays: z.number().int().min(1).max(60).optional(),
  locale: z.enum(["es", "en"]).optional(),
});

function requireAdmin(req: NextRequest): string | null {
  const secret = (process.env.WEEKLY_REPORT_ADMIN_TOKEN || "").trim();
  if (!secret) return "Falta configurar WEEKLY_REPORT_ADMIN_TOKEN en el entorno.";
  const got = (req.headers.get("x-admin-token") || "").trim();
  if (!got || got !== secret) return "No autorizado.";
  return null;
}

export async function POST(req: NextRequest) {
  const adminErr = requireAdmin(req);
  if (adminErr) return NextResponse.json({ ok: false, error: adminErr }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "payload inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  const { engagementId, faenaId, weekStart, weekEnd, expiresInDays, locale } = parsed.data;

  const weekStartDate = toUtcDateOnly(weekStart);
  const weekEndDate = weekEnd ? toUtcDateOnly(weekEnd) : addDaysUtc(weekStartDate, 6);
  const weekKey = makeWeekKey(weekStartDate);

  const token = generateTokenString();
  const expDays = expiresInDays ?? 14;
  const expiresAt = addDaysUtc(new Date(), expDays);

  const created = await prisma.$transaction(async (tx) => {
    // ¿Existe ya el reporte para esta faena + semana?
    const existingReport = await tx.weeklyFaenaReport.findUnique({
      where: { faenaId_weekKey: { faenaId, weekKey } },
      select: { id: true, tokenId: true, engagementId: true },
    });

    // Si había token anterior, lo eliminamos para evitar tokens colgando
    if (existingReport?.tokenId) {
      await tx.weeklyFaenaReport.update({
        where: { id: existingReport.id },
        data: { tokenId: null },
      });
      await tx.weeklyFaenaReportToken.delete({ where: { id: existingReport.tokenId } }).catch(() => null);
    }

    const tokenRow = await tx.weeklyFaenaReportToken.create({
      data: {
        token,
        engagementId,
        faenaId,
        weekStart: weekStartDate,
        weekEnd: weekEndDate,
        expiresAt,
      },
      select: { id: true, token: true },
    });

    if (existingReport) {
      await tx.weeklyFaenaReport.update({
        where: { id: existingReport.id },
        data: { tokenId: tokenRow.id },
      });
      return { token: tokenRow.token, reportId: existingReport.id };
    }

    const report = await tx.weeklyFaenaReport.create({
      data: {
        engagementId,
        faenaId,
        weekStart: weekStartDate,
        weekEnd: weekEndDate,
        weekKey,
        status: "DRAFT",
        semaforo: "GREEN",
        tokenId: tokenRow.id,
      },
      select: { id: true },
    });

    return { token: tokenRow.token, reportId: report.id };
  });

  const loc = locale ?? "es";
  const path = `/${loc}/r/weekly-faena?token=${encodeURIComponent(created.token)}`;
  const base = safeBaseUrl();
  const link = base ? `${base}${path}` : path;

  return NextResponse.json({
    ok: true,
    reportId: created.reportId,
    token: created.token,
    link,
    linkPath: path,
    expiresInDays: expDays,
  });
}
