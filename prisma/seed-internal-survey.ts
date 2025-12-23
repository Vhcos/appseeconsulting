// prisma/seed-internal-survey.ts
// @ts-nocheck

import { PrismaClient, QuestionType, QuestionSetKind } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Preguntas del Anexo B — Encuesta interna (Casia).
 * 11 de escala 1–5 + 3 abiertas.
 */
const INTERNAL_SURVEY_QUESTIONS = [
  {
    key: "B1.1",
    order: 1,
    type: QuestionType.SCALE_1_5,
    promptEs: "Puedo explicar qué hace la empresa en una frase clara.",
    promptEn: "I can explain what the company does in one clear sentence.",
  },
  {
    key: "B1.2",
    order: 2,
    type: QuestionType.SCALE_1_5,
    promptEs:
      "La propuesta de valor es consistente en toda la empresa.",
    promptEn:
      "The value proposition is consistent across the whole company.",
  },
  {
    key: "B1.3",
    order: 3,
    type: QuestionType.SCALE_1_5,
    promptEs:
      "Tenemos prioridades claras para los próximos 90 días.",
    promptEn:
      "We have clear priorities for the next 90 days.",
  },
  {
    key: "B1.4",
    order: 4,
    type: QuestionType.SCALE_1_5,
    promptEs:
      "Entiendo qué valora más el cliente (agua, continuidad, cumplimiento, costo, seguridad, data).",
    promptEn:
      "I understand what the client values most (water, continuity, compliance, cost, safety, data).",
  },
  {
    key: "B1.5",
    order: 5,
    type: QuestionType.SCALE_1_5,
    promptEs:
      "Sé por qué ganamos negocios y por qué los perdemos.",
    promptEn:
      "I know why we win deals and why we lose them.",
  },
  {
    key: "B1.6",
    order: 6,
    type: QuestionType.SCALE_1_5,
    promptEs:
      "El servicio se entrega con estándares (no depende de 'héroes').",
    promptEn:
      "Our service is delivered with standards (it does not depend on 'heroes').",
  },
  {
    key: "B1.7",
    order: 7,
    type: QuestionType.SCALE_1_5,
    promptEs:
      "La seguridad (HSEC) está integrada a la operación (no es trámite).",
    promptEn:
      "Safety (HSEC) is integrated into operations (not just bureaucracy).",
  },
  {
    key: "B1.8",
    order: 8,
    type: QuestionType.SCALE_1_5,
    promptEs:
      "Lo que medimos hoy es útil y entendible para el cliente.",
    promptEn:
      "What we measure today is useful and understandable for the client.",
  },
  {
    key: "B1.9",
    order: 9,
    type: QuestionType.SCALE_1_5,
    promptEs:
      "Operación del cliente y Alta Dirección reciben lo que necesitan (no 'lo mismo para todos').",
    promptEn:
      "Client operations and senior management receive what they need (not 'the same for everyone').",
  },
  {
    key: "B1.10",
    order: 10,
    type: QuestionType.SCALE_1_5,
    promptEs:
      "Creo que nuestros reportes influyen en decisiones del cliente (renovación, auditorías, presupuesto).",
    promptEn:
      "I believe our reports influence client decisions (renewals, audits, budgeting).",
  },
  {
    key: "B1.11",
    order: 11,
    type: QuestionType.SCALE_1_5,
    promptEs:
      "Siento que el equipo está alineado con la visión del negocio.",
    promptEn:
      "I feel the team is aligned with the business vision.",
  },
  // Preguntas abiertas
  {
    key: "B2.1",
    order: 12,
    type: QuestionType.TEXT,
    promptEs:
      "¿Qué 3 cosas deberíamos lograr en 90 días para avanzar al siguiente nivel?",
    promptEn:
      "What 3 things should we achieve in 90 days to move to the next level?",
    helpEs: "Responder en viñetas o frases cortas.",
    helpEn: "Answer in bullets or short phrases.",
  },
  {
    key: "B2.2",
    order: 13,
    type: QuestionType.TEXT,
    promptEs:
      "¿Qué 1 cosa es la más peligrosa si seguimos igual por 6 meses?",
    promptEn:
      "What 1 thing is most dangerous if we stay the same for 6 months?",
  },
  {
    key: "B2.3",
    order: 14,
    type: QuestionType.TEXT,
    promptEs:
      "¿Qué deberíamos dejar de hacer (stop doing) para escalar?",
    promptEn:
      "What should we stop doing in order to scale?",
  },
];

async function seedInternalSurvey() {
  const engagements = await prisma.engagement.findMany({
    select: { id: true },
  });

  if (!engagements.length) {
    console.log("No hay engagements para asociar la encuesta interna.");
    return;
  }

  for (const engagement of engagements) {
    // QuestionSet por engagement
    let qs = await prisma.questionSet.findFirst({
      where: {
        engagementId: engagement.id,
        kind: QuestionSetKind.SURVEY,
      },
      include: { questions: true },
    });

    if (!qs) {
      qs = await prisma.questionSet.create({
        data: {
          engagementId: engagement.id,
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
        where: {
          questionSetId_key: {
            questionSetId: qs.id,
            key: q.key,
          },
        },
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
          optionsJson: null,
        },
      });
    }

    console.log(
      `Encuesta interna configurada para engagement ${engagement.id} con ${INTERNAL_SURVEY_QUESTIONS.length} preguntas.`,
    );
  }
}

seedInternalSurvey()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
