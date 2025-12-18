import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function fmtDate(d?: Date | null) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function createRiskAction(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const externalId = String(formData.get("externalId") ?? "").trim() || null;
  const risk = String(formData.get("risk") ?? "").trim();
  if (!risk) return;

  const probabilityRaw = String(formData.get("probability") ?? "").trim();
  const impactRaw = String(formData.get("impact") ?? "").trim();

  const probability = probabilityRaw ? Number(probabilityRaw) : null;
  const impact = impactRaw ? Number(impactRaw) : null;

  const mitigation = String(formData.get("mitigation") ?? "").trim() || null;
  const owner = String(formData.get("owner") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "").trim() || null;

  const reviewDateRaw = String(formData.get("reviewDate") ?? "").trim();
  const reviewDate = reviewDateRaw ? new Date(`${reviewDateRaw}T00:00:00.000Z`) : null;

  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.risk.create({
    data: {
      engagementId,
      externalId,
      risk,
      probability: Number.isFinite(probability as number) ? (probability as number) : null,
      impact: Number.isFinite(impact as number) ? (impact as number) : null,
      mitigation,
      owner,
      status,
      reviewDate,
      notes,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/risks`);
}

async function deleteRiskAction(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.risk.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/risks`);
}

export default async function RisksPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const risks = await prisma.risk.findMany({
    where: { engagementId },
    orderBy: [{ reviewDate: "desc" }, { id: "desc" }],
  });

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{t(locale, "Riesgos", "Risks")}</h2>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            {t(locale, "Tabla igual al Anexo: riesgos y mitigación.", "Table matching the Annex: risks and mitigation.")}
          </p>
        </div>
        <Link href={`/${locale}/wizard/${engagementId}`}>{t(locale, "Volver", "Back")}</Link>
      </div>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(locale, "Nuevo riesgo", "New risk")}</h3>

        <form action={createRiskAction.bind(null, engagementId, locale)} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>ID</label>
            <input name="externalId" placeholder={t(locale, "Ej: R-01", "e.g. R-01")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Riesgo", "Risk")}</label>
            <input name="risk" required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Prob / Impacto", "Prob / Impact")}</label>
            <input name="probability" type="number" placeholder={t(locale, "Prob", "Prob")} />
            <input name="impact" type="number" placeholder={t(locale, "Impacto", "Impact")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Mitigación", "Mitigation")}</label>
            <input name="mitigation" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Dueño / Estado / Revisión", "Owner / Status / Review")}</label>
            <input name="owner" placeholder={t(locale, "Dueño", "Owner")} />
            <input name="status" placeholder={t(locale, "Estado", "Status")} />
            <input name="reviewDate" type="date" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "start" }}>
            <label>{t(locale, "Notas", "Notes")}</label>
            <textarea name="notes" rows={3} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit">{t(locale, "Crear", "Create")}</button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: 16 }}>
        <div style={{ overflowX: "auto", border: "1px solid #e5e5e5", borderRadius: 12 }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {[
                  "ID",
                  t(locale, "Riesgo", "Risk"),
                  t(locale, "Prob", "Prob"),
                  t(locale, "Impacto", "Impact"),
                  t(locale, "Mitigación", "Mitigation"),
                  t(locale, "Dueño", "Owner"),
                  t(locale, "Estado", "Status"),
                  t(locale, "Fecha revisión", "Review date"),
                  t(locale, "Notas", "Notes"),
                  t(locale, "Acciones", "Actions"),
                ].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eee", whiteSpace: "nowrap", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>{r.externalId ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 260 }}>{r.risk}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3" }}>{r.probability ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3" }}>{r.impact ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>{r.mitigation ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 140 }}>{r.owner ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 140 }}>{r.status ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>{fmtDate(r.reviewDate)}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 240 }}>{r.notes ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                    <form action={deleteRiskAction.bind(null, r.id, engagementId, locale)} style={{ display: "inline" }}>
                      <button type="submit" style={{ cursor: "pointer" }}>{t(locale, "Eliminar", "Delete")}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {risks.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: 16, opacity: 0.7 }}>{t(locale, "Aún no hay riesgos.", "No risks yet.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
