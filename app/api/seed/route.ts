import { NextResponse } from "next/server";
import { seedDemo } from "@/lib/seed/seedDemo";

export const runtime = "nodejs";

export async function POST() {
  const engagementId = await seedDemo();
  return NextResponse.json({ ok: true, engagementId });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Usa POST /api/seed para crear un Engagement demo + QuestionSets + Questions."
  });
}
