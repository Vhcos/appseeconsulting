import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default async function EngagementHome({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    include: { company: true, org: true },
  });

  if (!engagement) {
    return (
      <main style={{ padding: 24 }}>
        <p>{t(locale, "Engagement no encontrado.", "Engagement not found.")}</p>
        <Link href={`/${locale}/wizard`}>{t(locale, "Volver", "Back")}</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{engagement.name}</h2>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            {engagement.org.name} · {engagement.company.name}
          </p>
        </div>

        <Link href={`/${locale}/wizard`}>{t(locale, "Volver al listado", "Back to list")}</Link>
      </div>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(locale, "Accesos rápidos", "Quick links")}</h3>

        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
          <li>
            <Link href={`/${locale}/wizard/${engagementId}/tables`}>
              {t(locale, "Tablas (Anexos)", "Tables (Annexes)")}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/wizard/${engagementId}/tables/initiatives`}>
              {t(locale, "Iniciativas", "Initiatives")}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/wizard/${engagementId}/tables/account-plan`}>
              {t(locale, "Account Plan (Plan de cuenta)", "Account Plan")}
            </Link>
          </li>
        </ul>

        <p style={{ marginTop: 12, opacity: 0.75 }}>
          {t(
            locale,
            "Nota: KPI (Key Performance Indicator) y RACI (Responsible, Accountable, Consulted, Informed) van en tablas separadas.",
            "Note: KPI (Key Performance Indicator) and RACI (Responsible, Accountable, Consulted, Informed) live in separate tables."
          )}
        </p>
      </section>
    </main>
  );
}
