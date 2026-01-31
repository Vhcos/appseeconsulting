// lib/resend.ts
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  // No lanzamos error hard al importar para no romper build,
  // pero sí fallaremos cuando intentes enviar.
  console.warn("[resend] Falta RESEND_API_KEY en env.");
}

export const resend = new Resend(process.env.RESEND_API_KEY);
console.log("RESEND_API_KEY prefix:", (process.env.RESEND_API_KEY || "").slice(0,3), "len:", (process.env.RESEND_API_KEY || "").length);
