// app/[locale]/wizard/[engagementId]/tables/strategy/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getHelpVideo, youtubeEmbedUrl, youtubeWatchUrl } from "@/lib/see/helpVideos";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function parseObjectives(raw?: string | null) {
  const arr = (raw ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  while (arr.length < 5) arr.push("");
  return arr.slice(0, 5);
}

function toObjectivesString(objs: string[]) {
  return objs
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .slice(0, 5)
    .join("\n");
}

async function saveStrategy(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const vision = String(formData.get("vision") ?? "").trim() || null;
  const mission = String(formData.get("mission") ?? "").trim() || null;

  const objectives = [
    String(formData.get("obj1") ?? ""),
    String(formData.get("obj2") ?? ""),
    String(formData.get("obj3") ?? ""),
    String(formData.get("obj4") ?? ""),
    String(formData.get("obj5") ?? ""),
  ];

  await prisma.engagement.update({
    where: { id: engagementId },
    data: {
      strategyVision: vision,
      strategyMission: mission,
      strategyObjectives: toObjectivesString(objectives),
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/strategy`);
  revalidatePath(`/${locale}/wizard/${engagementId}/step-3-estrategia`);
}

export default async function StrategyTablePage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: {
      strategyVision: true,
      strategyMission: true,
      strategyObjectives: true,
      name: true,
    },
  });

  const objs = parseObjectives(engagement?.strategyObjectives);
  const video = getHelpVideo("strategy", locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "Visión, misión y objetivos", "Vision, mission and objectives")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Esto es para que el consultor y el cliente hablen el mismo idioma. Máximo 5 objetivos.",
              "This aligns consultant and client. Maximum 5 objectives."
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/${locale}/wizard/${engagementId}/step-3-estrategia`} className="text-sm text-indigo-600 hover:text-indigo-500">
            {t(locale, "Volver al Step 3", "Back to Step 3")}
          </Link>
          <Link href={`/${locale}/wizard/${engagementId}/tables`} className="text-sm text-slate-600 hover:text-slate-900">
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
                      "Cuando tengas el link de YouTube, agrega el youtubeId en lib/see/helpVideos.ts (key: strategy).",
                      "When you have the YouTube link, add the youtubeId in lib/see/helpVideos.ts (key: strategy)."
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <iframe className="h-full w-full" src={youtubeEmbedUrl(video.youtubeId)} allowFullScreen />
                  </div>
                  <a className="text-indigo-600 hover:text-indigo-500" href={youtubeWatchUrl(video.youtubeId)} target="_blank" rel="noreferrer">
                    {t(locale, "Abrir en YouTube", "Open on YouTube")} {video.eta ? `(${video.eta})` : ""}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-900">{t(locale, "Preguntas guía (rápidas)", "Guiding questions (quick)")}</p>
            <ul className="mt-2 space-y-2 text-xs text-slate-700">
              <li><span className="font-semibold">{t(locale, "Visión:", "Vision:")}</span> {t(locale, "¿Qué queremos ser en 3–5 años? ¿Qué diría un cliente si todo sale perfecto?", "Who do we want to be in 3–5 years? What would a client say if everything goes great?")}</li>
              <li><span className="font-semibold">{t(locale, "Misión:", "Mission:")}</span> {t(locale, "¿Qué hacemos hoy, para quién, cómo y con qué promesa concreta?", "What do we do today, for whom, how, and with what concrete promise?")}</li>
              <li><span className="font-semibold">{t(locale, "Objetivos:", "Objectives:")}</span> {t(locale, "Máx 5. Verbo + métrica + plazo. Si no se puede medir, es deseo.", "Max 5. Verb + metric + timeframe. If it can't be measured, it's a wish.")}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={saveStrategy.bind(null, engagementId, locale)} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">{t(locale, "Visión", "Vision")}</label>
              <textarea
                name="vision"
                rows={4}
                defaultValue={engagement?.strategyVision ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder={t(locale, "Ej: Ser el socio preferido en control de polvo y sostenibilidad en gran minería.", "e.g. Be the preferred partner in dust control and sustainability for large mining.")}
              />
              <p className="mt-1 text-[11px] text-slate-500">{t(locale, "Futuro deseado (3–5 años).", "Desired future (3–5 years).")}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">{t(locale, "Misión", "Mission")}</label>
              <textarea
                name="mission"
                rows={4}
                defaultValue={engagement?.strategyMission ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder={t(locale, "Ej: Diseñar e implementar soluciones con evidencia (KPI) que mejoren seguridad, continuidad operacional y costo.", "e.g. Design and implement evidence-based solutions (KPIs) that improve safety, uptime and cost.")}
              />
              <p className="mt-1 text-[11px] text-slate-500">{t(locale, "Qué hacemos hoy (para quién y cómo).", "What we do today (for whom and how).")}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700">{t(locale, "Objetivos estratégicos (máx 5)", "Strategic objectives (max 5)")}</p>
            <div className="mt-2 grid gap-2">
              {objs.map((val, i) => (
                <input
                  key={i}
                  name={`obj${i + 1}`}
                  defaultValue={val}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder={t(
                    locale,
                    `Ej: Aumentar EBITDA 15% en 12 meses (Objetivo ${i + 1})`,
                    `e.g. Increase EBITDA 15% in 12 months (Objective ${i + 1})`
                  )}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {t(locale, "Tip: si tienes más de 5, estás mezclando iniciativas con objetivos.", "Tip: if you have more than 5, you're mixing initiatives with objectives.")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500" type="submit">
              {t(locale, "Guardar", "Save")}
            </button>
            <Link href={`/${locale}/wizard/${engagementId}/step-3-estrategia`} className="text-xs text-slate-600 hover:text-slate-900">
              {t(locale, "Volver al resumen del Step 3", "Back to Step 3 summary")}
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
