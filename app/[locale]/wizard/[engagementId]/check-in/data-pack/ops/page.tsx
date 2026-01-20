import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<{ reportId?: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type OpsEditorialV1 = {
  ajustePropuesto?: string;
  porQue?: string;
  queNecesitoDelMandante?: string;
};

function stepKey(reportId: string) {
  return `datapack-ops:${reportId}`;
}

export default async function DataPackOpsPage({ params, searchParams }: { params: ParamsPromise; searchParams: SearchParamsPromise }) {
  const { locale, engagementId } = await params;
  const sp = await searchParams;
  const reportId = (sp.reportId || "").trim();

  if (!reportId) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <p className="text-sm text-slate-700">
          {t(locale, "Falta reportId. El Data Pack semanal se genera desde un reporte semanal.", "Missing reportId. Weekly Data Pack is generated from a weekly report.")}
        </p>
        <Link
          href={`/${locale}/wizard/${engagementId}/check-in/faena-semanal`}
          className="mt-3 inline-flex items-center rounded-full border-2 border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          {t(locale, "← Ir a reportes semanales", "← Go to weekly reports")}
        </Link>
      </main>
    );
  }

  // Weekly report = fuente de verdad de “números”
  const r = await (prisma as any).weeklyFaenaReport.findUnique({
    where: { id: reportId },
    include: { faena: true },
  });

  if (!r || String(r.engagementId) !== String(engagementId)) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <p className="text-sm text-slate-700">{t(locale, "Reporte semanal no encontrado para este engagement.", "Weekly report not found for this engagement.")}</p>
        <Link
          href={`/${locale}/wizard/${engagementId}/check-in/faena-semanal`}
          className="mt-3 inline-flex items-center rounded-full border-2 border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          {t(locale, "← Volver", "← Back")}
        </Link>
      </main>
    );
  }

  // Editorial (solo punto 4)
  const wp = await prisma.wizardProgress.findUnique({
    where: { engagementId_stepKey: { engagementId, stepKey: stepKey(reportId) } },
    select: { notes: true },
  });

  const doc = safeJsonParse<OpsEditorialV1>(wp?.notes, {});

  const faenaName = r?.faena?.name || r?.faena?.nombre || "—";

  const pdfHref =
    `/api/export/datapack/ops/pdf` +
    `?locale=${encodeURIComponent(locale)}` +
    `&engagementId=${encodeURIComponent(engagementId)}` +
    `&reportId=${encodeURIComponent(reportId)}`;

  async function save(formData: FormData) {
    "use server";

    const payload: OpsEditorialV1 = {
      ajustePropuesto: String(formData.get("ajustePropuesto") ?? "").trim(),
      porQue: String(formData.get("porQue") ?? "").trim(),
      queNecesitoDelMandante: String(formData.get("queNecesitoDelMandante") ?? "").trim(),
    };

    await prisma.wizardProgress.upsert({
      where: { engagementId_stepKey: { engagementId, stepKey: stepKey(reportId) } },
      create: { engagementId, stepKey: stepKey(reportId), completedAt: new Date(), notes: JSON.stringify(payload) },
      update: { completedAt: new Date(), notes: JSON.stringify(payload) },
    });

    revalidatePath(`/${locale}/wizard/${engagementId}/check-in`);
    revalidatePath(`/${locale}/wizard/${engagementId}/check-in/data-pack/ops`);

    redirect(`/${locale}/wizard/${engagementId}/check-in/data-pack/ops?reportId=${encodeURIComponent(reportId)}`);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t(locale, "Data Pack semanal (ejecutivo)", "Weekly Data Pack (executive)")}</h1>
          <p className="mt-1 text-sm text-slate-700">
            {t(locale, "Cliente/Faena:", "Site:")} <span className="font-semibold text-slate-900">{faenaName}</span>
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {t(locale, "Nota:", "Note:")}{" "}
            {t(
              locale,
              "Los puntos 1–3 se llenan automáticamente desde el Reporte Semanal. Aquí solo se edita el punto 4.",
              "Sections 1–3 are auto-filled from the Weekly Report. Only section 4 is editable here."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={pdfHref} className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">
            {t(locale, "Descargar PDF", "Download PDF")}
          </Link>

          <Link
            href={`/${locale}/wizard/${engagementId}/check-in/faena-semanal/${encodeURIComponent(reportId)}`}
            className="inline-flex items-center rounded-full border-2 border-slate-300 px-3 py-1 text-xs font-bold text-slate-800 hover:bg-slate-50"
          >
            {t(locale, "← Volver al reporte semanal", "← Back to weekly report")}
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">4) {t(locale, "Recomendación operativa concreta (próximo ajuste)", "Concrete operational recommendation (next adjustment)")}</h2>

        <form action={save} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700">{t(locale, "Ajuste propuesto", "Proposed adjustment")}</label>
            <textarea
              name="ajustePropuesto"
              defaultValue={doc.ajustePropuesto || ""}
              rows={3}
              className="mt-1 w-full rounded-xl border-2 border-slate-300 p-3 text-sm outline-none focus:border-slate-500"
              placeholder={t(locale, "Ej: Ajuste propuesto…", "E.g., Proposed adjustment…")}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">{t(locale, "Por qué", "Why")}</label>
            <textarea
              name="porQue"
              defaultValue={doc.porQue || ""}
              rows={3}
              className="mt-1 w-full rounded-xl border-2 border-slate-300 p-3 text-sm outline-none focus:border-slate-500"
              placeholder={t(locale, "Ej: Por qué…", "E.g., Why…")}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">{t(locale, "Qué necesito del mandante", "What I need from the client")}</label>
            <textarea
              name="queNecesitoDelMandante"
              defaultValue={doc.queNecesitoDelMandante || ""}
              rows={3}
              className="mt-1 w-full rounded-xl border-2 border-slate-300 p-3 text-sm outline-none focus:border-slate-500"
              placeholder={t(locale, "Ej: Qué necesito…", "E.g., What I need…")}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="submit" className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
              {t(locale, "Guardar punto 4", "Save section 4")}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
