import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ engagementId: string }> }) {
  const { engagementId } = await ctx.params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: { id: true, name: true, contextCompanyName: true },
  });

  if (!engagement) {
    return new Response("Engagement no encontrado", { status: 404 });
  }

  const clientName =
    (engagement.contextCompanyName && engagement.contextCompanyName.trim()) ||
    (engagement.name && engagement.name.trim()) ||
    "Cliente";

  const weeksDb = await prisma.roadmapWeek.findMany({
    where: { engagementId },
  });

  const weeks = [...weeksDb].sort((a, b) => {
    const na = Number(String(a.week ?? "").trim());
    const nb = Number(String(b.week ?? "").trim());
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a.week ?? "").localeCompare(String(b.week ?? ""));
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "SEEConsulting";
  wb.created = new Date();

  const ws = wb.addWorksheet("Roadmap 20 semanas");

  ws.columns = [
    { header: "Semana", key: "week", width: 10 },
    { header: "Objetivo", key: "objective", width: 40 },
    { header: "Actividades clave", key: "keyActivities", width: 52 },
    { header: "Entregables", key: "deliverables", width: 42 },
    { header: "KPI foco", key: "kpiFocus", width: 28 },
    { header: "Ritual", key: "ritual", width: 26 },
  ];

  // Header style
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const w of weeks) {
    ws.addRow({
      week: w.week ?? "",
      objective: w.objective ?? "",
      keyActivities: w.keyActivities ?? "",
      deliverables: w.deliverables ?? "",
      kpiFocus: w.kpiFocus ?? "",
      ritual: w.ritual ?? "",
    });
  }

  // Wrap text for long cells
  for (let r = 2; r <= ws.rowCount; r++) {
    ws.getRow(r).alignment = { vertical: "top", wrapText: true };
  }

  const safeClient = String(clientName).replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 40);
  const filename = `roadmap_20w_${safeClient}.xlsx`;

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
