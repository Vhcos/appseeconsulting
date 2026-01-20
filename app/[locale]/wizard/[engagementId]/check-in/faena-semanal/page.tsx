import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CreateLinkCard from "./CreateLinkCard";
import { createWeeklyFaenaLink } from "./actions";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function fmtDate(locale: string, d: any) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const loc = locale === "en" ? "en-US" : "es-CL";
  return new Intl.DateTimeFormat(loc, { year: "numeric", month: "short", day: "2-digit" }).format(date);
}

function pick<T = any>(obj: any, keys: string[], fallback: T): T {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k] as T;
  }
  return fallback;
}

function prettyEnum(locale: string, raw: any) {
  const s = String(raw ?? "").trim();
  if (!s) return "—";
  const key = s.toUpperCase();

  const dictEs: Record<string, string> = {
    GREEN: "Verde",
    YELLOW: "Amarillo",
    AMBER: "Amarillo",
    RED: "Rojo",
    DRAFT: "Borrador",
    SUBMITTED: "Enviado",
    UP_TO_DATE: "A tiempo",
    LATE: "Atrasado",
    MISSING_DATA: "Falta información",
  };

  const dictEn: Record<string, string> = {
    GREEN: "Green",
    YELLOW: "Yellow",
    AMBER: "Yellow",
    RED: "Red",
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    UP_TO_DATE: "Up to date",
    LATE: "Late",
    MISSING_DATA: "Missing data",
  };

  const hit = locale === "en" ? dictEn[key] : dictEs[key];
  if (hit) return hit;

  const nice = key
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
  return nice || s;
}

function semaforoBadge(semaforo: string) {
  const s = (semaforo || "").toLowerCase();
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";
  if (s.includes("rojo") || s.includes("red")) return `${base} border-red-200 bg-red-50 text-red-700`;
  if (s.includes("amar") || s.includes("yellow") || s.includes("amber")) return `${base} border-amber-200 bg-amber-50 text-amber-800`;
  if (s.includes("verd") || s.includes("green")) return `${base} border-emerald-200 bg-emerald-50 text-emerald-800`;
  return `${base} border-slate-200 bg-slate-50 text-slate-700`;
}

type CreateLinkState =
  | { ok: false; error?: string; link?: never }
  | { ok: true; link: string; error?: never };

