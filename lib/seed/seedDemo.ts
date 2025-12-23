// lib/seed/seedDemo.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "@/lib/prisma";
import { DEFAULT_QUESTION_SETS } from "@/lib/seed/defaultQuestionSets";

export async function seedDemo() {
  // 1) Org + Company
  const org = await prisma.organization.upsert({
    where: { slug: "seeconsulting" },
    update: {},
    create: {
      name: "SEE Consulting",
      slug: "seeconsulting"
    }
  });

  const company = await prisma.company.create({
    data: {
      orgId: org.id,
      name: "Cliente Demo",
      country: "Chile",
      industry: "Servicios",
      timezone: "America/Santiago"
    }
  });

  // 2) Engagement
  const engagement = await prisma.engagement.create({
    data: {
      orgId: org.id,
      companyId: company.id,
      name: "Diagnóstico + Reporte + KPI (Demo)",
      status: "DRAFT",
      localeDefault: "es",
      recipients: {
        create: [
          { type: "EMAIL", label: "Principal", value: "demo@cliente.cl", isActive: true },
          { type: "WHATSAPP", label: "Principal", value: "+56900000000", isActive: false }
        ]
      }
    }
  });

  // 3) Question sets + Questions
  for (const set of DEFAULT_QUESTION_SETS) {
    const createdSet = await prisma.questionSet.create({
      data: {
        engagementId: engagement.id,
        kind: set.kind,
        order: set.order,
        titleEs: set.titleEs,
        titleEn: set.titleEn,
        descriptionEs: set.descriptionEs ?? null,
        descriptionEn: set.descriptionEn ?? null,
        isActive: true
      }
    });

    for (const q of set.questions) {
      await prisma.question.create({
        data: {
          questionSetId: createdSet.id,
          key: q.key,
          order: q.order,
          promptEs: q.promptEs,
          promptEn: q.promptEn,
          helpEs: q.helpEs ?? null,
          helpEn: q.helpEn ?? null,
          type: q.type as any,
          required: q.required ?? false,
          optionsJson: q.options ? { options: q.options } : undefined
        }
      });
    }
  }

  return engagement.id;
}
