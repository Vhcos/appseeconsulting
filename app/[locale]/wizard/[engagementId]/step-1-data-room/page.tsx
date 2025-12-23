import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import WizardStepsNav from "@/components/see/WizardStepsNav";
import { DATA_ROOM_MASTER } from "@/lib/data-room-master";
import { DataRoomArea, ProgressStatus } from "@prisma/client";

type ParamsPromise = Promise<{ locale: string; engagementId: string }>;

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

const AREA_LABELS: Record<DataRoomArea, { es: string; en: string }> = {
  GOVERNANCE: {
    es: "Gobierno y organización",
    en: "Governance & organization",
  },
  COMMERCIAL: {
    es: "Comercial",
    en: "Commercial",
  },
  OPERATIONS: {
    es: "Operaciones",
    en: "Operations",
  },
  HSEC: {
    es: "HSEC (Seguridad, Medioambiente y Comunidad)",
    en: "HSEC (Health, Safety, Environment & Community)",
  },
  DATA_TECH: {
    es: "Datos y tecnología",
    en: "Data & technology",
  },
  FINANCE: {
    es: "Finanzas",
    en: "Finance",
  },
};

const STATUS_OPTIONS: {
  value: ProgressStatus;
  labelEs: string;
  labelEn: string;
}[] = [
  { value: "NOT_STARTED", labelEs: "No iniciado", labelEn: "Not started" },
  { value: "OFF_TRACK", labelEs: "Desviado", labelEn: "Off track" },
  { value: "IN_PROGRESS", labelEs: "Progresando", labelEn: "In progress" },
  {
    value: "ON_TRACK",
    labelEs: "Según lo planificado",
    labelEn: "On track",
  },
];

async function initDataRoom(engagementId: string, locale: string) {
  "use server";

  const existing = await prisma.dataRoomItem.count({
    where: { engagementId },
  });

  if (existing === 0) {
    await prisma.dataRoomItem.createMany({
      data: DATA_ROOM_MASTER.map((item) => ({
        engagementId,
        area: item.area,
        code: item.code,
        title: item.title,
        description: item.description,
      })),
    });
  }

  revalidatePath(`/${locale}/wizard/${engagementId}/step-1-data-room`);
}

async function updateDataRoomItem(
  formData: FormData,
  engagementId: string,
  locale: string,
) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const statusRaw = formData.get("status");
  const status =
    statusRaw && typeof statusRaw === "string"
      ? (statusRaw as ProgressStatus)
      : undefined;

  const owner = (formData.get("owner") as string | null)?.trim() || null;
  const dueDateStr = (formData.get("dueDate") as string | null)?.trim() || "";
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const hasData = formData.get("hasData") === "on";

  await prisma.dataRoomItem.update({
    where: { id },
    data: {
      status,
      owner,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      notes,
      hasData,
    },
  });

  revalidatePath(`/${locale}/wizard/${engagementId}/step-1-data-room`);
}

