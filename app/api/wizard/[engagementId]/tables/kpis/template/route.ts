import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ engagementId: string }> }) {
  // Next tipa params como Promise<...>
  await ctx.params;

  // Plantilla pensada para Excel en Chile:
  // - separador ;
  // - columnas en español
  // - "Base" (no "basis")
  // - "Meta" = numérica
  // - "Detalle de la meta" = texto/criterio
  const csv =
    "\uFEFF" +
    [
      "nombre;perspectiva;frecuencia;direccion;base;unidad;meta;Detalle de la meta;accion;dueno_email",
      'Cumplimiento de riego;Cliente;Semanal;↑;Palanca;%;95;"≥ 95% de cumplimiento";"Checklist + auditoría semanal";operaciones@empresa.com',
      'Costo directo por m²;Financiera;Mensual;↓;Resultado;$/m²;10;"≤ 10 $/m²";"Control de consumo + renegociar proveedores";finanzas@empresa.com',
    ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kpis_template.csv"',
      // clave para que Vercel/edge no te siga sirviendo el viejo
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
