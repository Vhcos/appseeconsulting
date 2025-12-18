import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BscPerspective } from "@prisma/client";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function perspectiveLabel(locale: string, p: BscPerspective) {
  const map: Record<BscPerspective, { es: string; en: string }> = {
    FINANCIAL: { es: "Financiera", en: "Financial" },
    CUSTOMER: { es: "Cliente", en: "Customer" },
    INTERNAL_PROCESS: { es: "Proceso interno", en: "Internal process" },
    LEARNING_GROWTH: { es: "Aprendizaje y crecimiento", en: "Learning & growth" },
  };
  return t(locale, map[p].es, map[p].en);
}

function fmtDate(d?: Date | null) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function createInitiativeAction(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const perspective = String(formData.get("perspective") ?? "").trim() as BscPerspective;

  if (!title) return;

  const externalId = String(formData.get("externalId") ?? "").trim() || null;
  const problem = String(formData.get("problem") ?? "").trim() || null;

  const kpiId = String(formData.get("kpiId") ?? "").trim() || null;

  const impactRaw = String(formData.get("impact") ?? "").trim();
  const effortRaw = String(formData.get("effort") ?? "").trim();
  const riskRaw = String(formData.get("risk") ?? "").trim();

  const impact = impactRaw ? Number(impactRaw) : null;
  const effort = effortRaw ? Number(effortRaw) : null;
  const risk = riskRaw ? Number(riskRaw) : null;

  const costEst = String(formData.get("costEst") ?? "").trim() || null;
  const owner = String(formData.get("owner") ?? "").trim() || null;
  const sponsor = String(formData.get("sponsor") ?? "").trim() || null;

  const startDateRaw = String(formData.get("startDate") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim();

  const startDate = startDateRaw ? new Date(`${startDateRaw}T00:00:00.000Z`) : null;
  const endDate = endDateRaw ? new Date(`${endDateRaw}T00:00:00.000Z`) : null;

  const status = String(formData.get("status") ?? "").trim() || null;
  const definitionDone = String(formData.get("definitionDone") ?? "").trim() || null;
  const dependencies = String(formData.get("dependencies") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.initiative.create({
    data: {
      engagementId,
      externalId,
      title,
      perspective,
      problem,
      kpiId,
      impact: Number.isFinite(impact as number) ? (impact as number) : null,
      effort: Number.isFinite(effort as number) ? (effort as number) : null,
      risk: Number.isFinite(risk as number) ? (risk as number) : null,
      costEst,
      owner,
      sponsor,
      startDate,
      endDate,
      status,
      definitionDone,
      dependencies,
      notes,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/initiatives`);
}

async function deleteInitiativeAction(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.initiative.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/initiatives`);
}

export default async function InitiativesPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const [initiatives, kpis] = await Promise.all([
    prisma.initiative.findMany({
      where: { engagementId },
      // OJO: tu schema NO tiene createdAt en Initiative, por eso NO lo usamos aquí.
      orderBy: [{ startDate: "desc" }, { id: "desc" }],
    }),
    prisma.kpi.findMany({
      where: { engagementId },
      orderBy: [{ id: "desc" }],
      select: { id: true, nameEs: true, nameEn: true },
    }),
  ]);

  const title = t(locale, "Iniciativas", "Initiatives");

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            {t(
              locale,
              "Tabla igual al Anexo: iniciativas y su seguimiento.",
              "Table matching the Annex: initiatives and tracking."
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Link href={`/${locale}/wizard/${engagementId}`}>{t(locale, "Volver", "Back")}</Link>
        </div>
      </div>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(locale, "Nueva iniciativa", "New initiative")}</h3>

        <form action={createInitiativeAction.bind(null, engagementId, locale)} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>ID</label>
            <input name="externalId" placeholder={t(locale, "Ej: INI-01", "e.g. INI-01")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Iniciativa", "Initiative")}</label>
            <input name="title" required placeholder={t(locale, "Título corto", "Short title")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Perspectiva", "Perspective")}</label>
            <select name="perspective" defaultValue="CUSTOMER">
              <option value="FINANCIAL">{perspectiveLabel(locale, "FINANCIAL")}</option>
              <option value="CUSTOMER">{perspectiveLabel(locale, "CUSTOMER")}</option>
              <option value="INTERNAL_PROCESS">{perspectiveLabel(locale, "INTERNAL_PROCESS")}</option>
              <option value="LEARNING_GROWTH">{perspectiveLabel(locale, "LEARNING_GROWTH")}</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Problema", "Problem")}</label>
            <input name="problem" placeholder={t(locale, "¿Qué problema resuelve?", "What problem does it solve?")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "KPI asociado", "Linked KPI")}</label>
            <select name="kpiId" defaultValue="">
              <option value="">{t(locale, "Sin KPI", "No KPI")}</option>
              {kpis.map((k) => (
                <option key={k.id} value={k.id}>
                  {t(locale, k.nameEs, k.nameEn)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Impacto / Esfuerzo / Riesgo", "Impact / Effort / Risk")}</label>
            <input name="impact" type="number" placeholder={t(locale, "Impacto", "Impact")} />
            <input name="effort" type="number" placeholder={t(locale, "Esfuerzo", "Effort")} />
            <input name="risk" type="number" placeholder={t(locale, "Riesgo", "Risk")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Costo est.", "Est. cost")}</label>
            <input name="costEst" placeholder={t(locale, "Ej: USD 3.000 / Mes", "e.g. USD 3,000 / Month")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Dueño / Sponsor", "Owner / Sponsor")}</label>
            <input name="owner" placeholder={t(locale, "Dueño", "Owner")} />
            <input name="sponsor" placeholder={t(locale, "Sponsor", "Sponsor")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Inicio / Fin", "Start / End")}</label>
            <input name="startDate" type="date" />
            <input name="endDate" type="date" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Estado", "Status")}</label>
            <input name="status" placeholder={t(locale, "Ej: En curso", "e.g. In progress")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Def. terminado", "Definition done")}</label>
            <input name="definitionDone" placeholder={t(locale, "Sí/No + criterio", "Yes/No + criteria")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Dependencias", "Dependencies")}</label>
            <input name="dependencies" />
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
                  t(locale, "Iniciativa", "Initiative"),
                  t(locale, "Perspectiva", "Perspective"),
                  t(locale, "Problema", "Problem"),
                  t(locale, "KPI asociado", "Linked KPI"),
                  t(locale, "Impacto", "Impact"),
                  t(locale, "Esfuerzo", "Effort"),
                  t(locale, "Riesgo", "Risk"),
                  t(locale, "Costo est.", "Est. cost"),
                  t(locale, "Dueño", "Owner"),
                  "Sponsor",
                  t(locale, "Inicio", "Start"),
                  t(locale, "Fin", "End"),
                  t(locale, "Estado", "Status"),
                  t(locale, "Def. terminado", "Definition done"),
                  t(locale, "Dependencias", "Dependencies"),
                  t(locale, "Notas", "Notes"),
                  t(locale, "Acciones", "Actions"),
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderBottom: "1px solid #eee",
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {initiatives.map((it) => {
                const kpi = it.kpiId ? kpis.find((k) => k.id === it.kpiId) : null;

                return (
                  <tr key={it.id}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                      {it.externalId ?? ""}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>
                      {it.title}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                      {perspectiveLabel(locale, it.perspective)}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 240 }}>
                      {it.problem ?? ""}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>
                      {kpi ? t(locale, kpi.nameEs, kpi.nameEn) : ""}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3" }}>{it.impact ?? ""}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3" }}>{it.effort ?? ""}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3" }}>{it.risk ?? ""}</td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 160 }}>
                      {it.costEst ?? ""}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 140 }}>
                      {it.owner ?? ""}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 140 }}>
                      {it.sponsor ?? ""}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                      {fmtDate(it.startDate)}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                      {fmtDate(it.endDate)}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 140 }}>
                      {it.status ?? ""}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 160 }}>
                      {it.definitionDone ?? ""}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 180 }}>
                      {it.dependencies ?? ""}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 220 }}>
                      {it.notes ?? ""}
                    </td>

                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                      <form
                        action={deleteInitiativeAction.bind(null, it.id, engagementId, locale)}
                        style={{ display: "inline" }}
                      >
                        <button type="submit" style={{ cursor: "pointer" }}>
                          {t(locale, "Eliminar", "Delete")}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}

              {initiatives.length === 0 && (
                <tr>
                  <td colSpan={18} style={{ padding: 16, opacity: 0.7 }}>
                    {t(locale, "Aún no hay iniciativas.", "No initiatives yet.")}
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
