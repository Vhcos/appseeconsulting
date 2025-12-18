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

async function createDecisionAction(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const dateRaw = String(formData.get("date") ?? "").trim();
  const date = dateRaw ? new Date(`${dateRaw}T00:00:00.000Z`) : null;

  const decision = String(formData.get("decision") ?? "").trim();
  if (!decision) return;

  const options = String(formData.get("options") ?? "").trim() || null;
  const recommendation = String(formData.get("recommendation") ?? "").trim() || null;
  const responsible = String(formData.get("responsible") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const evidenceUrl = String(formData.get("evidenceUrl") ?? "").trim() || null;
  const evidenceLabel = String(formData.get("evidenceLabel") ?? "").trim() || null;

  await prisma.decision.create({
    data: {
      engagementId,
      date,
      decision,
      options,
      recommendation,
      responsible,
      status,
      notes,
      evidences: evidenceUrl
        ? {
            create: {
              url: evidenceUrl,
              label: evidenceLabel || "Evidencia",
            },
          }
        : undefined,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/decisions`);
}

async function deleteDecisionAction(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.decision.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/decisions`);
}

export default async function DecisionsPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const decisions = await prisma.decision.findMany({
    where: { engagementId },
    include: { evidences: true },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{t(locale, "Decisiones", "Decisions")}</h2>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            {t(locale, "Tabla igual al Anexo: registro de decisiones.", "Table matching the Annex: decision log.")}
          </p>
        </div>
        <Link href={`/${locale}/wizard/${engagementId}`}>{t(locale, "Volver", "Back")}</Link>
      </div>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(locale, "Nueva decisión", "New decision")}</h3>

        <form action={createDecisionAction.bind(null, engagementId, locale)} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Fecha", "Date")}</label>
            <input name="date" type="date" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Decisión", "Decision")}</label>
            <input name="decision" required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Opciones", "Options")}</label>
            <input name="options" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Recomendación", "Recommendation")}</label>
            <input name="recommendation" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Responsable / Estado", "Responsible / Status")}</label>
            <input name="responsible" placeholder={t(locale, "Responsable", "Responsible")} />
            <input name="status" placeholder={t(locale, "Estado", "Status")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Evidencia", "Evidence")}</label>
            <input name="evidenceLabel" placeholder={t(locale, "Etiqueta", "Label")} />
            <input name="evidenceUrl" placeholder="https://..." />
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
                  t(locale, "Fecha", "Date"),
                  t(locale, "Decisión", "Decision"),
                  t(locale, "Opciones", "Options"),
                  t(locale, "Recomendación", "Recommendation"),
                  t(locale, "Responsable", "Responsible"),
                  t(locale, "Evidencia", "Evidence"),
                  t(locale, "Estado", "Status"),
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
              {decisions.map((d) => {
                const ev = d.evidences?.[0] ?? null;
                return (
                  <tr key={d.id}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>{fmtDate(d.date)}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 240 }}>{d.decision}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>{d.options ?? ""}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 240 }}>{d.recommendation ?? ""}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 160 }}>{d.responsible ?? ""}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>
                      {ev?.url ? (
                        <a href={ev.url} target="_blank" rel="noreferrer">
                          {ev.label ?? ev.url}
                        </a>
                      ) : (
                        ""
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 140 }}>{d.status ?? ""}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 240 }}>{d.notes ?? ""}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                      <form action={deleteDecisionAction.bind(null, d.id, engagementId, locale)} style={{ display: "inline" }}>
                        <button type="submit" style={{ cursor: "pointer" }}>{t(locale, "Eliminar", "Delete")}</button>
                      </form>
                    </td>
                  </tr>
                );
              })}

              {decisions.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 16, opacity: 0.7 }}>{t(locale, "Aún no hay decisiones.", "No decisions yet.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
