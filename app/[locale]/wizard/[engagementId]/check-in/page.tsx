import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CheckInNav from "@/components/see/CheckInNav";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<{ period?: string; accountId?: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function defaultMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function sanitizeSegment(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.includes("/") || s.includes("\\") || s.includes("..")) return null;
  if (s.length > 120) return null;
  return s;
}

function actionCard() {
  return [
    "group rounded-2xl border border-slate-200 bg-white p-4",
    "shadow-sm hover:shadow transition-all",
    "hover:bg-slate-50",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
    "active:scale-[0.99]",
  ].join(" ");
}

function actionTitle() {
  return "text-sm font-semibold text-slate-900";
}

function actionDesc() {
  return "mt-1 text-xs text-slate-600";
}

export default async function CheckInPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams: SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = await searchParams;

  const periodKey = sp.period && /^\d{4}-\d{2}$/.test(sp.period) ? sp.period : defaultMonthKey();
  const activeAccountId = sanitizeSegment(sp.accountId ?? null);

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: { id: true, name: true },
  });

  if (!engagement) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-slate-700">{t(locale, "No existe este engagement.", "Engagement not found.")}</p>
        <Link className="mt-4 inline-flex text-xs text-indigo-600 hover:text-indigo-500" href={`/${locale}/wizard`}>
          ← {t(locale, "Volver", "Back")}
        </Link>
      </main>
    );
  }

  const units = await prisma.accountPlanRow.findMany({
    where: { engagementId },
    select: { id: true, account: true },
    orderBy: [{ id: "desc" }],
  });

  const qs = new URLSearchParams();
  qs.set("period", periodKey);
  if (activeAccountId) qs.set("accountId", activeAccountId);
  const baseQs = qs.toString();

  const kpisHref = `/${locale}/wizard/${engagementId}/check-in/kpis?${baseQs}`;
  const initsHref = `/${locale}/wizard/${engagementId}/check-in/initiatives?${baseQs}`;
  const summaryHref = `/${locale}/wizard/${engagementId}/check-in/summary?${baseQs}`;
  const dataPackHref = `/${locale}/wizard/${engagementId}/check-in/data-pack?${baseQs}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(locale, "Check-in", "Check-in")}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">
              {engagement.name || t(locale, "Engagement", "Engagement")}
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Selecciona período y unidad. Luego actualiza KPIs e iniciativas y cierra con el resumen.",
                "Pick period and unit. Then update KPIs & initiatives and close with the summary."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/wizard/${engagementId}/dashboard`}
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              ← {t(locale, "Dashboard", "Dashboard")}
            </Link>
          </div>
        </div>

        <div className="mt-4">
          <CheckInNav locale={locale} engagementId={engagementId} />
        </div>

        <form method="get" className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="block text-[11px] font-semibold text-slate-700">{t(locale, "Período", "Period")}</label>
            <input
              type="month"
              name="period"
              defaultValue={periodKey}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-700">
              {t(locale, "Unidad (Cuenta/Faena)", "Unit (Account/Site)")}
            </label>
            <select
              name="accountId"
              defaultValue={activeAccountId ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">{t(locale, "GLOBAL (sin unidad)", "GLOBAL (no unit)")}</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.account && u.account.trim() ? u.account : u.id}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-all active:scale-[0.98]"
            >
              {t(locale, "Aplicar", "Apply")}
            </button>

            <span className="text-xs text-slate-600">
              {t(locale, "Activo:", "Active:")}{" "}
              <span className="font-semibold">{periodKey}</span>
              {" · "}
              <span className="font-semibold">{activeAccountId ? t(locale, "Unidad", "Unit") : "GLOBAL"}</span>
            </span>

            <Link
              href={kpisHref}
              className="ml-auto inline-flex items-center rounded-full bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-all active:scale-[0.98]"
            >
              {t(locale, "Continuar con KPIs →", "Continue with KPIs →")}
            </Link>
          </div>
        </form>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Link href={kpisHref} className={actionCard()}>
            <div className={actionTitle()}>{t(locale, "1) KPIs", "1) KPIs")}</div>
            <div className={actionDesc()}>{t(locale, "Carga valores y notas.", "Log values and notes.")}</div>
            <div className="mt-3 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-500">
              {t(locale, "Abrir →", "Open →")}
            </div>
          </Link>

          <Link href={initsHref} className={actionCard()}>
            <div className={actionTitle()}>{t(locale, "2) Iniciativas", "2) Initiatives")}</div>
            <div className={actionDesc()}>
              {t(locale, "Actualiza progreso, bloqueos y evidencias.", "Update progress, blockers and evidence.")}
            </div>
            <div className="mt-3 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-500">
              {t(locale, "Abrir →", "Open →")}
            </div>
          </Link>

          <Link href={summaryHref} className={actionCard()}>
            <div className={actionTitle()}>{t(locale, "3) Resumen", "3) Summary")}</div>
            <div className={actionDesc()}>
              {t(locale, "Diff vs período anterior + resumen ejecutivo.", "Diff vs previous period + exec summary.")}
            </div>
            <div className="mt-3 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-500">
              {t(locale, "Abrir →", "Open →")}
            </div>
          </Link>

          <Link href={dataPackHref} className={actionCard()}>
            <div className={actionTitle()}>{t(locale, "Data Pack", "Data Pack")}</div>
            <div className={actionDesc()}>
              {t(locale, "Salida 1-página (Operación / Dirección).", "One-page output (Ops / Exec).")}
            </div>
            <div className="mt-3 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-500">
              {t(locale, "Abrir →", "Open →")}
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
