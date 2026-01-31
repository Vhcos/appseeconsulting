import { prisma } from "@/lib/prisma";

export async function ensureDefaultNpsQuestionSet(engagementId: string) {
  const existing = await prisma.questionSet.findFirst({
    where: {
      engagementId,
      kind: "SURVEY",
      titleEs: "NPS Casia (Default)",
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (existing) return existing;

  return prisma.questionSet.create({
    data: {
      engagementId,
      kind: "SURVEY",
      order: 1,
      titleEs: "NPS Casia (Default)",
      titleEn: "NPS Casia (Default)",
      descriptionEs: "Encuesta NPS completa (base). Luego puedes reemplazar preguntas/opciones.",
      descriptionEn: "Full NPS survey (base). You can replace questions/options later.",
      isActive: true,
      questions: {
        create: [
          {
            order: 1,
            key: "nps_score",
            promptEs:
              "En una escala del 0 al 10, ¿qué probabilidad hay de que recomiendes a CASIA como proveedor a un colega o contacto en tu industria? (0 = Nada probable, 10 = Muy probable)",
            promptEn:
              "On a scale of 0 to 10, how likely are you to recommend CASIA to a colleague? (0 = Not likely, 10 = Very likely)",
            helpEs: null,
            helpEn: null,
            type: "NUMBER",
            required: true,
            optionsJson: { min: 0, max: 10, step: 1 },
          },
          {
            order: 2,
            key: "nps_reason",
            promptEs: "¿Cuál es el factor principal que determinó tu nota anterior?",
            promptEn: "What is the main factor behind your score?",
            helpEs: null,
            helpEn: null,
            type: "SINGLE_SELECT",
            required: true,
            optionsJson: {
              choices: [
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
            order: 3,
            key: "nps_focus",
            promptEs: "¿En qué aspecto crees que deberíamos enfocarnos para mejorar tu experiencia?",
            promptEn: "Where should we focus to improve your experience?",
            helpEs: null,
            helpEn: null,
            type: "SINGLE_SELECT",
            required: true,
            optionsJson: {
              choices: [
                { value: "MAYOR_PRESENCIA_EN_TERRENO", labelEs: "Mayor presencia en terreno", labelEn: "More field presence" },
                { value: "MEJOR_TECNOLOGIA_INNOVACION", labelEs: "Mejor tecnología / innovación", labelEn: "Better tech / innovation" },
                { value: "MAS_DATOS_INSIGHTS", labelEs: "Más datos / insights", labelEn: "More data / insights" },
                { value: "GESTION_ADMINISTRATIVA", labelEs: "Gestión administrativa", labelEn: "Administrative management" },
                { value: "MANTENER_ESTANDAR", labelEs: "Mantener estándar", labelEn: "Maintain standard" },
              ],
            },
          },
          {
            order: 4,
            key: "nps_comment",
            promptEs: "Si quieres, déjanos un comentario (ejemplos, contexto, sugerencias).",
            promptEn: "Optional: leave a comment (examples, context, suggestions).",
            helpEs: null,
            helpEn: null,
            type: "LONG_TEXT",
            required: false,
            optionsJson: { maxLength: 2000 },
          },
        ],
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });
}

export function labelForChoice(choice: any, locale: "es" | "en") {
  if (!choice) return "";
  return locale === "en"
    ? (choice.labelEn ?? choice.labelEs ?? choice.label ?? "")
    : (choice.labelEs ?? choice.labelEn ?? choice.label ?? "");
}
