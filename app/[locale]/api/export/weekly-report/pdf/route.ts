import { NextRequest, NextResponse } from "next/server";

// Wrapper: redirige a la ruta sin locale (si la tienes en app/api/...)
// Si NO la tienes, dime y acá mismo generamos el PDF directo.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const url = new URL(req.url);

  const target = new URL("/api/export/weekly-report/pdf", url.origin);
  target.search = url.search; // conserva locale, engagementId, reportId, etc.

  // 307 mantiene GET y permite descarga normal
  return NextResponse.redirect(target, 307);
}
