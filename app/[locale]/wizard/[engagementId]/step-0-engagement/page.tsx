// app/[locale]/wizard/[engagementId]/step-0-engagement/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

// === Server action para guardar la ficha del cliente ===
async function saveClientContext(formData: FormData) {
  "use server";

  const engagementId = String(formData.get("engagementId") ?? "");
  const locale = String(formData.get("locale") ?? "es");

  if (!engagementId) return;

  const contextCompanyName =
    (formData.get("companyName") as string | null)?.trim() || null;
  const contextIndustry =
    (formData.get("industry") as string | null)?.trim() || null;
  const contextGoal12m =
    (formData.get("goal12m") as string | null)?.trim() || null;
  const contextGoal36m =
    (formData.get("goal36m") as string | null)?.trim() || null;
  const contextSponsor =
    (formData.get("sponsor") as string | null)?.trim() || null;
  const contextCoreTeam =
    (formData.get("coreTeam") as string | null)?.trim() || null;

  await prisma.engagement.update({
    where: { id: engagementId },
    data: {
      contextCompanyName,
      contextIndustry,
      contextGoal12m,
      contextGoal36m,
      contextSponsor,
      contextCoreTeam,
    },
  });

  // Refrescamos ficha, panel y reporte
  revalidatePath(`/${locale}/wizard/${engagementId}/step-0-engagement`);
  revalidatePath(`/${locale}/wizard/${engagementId}/step-0-contexto`);
  revalidatePath(`/${locale}/report/${engagementId}`);
}

export default async function Step0EngagementPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: {
      id: true,
      name: true,
      company: { select: { name: true } },
      contextCompanyName: true,
      contextIndustry: true,
      contextGoal12m: true,
      contextGoal36m: true,
      contextSponsor: true,
      contextCoreTeam: true,
    },
  });

  if (!engagement) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
        <p className="mb-4 text-lg font-medium text-slate-900">
          {t(locale, "No existe este engagement.", "Engagement not found.")}
        </p>
        <Link
          href={`/${locale}/wizard`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Volver", "Back")}
        </Link>
      </main>
    );
  }

  const displayName =
    engagement.contextCompanyName ||
    engagement.company?.name ||
    engagement.name ||
    t(locale, "Cliente sin nombre", "Unnamed client");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {t(locale, "Ficha del cliente", "Client overview")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              locale,
              "Aquí dejamos claro quién es la empresa, qué quiere lograr y en qué horizonte de tiempo. Esta ficha alimenta el informe final.",
              "Here we capture who the company is, what it wants to achieve and in which time horizon. This sheet feeds the final report.",
            )}
          </p>
        </div>

        <Link
          href={`/${locale}/wizard/${engagementId}/step-0-contexto`}
          className="text-xs text-indigo-600 hover:text-indigo-500"
        >
          ← {t(locale, "Ir al panel de control", "Go to dashboard")}
        </Link>
      </div>

      <form
        action={saveClientContext}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <input type="hidden" name="engagementId" value={engagement.id} />
        <input type="hidden" name="locale" value={locale} />

        <section className="grid gap-4 md:grid-cols-2">
          {/* Nombre empresa */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Nombre de la empresa", "Company name")}
            </label>
            <input
              type="text"
              name="companyName"
              defaultValue={engagement.contextCompanyName ?? engagement.company?.name ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(locale, "Ej: Casia", "e.g. Casia")}
            />
            <p className="text-[11px] text-slate-500">
              {t(
                locale,
                "Este nombre se usará en todo el informe y en el panel de control.",
                "This name will be used across the report and dashboard.",
              )}
            </p>
          </div>

          {/* Industria */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Rubro / industria", "Industry")}
            </label>
            <input
              type="text"
              name="industry"
              defaultValue={engagement.contextIndustry ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: Minería sustentable / servicios a la minería",
                "e.g. Sustainable mining / mining services",
              )}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {/* Meta 12 meses */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Meta a 12 meses", "12-month goal")}
            </label>
            <textarea
              rows={3}
              name="goal12m"
              defaultValue={engagement.contextGoal12m ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: Ordenar contratos actuales, estabilizar margen y mejorar relación con cliente clave.",
                "e.g. Organize current contracts, stabilize margin and improve relationship with key client.",
              )}
            />
          </div>

          {/* Meta 36 meses */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Meta a 36 meses", "36-month goal")}
            </label>
            <textarea
              rows={3}
              name="goal36m"
              defaultValue={engagement.contextGoal36m ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: Duplicar tamaño del negocio manteniendo seguridad, margen y reputación con la minera.",
                "e.g. Double business size while maintaining safety, margin and reputation with the mining client.",
              )}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {/* Sponsor */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Sponsor principal", "Main sponsor")}
            </label>
            <input
              type="text"
              name="sponsor"
              defaultValue={engagement.contextSponsor ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: Gerente general / CEO",
                "e.g. General manager / CEO",
              )}
            />
          </div>

          {/* Equipo clave */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              {t(locale, "Equipo clave del proceso", "Core team for this process")}
            </label>
            <textarea
              rows={3}
              name="coreTeam"
              defaultValue={engagement.contextCoreTeam ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder={t(
                locale,
                "Ej: Operaciones, Finanzas, HSEC, Comercial, Transformación.",
                "e.g. Operations, Finance, HSEC, Commercial, Transformation.",
              )}
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            {t(
              locale,
              "Esta ficha se usará en el panel de control y en la sección de contexto del informe final.",
              "This sheet will be used in the dashboard and the context section of the final report.",
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              {t(locale, "Guardar ficha", "Save overview")}
            </button>
            <Link
              href={`/${locale}/wizard/${engagementId}/step-1-data-room`}
              className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              {t(locale, "Ir al Data Room →", "Go to Data Room →")}
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
