// lib/nps/sendNpsInviteEmail.ts
import { resend } from "@/lib/resend";

type SendNpsInviteEmailArgs = {
  to: string;
  fullName: string;
  inviteUrl: string;
  semesterKey: string; // ej: 2026S1
};

function safe(s: string) {
  return (s || "").trim();
}

export async function sendNpsInviteEmail(args: SendNpsInviteEmailArgs) {
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO;

  if (!process.env.RESEND_API_KEY) throw new Error("Falta RESEND_API_KEY.");
  if (!from) throw new Error("Falta RESEND_FROM_EMAIL.");

  const to = safe(args.to).toLowerCase();
  const name = safe(args.fullName) || "Hola";
  const url = safe(args.inviteUrl);

  if (!to) throw new Error("Email destino vacío.");
  if (!url) throw new Error("inviteUrl vacío.");

  const subject = `Casia | Encuesta breve (3 clics) – NPS (${args.semesterKey})`;

  const html = `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.5; color:#0f172a;">
    <p style="margin:0 0 12px 0;">Hola ${escapeHtml(name)},</p>
    <p style="margin:0 0 12px 0;">
      En Casia buscamos escalar con orden. ¿Nos ayudas con 3 clics?
      <br/>
      Responder toma menos de 30 segundos.
    </p>
    <p style="margin:16px 0;">
      <a href="${escapeAttr(url)}" style="display:inline-block; background:#4f46e5; color:white; padding:10px 14px; border-radius:999px; text-decoration:none; font-weight:600;">
        Responder encuesta
      </a>
    </p>
    <p style="margin:0 0 6px 0; font-size:12px; color:#475569;">
      Si el botón no funciona, copia y pega este link:
      <br/>
      <span style="word-break:break-all;">${escapeHtml(url)}</span>
    </p>
    <p style="margin:18px 0 0 0;">Gracias,<br/>Casia</p>
  </div>
  `;

  const text = `Hola ${name}\n\nEn Casia buscamos escalar con orden. ¿Nos ayudas con 3 clics?\n\nResponde aquí: ${url}\n\nGracias,\nCasia`;

  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo: replyTo || undefined,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return data;
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(input: string) {
  // Simple para href
  return escapeHtml(input);
}
