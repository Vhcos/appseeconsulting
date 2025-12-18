import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default async function TablesHome({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: { id: true, name: true },
  });

  if (!engagement) {
    return (
      <main style={{ padding: 24 }}>
        <p>{t(locale, "Engagement no encontrado.", "Engagement not found.")}</p>
        <Link href={`/${locale}/wizard`}>{t(locale, "Volver", "Back")}</Link>
      </main>
    );
  }

  const links: Array<{ href: string; es: string; en: string }> = [
    { href: `/${locale}/wizard/${engagementId}/tables/initiatives`, es: "Iniciativas", en: "Initiatives" },
    { href: `/${locale}/wizard/${engagementId}/tables/risks`, es: "Riesgos", en: "Risks" },
    { href: `/${locale}/wizard/${engagementId}/tables/decisions`, es: "Decisiones", en: "Decisions" },
    { href: `/${locale}/wizard/${engagementId}/tables/roadmap`, es: "Roadmap 20 semanas", en: "20-week roadmap" },
    { href: `/${locale}/wizard/${engagementId}/tables/actions`, es: "Action items", en: "Action items" },
    { href: `/${locale}/wizard/${engagementId}/tables/raci`, es: "RACI (Responsible, Accountable, Consulted, Informed)", en: "RACI (Responsible, Accountable, Consulted, Informed)" },
    { href: `/${locale}/wizard/${engagementId}/tables/unit-economics`, es: "Unit economics", en: "Unit economics" },
    { href: `/${locale}/wizard/${engagementId}/tables/account-plan`, es: "Account Plan (Plan de cuenta)", en: "Account Plan" },
  ];

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{t(locale, "Tablas (Anexos)", "Tables (Annexes)")}</h2>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            {t(locale, "Engagement:", "Engagement:")} {engagement.name}
          </p>
        </div>

        <Link href={`/${locale}/wizard/${engagementId}`}>{t(locale, "Volver", "Back")}</Link>
      </div>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 2 }}>
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href}>{t(locale, l.es, l.en)}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
