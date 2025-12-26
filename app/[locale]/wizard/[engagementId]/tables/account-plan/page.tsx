import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

async function createAccountPlanRowAction(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const account = String(formData.get("account") ?? "").trim();
  if (!account) return;

  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.accountPlanRow.create({
    data: { engagementId, account, notes },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/account-plan`);
}

async function deleteAccountPlanRowAction(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.accountPlanRow.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/account-plan`);
}

export default async function AccountPlanPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams?: { accountId?: string };
}) {
  const { locale, engagementId } = await params;
  const activeAccountId = (searchParams?.accountId ?? "").trim() || null;

  const rows = await prisma.accountPlanRow.findMany({
    where: { engagementId },
    orderBy: [{ account: "asc" }, { id: "asc" }],
  });

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{t(locale, "Plan de cuenta (Unidades)", "Account plan (Units)")}</h2>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            {t(locale, "Define faenas/obras/centros de costo (unidades) para filtrar tablas y check-in.", "Define sites/projects/cost centers (units) to filter tables and check-in.")}
          </p>
        </div>
        <Link href={`/${locale}/wizard/${engagementId}/tables`}>{t(locale, "Volver", "Back")}</Link>
      </div>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(locale, "Nueva unidad", "New unit")}</h3>

        <form action={createAccountPlanRowAction.bind(null, engagementId, locale)} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Nombre", "Name")}</label>
            <input name="account" required placeholder={t(locale, "Ej: Faena Norte / Obra X / CC-101", "e.g. Site North / Project X / CC-101")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Notas", "Notes")}</label>
            <input name="notes" placeholder={t(locale, "Opcional", "Optional")} />
          </div>

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
                {[t(locale, "Unidad", "Unit"), t(locale, "Notas", "Notes"), t(locale, "Activa", "Active"), t(locale, "Acciones", "Actions")].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eee", whiteSpace: "nowrap", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const isActive = activeAccountId === r.id;
                const setActiveHref = `/${locale}/wizard/${engagementId}/tables/account-plan?accountId=${encodeURIComponent(r.id)}`;

                return (
                  <tr key={r.id} style={isActive ? { background: "#f1f5f9" } : undefined}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>
                      {r.account}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 260 }}>
                      {r.notes ?? ""}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                      <Link href={setActiveHref} style={{ textDecoration: "underline" }}>
                        {isActive ? t(locale, "Sí", "Yes") : t(locale, "Usar", "Use")}
                      </Link>
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                      <form action={deleteAccountPlanRowAction.bind(null, r.id, engagementId, locale)} style={{ display: "inline" }}>
                        <button type="submit" style={{ cursor: "pointer" }}>{t(locale, "Eliminar", "Delete")}</button>
                      </form>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 16, opacity: 0.7 }}>
                    {t(locale, "Aún no hay unidades. Crea al menos 1 para poder filtrar.", "No units yet. Create at least 1 to filter.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
