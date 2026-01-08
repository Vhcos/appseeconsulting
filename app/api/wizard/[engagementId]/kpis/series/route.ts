import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addMonths, monthKeysBetween, computeEvaluatedValue, yearStartKey } from "@/lib/see/kpi-eval";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ engagementId: string }> }) {
  const { engagementId } = await ctx.params;

  const { searchParams } = new URL(req.url);
  const periodKey = String(searchParams.get("period") || "").trim();
  const accountId = String(searchParams.get("accountId") || "").trim();

  const safePeriod = /^\d{4}-\d{2}$/.test(periodKey) ? periodKey : null;
  if (!safePeriod) {
    return NextResponse.json({ error: "Invalid period. Use YYYY-MM." }, { status: 400 });
  }

  const scopeKey = accountId ? `UNIT:${accountId}` : "GLOBAL";

  const windowEnd = safePeriod;
  const windowStart = addMonths(windowEnd, -11);
  const windowMonths = monthKeysBetween(windowStart, windowEnd);

  const earliest = windowStart;
  const minForA = yearStartKey(earliest);
  const minForL = addMonths(earliest, -11);
  const minKey = minForL < minForA ? minForL : minForA;

  const kpis = await prisma.kpi.findMany({
    where: { engagementId },
    select: {
      id: true,
      nameEs: true,
      nameEn: true,
      unit: true,
      targetValue: true,
      direction: true,
      basis: true,
    },
    orderBy: { id: "asc" },
  });

  const ids = kpis.map((k) => k.id);
  const values = ids.length
    ? await prisma.kpiValue.findMany({
        where: {
          kpiId: { in: ids },
          scopeKey,
          periodKey: { gte: minKey, lte: windowEnd },
        },
        select: { kpiId: true, periodKey: true, value: true },
      })
    : [];

  const byKpi = new Map<string, Map<string, number | null>>();
  for (const k of kpis) byKpi.set(k.id, new Map());

  for (const v of values) {
    const m = byKpi.get(v.kpiId);
    const num = v.value == null ? null : Number(String(v.value));
    m?.set(v.periodKey, Number.isFinite(num) ? num : null);
  }

  const items = kpis.map((k) => {
    const valuesByPeriod = byKpi.get(k.id) ?? new Map<string, number | null>();

    const monthly = windowMonths.map((mk) => valuesByPeriod.get(mk) ?? null);
    const evaluated = windowMonths.map((mk) =>
      computeEvaluatedValue({
        periodKey: mk,
        basis: (k.basis as unknown as "A" | "L") || "A",
        unit: k.unit,
        valuesByPeriod,
      }),
    );

    const target = k.targetValue == null ? null : Number(String(k.targetValue));
    return {
      kpiId: k.id,
      unit: k.unit ?? null,
      basis: (k.basis as unknown as "A" | "L") || "A",
      targetValue: Number.isFinite(target) ? target : null,
      monthly,
      evaluated,
    };
  });

  return NextResponse.json({
    months: windowMonths,
    scopeKey,
    items,
  });
}
