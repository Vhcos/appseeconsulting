import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default async function WizardEntryPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale } = await params;

  // Tomamos el engagement más reciente y vamos directo al Step-0 (Ficha del engagement)
  const engagement = await prisma.engagement.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (engagement) {
    redirect(`/${locale}/wizard/${engagement.id}/step-0-engagement`);
  }

  // Fallback solo si aún no hay engagements creados
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">
        {t(locale, "Configura tu primer engagement", "Set up your first engagement")}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {t(
          locale,
          "Todavía no hay proyectos creados. Pídele a tu implementador que cargue un engagement de ejemplo o crea uno manualmente desde la base de datos.",
          "There are no projects created yet. Ask your implementer to seed a demo engagement or create one manually from the database.",
        )}
      </p>

      <p className="mt-6 text-xs text-slate-500">
        {t(
          locale,
          "Cuando exista al menos un engagement, el inicio te llevará automáticamente a la Ficha del engagement (Step-0).",
          "Once there is at least one engagement, the home will automatically take you to the Engagement sheet (Step-0).",
        )}
      </p>

      <div className="mt-8">
        <Link
          href={`/${locale}`}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          {t(locale, "Volver al inicio", "Back to home")}
        </Link>
      </div>
    </main>
  );
}
