/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import WizardStepsNav from "@/components/see/WizardStepsNav";
import { Prisma, QuestionSetKind, QuestionType } from "@prisma/client";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

const DEFAULT_AREAS_ES = [
  "Directorio",
  "Gerencia",
  "Operaciones",
  "Comercial",
  "Informática",
  "Administración",
  "Logística",
];

const INTERNAL_SURVEY_QUESTIONS: Array<{
  key: string;
  order: number;
  type: QuestionType;
  promptEs: string;
  promptEn: string;
  helpEs?: string;
  helpEn?: string;
}> = [
  { key: "B1.1", order: 1, type: QuestionType.SCALE_1_5, promptEs: "Puedo explicar qué hace la empresa en una frase clara.", promptEn: "I can explain what the company does in one clear sentence." },
  { key: "B1.2", order: 2, type: QuestionType.SCALE_1_5, promptEs: "La propuesta de valor es consistente en toda la empresa.", promptEn: "The value proposition is consistent across the whole company." },
  { key: "B1.3", order: 3, type: QuestionType.SCALE_1_5, promptEs: "Tenemos prioridades claras para los próximos 90 días.", promptEn: "We have clear priorities for the next 90 days." },
  { key: "B1.4", order: 4, type: QuestionType.SCALE_1_5, promptEs: "Entiendo qué valora más el cliente (agua, continuidad, cumplimiento, costo, seguridad, data).", promptEn: "I understand what the client values most (water, continuity, compliance, cost, safety, data)." },
  { key: "B1.5", order: 5, type: QuestionType.SCALE_1_5, promptEs: "Sé por qué ganamos negocios y por qué los perdemos.", promptEn: "I know why we win deals and why we lose them." },
  { key: "B1.6", order: 6, type: QuestionType.SCALE_1_5, promptEs: "El servicio se entrega con estándares (no depende de 'héroes').", promptEn: "Our service is delivered with standards (it does not depend on 'heroes')." },
  { key: "B1.7", order: 7, type: QuestionType.SCALE_1_5, promptEs: "La seguridad (HSEC) está integrada a la operación (no es trámite).", promptEn: "Safety (HSEC) is integrated into operations (not just bureaucracy)." },
  { key: "B1.8", order: 8, type: QuestionType.SCALE_1_5, promptEs: "Lo que medimos hoy es útil y entendible para el cliente.", promptEn: "What we measure today is useful and understandable for the client." },
  { key: "B1.9", order: 9, type: QuestionType.SCALE_1_5, promptEs: "Operación del cliente y Alta Dirección reciben lo que necesitan (no 'lo mismo para todos').", promptEn: "Client operations and senior management receive what they need (not 'the same for everyone')." },
  { key: "B1.10", order: 10, type: QuestionType.SCALE_1_5, promptEs: "Creo que nuestros reportes influyen en decisiones del cliente (renovación, auditorías, presupuesto).", promptEn: "I believe our reports influence client decisions (renewals, audits, budgeting)." },
  { key: "B1.11", order: 11, type: QuestionType.SCALE_1_5, promptEs: "Siento que el equipo está alineado con la visión del negocio.", promptEn: "I feel the team is aligned with the business vision." },
  { key: "B2.1", order: 12, type: QuestionType.TEXT, promptEs: "¿Qué 3 cosas deberíamos lograr en 90 días para avanzar al siguiente nivel?", promptEn: "What 3 things should we achieve in 90 days to move to the next level?", helpEs: "Responder en viñetas o frases cortas.", helpEn: "Answer in bullets or short phrases." },
  { key: "B2.2", order: 13, type: QuestionType.TEXT, promptEs: "¿Qué 1 cosa es la más peligrosa si seguimos igual por 6 meses?", promptEn: "What 1 thing is most dangerous if we stay the same for 6 months?" },
  { key: "B2.3", order: 14, type: QuestionType.TEXT, promptEs: "¿Qué deberíamos dejar de hacer (stop doing) para escalar?", promptEn: "What should we stop doing in order to scale?" },
];

const INTERNAL_KEYS = new Set(INTERNAL_SURVEY_QUESTIONS.map((q) => q.key));
function isInternalSurveyKey(key: string) {
  return INTERNAL_KEYS.has(key) || key.startsWith("B1.") || key.startsWith("B2.");
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function pickStringFromValueJson(v: unknown, key: string): string | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as any;
  const s = obj?.[key];
  return typeof s === "string" && s.trim() !== "" ? s.trim() : null;
}

