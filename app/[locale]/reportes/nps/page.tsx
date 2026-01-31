// app/[locale]/reportes/nps/page.tsx
import { prisma } from "@/lib/prisma";
import DashboardClient from "./dashboard-client";

type ParamsPromise = Promise<{ locale: string }>;
type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;

type PageProps = {
  params: ParamsPromise;
  searchParams: SearchParamsPromise;
};

function pickFirst(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function computeNps(scores: number[]) {
  const total = scores.length;
  const promoters = scores.filter((s) => s >= 9).length;
  const passives = scores.filter((s) => s >= 7 && s <= 8).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const nps = total === 0 ? null : Math.round(((promoters - detractors) / total) * 100);
  return { total, promoters, passives, detractors, nps };
}

export default async function NpsReportsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const sp = await searchParams;

  const engagementId = pickFirst(sp.engagementId);
  const semesterKeyParam = pickFirst(sp.semesterKey) ?? pickFirst(sp.semester);

  // 1) Semestres disponibles
  const semesterRows = await prisma.npsInvite.findMany({
    where: engagementId ? { engagementId } : {},
    select: { semesterKey: true },
    orderBy: { semesterKey: "desc" },
  });

  const semesters = Array.from(new Set(semesterRows.map((r) => r.semesterKey)));
  const semesterKey = semesterKeyParam ?? semesters[0] ?? "2026S1";

  // 2) Invites + response
  const invites = await prisma.npsInvite.findMany({
    where: {
      semesterKey,
      ...(engagementId ? { engagementId } : {}),
    },
    include: {
      responses: true, // en tu schema es NpsResponse[]
    },
    orderBy: [{ respondedAt: "desc" }, { email: "asc" }],
  });

  // 3) Cruzar con contactos (para unidad/rol)
  const emailList = invites.map((i) => i.email.toLowerCase());
  const contacts =
    engagementId && emailList.length
      ? await prisma.npsContact.findMany({
          where: { engagementId, email: { in: emailList } },
          include: { role: true, unit: true },
        })
      : [];

  const contactByEmail = new Map(
    contacts.map((c) => [
      c.email.toLowerCase(),
      {
        fullName: c.fullName,
        roleName: c.role?.name ?? null,
        unitName: c.unit?.account ?? null,
      },
    ])
  );

  // 4) Rows (tabla)
  const rows = invites.map((inv) => {
    const resp = inv.responses?.[0] ?? null; // por diseño 1 response por invite (inviteId @unique)
    const c = contactByEmail.get(inv.email.toLowerCase());

    return {
      name: inv.fullName ?? c?.fullName ?? "",
      email: inv.email,
      unit: c?.unitName ?? null,
      role: c?.roleName ?? null,
      score: resp?.score ?? null,
      reason: resp?.reason ?? null,
      focus: resp?.focus ?? null,
      comment: resp?.comment ?? null,
      respondedAt: inv.respondedAt ? inv.respondedAt.toISOString() : null,
    };
  });

  // 5) Summary global
  const scores = rows.filter((r) => typeof r.score === "number").map((r) => r.score as number);
  const agg = computeNps(scores);

  const summary = {
    responses: agg.total,
    nps: agg.nps,
    promoters: agg.promoters,
    passives: agg.passives,
    detractors: agg.detractors,
  };

  // 6) Distribución 0–10
  const distMap = new Map<number, number>();
  for (let s = 0; s <= 10; s++) distMap.set(s, 0);
  for (const s of scores) distMap.set(s, (distMap.get(s) ?? 0) + 1);

  const distribution = Array.from(distMap.entries()).map(([score, count]) => ({ score, count }));

  // 7) Por unidad (si hay engagementId; si no, igual agrupa por "Sin unidad")
  const unitScores = new Map<string, number[]>();
  for (const r of rows) {
    if (typeof r.score !== "number") continue;
    const unitKey = r.unit ?? "Sin unidad";
    const arr = unitScores.get(unitKey) ?? [];
    arr.push(r.score);
    unitScores.set(unitKey, arr);
  }

  const byUnit = Array.from(unitScores.entries())
    .map(([unit, sc]) => {
      const u = computeNps(sc);
      return { unit, responses: u.total, nps: u.nps };
    })
    .sort((a, b) => (b.responses ?? 0) - (a.responses ?? 0));

  return (
    <DashboardClient
      locale={locale}
      engagementId={engagementId ?? null}
      semesterKey={semesterKey}
      semesters={semesters.length ? semesters : [semesterKey]}
      summary={summary}
      distribution={distribution}
      byUnit={byUnit}
      rows={rows}
    />
  );
}
