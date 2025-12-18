import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function decOrNull(v: string) {
  const s = v.trim();
  if (!s) return null;
  try {
    return new Prisma.Decimal(s);
  } catch {
    return null;
  }
}

async function createUE(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const clientSite = String(formData.get("clientSite") ?? "").trim() || null;
  const modality = String(formData.get("modality") ?? "").trim() || null;

  const m2Month = decOrNull(String(formData.get("m2Month") ?? ""));
  const priceUsdM2 = decOrNull(String(formData.get("priceUsdM2") ?? ""));
  const revenueUsdMonth = decOrNull(String(formData.get("revenueUsdMonth") ?? ""));

  const directCosts = String(formData.get("directCosts") ?? "").trim() || null;
  const margin = String(formData.get("margin") ?? "").trim() || null;
  const marginPct = String(formData.get("marginPct") ?? "").trim() || null;
  const risks = String(formData.get("risks") ?? "").trim() || null;
  const evidence = String(formData.get("evidence") ?? "").trim() || null;

  await prisma.unitEconomicsRow.create({
    data: {
      engagementId,
      clientSite,
      modality,
      m2Month,
      priceUsdM2,
      revenueUsdMonth,
      directCosts,
      margin,
      marginPct,
      risks,
      evidence,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/unit-economics`);
}

async function deleteUE(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.unitEconomicsRow.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/unit-economics`);
}

export default async function UnitEconomicsPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const rows = await prisma.unitEconomicsRow.findMany({
    where: { engagementId },
    orderBy: [{ id: "desc" }],
  });

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{t(locale, "Unit economics", "Unit economics")}</h2>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            {t(locale, "Tabla igual al Anexo: unit economics por cliente/faena.", "Table matching the Annex: unit economics per client/site.")}
          </p>
        </div>
        <Link href={`/${locale}/wizard/${engagementId}`}>{t(locale, "Volver", "Back")}</Link>
      </div>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(locale, "Nueva fila", "New row")}</h3>

        <form action={createUE.bind(null, engagementId, locale)} style={{ display: "grid", gap: 10 }}>
          {[
            ["clientSite", t(locale, "Cliente/Faena", "Client/Site")],
            ["modality", t(locale, "Modalidad", "Modality")],
          ].map(([name, label]) => (
            <div key={name} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, alignItems: "center" }}>
              <label>{label}</label>
              <input name={name} />
            </div>
          ))}

          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "m²/mes / Precio USD/m² / Ingreso USD/mes", "m²/month / USD/m² / USD/month revenue")}</label>
            <input name="m2Month" placeholder="0" />
            <input name="priceUsdM2" placeholder="0" />
            <input name="revenueUsdMonth" placeholder="0" />
          </div>

          {[
            ["directCosts", t(locale, "Costos directos", "Direct costs")],
            ["margin", t(locale, "Margen", "Margin")],
            ["marginPct", t(locale, "Margen %", "Margin %")],
            ["risks", t(locale, "Riesgos", "Risks")],
            ["evidence", t(locale, "Evidencia", "Evidence")],
          ].map(([name, label]) => (
            <div key={name} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, alignItems: "center" }}>
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
                  t(locale, "Cliente/Faena", "Client/Site"),
                  t(locale, "Modalidad", "Modality"),
                  "m²/mes",
                  "Precio USD/m²",
                  "Ingreso USD/mes",
                  t(locale, "Costos directos", "Direct costs"),
                  t(locale, "Margen", "Margin"),
                  t(locale, "Margen %", "Margin %"),
                  t(locale, "Riesgos", "Risks"),
                  t(locale, "Evidencia", "Evidence"),
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
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 180 }}>{r.clientSite ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 140 }}>{r.modality ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3" }}>{r.m2Month?.toString() ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3" }}>{r.priceUsdM2?.toString() ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3" }}>{r.revenueUsdMonth?.toString() ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>{r.directCosts ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 140 }}>{r.margin ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 120 }}>{r.marginPct ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>{r.risks ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>{r.evidence ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                    <form action={deleteUE.bind(null, r.id, engagementId, locale)} style={{ display: "inline" }}>
                      <button type="submit" style={{ cursor: "pointer" }}>{t(locale, "Eliminar", "Delete")}</button>
                    </form>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding: 16, opacity: 0.7 }}>{t(locale, "Aún no hay filas.", "No rows yet.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