async function ensureInternalSurvey(engagementId: string) {
  let qs = await prisma.questionSet.findFirst({
    where: {
      engagementId,
      kind: QuestionSetKind.SURVEY,
      OR: [{ titleEs: "Encuesta interna" }, { titleEn: "Internal survey" }],
    },
  });

  if (!qs) {
    qs = await prisma.questionSet.create({
      data: {
        engagementId,
        kind: QuestionSetKind.SURVEY,
        order: 1,
        titleEs: "Encuesta interna",
        titleEn: "Internal survey",
        descriptionEs:
          "Encuesta interna anónima (escala 1–5 y preguntas abiertas) usada para el diagnóstico 360°.",
        descriptionEn:
          "Internal anonymous survey (1–5 scale and open questions) used for the 360° diagnosis.",
      },
    });
  }

  for (const q of INTERNAL_SURVEY_QUESTIONS) {
    await prisma.question.upsert({
      where: { questionSetId_key: { questionSetId: qs.id, key: q.key } },
      update: {
        order: q.order,
        type: q.type,
        promptEs: q.promptEs,
        promptEn: q.promptEn,
        helpEs: q.helpEs ?? null,
        helpEn: q.helpEn ?? null,
        required: true,
      },
      create: {
        questionSetId: qs.id,
        key: q.key,
        order: q.order,
        type: q.type,
        promptEs: q.promptEs,
        promptEn: q.promptEn,
        helpEs: q.helpEs ?? null,
        helpEn: q.helpEn ?? null,
        required: true,
        optionsJson: Prisma.DbNull,
      },
    });
  }

  return prisma.questionSet.findUnique({
    where: { id: qs.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
}

async function getSurveyAreas(engagementId: string): Promise<string[]> {
  const wp = await prisma.wizardProgress.findUnique({
    where: { engagementId_stepKey: { engagementId, stepKey: "survey-areas" } },
    select: { notes: true },
  });

  const parsed = safeJsonParse<{ areas?: string[] }>(wp?.notes, {});
  const areas = Array.isArray(parsed.areas) ? parsed.areas : [];
  const cleaned = areas.map((a) => String(a).trim()).filter(Boolean);
  return cleaned.length ? cleaned : DEFAULT_AREAS_ES;
}

async function setSurveyAreas(engagementId: string, areas: string[]) {
  const cleaned = Array.from(new Set(areas.map((a) => String(a).trim()).filter(Boolean)));
  const payload = { areas: cleaned };
  const stepKey = "survey-areas";

  await prisma.wizardProgress.upsert({
    where: { engagementId_stepKey: { engagementId, stepKey } },
    update: { notes: JSON.stringify(payload) },
    create: { engagementId, stepKey, notes: JSON.stringify(payload) },
  });
}

export default async function Step2EncuestaPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { locale, engagementId } = await params;

  const err = typeof searchParams?.err === "string" ? searchParams.err : "";
  const questionSet = await ensureInternalSurvey(engagementId);
  const allQuestions = questionSet?.questions ?? [];
  const questions = allQuestions.filter((q) => isInternalSurveyKey(q.key));

  const [answerItemCount, riskCount, areas, allAnswersForRespondents] = await Promise.all([
    prisma.answer.count({ where: { engagementId } }),
    prisma.risk.count({ where: { engagementId } }),
    getSurveyAreas(engagementId),
    prisma.answer.findMany({
      where: { engagementId },
      select: { valueJson: true },
    }),
  ]);

  const respondentSet = new Set<string>();
  for (const a of allAnswersForRespondents) {
    const code = pickStringFromValueJson(a.valueJson, "respondentCode");
    if (code) respondentSet.add(code);
  }
  const respondentCount = respondentSet.size;

  async function addSurveyArea(formData: FormData) {
    "use server";
    const locale = String(formData.get("locale") ?? "es");
    const engagementId = String(formData.get("engagementId") ?? "");
    const newArea = String(formData.get("newArea") ?? "").trim();
    if (!engagementId || !newArea) return;

    const current = await getSurveyAreas(engagementId);
    await setSurveyAreas(engagementId, [...current, newArea]);

    revalidatePath(`/${locale}/wizard/${engagementId}/step-2-encuesta`);
  }

  async function removeSurveyArea(formData: FormData) {
    "use server";
    const locale = String(formData.get("locale") ?? "es");
    const engagementId = String(formData.get("engagementId") ?? "");
    const area = String(formData.get("area") ?? "").trim();
    if (!engagementId || !area) return;

    const current = await getSurveyAreas(engagementId);
    await setSurveyAreas(engagementId, current.filter((a) => a !== area));

    revalidatePath(`/${locale}/wizard/${engagementId}/step-2-encuesta`);
  }

  async function saveInternalSurvey(formData: FormData) {
    "use server";

    const locale = String(formData.get("locale") ?? "es");
    const engagementId = String(formData.get("engagementId") ?? "");
    const respondentCode = String(formData.get("respondentCode") ?? "").trim();
    const respondentArea = String(formData.get("respondentArea") ?? "").trim();
    if (!engagementId) return;

    if (!respondentCode) {
      redirect(`/${locale}/wizard/${engagementId}/step-2-encuesta?err=code`);
    }

    const qs = await prisma.questionSet.findFirst({
      where: {
        engagementId,
        kind: QuestionSetKind.SURVEY,
        OR: [{ titleEs: "Encuesta interna" }, { titleEn: "Internal survey" }],
      },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    const allQs = qs?.questions ?? [];
    const questions = allQs.filter((q) => isInternalSurveyKey(q.key));
    if (!qs || !questions.length) {
      revalidatePath(`/${locale}/wizard/${engagementId}/step-2-encuesta`);
      return;
    }

    const rows: Prisma.AnswerCreateManyInput[] = [];

    for (const q of questions) {
      const raw = formData.get(`q-${q.id}`);
      if (raw == null) continue;

      if (q.type === QuestionType.SCALE_1_5) {
        const s = String(raw).trim();
        if (!s) continue;
        const n = Number(s);
        if (Number.isNaN(n)) continue;

        const valueJson: Prisma.InputJsonValue = {
          type: "SCALE_1_5",
          value: n,
          respondentCode,
          area: respondentArea || null,
        };

        rows.push({ engagementId, questionId: q.id, valueJson });
      } else if (q.type === QuestionType.TEXT) {
        const text = String(raw).trim();
        if (!text) continue;

        const valueJson: Prisma.InputJsonValue = {
          type: "TEXT",
          text,
          respondentCode,
          area: respondentArea || null,
        };

        rows.push({ engagementId, questionId: q.id, valueJson });
      }
    }

    if (!rows.length) {
      revalidatePath(`/${locale}/wizard/${engagementId}/step-2-encuesta`);
      return;
    }

    await prisma.answer.createMany({ data: rows });

    revalidatePath(`/${locale}/wizard/${engagementId}/step-2-encuesta`);
    revalidatePath(`/${locale}/wizard/${engagementId}/step-2-diagnostico-360`);
    revalidatePath(`/${locale}/wizard/${engagementId}/step-0-contexto`);
  }

  const label = (es: string | null, en: string | null) =>
    locale === "en" ? (en ?? es ?? "") : (es ?? en ?? "");

  const miniTabs = [
    {
      href: `/${locale}/wizard/${engagementId}/step-2-diagnostico-360`,
      label: t(locale, "2 Diagnóstico 360", "2 360° diagnosis"),
      active: false,
    },
    {
      href: `/${locale}/wizard/${engagementId}/step-2-encuesta`,
      label: t(locale, "2A Encuesta interna", "2A Internal survey"),
      active: true,
    },
    {
      href: `/${locale}/wizard/${engagementId}/step-2b-entrevistas`,
      label: t(locale, "2B Entrevistas", "2B Interviews"),
      active: false,
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <WizardStepsNav locale={locale} engagementId={engagementId} currentStep="step-2-encuesta" />

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

      <header className="mb-6 mt-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
            {t(locale, "Etapa 2A · Encuesta interna", "Step 2A · Internal survey")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Diagnóstico 360° (encuestas internas)", "360° diagnosis (internal surveys)")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Cruzamos lo que dice el equipo, la gerencia y los datos para identificar brechas clave.",
              "We cross what the team, management and data say to identify key gaps."
            )}
          </p>
          <Link
            href={`/${locale}/wizard/${engagementId}/step-2-diagnostico-360`}
            className="mt-2 inline-flex text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← {t(locale, "Volver al Diagnóstico 360°", "Back to 360° diagnosis")}
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
          <p className="font-medium text-slate-800">{t(locale, "Basado en Anexo B", "Based on Annex B")}</p>
          <p className="mt-1 text-[11px]">
            {t(locale, "Encuesta interna anónima (escala 1–5 + abiertas).", "Anonymous internal survey (1–5 scale + open).")}
          </p>
        </div>
      </header>

      {err === "code" && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {t(
            locale,
            "Para guardar, debes ingresar un Código del respondente. Puede ser un alias (no tiene que ser nombre real), pero es obligatorio para poder tabular por persona.",
            "To save, you must enter a Respondent code. It can be an alias (not a real name), but it is required to tabulate per person.",
          )}
        </div>
      )}

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
            <p className="text-[11px] font-medium text-slate-600">{t(locale, "Preguntas (B1/B2)", "Questions (B1/B2)")}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{questions.length}</p>
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

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {t(locale, "Áreas / roles (configurable)", "Areas / roles (configurable)")}
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                {t(locale, "Esto alimenta sugerencias del campo Área/rol. Puedes adaptarlo al organigrama.", "This feeds suggestions for the Area/role field. You can adapt it to the org chart.")}
              </p>
            </div>

            <form action={addSurveyArea} className="flex items-center gap-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="engagementId" value={engagementId} />
              <input
                name="newArea"
                type="text"
                className="w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Agregar área (ej: Finanzas)", "Add area (e.g. Finance)")}
              />
              <button type="submit" className="rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
                {t(locale, "Agregar", "Add")}
              </button>
            </form>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {areas.map((a) => (
              <form key={a} action={removeSurveyArea}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="engagementId" value={engagementId} />
                <input type="hidden" name="area" value={a} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800 hover:bg-slate-100"
                  title={t(locale, "Eliminar", "Remove")}
                >
                  <span>{a}</span>
                  <span className="text-slate-400">×</span>
                </button>
              </form>
            ))}
          </div>
        </div>

        <form action={saveInternalSurvey} className="space-y-6">
          <input type="hidden" name="engagementId" value={engagementId} />
          <input type="hidden" name="locale" value={locale} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                {t(locale, "Código del respondente", "Respondent code")}
              </label>
              <input
                name="respondentCode"
                type="text"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Op-01", "e.g. Op-01")}
              />
              <p className="text-[11px] text-slate-500">
                {t(locale, "Puede ser un alias. Es obligatorio para tabular por persona.", "Can be an alias. Required to tabulate per person.")}
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                {t(locale, "Área / rol", "Area / role")}
              </label>
              <input
                name="respondentArea"
                type="text"
                list="survey-areas"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Operaciones", "e.g. Operations")}
              />
              <datalist id="survey-areas">
                {areas.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
              <p className="text-[11px] text-slate-500">
                {t(locale, "Puedes escribir libre o elegir una sugerencia.", "You can type freely or pick a suggestion.")}
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "B.1 Preguntas (escala 1–5)", "B.1 Questions (1–5 scale)")}
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {t(locale, "1 = Total desacuerdo · 5 = Total acuerdo.", "1 = Strongly disagree · 5 = Strongly agree.")}
            </p>

            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full border-collapse text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] text-slate-500">
                    <th className="px-3 py-2 font-semibold">{t(locale, "Código", "Code")}</th>
                    <th className="px-3 py-2 font-semibold">{t(locale, "Pregunta", "Question")}</th>
                    <th className="px-3 py-2 font-semibold">{t(locale, "Respuesta (1–5)", "Answer (1–5)")}</th>
                  </tr>
                </thead>
                <tbody>
                  {questions
                    .filter((q) => q.type === QuestionType.SCALE_1_5)
                    .map((q) => (
                      <tr key={q.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-3 py-2 align-top font-mono text-[11px] text-slate-500">{q.key}</td>
                        <td className="px-3 py-2 align-top text-[13px]">
                          {label(q.promptEs, q.promptEn)}
                          {label(q.helpEs, q.helpEn) && (
                            <span className="mt-1 block text-[11px] text-slate-500">{label(q.helpEs, q.helpEn)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select
                            name={`q-${q.id}`}
                            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                            defaultValue=""
                          >
                            <option value="">{t(locale, "Selecciona", "Select")}</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "B.2 Preguntas abiertas", "B.2 Open questions")}
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {t(locale, "Registra las ideas tal como las expresa la persona.", "Write the ideas as the person says them.")}
            </p>

            <div className="mt-3 space-y-3">
              {questions
                .filter((q) => q.type === QuestionType.TEXT)
                .map((q) => (
                  <div key={q.id} className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">{label(q.promptEs, q.promptEn)}</label>
                    <textarea
                      name={`q-${q.id}`}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                      placeholder={label(q.helpEs, q.helpEn) || ""}
                    />
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button type="submit" className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
              {t(locale, "Guardar respuestas de esta persona", "Save this person's answers")}
            </button>
          </div>
        </form>
      </section>

      <p className="mt-4 text-[11px] text-slate-500">
        {t(locale, "Con los resultados de la encuesta y las entrevistas, completaremos el diagnóstico 360°.", "With the survey and interview results we will complete the 360° diagnosis.")}
      </p>
    </main>
  );
}
