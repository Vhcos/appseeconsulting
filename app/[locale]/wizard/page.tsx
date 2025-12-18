import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { EngagementStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

async function createEngagementAction(locale: string, formData: FormData) {
  "use server";

  const orgSlug = String(formData.get("orgSlug") ?? "").trim() || "seeconsulting";
  const orgName = String(formData.get("orgName") ?? "").trim() || "SEE Consulting";

  const companyName = String(formData.get("companyName") ?? "").trim();
  const engagementName = String(formData.get("engagementName") ?? "").trim();

  const localeDefault = String(formData.get("localeDefault") ?? "").trim() || "es";

  if (!companyName || !engagementName) return;

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: { name: orgName },
    create: { slug: orgSlug, name: orgName },
  });

  // buscamos una compañía existente por nombre dentro de la org (Organization)
  let company = await prisma.company.findFirst({
    where: { orgId: org.id, name: companyName },
  });

  if (!company) {
    company = await prisma.company.create({
      data: { orgId: org.id, name: companyName },
    });
  }

  await prisma.engagement.create({
    data: {
      orgId: org.id,
      companyId: company.id,
      name: engagementName,
      status: EngagementStatus.DRAFT,
      localeDefault,
    },
  });

  revalidatePath(`/${locale}/wizard`);
}

export default async function WizardHome({ params }: { params: ParamsPromise }) {
  const { locale } = await params;

  const engagements = await prisma.engagement.findMany({
    include: { company: true, org: true },
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <main style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>{t(locale, "Wizard", "Wizard")}</h2>
      <p style={{ opacity: 0.75, marginTop: 6 }}>
        {t(
          locale,
          "Crea un engagement (cliente/proyecto) y luego entra a sus anexos/tablas.",
          "Create an engagement (client/project) and then open its annex tables."
        )}
      </p>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(locale, "Crear engagement", "Create engagement")}</h3>

        <form action={createEngagementAction.bind(null, locale)} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Org slug", "Org slug")}</label>
            <input name="orgSlug" defaultValue="seeconsulting" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Org nombre", "Org name")}</label>
            <input name="orgName" defaultValue="SEE Consulting" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Compañía", "Company")}</label>
            <input name="companyName" required placeholder={t(locale, "Ej: Cliente X", "e.g. Client X")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Nombre engagement", "Engagement name")}</label>
            <input name="engagementName" required placeholder={t(locale, "Ej: Diagnóstico Q1", "e.g. Q1 Diagnostic")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Idioma por defecto", "Default language")}</label>
            <select name="localeDefault" defaultValue="es">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit">{t(locale, "Crear", "Create")}</button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 10 }}>{t(locale, "Engagements", "Engagements")}</h3>

        <div style={{ display: "grid", gap: 10 }}>
          {engagements.map((e) => (
            <div
              key={e.id}
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "baseline",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{e.name}</div>
                <div style={{ opacity: 0.75, marginTop: 4, fontSize: 13 }}>
                  {e.org.name} · {e.company.name} · {e.status}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Link href={`/${locale}/wizard/${e.id}`}>{t(locale, "Abrir", "Open")}</Link>
              </div>
            </div>
          ))}

          {engagements.length === 0 && (
            <div style={{ opacity: 0.7 }}>{t(locale, "Aún no hay engagements.", "No engagements yet.")}</div>
          )}
        </div>
      </section>
    </main>
  );
}
