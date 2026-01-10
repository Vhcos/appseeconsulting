"use server";

type CreateLinkInput = {
  locale: string;
  engagementId: string;
  faenaId: string;
  weekStart: string; // YYYY-MM-DD
  expiresInDays?: number;
};

function getBaseUrl() {
  // 1) Si lo defines tú, manda.
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit;

  // 2) Vercel (automático)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  // 3) Local fallback
  return "http://localhost:3000";
}

export async function createWeeklyFaenaLink(
  input: CreateLinkInput
): Promise<
  | { ok: true; link: string; raw: any }
  | { ok: false; error: string; raw?: any }
> {
  const adminToken = process.env.WEEKLY_REPORT_ADMIN_TOKEN;
  if (!adminToken) {
    return { ok: false, error: "Falta WEEKLY_REPORT_ADMIN_TOKEN en variables de entorno." };
  }

  try {
    const baseUrl = getBaseUrl();

    const res = await fetch(`${baseUrl}/api/weekly-faena-report/create-link`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({
        engagementId: input.engagementId,
        faenaId: input.faenaId,
        weekStart: input.weekStart,
        locale: input.locale,
        expiresInDays: input.expiresInDays ?? 14,
      }),
      cache: "no-store",
    });

    const raw = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: raw?.error ?? `HTTP ${res.status}`, raw };
    }

    const link = raw?.link ?? raw?.href ?? raw?.url;
    if (!link) {
      return {
        ok: false,
        error: "El endpoint no devolvió 'link'/'href'/'url'. Revisa la respuesta.",
        raw,
      };
    }

    return { ok: true, link, raw };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Error inesperado creando link." };
  }
}