export default async function FaenaSemanalPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: { id: true, name: true },
  });

  const faenasRaw = await (prisma as any).faena.findMany({
    where: { engagementId },
    orderBy: { name: "asc" },
  });

  const faenas = (faenasRaw ?? []).map((f: any) => ({
    id: f.id as string,
    name: (f.name ?? f.nombre ?? "Sin nombre") as string,
    adminEmail: (f.adminEmail ?? f.admin_email ?? null) as string | null,
  }));

  const reports = await (prisma as any).weeklyFaenaReport.findMany({
    where: { engagementId },
    include: { faena: true },
    orderBy: [{ weekStart: "desc" }, { createdAt: "desc" }],
  });

  // Server Action (vía form) para evitar "Invalid Server Actions request" en Turbopack
  async function createLinkAction(prev: CreateLinkState, formData: FormData): Promise<CreateLinkState> {
    "use server";

    const faenaId = String(formData.get("faenaId") ?? "").trim();
    const weekStart = String(formData.get("weekStart") ?? "").trim();

    if (!faenaId) return { ok: false, error: "Falta unidad operativa." };
    if (!weekStart) return { ok: false, error: "Falta semana (lunes)." };

    const resp = await createWeeklyFaenaLink({
      locale,
      engagementId,
      faenaId,
      weekStart,
      expiresInDays: 14,
    });

    if (!resp.ok) return { ok: false, error: resp.error || "No se pudo crear el link." };
    return { ok: true, link: resp.link };
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "Reporte semanal", "Weekly site report")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Reporte semanal (1 hoja) por unidad operativa: link sin login, guardado y auditable.",
              "Weekly (one-page) report per site: no-login link, stored and auditable."
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t(locale, "Engagement:", "Engagement:")}{" "}
            <span className="font-medium text-slate-700">{engagement?.name ?? engagementId}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/wizard/${engagementId}/check-in`}
            className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {t(locale, "← Volver a Check-in", "← Back to Check-in")}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CreateLinkCard
          locale={locale}
          engagementId={engagementId}
          faenas={faenas}
          createLinkAction={createLinkAction}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(locale, "Cómo funciona (rápido)", "How it works (quick)")}
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>{t(locale, "Creas link por unidad + semana.", "Create a link per site + week.")}</li>
            <li>{t(locale, "El Responsable lo completa desde el teléfono (10–15 min).", "Responsible fills it on mobile (10–15 min).")}</li>
            <li>{t(locale, "Se guarda con fecha/hora y queda listo para consolidar.", "Saved with timestamp and ready to consolidate.")}</li>
          </ol>
          <p className="mt-3 text-xs text-slate-500">
            {t(
              locale,
              "Nota: KPI (Key Performance Indicator) se alimenta después; aquí solo capturamos datos operacionales.",
              "Note: KPI (Key Performance Indicator) comes later; here we capture operational inputs only."
            )}
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(locale, "Reportes guardados", "Saved reports")}
          </h2>
          <span className="text-xs text-slate-500">
            {t(locale, "Total:", "Total:")} {reports?.length ?? 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-600">
                <th className="py-2 pr-4">{t(locale, "Semana", "Week")}</th>
                <th className="py-2 pr-4">{t(locale, "Unidad operativa", "Site")}</th>
                <th className="py-2 pr-4">{t(locale, "Semáforo", "Status light")}</th>
                <th className="py-2 pr-4">{t(locale, "Estado", "State")}</th>
                <th className="py-2 pr-4">{t(locale, "Enviado", "Submitted")}</th>
                <th className="py-2 pr-4">{t(locale, "Responsable", "Responsible")}</th>
                <th className="py-2 pr-4">{t(locale, "Email", "Email")}</th>
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {(reports ?? []).map((r: any) => {
                const weekStart = pick(r, ["weekStart", "week_start", "semanaInicio", "semana_inicio"], null);
                const weekEnd = pick(r, ["weekEnd", "week_end", "semanaFin", "semana_fin"], null);

                const semaforo = prettyEnum(locale, pick(r, ["semaforo", "trafficLight", "traffic_light"], "—"));
                const status = prettyEnum(locale, pick(r, ["status", "state"], "—"));

                const submittedAt = pick(r, ["submittedAt", "submitted_at"], null);
                const submittedByEmail = pick(r, ["submittedByEmail", "submitted_by_email", "adminEmail"], null);
                const submittedByName = pick(r, ["submittedByName", "submitted_by_name"], null);

                const faenaName = pick(r?.faena, ["name", "nombre"], "—");
                const reportId = r.id as string;

                return (
                  <tr key={reportId} className="border-b border-slate-100 text-slate-800">
                    <td className="py-2 pr-4">
                      <div className="font-medium">
                        {fmtDate(locale, weekStart)} – {fmtDate(locale, weekEnd)}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="font-medium">{faenaName}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={semaforoBadge(semaforo)}>{semaforo}</span>
                    </td>
                    <td className="py-2 pr-4">{status}</td>
                    <td className="py-2 pr-4">{fmtDate(locale, submittedAt)}</td>
                    <td className="py-2 pr-4">{submittedByName ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <span className="text-slate-700">{submittedByEmail ?? "—"}</span>
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <Link
                        href={`/${locale}/wizard/${engagementId}/check-in/faena-semanal/${reportId}`}
                        className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {t(locale, "Ver", "View")}
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {(reports ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-slate-500">
                    {t(locale, "Aún no hay reportes. Crea un link y prueba el envío.", "No reports yet. Create a link and submit one.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
