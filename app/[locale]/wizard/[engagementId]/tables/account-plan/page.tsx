import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;
type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function readString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const v = sp[key];
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v)) return (v[0] ?? "").trim() || null;
  return null;
}

function sanitizeSegment(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.includes("/") || s.includes("\\") || s.includes("..")) return null;
  if (s.length > 120) return null;
  return s;
}

function normalizeMaybeNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

async function createRow(engagementId: string, locale: string, formData: FormData) {
  "use server";

  await prisma.accountPlanRow.create({
    data: {
      engagementId,
      account: normalizeMaybeNull(formData.get("account")),
      goal12m: normalizeMaybeNull(formData.get("goal12m")),
      decisionMakers: normalizeMaybeNull(formData.get("decisionMakers")),
      competitors: normalizeMaybeNull(formData.get("competitors")),
      mainPain: normalizeMaybeNull(formData.get("mainPain")),
      valueProp: normalizeMaybeNull(formData.get("valueProp")),
      agenda8w: normalizeMaybeNull(formData.get("agenda8w")),
      nextStep: normalizeMaybeNull(formData.get("nextStep")),
      status: normalizeMaybeNull(formData.get("status")),
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/tables/account-plan`);
}

async function deleteRow(id: string, engagementId: string, locale: string) {
  "use server";
  await prisma.accountPlanRow.delete({ where: { id } });
  revalidatePath(`/${locale}/wizard/${engagementId}/tables/account-plan`);
}

export default async function AccountPlanPage({
  params,
  searchParams,
}: {
  params: ParamsPromise;
  searchParams?: SearchParamsPromise;
}) {
  const { locale, engagementId } = await params;
  const sp = (searchParams ? await searchParams : {}) as Record<string, string | string[] | undefined>;

  const activeAccountId = sanitizeSegment(readString(sp, "accountId"));

  const rows = await prisma.accountPlanRow.findMany({
    where: { engagementId },
    orderBy: [{ id: "desc" }],
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t(locale, "Estructura por unidad operativa", "Structure by operational unit")}
          </p>

          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {t(locale, "Unidades operativas", "Operational units")}
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            {t(
              locale,
              "Crea tus unidades operativas (por ejemplo: faena, obra, sucursal, contrato o cliente). Luego podrás asignar iniciativas, roadmap, unit economics y KPIs por unidad.",
              "Create your operational units (for example: site, project, branch, contract, or client). Later you can scope initiatives, roadmap, unit economics, and KPIs per unit.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/wizard/${engagementId}/tables`}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← {t(locale, "Volver", "Back")}
          </Link>
        </div>
      </div>

      {activeAccountId && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          {t(locale, "Unidad operativa activa:", "Active operational unit:")}{" "}
          <span className="font-semibold">{activeAccountId}</span>
          <span className="ml-2 text-slate-500">
            ({t(locale, "solo referencia por parámetro en la URL", "just a URL parameter reference")})
          </span>
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t(locale, "Nueva unidad operativa", "New operational unit")}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Parte con 1 unidad y agrega más cuando lo necesites.",
                "Start with one unit and add more later.",
              )}
            </p>
          </div>
        </div>

        <form action={createRow.bind(null, engagementId, locale)} className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Unidad operativa", "Operational unit")}
              </label>
              <input
                name="account"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(
                  locale,
                  "Ej: Faena Los Bronces / Obra San Gregorio / Sucursal Temuco / Contrato X",
                  "e.g., Los Bronces site / San Gregorio project / Temuco branch / Contract X",
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Meta a 12 meses", "12-month goal")}
              </label>
              <input
                name="goal12m"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Renovar y expandir contrato", "e.g., Renew and expand contract")}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Decisores", "Decision makers")}
              </label>
              <textarea
                name="decisionMakers"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "- Gerente de Operaciones\n- Jefe de Mantención", "- Operations Manager\n- Maintenance Lead")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Competidores", "Competitors")}
              </label>
              <textarea
                name="competitors"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Empresa A, Empresa B", "e.g., Company A, Company B")}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Dolor principal", "Main pain")}
              </label>
              <textarea
                name="mainPain"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "¿Qué duele hoy y por qué importa?", "What hurts today and why does it matter?")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Propuesta de valor", "Value proposition")}
              </label>
              <textarea
                name="valueProp"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "¿Qué ofreces distinto y medible?", "What do you offer that is different and measurable?")}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Agenda 8 semanas", "8-week agenda")}
              </label>
              <textarea
                name="agenda8w"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Hitos concretos para las próximas 8 semanas", "Concrete milestones for the next 8 weeks")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Próximo paso", "Next step")}
              </label>
              <textarea
                name="nextStep"
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Acción inmediata (dueño, fecha, output)", "Immediate action (owner, date, output)")}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900">
                {t(locale, "Estado", "Status")}
              </label>
              <input
                name="status"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                placeholder={t(locale, "Ej: Activa / En negociación", "e.g., Active / Negotiating")}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              {t(locale, "Guardar unidad", "Save unit")}
            </button>

            <span className="ml-auto text-[11px] text-slate-500">
              {t(locale, "Unidades:", "Units:")} {rows.length}
            </span>
          </div>
        </form>
      </section>

      <section className="mt-6">
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1100px] border-collapse text-left text-xs">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                {[
                  t(locale, "Unidad operativa", "Operational unit"),
                  t(locale, "Meta 12 meses", "12-month goal"),
                  t(locale, "Decisores", "Decision makers"),
                  t(locale, "Competidores", "Competitors"),
                  t(locale, "Dolor", "Pain"),
                  t(locale, "Valor", "Value proposition"),
                  t(locale, "Agenda 8 semanas", "8-week agenda"),
                  t(locale, "Próximo paso", "Next step"),
                  t(locale, "Estado", "Status"),
                  t(locale, "Acción", "Action"),
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="min-w-[220px] px-3 py-2 align-top text-[11px] text-slate-900">{r.account ?? ""}</td>
                  <td className="min-w-[180px] px-3 py-2 align-top text-[11px] text-slate-700">{r.goal12m ?? ""}</td>
                  <td className="min-w-[170px] px-3 py-2 align-top text-[11px] text-slate-700 whitespace-pre-line">{r.decisionMakers ?? ""}</td>
                  <td className="min-w-[150px] px-3 py-2 align-top text-[11px] text-slate-700 whitespace-pre-line">{r.competitors ?? ""}</td>
                  <td className="min-w-[170px] px-3 py-2 align-top text-[11px] text-slate-700 whitespace-pre-line">{r.mainPain ?? ""}</td>
                  <td className="min-w-[170px] px-3 py-2 align-top text-[11px] text-slate-700 whitespace-pre-line">{r.valueProp ?? ""}</td>
                  <td className="min-w-[190px] px-3 py-2 align-top text-[11px] text-slate-700 whitespace-pre-line">{r.agenda8w ?? ""}</td>
                  <td className="min-w-[190px] px-3 py-2 align-top text-[11px] text-slate-700 whitespace-pre-line">{r.nextStep ?? ""}</td>
                  <td className="min-w-[120px] px-3 py-2 align-top text-[11px] text-slate-700">{r.status ?? ""}</td>
                  <td className="px-3 py-2 align-top text-[11px]">
                    <form action={deleteRow.bind(null, r.id, engagementId, locale)}>
                      <button
                        type="submit"
                        className="text-[11px] font-semibold text-slate-600 hover:text-rose-600"
                      >
                        {t(locale, "Eliminar", "Delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-sm text-slate-500">
                    {t(locale, "Aún no hay unidades. Crea la primera.", "No units yet. Create the first one.")}
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
