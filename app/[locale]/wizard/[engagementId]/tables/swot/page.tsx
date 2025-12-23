// app/[locale]/wizard/[engagementId]/tables/swot/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getHelpVideo, youtubeEmbedUrl, youtubeWatchUrl } from "@/lib/see/helpVideos";

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

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/swot`);
  revalidatePath(`/${locale}/wizard/${engagementId}/step-4-foda`);
}

export default async function SwotTablePage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const [engagement, risks] = await Promise.all([
    prisma.engagement.findUnique({
      where: { id: engagementId },
      select: {
        name: true,
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

  const video = getHelpVideo("swot", locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "FODA (modo guiado)", "SWOT (guided mode)")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Este modo es para trabajar con más guía. Ideal si lo estás desarrollando con el consultor.",
              "This mode is more guided. Ideal if you’re building it with the consultant."
            )}
          </p>
          {engagement?.name ? (
            <p className="mt-1 text-[11px] text-slate-500">
              {t(locale, "Engagement:", "Engagement:")} {engagement.name}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/wizard/${engagementId}/step-4-foda`}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            {t(locale, "Volver al Step 4", "Back to Step 4")}
          </Link>
          <Link
            href={`/${locale}/wizard/${engagementId}/tables`}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            {t(locale, "Ver todas las tablas", "All tables")}
          </Link>
        </div>
      </div>

