import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params
}: {
  params: Promise<{ locale: string; engagementId: string }>;
}) {
  const { locale, engagementId } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    include: { company: true }
  });

  if (!engagement) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p>No existe este engagement.</p>
        <Link className="underline" href={`/${locale}/report`}>Volver</Link>
      </main>
    );
  }

  const sets = await prisma.questionSet.findMany({
    where: { engagementId },
    orderBy: { order: "asc" },
    include: { questions: { orderBy: { order: "asc" } } }
  });

  const answers = await prisma.answer.findMany({
    where: { engagementId },
    include: { question: true }
  });

  const answerByQuestionId = new Map<string, any>();
  for (const a of answers) answerByQuestionId.set(a.questionId, a.valueJson);

  const initiatives = await prisma.initiative.findMany({
    where: { engagementId },
    orderBy: { createdAt: "desc" }
  });

  const risks = await prisma.risk.findMany({
    where: { engagementId },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reporte (preview)</h1>
          <p className="mt-1 text-sm text-gray-600">
            {engagement.name} · Empresa: {engagement.company?.name ?? "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" href={`/${locale}/wizard/${engagementId}`}>
            Volver a Wizard
          </Link>
          <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" href={`/${locale}/report`}>
            Lista Reportes
          </Link>
        </div>
      </div>

      <section className="mt-10 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">1) Respuestas (captura)</h2>
        <p className="mt-1 text-sm text-gray-600">
          Esto es lo que después “congelamos” como snapshot para el PDF.
        </p>

        <div className="mt-6 space-y-6">
          {sets.map((s) => (
            <div key={s.id} className="rounded-lg border p-4">
              <div className="text-xs text-gray-500">{s.kind} · #{s.order}</div>
              <div className="font-medium">{locale === "en" ? s.titleEn : s.titleEs}</div>

              <ul className="mt-3 space-y-2">
                {s.questions.map((q) => {
                  const val = answerByQuestionId.get(q.id)?.value;
                  return (
                    <li key={q.id} className="text-sm">
                      <div className="font-medium">{q.order}. {locale === "en" ? q.promptEn : q.promptEs}</div>
                      <div className="text-gray-700 whitespace-pre-wrap">
                        {val === undefined || val === null || val === "" ? <span className="text-gray-400">—</span> : String(val)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">2) Iniciativas</h2>
        {initiatives.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">—</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {initiatives.map((i) => (
              <li key={i.id} className="rounded-lg border p-3">
                <div className="text-xs text-gray-500">{i.perspective}</div>
                <div className="font-medium">{i.title}</div>
                <div className="text-sm text-gray-600">Owner: {i.owner ?? "—"} · Estado: {i.status ?? "—"}</div>
                {i.problem ? <div className="mt-2 text-sm">{i.problem}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">3) Riesgos</h2>
        {risks.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">—</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {risks.map((r) => (
              <li key={r.id} className="rounded-lg border p-3">
                <div className="font-medium">{r.risk}</div>
                <div className="text-sm text-gray-600">
                  Prob: {r.probability ?? "—"} · Impacto: {r.impact ?? "—"} · Owner: {r.owner ?? "—"} · Estado: {r.status ?? "—"}
                </div>
                {r.mitigation ? <div className="mt-2 text-sm">{r.mitigation}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">4) PDF</h2>
        <p className="mt-2 text-sm text-gray-600">
          Próximo paso: generar PDF “congelado” serverless (Vercel) con Chromium.
        </p>
      </section>
    </main>
  );
}
