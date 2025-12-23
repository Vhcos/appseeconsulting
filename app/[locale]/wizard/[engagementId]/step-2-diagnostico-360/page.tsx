import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { QuestionSetKind, QuestionType } from "@prisma/client";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function pickNumberFromValueJson(v: unknown): number | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;
  const n = obj["value"];
  if (typeof n === "number") return n;
  if (typeof n === "string" && n.trim() !== "" && !Number.isNaN(Number(n))) return Number(n);
  return null;
}

function pickStringFromValueJson(v: unknown, key: string): string | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;
  const s = obj[key];
  return typeof s === "string" && s.trim() !== "" ? s.trim() : null;
}

function isInternalSurveyKey(key: string) {
  return key.startsWith("B1.") || key.startsWith("B2.");
}

type Step2Notes = {
  quantitativeSummary?: string;
  openThemes?: string;
  interviewsMgmtBoard?: string;
  interviewsOpsHsecClient?: string;
  keyGaps?: string;
};

export default async function Step2Diagnostico360Page({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const stepKey = "step-2-diagnostico-360";

  const questionSet = await prisma.questionSet.findFirst({
    where: { engagementId, kind: QuestionSetKind.SURVEY },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  const allQuestions = questionSet?.questions ?? [];
  const questions = allQuestions.filter((q) => isInternalSurveyKey(q.key));
  const ignored = allQuestions.filter((q) => !isInternalSurveyKey(q.key)).map((q) => q.key);

  const questionIds = questions.map((q) => q.id);
  const scaleQuestions = questions.filter((q) => q.type === QuestionType.SCALE_1_5);

  const [allAnswers, riskCount, progress] = await Promise.all([
    questionIds.length
      ? prisma.answer.findMany({
          where: { engagementId, questionId: { in: questionIds } },
          select: { questionId: true, valueJson: true },
        })
      : Promise.resolve([]),
    prisma.risk.count({ where: { engagementId } }),
    prisma.wizardProgress.findUnique({
      where: { engagementId_stepKey: { engagementId, stepKey } },
      select: { notes: true },
    }),
  ]);

  const questionCount = questions.length;
  const answerItemCount = allAnswers.length;

  const respondentSet = new Set<string>();
  for (const a of allAnswers) {
    const code = pickStringFromValueJson(a.valueJson, "respondentCode");
    if (code) respondentSet.add(code);
  }
  const respondentCount = respondentSet.size;

  const perQuestion = new Map<string, { sum: number; n: number }>();
  for (const a of allAnswers) {
    const n = pickNumberFromValueJson(a.valueJson);
    if (n == null) continue;
    const agg = perQuestion.get(a.questionId) ?? { sum: 0, n: 0 };
    agg.sum += n;
    agg.n += 1;
    perQuestion.set(a.questionId, agg);
  }

  const notes = safeJsonParse<Step2Notes>(progress?.notes, {
    quantitativeSummary: "",
    openThemes: "",
    interviewsMgmtBoard: "",
    interviewsOpsHsecClient: "",
    keyGaps: "",
  });

  async function saveNotes(formData: FormData) {
    "use server";

    const locale = String(formData.get("locale") ?? "es");
    const engagementId = String(formData.get("engagementId") ?? "");
    if (!engagementId) return;

    const payload: Step2Notes = {
      quantitativeSummary: String(formData.get("quantitativeSummary") ?? ""),
      openThemes: String(formData.get("openThemes") ?? ""),
      interviewsMgmtBoard: String(formData.get("interviewsMgmtBoard") ?? ""),
      interviewsOpsHsecClient: String(formData.get("interviewsOpsHsecClient") ?? ""),
      keyGaps: String(formData.get("keyGaps") ?? ""),
    };

    await prisma.wizardProgress.upsert({
      where: { engagementId_stepKey: { engagementId, stepKey } },
      update: { notes: JSON.stringify(payload) },
      create: { engagementId, stepKey, notes: JSON.stringify(payload) },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/step-2-diagnostico-360`);
  }

  const label = (es: string | null, en: string | null) =>
    locale === "en" ? (en ?? es ?? "") : (es ?? en ?? "");

  const miniTabs = [
    {
      href: `/${locale}/wizard/${engagementId}/step-2-diagnostico-360`,
      label: t(locale, "2 Diagnóstico 360", "2 360° diagnosis"),
      active: true,
    },
    {
      href: `/${locale}/wizard/${engagementId}/step-2-encuesta`,
      label: t(locale, "2 Encuesta", "2 Survey"),
      active: false,
    },
    {
      href: `/${locale}/wizard/${engagementId}/step-2b-entrevistas`,
      label: t(locale, "2B Entrevistas", "2B Interviews"),
      active: false,
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <div className="mt-4 flex flex-wrap gap-2">
        {miniTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
              tab.active
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mb-6 mt-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
            {t(locale, "Etapa 2 · Diagnóstico 360°", "Step 2 · 360° diagnosis")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Diagnóstico 360°", "360° diagnosis")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Consolidamos encuestas internas + entrevistas para identificar brechas y priorizar acciones.",
              "We consolidate internal surveys + interviews to identify gaps and prioritize actions.",
            )}
          </p>
        </div>

        <Link href={`/${locale}/wizard/${engagementId}/step-1-data-room`} className="text-xs text-indigo-600 hover:text-indigo-500">
          ← {t(locale, "Volver al Data Room", "Back to Data Room")}
        </Link>
      </div>

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <section className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Preguntas (B1/B2)", "Questions (B1/B2)")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{questionCount}</p>
              <Link
                href={`/${locale}/wizard/${engagementId}/step-2-encuesta`}
                className="mt-2 inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-[11px] font-semibold text-white hover:bg-indigo-700"
              >
                {t(locale, "Responder encuesta", "Answer survey")}
              </Link>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Personas (códigos)", "Respondents (codes)")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{respondentCount}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Respuestas (ítems)", "Answers (items)")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{answerItemCount}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-medium text-slate-600">{t(locale, "Riesgos detectados", "Detected risks")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{riskCount}</p>
            </div>
          </div>

          {ignored.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {t(
                locale,
                `Nota: se están ignorando preguntas no-Anexo B dentro del set SURVEY: ${ignored.join(", ")}.`,
                `Note: ignoring non-Annex B questions found in SURVEY set: ${ignored.join(", ")}.`,
              )}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Encuesta interna (promedios)", "Internal survey (averages)")}</h2>
              <p className="mt-1 text-xs text-slate-600">
                {t(
                  locale,
                  "Promedios desde respuestas (solo escala 1–5).",
                  "Averages from answers (scale 1–5 only).",
                )}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
              {t(locale, "Basado en Anexo B", "Based on Annex B")}
            </span>
          </div>

          {scaleQuestions.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-medium text-slate-600">{t(locale, "Código", "Code")}</th>
                    <th className="px-3 py-2 font-medium text-slate-600">{t(locale, "Pregunta", "Question")}</th>
                    <th className="px-3 py-2 font-medium text-slate-600">{t(locale, "Promedio", "Average")}</th>
                    <th className="px-3 py-2 font-medium text-slate-600">N</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scaleQuestions.map((q) => {
                    const agg = perQuestion.get(q.id);
                    const avg = agg && agg.n > 0 ? agg.sum / agg.n : null;
                    return (
                      <tr key={q.id}>
                        <td className="px-3 py-2 align-top font-mono text-[11px] text-slate-500">{q.key}</td>
                        <td className="px-3 py-2 align-top text-slate-800">{label(q.promptEs, q.promptEn)}</td>
                        <td className="px-3 py-2 align-top text-slate-800">{avg == null ? "—" : avg.toFixed(2)}</td>
                        <td className="px-3 py-2 align-top text-slate-800">{agg?.n ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
              {t(locale, "No hay preguntas de escala configuradas.", "No scale questions configured.")}
            </div>
          )}

          <form action={saveNotes} className="space-y-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="engagementId" value={engagementId} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  {t(locale, "Resumen cuantitativo (nota)", "Quantitative summary (note)")}
                </label>
                <textarea
                  name="quantitativeSummary"
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder={t(locale, "Insight principal con números simples.", "Main insight with simple numbers.")}
                  defaultValue={notes.quantitativeSummary ?? ""}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  {t(locale, "Ideas fuerza (abiertas)", "Key themes (open answers)")}
                </label>
                <textarea
                  name="openThemes"
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder={t(locale, "Temas repetidos, tensiones, frases típicas.", "Repeated themes, tensions, typical phrases.")}
                  defaultValue={notes.openThemes ?? ""}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  {t(locale, "Entrevistas: gerencia / directorio", "Interviews: management / board")}
                </label>
                <textarea
                  name="interviewsMgmtBoard"
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder={t(locale, "Aprendizajes clave y preocupaciones.", "Key learnings and concerns.")}
                  defaultValue={notes.interviewsMgmtBoard ?? ""}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  {t(locale, "Entrevistas: ops / HSEC / cliente", "Interviews: ops / HSEC / client")}
                </label>
                <textarea
                  name="interviewsOpsHsecClient"
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder={t(locale, "Dolores operacionales, seguridad, feedback cliente.", "Operational pains, safety, client feedback.")}
                  defaultValue={notes.interviewsOpsHsecClient ?? ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                {t(locale, "Brechas clave del diagnóstico", "Key gaps")}
              </label>
              <textarea
                name="keyGaps"
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Lista 5–7 brechas en bullets.", "List 5–7 gaps in bullets.")}
                defaultValue={notes.keyGaps ?? ""}
              />
            </div>

            <div className="flex justify-end">
              <button type="submit" className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
                {t(locale, "Guardar notas del diagnóstico", "Save diagnosis notes")}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
