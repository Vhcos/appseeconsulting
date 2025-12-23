import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import WizardStepsNav from "@/components/see/WizardStepsNav";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function normalizeObjectives(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  // máx 5 líneas
  return lines.slice(0, 5).join("\n");
}

async function saveStrategy(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const vision = String(formData.get("vision") ?? "").trim() || null;
  const mission = String(formData.get("mission") ?? "").trim() || null;

  const objectivesRaw = String(formData.get("objectives") ?? "").trim();
  const objectives = objectivesRaw ? normalizeObjectives(objectivesRaw) : null;

  await prisma.engagement.update({
    where: { id: engagementId },
    data: {
      strategyVision: vision,
      strategyMission: mission,
      strategyObjectives: objectives,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/step-3-estrategia`);
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/strategy`);
}

export default async function Step3EstrategiaPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const [engagement, kpiCount, initiativeCount] = await Promise.all([
    prisma.engagement.findUnique({
      where: { id: engagementId },
      select: {
        strategyVision: true,
        strategyMission: true,
        strategyObjectives: true,
      },
    }),
    prisma.kpi.count({ where: { engagementId } }),
    prisma.initiative.count({ where: { engagementId } }),
  ]);

  const objectivesText = engagement?.strategyObjectives ?? "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <WizardStepsNav locale={locale} engagementId={engagementId} currentStep="step-3-estrategia" />

      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          {t(locale, "Visión, misión y objetivos", "Vision, mission and goals")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {t(
            locale,
            "Esto es la brújula. No es poesía: es claridad para decidir qué hacer (y qué no hacer).",
            "This is the compass. Not poetry: clarity to decide what to do (and what not to do)."
          )}
        </p>
      </header>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700">
            {t(locale, "Guía rápida (para no confundir conceptos)", "Quick guide")}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
            <li>
              <b>{t(locale, "Visión", "Vision")}:</b> {t(locale, "¿Cómo se ve el éxito en 3–5 años?", "What does success look like in 3–5 years?")}
            </li>
            <li>
              <b>{t(locale, "Misión", "Mission")}:</b> {t(locale, "¿Qué hacemos hoy, para quién y cómo?", "What do we do today, for whom and how?")}
            </li>
            <li>
              <b>{t(locale, "Objetivos estratégicos", "Strategic objectives")}:</b>{" "}
              {t(locale, "Máximo 5, medibles o verificables. Una idea por línea.", "Max 5, measurable or verifiable. One idea per line.")}
            </li>
          </ul>

         <div className="mt-4 flex flex-wrap gap-2">
            <Link
             href={`/${locale}/wizard/${engagementId}/tables/strategy`}
             className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
           >
             {t(locale, "Ayuda para desarrollar tu estrategia", "Help to build your strategy")}
           </Link>

           <span className="self-center text-[11px] text-slate-500">
             {t(locale, "Incluye guía + formato consultor.", "Includes guide + consultant format.")}
           </span>
         </div>

        </section>

        <form action={saveStrategy.bind(null, engagementId, locale)} className="space-y-5">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Visión", "Vision")}</p>
              <textarea
                name="vision"
                rows={5}
                defaultValue={engagement?.strategyVision ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Ser el socio preferido para X, en Y mercado, con Z estándar.", "e.g. Become the preferred partner for X, in Y market, with Z standard.")}
              />
              <p className="text-[11px] text-slate-500">{t(locale, "Tip: 1 frase. Si no cabe, estás mezclando cosas.", "Tip: 1 sentence. If it doesn't fit, you're mixing concepts.")}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t(locale, "Misión", "Mission")}</p>
              <textarea
                name="mission"
                rows={5}
                defaultValue={engagement?.strategyMission ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Diseñamos/operamos X para clientes Y, logrando Z.", "e.g. We design/operate X for customers Y, achieving Z.")}
              />
              <p className="text-[11px] text-slate-500">{t(locale, "Tip: qué haces + para quién + resultado.", "Tip: what you do + for whom + outcome.")}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t(locale, "Objetivos estratégicos (máx. 5)", "Strategic objectives (max 5)")}
              </p>
              <textarea
                name="objectives"
                rows={5}
                defaultValue={objectivesText}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "1) ...\n2) ...\n3) ...\n4) ...\n5) ...", "1) ...\n2) ...\n3) ...\n4) ...\n5) ...")}
              />
              <p className="text-[11px] text-slate-500">{t(locale, "Una línea = un objetivo. Mejor simple que perfecto.", "One line = one objective. Better simple than perfect.")}</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Conexión con KPIs e iniciativas", "Connection with KPIs and initiatives")}</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-medium text-slate-600">{t(locale, "KPIs definidos (este engagement)", "Defined KPIs (this engagement)")}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{kpiCount}</p>
                <Link href={`/${locale}/wizard/${engagementId}/step-5-bsc`} className="mt-2 inline-block text-[11px] text-indigo-600 hover:text-indigo-500">
                  {t(locale, "Ir a BSC (KPIs)", "Go to BSC (KPIs)")}
                </Link>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-medium text-slate-600">{t(locale, "Iniciativas (este engagement)", "Initiatives (this engagement)")}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{initiativeCount}</p>
                <Link href={`/${locale}/wizard/${engagementId}/tables/initiatives`} className="mt-2 inline-block text-[11px] text-indigo-600 hover:text-indigo-500">
                  {t(locale, "Ver iniciativas", "View initiatives")}
                </Link>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <button type="submit" className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500">
                {t(locale, "Guardar", "Save")}
              </button>

              <Link
                href={`/${locale}/wizard/${engagementId}/tables`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {t(locale, "Ver tablas", "View tables")}
              </Link>
            </div>

            <Link
              href={`/${locale}/wizard/${engagementId}/step-4-foda`}
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
            >
              {t(locale, "Siguiente: FODA →", "Next: SWOT →")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
