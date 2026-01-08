import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ engagementId: string }> }) {
  const { engagementId } = await ctx.params;
  void engagementId; // no se usa en template, pero dejamos firma consistente

  // BOM para Excel (tildes/ñ)
  const bom = "\uFEFF";

  // Headers en español (template “amigable”)
  const header = ["semana", "objetivo", "actividades_clave", "entregables", "kpi_foco", "ritual"].join(",");

  const exampleRows = [
    [
      "1",
      "Kickoff + data room operativo",
      "Alinear alcance; pedir insumos; agendar entrevistas",
      "Checklist data room + calendario entrevistas",
      "% insumos críticos comprometidos",
      "Comité semanal (45–60 min)",
    ],
  ];

  const example = exampleRows
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const csv = `${bom}${header}\n${example}\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="roadmap-20w-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
