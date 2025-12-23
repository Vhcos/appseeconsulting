import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getHelpVideo } from "@/lib/see/helpVideos";
import { BscPerspective } from "@prisma/client";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function perspectiveLabel(locale: string, p: BscPerspective) {
  const map: Record<BscPerspective, { es: string; en: string }> = {
    FINANCIAL: { es: "Financiera", en: "Financial" },
    CUSTOMER: { es: "Cliente", en: "Customer" },
    INTERNAL_PROCESS: { es: "Proceso interno", en: "Internal process" },
    LEARNING_GROWTH: { es: "Aprendizaje y crecimiento", en: "Learning & growth" },
  };
  return t(locale, map[p].es, map[p].en);
}

export default async function StepBscPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const [kpis, initiativesTotal, initiativesLinked] = await Promise.all([
    prisma.kpi.findMany({
      where: { engagementId },
      select: { id: true, perspective: true },
    }),
    prisma.initiative.count({ where: { engagementId } }),
    prisma.initiative.count({ where: { engagementId, kpiId: { not: null } } }),
  ]);

  const counts: Record<BscPerspective, number> = {
    FINANCIAL: 0,
    CUSTOMER: 0,
    INTERNAL_PROCESS: 0,
    LEARNING_GROWTH: 0,
  };
  for (const k of kpis) counts[k.perspective] += 1;

  const video = getHelpVideo(locale, "step-5-bsc");

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">{t(locale, "Paso 5 — BSC y KPIs", "Step 5 — Scorecard and KPIs")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t(
            locale,
            "Aquí definimos qué medimos. Después, iniciativas y roadmap empujan estos números.",
            "Define what we measure. Then initiatives and the roadmap move these numbers."
          )}
        </p>
      </div>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {t(locale, "Mira esto antes de seguir", "Watch this before continuing")}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {video.helper ?? ""}
              {video.eta ? (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {t(locale, "Tiempo estimado:", "Estimated time:")} {video.eta}
                </span>
              ) : null}
            </div>
          </div>

          <Link
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            href={`/${locale}/wizard/${engagementId}/tables/kpis?from=step-5-bsc`}
          >
            {t(locale, "Ir a KPIs", "Go to KPIs")}
          </Link>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-dashed border-slate-300">
          {video.youtubeId ? (
            <div className="aspect-video w-full">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-600">
              <div className="font-medium text-slate-800">{t(locale, "Video aún no cargado.", "Video not set yet.")}</div>
              <div className="mt-1">
                {t(
                  locale,
                  "Cuando tengas el video en YouTube, agrega el youtubeId en lib/see/helpVideos.ts (step-5-bsc).",
                  "When you have the video on YouTube, add the youtubeId in lib/see/helpVideos.ts (step-5-bsc)."
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
          <div className="text-sm font-semibold text-slate-900">{t(locale, "¿Cuántos KPIs tenemos?", "How many KPIs do we have?")}</div>
          <div className="mt-3 grid gap-2">
            {(Object.keys(counts) as BscPerspective[]).map((p) => (
              <div key={p} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <div className="text-sm text-slate-700">{perspectiveLabel(locale, p)}</div>
                <div className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{counts[p]}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href={`/${locale}/wizard/${engagementId}/tables/kpis?from=step-5-bsc`}
            >
              {t(locale, "Crear / editar KPIs", "Create / edit KPIs")}
            </Link>

            <Link
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href={`/${locale}/wizard/${engagementId}/tables/initiatives?from=step-5-bsc`}
            >
              {t(locale, "Ir a Iniciativas", "Go to Initiatives")}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">{t(locale, "Conexión con Iniciativas", "Connection to Initiatives")}</div>
          <p className="mt-2 text-sm text-slate-600">
            {t(
              locale,
              "Lo ideal: cada iniciativa empuja un KPI.",
              "Ideal: each initiative pushes a KPI."
            )}
          </p>

          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>{t(locale, "Iniciativas totales", "Total initiatives")}</span>
              <span className="font-semibold">{initiativesTotal}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>{t(locale, "Con KPI asociado", "Linked to a KPI")}</span>
              <span className="font-semibold">{initiativesLinked}</span>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            {t(
              locale,
              "Si hay muchas iniciativas sin KPI, el seguimiento se vuelve difuso.",
              "If many initiatives have no KPI, tracking becomes fuzzy."
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
