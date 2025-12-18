import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

async function createAP(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const account = String(formData.get("account") ?? "").trim() || null;
  const goal12m = String(formData.get("goal12m") ?? "").trim() || null;
  const decisionMakers = String(formData.get("decisionMakers") ?? "").trim() || null;
  const competitors = String(formData.get("competitors") ?? "").trim() || null;
  const mainPain = String(formData.get("mainPain") ?? "").trim() || null;
  const valueProp = String(formData.get("valueProp") ?? "").trim() || null;
  const agenda8w = String(formData.get("agenda8w") ?? "").trim() || null;
  const nextStep = String(formData.get("nextStep") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "").trim() || null;

  await prisma.accountPlanRow.create({
    data: {
      engagementId,
      account,
      goal12m,
      decisionMakers,
      competitors,
      mainPain,
      valueProp,
      agenda8w,
      nextStep,
      status,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/account-plan`);
}

async function deleteAP(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.accountPlanRow.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/account-plan`);
}

export default async function AccountPlanPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const rows = await prisma.accountPlanRow.findMany({
    where: { engagementId },
    orderBy: [{ account: "asc" }, { id: "desc" }],
  });

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{t(locale, "Account Plan (Plan de cuenta)", "Account plan")}</h2>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            {t(locale, "Tabla igual al Anexo: plan por cuenta/cliente.", "Table matching the Annex: plan per account/client.")}
          </p>
        </div>
        <Link href={`/${locale}/wizard/${engagementId}`}>{t(locale, "Volver", "Back")}</Link>
      </div>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(locale, "Nueva fila", "New row")}</h3>

        <form action={createAP.bind(null, engagementId, locale)} style={{ display: "grid", gap: 10 }}>
          {[
            ["account", t(locale, "Cuenta", "Account")],
            ["goal12m", t(locale, "Objetivo 12 meses", "12-month goal")],
            ["decisionMakers", t(locale, "Decisores", "Decision makers")],
            ["competitors", t(locale, "Competidores", "Competitors")],
            ["mainPain", t(locale, "Dolor principal", "Main pain")],
            ["valueProp", t(locale, "Propuesta de valor", "Value proposition")],
            ["agenda8w", t(locale, "Agenda 8 semanas", "8-week agenda")],
            ["nextStep", t(locale, "Próximo paso", "Next step")],
            ["status", t(locale, "Estado", "Status")],
          ].map(([name, label]) => (
            <div key={name} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 10, alignItems: "center" }}>
              <label>{label}</label>
              <input name={name} />
            </div>
          ))}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit">{t(locale, "Agregar", "Add")}</button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: 16 }}>
        <div style={{ overflowX: "auto", border: "1px solid #e5e5e5", borderRadius: 12 }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {[
                  t(locale, "Cuenta", "Account"),
                  t(locale, "Objetivo 12 meses", "12-month goal"),
                  t(locale, "Decisores", "Decision makers"),
                  t(locale, "Competidores", "Competitors"),
                  t(locale, "Dolor principal", "Main pain"),
                  t(locale, "Propuesta de valor", "Value proposition"),
                  t(locale, "Agenda 8 semanas", "8-week agenda"),
                  t(locale, "Próximo paso", "Next step"),
                  t(locale, "Estado", "Status"),
                  t(locale, "Acciones", "Actions"),
                ].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eee", whiteSpace: "nowrap", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 160 }}>{r.account ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>{r.goal12m ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>{r.decisionMakers ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>{r.competitors ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>{r.mainPain ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 240 }}>{r.valueProp ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>{r.agenda8w ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 180 }}>{r.nextStep ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 140 }}>{r.status ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                    <form action={deleteAP.bind(null, r.id, engagementId, locale)} style={{ display: "inline" }}>
                      <button type="submit" style={{ cursor: "pointer" }}>{t(locale, "Eliminar", "Delete")}</button>
                    </form>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: 16, opacity: 0.7 }}>{t(locale, "Aún no hay filas.", "No rows yet.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
