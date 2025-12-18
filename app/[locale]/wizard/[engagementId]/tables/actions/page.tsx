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

async function createActionItem(engagementId: string, locale: string, formData: FormData) {
  "use server";

  const task = String(formData.get("task") ?? "").trim();
  if (!task) return;

  const owner = String(formData.get("owner") ?? "").trim() || null;

  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const dueDate = dueDateRaw ? new Date(`${dueDateRaw}T00:00:00.000Z`) : null;

  const status = String(formData.get("status") ?? "").trim() || null;
  const blocker = String(formData.get("blocker") ?? "").trim() || null;
  const comments = String(formData.get("comments") ?? "").trim() || null;

  await prisma.actionItem.create({
    data: { engagementId, task, owner, dueDate, status, blocker, comments },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/actions`);
}

async function deleteActionItem(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.actionItem.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/actions`);
}

export default async function ActionsPage({ params }: { params: ParamsPromise }) {
  const { locale, engagementId } = await params;

  const rows = await prisma.actionItem.findMany({
    where: { engagementId },
    orderBy: [{ dueDate: "desc" }, { id: "desc" }],
  });

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{t(locale, "Acciones", "Actions")}</h2>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            {t(locale, "Tabla igual al Anexo: Acciones.", "Table matching the Annex: Actions.")}
          </p>
        </div>
        <Link href={`/${locale}/wizard/${engagementId}`}>{t(locale, "Volver", "Back")}</Link>
      </div>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #e5e5e5", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(locale, "Nueva acción", "New action")}</h3>

        <form action={createActionItem.bind(null, engagementId, locale)} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Tarea", "Task")}</label>
            <input name="task" required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Dueño / Fecha", "Owner / Date")}</label>
            <input name="owner" />
            <input name="dueDate" type="date" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Estado", "Status")}</label>
            <input name="status" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <label>{t(locale, "Bloqueador", "Blocker")}</label>
            <input name="blocker" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "start" }}>
            <label>{t(locale, "Comentarios", "Comments")}</label>
            <textarea name="comments" rows={3} />
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
                  t(locale, "Tarea", "Task"),
                  t(locale, "Dueño", "Owner"),
                  t(locale, "Fecha", "Date"),
                  t(locale, "Estado", "Status"),
                  t(locale, "Bloqueador", "Blocker"),
                  t(locale, "Comentarios", "Comments"),
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
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 260 }}>{r.task}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 140 }}>{r.owner ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>{fmtDate(r.dueDate)}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 120 }}>{r.status ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 180 }}>{r.blocker ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", minWidth: 260 }}>{r.comments ?? ""}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                    <form action={deleteActionItem.bind(null, r.id, engagementId, locale)} style={{ display: "inline" }}>
                      <button type="submit" style={{ cursor: "pointer" }}>
                        {t(locale, "Eliminar", "Delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 16, opacity: 0.7 }}>
                    {t(locale, "Aún no hay acciones.", "No actions yet.")}
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
