// lib/resendClient.ts
import { Resend } from "resend";

let _client: Resend | null = null;

export function getResendClient(): Resend {
  if (_client) return _client;

  const key = process.env.RESEND_API_KEY;

  // Importante:
  // - NO instanciar Resend si falta la env.
  // - Esto evita que el build explote al importar módulos.
  if (!key) {
    throw new Error("[resend] Falta RESEND_API_KEY en env.");
  }

  _client = new Resend(key);
  return _client;
}
