import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const url = new URL(req.url);

  const target = new URL("/api/export/datapack/ops/pdf", url.origin);
  target.search = url.search; // conserva locale, engagementId, reportId

  return NextResponse.redirect(target, 307);
}
