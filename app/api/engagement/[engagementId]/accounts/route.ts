import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ParamsPromise = Promise<{ engagementId: string }>;

export async function GET(_req: Request, { params }: { params: ParamsPromise }) {
  const { engagementId } = await params;

  const rows = await prisma.accountPlanRow.findMany({
    where: { engagementId },
    select: { id: true, account: true },
    orderBy: [{ account: "asc" }, { id: "asc" }],
  });

  return Response.json({
    ok: true,
    rows: rows.map((r) => ({
      id: r.id,
      label: (r.account ?? "").trim() || "Unidad sin nombre",
    })),
  });
}
