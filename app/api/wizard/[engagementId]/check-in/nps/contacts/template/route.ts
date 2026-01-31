// app/api/wizard/[engagementId]/check-in/nps/contacts/template/route.ts
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ engagementId: string }> }) {
  await ctx.params;

  // Excel-friendly para Chile:
  // - separador ;
  // - incluye campos mínimos + opcionales
  const csv =
    "\uFEFF" +
    [
      "full_name;email;company;phone;title;role_code;role_name;unit_code;unit_name",
      'Juan Pérez;jperez@cliente.com;Compañía Minera X;+56911112222;Administrador de contrato;ADM;Administrador de Contrato;SPENCE;Spence',
      'María Soto;msoto@cliente.com;Compañía Minera Y;+56933334444;Jefe(a) de área;JEFE;Jefatura;DRT;DRT',
    ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nps_contacts_template.csv"',
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
