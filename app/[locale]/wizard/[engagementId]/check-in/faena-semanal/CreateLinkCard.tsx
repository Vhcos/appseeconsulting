"use client";

import { useMemo, useState, useActionState } from "react";

type FaenaLite = {
  id: string;
  name: string;
  adminEmail?: string | null;
};

type CreateLinkState =
  | { ok: false; error?: string; link?: never }
  | { ok: true; link: string; error?: never };

export default function CreateLinkCard({
  locale,
  engagementId,
  faenas,
  createLinkAction,
}: {
  locale: string;
  engagementId: string;
  faenas: FaenaLite[];
  createLinkAction: (prev: CreateLinkState, formData: FormData) => Promise<CreateLinkState>;
}) {
  const [faenaId, setFaenaId] = useState<string>(faenas?.[0]?.id ?? "");
  const [weekStart, setWeekStart] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const canSubmit = useMemo(() => !!faenaId && !!weekStart, [faenaId, weekStart]);

  function t(es: string, en: string) {
    return locale === "en" ? en : es;
  }

  const [state, formAction, pending] = useActionState<CreateLinkState, FormData>(
    createLinkAction,
    { ok: false } as CreateLinkState
  );

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
    } catch {}
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">
        {t("Crear link semanal", "Create weekly link")}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {t(
          "Genera un link sin login para que el Responsable lo complete desde el teléfono.",
          "Generate a no-login link for the Responsible person to fill on mobile."
        )}
      </p>

      <form action={formAction} className="mt-4">
        {/* Solo mandamos lo que cambia. locale/engagementId ya están cerrados en la Server Action */}
        <input type="hidden" name="engagementId" value={engagementId} readOnly />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-700">
              {t("Unidad operativa", "Operational unit")}
            </span>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              name="faenaId"
              value={faenaId}
              onChange={(e) => setFaenaId(e.target.value)}
              required
            >
              {faenas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.adminEmail ? ` — ${f.adminEmail}` : ""}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500">
              {t(
                "Tip: crea las unidades en “Unidades operativas” (Account plan).",
                "Tip: create units in “Operational units” (Account plan)."
              )}
            </span>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-700">
              {t("Semana (lunes)", "Week (Monday)")}
            </span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              name="weekStart"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              required
            />
            <span className="text-[11px] text-slate-500">
              {t(
                "Ideal: selecciona el lunes de la semana que quieres reportar.",
                "Best practice: pick the Monday of the week you want to report."
              )}
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!canSubmit || pending}
            className={[
              "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors",
              !canSubmit || pending ? "bg-slate-200 text-slate-500" : "bg-indigo-600 text-white hover:bg-indigo-700",
            ].join(" ")}
          >
            {pending ? t("Creando…", "Creating…") : t("Crear link", "Create link")}
          </button>

          <span className="text-xs text-slate-500">
            {t("Expira en 14 días.", "Expires in 14 days.")}
          </span>
        </div>
      </form>

      {"error" in state && state.error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {"link" in state && state.link && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-emerald-800">
              {t("Link generado", "Link generated")}
            </div>
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
              onClick={() => copy(state.link)}
            >
              {t("Copiar", "Copy")}
            </button>
          </div>

          <div className="mt-2 break-all rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
            {state.link}
          </div>

          <div className="mt-2 text-xs text-slate-600">
            {t(
              "Tip: envíalo por WhatsApp o email al Responsable.",
              "Tip: send it via WhatsApp or email to the Responsible person."
            )}
          </div>
        </div>
      )}
    </section>
  );
}