export default async function Step1DataRoomPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { locale, engagementId } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
  });

  if (!engagement) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="mb-4 text-lg font-medium">
          {t(locale, "No existe este engagement.", "Engagement not found.")}
        </p>
        <Link href={`/${locale}/wizard`} className="text-indigo-600 underline">
          {t(locale, "Volver", "Back")}
        </Link>
      </main>
    );
  }

  const items = await prisma.dataRoomItem.findMany({
    where: { engagementId },
    orderBy: [{ area: "asc" }, { code: "asc" }],
  });

  const itemsByArea = new Map<DataRoomArea, typeof items>();

  for (const item of items) {
    const arr = itemsByArea.get(item.area) ?? [];
    arr.push(item);
    itemsByArea.set(item.area, arr);
  }

  const hasChecklist = items.length > 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <WizardStepsNav
        locale={locale}
        engagementId={engagementId}
        currentStep="step-1-data-room"
      />

      {/* Intro */}
      <section className="mt-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          {t(locale, "Data Room", "Data Room")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          {t(
            locale,
            "Revisamos la información disponible: contratos, volúmenes, precios, costos y otros datos clave del negocio. El objetivo es dejar todo lo crítico en un solo lugar antes de pasar al diagnóstico 360°.",
            "We review the available information: contracts, volumes, prices, costs and other key business data. The goal is to centralize all critical inputs before moving to the 360° diagnosis.",
          )}
        </p>
      </section>

      {/* Conexión a tablas fuertes */}
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(
              locale,
              "Contrato clave / Plan de cuenta",
              "Key contract / account plan",
            )}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            {t(
              locale,
              "Carga al menos el contrato principal y los datos de facturación en la tabla de Plan de cuenta.",
              "Load at least the main contract and billing data in the Account Plan table.",
            )}
          </p>
          <div className="mt-3">
            <Link
              href={`/${locale}/wizard/${engagementId}/tables/account-plan`}
              className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              {t(
                locale,
                "Abrir tabla Plan de cuenta",
                "Open Account Plan table",
              )}
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {t(locale, "Unit economics", "Unit economics")}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            {t(
              locale,
              "Registra precios, costos, márgenes y volúmenes por contrato o faena. Esta tabla alimenta los análisis económicos posteriores.",
              "Record prices, costs, margins and volumes per contract/site. This table feeds later economic analysis.",
            )}
          </p>
          <div className="mt-3">
            <Link
              href={`/${locale}/wizard/${engagementId}/tables/unit-economics`}
              className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              {t(
                locale,
                "Abrir tabla Unit economics",
                "Open Unit economics table",
              )}
            </Link>
          </div>
        </article>
      </section>

      {/* Checklist Anexo A.2 */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {t(
                locale,
                "Checklist de insumos (Anexo A.2)",
                "Input checklist (Annex A.2)",
              )}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                locale,
                "Usamos este checklist para asegurarnos de que no falte ninguna evidencia clave. Cada fila debe tener al menos estado, responsable y fecha objetivo.",
                "We use this checklist to ensure no critical evidence is missing. Each row should have at least status, owner and target date.",
              )}
            </p>
          </div>

          {!hasChecklist && (
            <form
              action={async () => {
                "use server";
                await initDataRoom(engagementId, locale);
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                {t(
                  locale,
                  "Crear checklist de Data Room",
                  "Create Data Room checklist",
                )}
              </button>
            </form>
          )}
        </div>

        {hasChecklist ? (
          <div className="mt-6 space-y-6">
            {Object.values(DataRoomArea).map((areaKey) => {
              const areaItems =
                itemsByArea.get(areaKey as DataRoomArea) ?? [];
              if (areaItems.length === 0) return null;
              const labels = AREA_LABELS[areaKey as DataRoomArea];

              return (
                <section
                  key={areaKey}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t(locale, labels.es, labels.en)}
                  </h3>

                  {/* cabecera tipo tabla */}
                  <div className="mt-3 grid grid-cols-6 gap-3 text-[11px] font-medium text-slate-500">
                    <div>{t(locale, "Insumo", "Item")}</div>
                    <div>{t(locale, "Estado", "Status")}</div>
                    <div>{t(locale, "Responsable", "Owner")}</div>
                    <div>{t(locale, "Fecha objetivo", "Target date")}</div>
                    <div>{t(locale, "¿Subido?", "Uploaded?")}</div>
                    <div>{t(locale, "Notas / Guardar", "Notes / Save")}</div>
                  </div>

                  {/* filas */}
                  <div className="mt-2 space-y-2">
                    {areaItems.map((item) => (
                      <form
                        key={item.id}
                        action={async (formData) => {
                          "use server";
                          await updateDataRoomItem(
                            formData,
                            engagementId,
                            locale,
                          );
                        }}
                        className="grid grid-cols-6 gap-3 items-start rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                      >
                        <input type="hidden" name="id" value={item.id} />

                        {/* Insumo */}
                        <div className="text-xs text-slate-800">
                          <div className="font-medium">
                            {item.code} — {item.title}
                          </div>
                          {item.description && (
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {item.description}
                            </div>
                          )}
                        </div>

                        {/* Estado */}
                        <div>
                          <select
                            name="status"
                            defaultValue={item.status ?? "NOT_STARTED"}
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {t(locale, opt.labelEs, opt.labelEn)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Responsable */}
                        <div>
                          <input
                            name="owner"
                            defaultValue={item.owner ?? ""}
                            placeholder={t(
                              locale,
                              "Ej: Jefe de Operaciones",
                              "E.g. Operations lead",
                            )}
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                          />
                        </div>

                        {/* Fecha objetivo */}
                        <div>
                          <input
                            type="date"
                            name="dueDate"
                            defaultValue={
                              item.dueDate
                                ? item.dueDate.toISOString().slice(0, 10)
                                : ""
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                          />
                        </div>

                        {/* ¿Subido? */}
                        <div className="flex items-center gap-2 text-xs">
                          <input
                            id={`hasData-${item.id}`}
                            type="checkbox"
                            name="hasData"
                            defaultChecked={item.hasData ?? false}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <label
                            htmlFor={`hasData-${item.id}`}
                            className="text-slate-700"
                          >
                            {t(locale, "Listo", "Ready")}
                          </label>
                        </div>

                        {/* Notas + Guardar */}
                        <div className="flex flex-col gap-2">
                          <textarea
                            name="notes"
                            defaultValue={item.notes ?? ""}
                            rows={2}
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                            placeholder={t(
                              locale,
                              "Ej: Falta consolidar datos de 2023.",
                              "E.g. Need to consolidate 2023 data.",
                            )}
                          />
                          <button
                            type="submit"
                            className="self-end rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
                          >
                            {t(locale, "Guardar", "Save")}
                          </button>
                        </div>
                      </form>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            {t(
              locale,
              "Todavía no has creado el checklist de Data Room. Usa el botón de arriba para generar las 22 filas del Anexo A.2.",
              "You have not created the Data Room checklist yet. Use the button above to generate the 22 rows from Annex A.2.",
            )}
          </p>
        )}
      </section>
    </main>
  );
}