{/* Video + guía */}
<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
  <div className="grid gap-4 md:grid-cols-2">
    <div>
      <p className="text-sm font-semibold text-slate-900">{video.title}</p>
      <p className="mt-1 text-xs text-slate-600">{video.helper}</p>

      <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        {!video.youtubeId ? (
          <div>
            <p className="font-medium text-slate-700">{t(locale, "Video aún no cargado", "Video not added yet")}</p>
            <p className="mt-1">
              {t(
                locale,
                "Cuando tengas el link de YouTube, agrega el youtubeId en lib/see/helpVideos.ts (key: swot).",
                "When you have the YouTube link, add the youtubeId in lib/see/helpVideos.ts (key: swot)."
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
              <iframe className="h-full w-full" src={youtubeEmbedUrl(video.youtubeId)} allowFullScreen />
            </div>
            <a
              className="text-indigo-600 hover:text-indigo-500"
              href={youtubeWatchUrl(video.youtubeId)}
              target="_blank"
              rel="noreferrer"
            >
              {t(locale, "Abrir en YouTube", "Open on YouTube")} {video.eta ? `(${video.eta})` : ""}
            </a>
          </div>
        )}
      </div>
    </div>

    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-900">
        {t(locale, "Preguntas guía (rápidas)", "Guiding questions (quick)")}
      </p>
      <ul className="mt-2 space-y-2 text-xs text-slate-700">
        <li>
          <span className="font-semibold">{t(locale, "Fortalezas:", "Strengths:")}</span>{" "}
          {t(locale, "¿Qué hacemos bien con evidencia? (personas, proceso, activos)", "What do we do well with evidence? (people, process, assets)")}
        </li>
        <li>
          <span className="font-semibold">{t(locale, "Debilidades:", "Weaknesses:")}</span>{" "}
          {t(locale, "¿Dónde fallamos seguido o perdemos tiempo/dinero?", "Where do we repeatedly fail or waste time/money?")}
        </li>
        <li>
          <span className="font-semibold">{t(locale, "Oportunidades:", "Opportunities:")}</span>{" "}
          {t(locale, "¿Qué cambio externo nos conviene si actuamos ya?", "What external change benefits us if we act now?")}
        </li>
        <li>
          <span className="font-semibold">{t(locale, "Amenazas:", "Threats:")}</span>{" "}
          {t(locale, "¿Qué riesgo externo nos puede pegar fuerte en 12 meses?", "What external risk could hit us hard in 12 months?")}
        </li>
      </ul>
    </div>
  </div>
</section>




      {/* Caja guía + insumo desde riesgos */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">
          {t(locale, "Cómo usar esto sin enredarse", "How to use this without getting stuck")}
        </p>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>
            <b>{t(locale, "Fortalezas", "Strengths")}:</b>{" "}
            {t(locale, "capacidades internas con evidencia (personas, procesos, activos).", "internal capabilities with evidence (people, process, assets).")}
          </li>
          <li>
            <b>{t(locale, "Debilidades", "Weaknesses")}:</b>{" "}
            {t(locale, "cosas internas que nos frenan o nos hacen perder tiempo/dinero.", "internal things that slow us down or waste time/money.")}
          </li>
          <li>
            <b>{t(locale, "Oportunidades", "Opportunities")}:</b>{" "}
            {t(locale, "cambios externos que podemos aprovechar si actuamos.", "external changes we can benefit from if we act.")}
          </li>
          <li>
            <b>{t(locale, "Amenazas", "Threats")}:</b>{" "}
            {t(locale, "riesgos externos que pueden pegarnos fuerte.", "external risks that can hit hard.")}
          </li>
        </ul>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700">{t(locale, "Insumo desde Riesgos (sugerencias)", "Input from Risks (suggestions)")}</p>
          <p className="mt-1 text-xs text-slate-600">
            {t(
              locale,
              "Úsalos como lista para inspirar AMENAZAS (y a veces OPORTUNIDADES). No hay link automático: tú decides.",
              "Use them as a list to inspire THREATS (and sometimes OPPORTUNITIES). No automatic mapping: you decide."
            )}
          </p>

          {topThreats.length === 0 ? (
            <div className="mt-2 text-xs text-slate-500">
              {t(locale, "No hay riesgos cargados aún.", "No risks loaded yet.")}{" "}
              <Link href={`/${locale}/wizard/${engagementId}/tables/risks`} className="text-indigo-600 hover:text-indigo-500">
                {t(locale, "Abrir tabla de riesgos", "Open risks table")}
              </Link>
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
        </div>
      </section>

      {/* Form */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={saveSwot.bind(null, engagementId, locale)} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Fortalezas", "Strengths")}</p>
              <textarea
                name="swotStrengths"
                rows={5}
                defaultValue={engagement?.swotStrengths ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder={t(locale, "Ej: Tenemos X capacidad demostrable (evidencia).", "e.g. We have X proven capability (evidence).")}
              />
              <p className="text-[11px] text-slate-500">{t(locale, "Tip: 3–5 bullets, con evidencia cuando se pueda.", "Tip: 3–5 bullets, evidence when possible.")}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Debilidades", "Weaknesses")}</p>
              <textarea
                name="swotWeaknesses"
                rows={5}
                defaultValue={engagement?.swotWeaknesses ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder={t(locale, "Ej: Dependemos demasiado de X o fallamos en Y.", "e.g. We depend too much on X or fail at Y.")}
              />
              <p className="text-[11px] text-slate-500">{t(locale, "Tip: si duele escribirlo, probablemente es real.", "Tip: if it’s uncomfortable, it’s probably real.")}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Oportunidades", "Opportunities")}</p>
              <textarea
                name="swotOpportunities"
                rows={5}
                defaultValue={engagement?.swotOpportunities ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder={t(locale, "Ej: Nueva regulación / tendencia / cliente que abre puerta.", "e.g. New regulation / trend / customer that opens a door.")}
              />
              <p className="text-[11px] text-slate-500">{t(locale, "Tip: oportunidad sin acción no sirve.", "Tip: opportunity without action is useless.")}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Amenazas", "Threats")}</p>
              <textarea
                name="swotThreats"
                rows={5}
                defaultValue={engagement?.swotThreats ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                placeholder={t(locale, "Ej: Competidor + cambio de precio + riesgo operativo.", "e.g. Competitor + price change + operational risk.")}
              />
              <p className="text-[11px] text-slate-500">{t(locale, "Tip: si es amenaza, pon cómo la vas a mitigar (aunque sea 1 línea).", "Tip: if it’s a threat, add mitigation (even 1 line).")}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button type="submit" className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
                {t(locale, "Guardar", "Save")}
              </button>

              <Link
                href={`/${locale}/wizard/${engagementId}/tables/risks`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t(locale, "Ver riesgos", "View risks")}
              </Link>
            </div>

            <Link
              href={`/${locale}/wizard/${engagementId}/step-5-bsc`}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              {t(locale, "Siguiente: BSC →", "Next: BSC →")}
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
