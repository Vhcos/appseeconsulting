// app/api/email/test-resend/route.ts
import { NextResponse } from "next/server";
import { getResendClient } from "@/lib/resendClient";

export const dynamic = "force-dynamic";

// Nota: este endpoint es SOLO de test.
// Si RESEND_API_KEY no está, debe responder 500 controlado, NO romper el build.
export async function GET() {
  try {
    const resend = getResendClient();

    const to = process.env.TEST_EMAIL_TO || "test@example.com";

    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject: "Test Resend (appseeconsulting)",
      html: `<p>Resend OK</p>`,
    });

    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : "Error desconocido.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
