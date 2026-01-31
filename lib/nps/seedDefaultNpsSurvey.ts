// lib/nps/seedDefaultNpsSurvey.ts
import { prisma } from "@/lib/prisma";
import { QuestionSetKind, QuestionType } from "@prisma/client";

/**
 * Seed mínimo de una "encuesta NPS" usando el motor genérico:
 * QuestionSet -> Questions -> Answers
 *
 * OJO:
 * - Esto NO está amarrado a NpsInvite/NpsResponse (tu NPS semestral v1).
 * - Solo asegura que exista un set de preguntas para UI genérica si lo necesitas.
 */
export async function seedDefaultNpsSurvey(engagementId: string) {
  if (!engagementId) throw new Error("seedDefaultNpsSurvey: engagementId requerido.");

  // Definición del set
  const titleEs = "Encuesta NPS";
  const titleEn = "NPS Survey";

  // 1) Buscar o crear QuestionSet
  const existing = await prisma.questionSet.findFirst({
    where: {
      engagementId,
      kind: QuestionSetKind.SURVEY,
      titleEs,
    },
    select: { id: true },
  });

  const questionSet =
    existing ??
    (await prisma.questionSet.create({
      data: {
        engagementId,
        kind: QuestionSetKind.SURVEY,
        order: 1,
        titleEs,
        titleEn,
        descriptionEs: "Encuesta de satisfacción (NPS) base.",
        descriptionEn: "Baseline satisfaction survey (NPS).",
        isActive: true,
      },
      select: { id: true },
    }));

  const questionSetId = questionSet.id;

  // 2) Definir preguntas alineadas al schema REAL (Question.promptEs/promptEn + type enum real)
  // NPS 0-10: tu enum no tiene SCALE_0_10, así que usamos NUMBER + optionsJson con min/max/step.
  const questions: Array<{
    key: string;
    order: number;
    promptEs: string;
    promptEn: string;
    helpEs?: string | null;
    helpEn?: string | null;
    type: QuestionType;
    required: boolean;
    optionsJson?: any;
  }> = [
    {
      key: "nps_score",
      order: 1,
      promptEs:
        "¿Qué tan probable es que recomiendes a Casia a un colega? (0 = nada probable, 10 = muy probable)",
      promptEn:
        "How likely are you to recommend Casia to a colleague? (0 = not likely, 10 = very likely)",
      helpEs: null,
      helpEn: null,
      type: QuestionType.NUMBER,
      required: true,
      optionsJson: { min: 0, max: 10, step: 1 },
    },
    {
      key: "nps_reason",
      order: 2,
      promptEs: "Motivo principal (opcional)",
      promptEn: "Main reason (optional)",
      helpEs: null,
      helpEn: null,
      type: QuestionType.SINGLE_SELECT,
      required: false,
      optionsJson: {
        options: [
          { value: "CONTROL_OPERATIVO", labelEs: "Control operativo", labelEn: "Operational control" },
          { value: "PERFORMANCE_CAMINOS", labelEs: "Performance caminos", labelEn: "Road performance" },
          { value: "DATA_REPORTABILIDAD", labelEs: "Data / reportabilidad", labelEn: "Data / reporting" },
          { value: "SEGURIDAD_HSEC", labelEs: "Seguridad / HSEC", labelEn: "Safety / HSEC" },
          { value: "RESPUESTA_EQUIPO", labelEs: "Respuesta del equipo", labelEn: "Team responsiveness" },
          { value: "OTRO", labelEs: "Otro", labelEn: "Other" },
        ],
      },
    },
    {
      key: "nps_focus",
      order: 3,
      promptEs: "¿Qué deberíamos priorizar? (opcional)",
      promptEn: "What should we prioritize? (optional)",
      helpEs: null,
      helpEn: null,
      type: QuestionType.SINGLE_SELECT,
      required: false,
      optionsJson: {
        options: [
          { value: "MAYOR_PRESENCIA_EN_TERRENO", labelEs: "Mayor presencia en terreno", labelEn: "More field presence" },
          { value: "MEJOR_TECNOLOGIA_INNOVACION", labelEs: "Mejor tecnología / innovación", labelEn: "Better technology / innovation" },
          { value: "MAS_DATOS_INSIGHTS", labelEs: "Más datos / insights", labelEn: "More data / insights" },
          { value: "GESTION_ADMINISTRATIVA", labelEs: "Gestión administrativa", labelEn: "Administrative management" },
          { value: "MANTENER_ESTANDAR", labelEs: "Mantener estándar", labelEn: "Maintain standard" },
        ],
      },
    },
    {
      key: "nps_comment",
      order: 4,
      promptEs: "Comentario (opcional)",
      promptEn: "Comment (optional)",
      helpEs: null,
      helpEn: null,
      type: QuestionType.LONG_TEXT,
      required: false,
      optionsJson: null,
    },
  ];

  // 3) Upsert por (questionSetId, key) (tu schema: @@unique([questionSetId, key]))
  await prisma.$transaction(
    questions.map((q) =>
      prisma.question.upsert({
        where: { questionSetId_key: { questionSetId, key: q.key } },
        create: {
          questionSetId,
          key: q.key,
          order: q.order,
          promptEs: q.promptEs,
          promptEn: q.promptEn,
          helpEs: q.helpEs ?? null,
          helpEn: q.helpEn ?? null,
          type: q.type,
          required: q.required,
          optionsJson: q.optionsJson ?? null,
        },
        update: {
          order: q.order,
          promptEs: q.promptEs,
          promptEn: q.promptEn,
          helpEs: q.helpEs ?? null,
          helpEn: q.helpEn ?? null,
          type: q.type,
          required: q.required,
          optionsJson: q.optionsJson ?? null,
        },
      })
    )
  );

  return { ok: true, questionSetId };
}
