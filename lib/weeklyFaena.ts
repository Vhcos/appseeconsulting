import { randomBytes } from "crypto";
import { DateTime } from "luxon";

export function generateTokenString(): string {
  // 24 bytes => token suficientemente largo, URL-safe
  return randomBytes(24).toString("base64url");
}

export function toUtcDateOnly(dateIso: string): Date {
  // Acepta "YYYY-MM-DD" o ISO completo; lo convierte a 00:00 UTC
  const dt = DateTime.fromISO(dateIso, { zone: "utc" }).startOf("day");
  if (!dt.isValid) throw new Error("Fecha inválida");
  return dt.toJSDate();
}

export function addDaysUtc(date: Date, days: number): Date {
  return DateTime.fromJSDate(date, { zone: "utc" }).plus({ days }).toJSDate();
}

export function makeWeekKey(weekStart: Date): string {
  // Usamos clave estable basada en el inicio de semana: YYYY-MM-DD
  return DateTime.fromJSDate(weekStart, { zone: "utc" }).toFormat("yyyy-LL-dd");
}

export function toDateInputValue(d: Date): string {
  return DateTime.fromJSDate(d, { zone: "utc" }).toFormat("yyyy-LL-dd");
}

export function safeBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  const v = raw.trim().replace(/\/+$/, "");
  return v ? v : null;
}
