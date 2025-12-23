import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function score(prob?: number | null, impact?: number | null) {
  const p = typeof prob === "number" ? prob : 0;
  const i = typeof impact === "number" ? impact : 0;
  return p * i;
}

async function saveSwot(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const swotStrengths = String(formData.get("swotStrengths") ?? "").trim() || null;
  const swotWeaknesses = String(formData.get("swotWeaknesses") ?? "").trim() || null;
  const swotOpportunities = String(formData.get("swotOpportunities") ?? "").trim() || null;
  const swotThreats = String(formData.get("swotThreats") ?? "").trim() || null;

  await prisma.engagement.update({
    where: { id: engagementId },
    data: {
      swotStrengths,
      swotWeaknesses,
      swotOpportunities,
      swotThreats,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/step-4-foda`);
}

export default async function Step4FodaPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const [engagement, risks] = await Promise.all([
    prisma.engagement.findUnique({
      where: { id: engagementId },
      select: {
        swotStrengths: true,
        swotWeaknesses: true,
        swotOpportunities: true,
        swotThreats: true,
      },
    }),
    prisma.risk.findMany({
      where: { engagementId },
      orderBy: [{ reviewDate: "desc" }, { id: "desc" }],
    }),
  ]);

  const topThreats = [...risks]
    .sort((a, b) => score(b.probability, b.impact) - score(a.probability, a.impact))
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">{t(locale, "FODA", "SWOT")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t(
            locale,
            "Ordenamos lo importante en 4 cajas. Sin burocracia: ideas concretas que ayuden a decidir.",
            "We organize what's important into 4 boxes. No bureaucracy: concrete ideas to make decisions."
          )}
        </p>
      </header>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700">{t(locale, "Apoyo rápido desde Riesgos", "Quick support from Risks")}</p>
          <p className="mt-1 text-xs text-slate-600">
            {t(
              locale,
              "Los riesgos te sirven como insumo para AMENAZAS (y a veces para OPORTUNIDADES). No se “linkean” mágicamente: se usan como lista para ordenar.",
              "Risks feed THREATS (and sometimes OPPORTUNITIES). They don't magically map: you use them as a list to organize."
            )}
          </p>

          {topThreats.length === 0 ? (
            <div className="mt-2 text-xs text-slate-500">
              {t(locale, "No hay riesgos cargados aún.", "No risks loaded yet.")}{" "}
            </div>
          ) : (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {topThreats.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-xs font-medium text-slate-900">{r.risk}</div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    {t(locale, "Dueño", "Owner")}: {r.owner ?? "-"} · {t(locale, "Nivel", "Level")}: {score(r.probability, r.impact) || "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
<div className="mt-4 flex flex-wrap items-center gap-2">
  <Link
    href={`/${locale}/wizard/${engagementId}/tables/swot`}
    className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
  >
    {t(locale, "Ayuda para desarrollar tu FODA", "Help to build your SWOT")}
  </Link>

  <span className="text-[11px] text-slate-500">
    {t(locale, "Más guiado, ideal para trabajar con el consultor.", "More guided, ideal to work with the consultant.")}
  </span>
</div>

        <form action={saveSwot.bind(null, engagementId, locale)} className="space-y-4">
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Fortalezas", "Strengths")}</p>
              <textarea
                name="swotStrengths"
                rows={4}
                defaultValue={engagement?.swotStrengths ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Lo que hacemos mejor que la mayoría (con evidencia).", "e.g. What we do better than most (with evidence).")}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Debilidades", "Weaknesses")}</p>
              <textarea
                name="swotWeaknesses"
                rows={4}
                defaultValue={engagement?.swotWeaknesses ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Donde perdemos tiempo/dinero o fallamos seguido.", "e.g. Where we lose time/money or fail repeatedly.")}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Oportunidades", "Opportunities")}</p>
              <textarea
                name="swotOpportunities"
                rows={4}
                defaultValue={engagement?.swotOpportunities ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Cambios externos que nos favorecen (si actuamos).", "e.g. External changes that help us (if we act).")}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Amenazas", "Threats")}</p>
              <textarea
                name="swotThreats"
                rows={4}
                defaultValue={engagement?.swotThreats ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Riesgos externos que pueden pegarnos fuerte.", "e.g. External risks that could hit us hard.")}
              />
            </div>
          </section>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <button type="submit" className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500">
                {t(locale, "Guardar", "Save")}
              </button>

              <Link
                href={`/${locale}/wizard/${engagementId}/tables/risks`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {t(locale, "Ver Riesgos", "View Risks")}
              </Link>
            </div>

            <Link
              href={`/${locale}/wizard/${engagementId}/step-5-bsc`}
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
            >
              {t(locale, "Siguiente: BSC →", "Next: BSC →")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
