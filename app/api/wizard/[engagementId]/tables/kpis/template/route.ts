// app/api/wizard/[engagementId]/tables/kpis/template/route.ts
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ engagementId: string }> }) {
  // OJO: en este repo Next tipa params como Promise<...>
  // No necesitamos engagementId para la plantilla, pero lo "await" para calzar tipos.
  await ctx.params;

  const csv =
    "\uFEFF" +
    [
      "name_es,name_en,perspective,frequency,direction,unit,target_value,target_text,owner_email,action_text",
      'Cumplimiento de riego,,CUSTOMER,WEEKLY,HIGHER_IS_BETTER,%,95,"≥ 95% de cumplimiento",operaciones@empresa.com,"Checklist + auditoría semanal"',
      'Costo por km,,FINANCIAL,MONTHLY,LOWER_IS_BETTER,USD,10,"≤ 10 USD/km",finanzas@empresa.com,"Renegociar proveedores + control de consumo"',
    ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kpis_template.csv"',
    },
  });
}
