import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ReportIndex({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const engagements = await prisma.engagement.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { company: true }
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" href={`/${locale}/wizard`}>
          Ir a Wizard
        </Link>
      </div>

      <p className="mt-2 text-sm text-gray-600">
        Vista HTML del reporte (por ahora). El PDF lo generamos después con pipeline serverless.
      </p>

      {engagements.length === 0 ? (
        <p className="mt-6 text-sm text-gray-600">No hay engagements aún.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {engagements.map((e) => (
            <li key={e.id} className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-sm text-gray-600">
                    Empresa: {e.company?.name ?? "—"} · Estado: {e.status}
                  </div>
                </div>
                <Link className="rounded-lg bg-black px-3 py-2 text-sm text-white hover:opacity-90" href={`/${locale}/report/${e.id}`}>
                  Abrir
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
