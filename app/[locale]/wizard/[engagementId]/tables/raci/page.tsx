import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

async function createRaci(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const initiativeName = String(formData.get("initiativeName") ?? "").trim();
  if (!initiativeName) return;

  const responsible = String(formData.get("responsible") ?? "").trim() || null;
  const approver = String(formData.get("approver") ?? "").trim() || null;
  const consulted = String(formData.get("consulted") ?? "").trim() || null;
  const informed = String(formData.get("informed") ?? "").trim() || null;

  await prisma.raciRow.create({
    data: { engagementId, initiativeName, responsible, approver, consulted, informed },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/raci`);
}

async function deleteRaci(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.raciRow.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/raci`);
}

export default async function RaciPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const rows = await prisma.raciRow.findMany({
    where: { engagementId },
    orderBy: [{ initiativeName: "asc" }, { id: "asc" }],
  });

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>RACI</h2>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            {t(locale, "Tabla igual al Anexo: Responsible, Accountable, Consulted, Informed.", "Table matching the Annex: Responsible, Accountable, Consulted, Informed.")}
          </p>
        </div>
        <Link href={`/${locale}/wizard/${engagementId}`}>{t(locale, "Volver", "Back")}</Link>
      </div>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(locale, "Nueva fila", "New row")}</h3>

        <form action={createRaci.bind(null, engagementId, locale)} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Iniciativa", "Initiative")}</label>
            <input name="initiativeName" required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr 1fr 1fr", gap: 10, alignItems: "center" }}>
            <label>R / A / C / I</label>
            <input name="responsible" placeholder={t(locale, "Responsible", "Responsible")} />
            <input name="approver" placeholder={t(locale, "Accountable", "Accountable")} />
            <input name="consulted" placeholder={t(locale, "Consulted", "Consulted")} />
            <input name="informed" placeholder={t(locale, "Informed", "Informed")} />
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
                {[
                  t(locale, "Iniciativa", "Initiative"),
                  "Responsible",
                  "Accountable",
                  "Consulted",
                  "Informed",
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
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 240 }}>{r.initiativeName}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 160 }}>{r.responsible ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 160 }}>{r.approver ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 160 }}>{r.consulted ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 160 }}>{r.informed ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                    <form action={deleteRaci.bind(null, r.id, engagementId, locale)} style={{ display: "inline" }}>
                      <button type="submit" style={{ cursor: "pointer" }}>{t(locale, "Eliminar", "Delete")}</button>
                    </form>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 16, opacity: 0.7 }}>{t(locale, "Aún no hay filas RACI.", "No RACI rows yet.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
