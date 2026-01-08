// app/api/wizard/[engagementId]/tables/kpis/export.xlsx/route.ts
import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function safeNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  // Prisma Decimal -> toString()
  try {
    const n = Number((v as any).toString?.() ?? v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ engagementId: string }> }) {
  const { engagementId } = await ctx.params;

  const kpis = await prisma.kpi.findMany({
    where: { engagementId },
    orderBy: [{ perspective: "asc" }, { nameEs: "asc" }],
    select: {
      id: true,
      nameEs: true,
      nameEn: true,
      perspective: true,
      frequency: true,
      direction: true,
      unit: true,
      targetValue: true,
      targetText: true,
      dueOffsetDays: true,
      dataSource: true,
      owner: { select: { email: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "appseeconsulting";
  wb.created = new Date();

  const ws = wb.addWorksheet("KPIs");

  ws.columns = [
    { header: "ID", key: "id", width: 26 },
    { header: "Nombre (ES)", key: "nameEs", width: 34 },
    { header: "Nombre (EN)", key: "nameEn", width: 34 },
    { header: "Perspectiva", key: "perspective", width: 18 },
    { header: "Frecuencia", key: "frequency", width: 14 },
    { header: "Dirección", key: "direction", width: 18 },
    { header: "Unidad", key: "unit", width: 14 },
    { header: "Meta (valor)", key: "targetValue", width: 14 },
    { header: "Meta (texto)", key: "targetText", width: 30 },
    { header: "Recordatorio(días)", key: "dueOffsetDays", width: 16 },
    { header: "Email Responsable", key: "ownerEmail", width: 26 },
    { header: "Fuente de datos", key: "dataSource", width: 14 },
  ];

  // Header style
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const k of kpis) {
    ws.addRow({
      id: k.id,
      nameEs: k.nameEs ?? "",
      nameEn: k.nameEn ?? "",
      perspective: k.perspective,
      frequency: k.frequency,
      direction: k.direction,
      unit: k.unit ?? "",
      targetValue: safeNumber(k.targetValue),
      targetText: k.targetText ?? "",
      dueOffsetDays: k.dueOffsetDays ?? null,
      ownerEmail: k.owner?.email ?? "",
      dataSource: k.dataSource,
    });
  }

  // Auto filter
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columns.length },
  };

  const buf = await wb.xlsx.writeBuffer();
  const filename = `kpis_${engagementId}.xlsx`;

  return new Response(Buffer.from(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
