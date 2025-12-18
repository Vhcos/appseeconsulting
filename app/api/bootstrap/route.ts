// app/api/bootstrap/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  // Bootstrap mínimo para poder probar el Wizard sin auth (autenticación) aún.
  const org = await prisma.organization.create({
    data: {
      name: "Demo Org",
      slug: `demo-org-${Date.now()}`,
    },
  });

  const company = await prisma.company.create({
    data: {
      orgId: org.id,
      name: "Demo Company",
      country: "Chile",
      industry: "Consulting",
      timezone: "America/Santiago",
    },
  });

  const engagement = await prisma.engagement.create({
    data: {
      orgId: org.id,
      companyId: company.id,
      name: "Engagement Demo",
      status: "DRAFT",
      localeDefault: "es",
    },
    select: { id: true },
  });

  return NextResponse.json({ engagementId: engagement.id });
}
