import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function normalizeValue(questionType: string, raw: FormDataEntryValue | null) {
  const s = typeof raw === "string" ? raw : "";
  if (!s) return null;

  switch (questionType) {
    case "NUMBER": {
      const n = Number(s);
      return Number.isFinite(n) ? n : s;
    }
    case "SCALE_1_5": {
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    case "DATE":
      return s; // ISO o yyyy-mm-dd
    default:
      return s;
  }
}

export default async function QuestionSetPage({
  params
}: {
  params: Promise<{ locale: string; engagementId: string; setId: string }>;
}) {
  const { locale, engagementId, setId } = await params;

  const set = await prisma.questionSet.findUnique({
    where: { id: setId },
    include: { questions: { orderBy: { order: "asc" } } }
  });

  if (!set || set.engagementId !== engagementId) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p>No existe este set.</p>
        <Link className="underline" href={`/${locale}/wizard/${engagementId}`}>Volver</Link>
      </main>
    );
  }

  const answers = await prisma.answer.findMany({
    where: { engagementId, question: { questionSetId: setId } },
    include: { question: true }
  });

  const answerByQuestionId = new Map<string, any>();
  for (const a of answers) answerByQuestionId.set(a.questionId, a.valueJson);

  async function save(formData: FormData) {
    "use server";

    const questions = await prisma.question.findMany({
      where: { questionSetId: setId },
      orderBy: { order: "asc" }
    });

    for (const q of questions) {
      const raw = formData.get(`q_${q.id}`);
      const val = normalizeValue(q.type, raw);

      const existing = await prisma.answer.findFirst({
        where: {
          engagementId,
          questionId: q.id,
          respondentUserId: null
        }
      });

      if (val === null) {
        // si está vacío, no creamos nada (y si existía, lo dejamos como estaba)
        continue;
      }

      const valueJson = { value: val };

      if (existing) {
        await prisma.answer.update({
          where: { id: existing.id },
          data: { valueJson }
        });
      } else {
        await prisma.answer.create({
          data: {
            engagementId,
            questionId: q.id,
            respondentUserId: null,
            valueJson
          }
        });
      }
    }

    // marca “tocado” el set (simple)
    await prisma.wizardProgress.upsert({
      where: { engagementId_stepKey: { engagementId, stepKey: `set:${setId}` } },
      update: { completedAt: new Date() },
      create: { engagementId, stepKey: `set:${setId}`, completedAt: new Date() }
    });

    redirect(`/${locale}/wizard/${engagementId}`);
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500">{set.kind} · #{set.order}</div>
          <h1 className="text-2xl font-semibold">{locale === "en" ? set.titleEn : set.titleEs}</h1>
          <p className="mt-1 text-sm text-gray-600">{locale === "en" ? set.descriptionEn : set.descriptionEs}</p>
        </div>

        <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" href={`/${locale}/wizard/${engagementId}`}>
          Volver
        </Link>
      </div>

      <form action={save} className="mt-8 space-y-6">
        {set.questions.map((q) => {
          const existing = answerByQuestionId.get(q.id);
          const existingValue = existing?.value ?? "";

          const label = locale === "en" ? q.promptEn : q.promptEs;
          const help = locale === "en" ? q.helpEn : q.helpEs;

          return (
            <div key={q.id} className="rounded-xl border p-4">
              <div className="text-sm font-medium">
                {q.order}. {label} {q.required ? <span className="text-red-600">*</span> : null}
              </div>
              {help ? <div className="mt-1 text-xs text-gray-500">{help}</div> : null}

              <div className="mt-3">
                {q.type === "LONG_TEXT" ? (
                  <textarea
                    name={`q_${q.id}`}
                    defaultValue={typeof existingValue === "string" ? existingValue : ""}
                    className="min-h-[120px] w-full rounded-lg border p-2"
                  />
                ) : q.type === "NUMBER" ? (
                  <input
                    name={`q_${q.id}`}
                    type="number"
                    defaultValue={typeof existingValue === "number" ? String(existingValue) : (existingValue ?? "")}
                    className="w-full rounded-lg border p-2"
                  />
                ) : q.type === "DATE" ? (
                  <input
                    name={`q_${q.id}`}
                    type="date"
                    defaultValue={typeof existingValue === "string" ? existingValue : ""}
                    className="w-full rounded-lg border p-2"
                  />
                ) : q.type === "SCALE_1_5" ? (
                  <select
                    name={`q_${q.id}`}
                    defaultValue={existingValue ? String(existingValue) : ""}
                    className="w-full rounded-lg border p-2"
                  >
                    <option value="">—</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                ) : (
                  <input
                    name={`q_${q.id}`}
                    defaultValue={typeof existingValue === "string" ? existingValue : (existingValue ?? "")}
                    className="w-full rounded-lg border p-2"
                  />
                )}
              </div>
            </div>
          );
        })}

        <div className="flex gap-3">
          <button className="rounded-lg bg-black px-4 py-2 text-white hover:opacity-90" type="submit">
            Guardar
          </button>
          <Link className="rounded-lg border px-4 py-2 hover:bg-gray-50" href={`/${locale}/wizard/${engagementId}`}>
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}
