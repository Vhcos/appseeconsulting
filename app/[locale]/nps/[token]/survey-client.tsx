"use client";

import { useMemo, useState } from "react";

type InviteMeta = {
  id: string;
  semesterKey: string;
  email: string;
  fullName: string | null;
  status: string;
};

type Props = {
  locale: string;
  token: string;
  invite: InviteMeta;
  alreadyResponded: boolean;
};

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

export default function SurveyClient({ locale, token, invite, alreadyResponded }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [comment, setComment] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scoreLabel = useMemo(() => {
    if (score === null) return "";
    if (score <= 6) return t(locale, "Nada probable", "Not likely");
    if (score <= 8) return t(locale, "Neutral", "Neutral");
    return t(locale, "Muy probable", "Very likely");
  }, [score, locale]);

  async function submit() {
    setError(null);

    if (alreadyResponded || done) return;

    if (score === null) {
      setError(t(locale, "Selecciona un puntaje (0–10).", "Pick a score (0–10)."));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/nps/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          reason,
          focus,
          comment: comment?.trim() ? comment.trim() : null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          (json && (json.error || json.message)) ||
          t(locale, "No se pudo guardar la respuesta.", "Could not save response.");
        throw new Error(msg);
      }

      setDone(true);
    } catch (e: any) {
      setError(e?.message || t(locale, "Error guardando respuesta.", "Error saving response."));
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = alreadyResponded || done || submitting;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">
        {t(locale, "Encuesta NPS", "NPS Survey")}
      </h1>

      <p className="mt-1 text-sm text-slate-600">
        {invite.fullName ? (
          <>
            {invite.fullName} · <span className="font-mono text-xs">{invite.email}</span>
          </>
        ) : (
          <span className="font-mono text-xs">{invite.email}</span>
        )}
        {" "}· {t(locale, "Semestre:", "Semester:")} <b>{invite.semesterKey}</b>
      </p>

      {alreadyResponded ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {t(locale, "Esta encuesta ya fue respondida. Gracias.", "This survey was already submitted. Thank you.")}
        </div>
      ) : null}

      {done ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {t(locale, "Respuesta guardada. ¡Gracias!", "Saved. Thank you!")}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-900">
          {t(
            locale,
            "¿Qué tan probable es que recomiendes a Casia a un colega? (0 = nada probable, 10 = muy probable)",
            "How likely are you to recommend Casia to a colleague? (0 = not likely, 10 = very likely)"
          )}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => setScore(n)}
              className={[
                "h-10 w-10 rounded-full border text-sm font-semibold transition-all",
                score === n
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
                disabled ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]",
              ].join(" ")}
              aria-label={`score-${n}`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="mt-2 text-xs text-slate-600">{scoreLabel}</div>

        <div className="mt-6 grid gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-900">
              {t(locale, "Motivo principal (opcional)", "Main reason (optional)")}
            </label>
            <select
              disabled={disabled}
              value={reason ?? ""}
              onChange={(e) => setReason(e.target.value || null)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">{t(locale, "—", "—")}</option>
              <option value="CONTROL_OPERATIVO">{t(locale, "Control operativo", "Operational control")}</option>
              <option value="PERFORMANCE_CAMINOS">{t(locale, "Performance caminos", "Road performance")}</option>
              <option value="DATA_REPORTABILIDAD">{t(locale, "Data / reportabilidad", "Data / reporting")}</option>
              <option value="SEGURIDAD_HSEC">{t(locale, "Seguridad / HSEC", "Safety / HSEC")}</option>
              <option value="RESPUESTA_EQUIPO">{t(locale, "Respuesta del equipo", "Team responsiveness")}</option>
              <option value="OTRO">{t(locale, "Otro", "Other")}</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900">
              {t(locale, "¿Qué deberíamos priorizar? (opcional)", "What should we prioritize? (optional)")}
            </label>
            <select
              disabled={disabled}
              value={focus ?? ""}
              onChange={(e) => setFocus(e.target.value || null)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">{t(locale, "—", "—")}</option>
              <option value="MAYOR_PRESENCIA_EN_TERRENO">{t(locale, "Mayor presencia en terreno", "More field presence")}</option>
              <option value="MEJOR_TECNOLOGIA_INNOVACION">{t(locale, "Mejor tecnología / innovación", "Better technology / innovation")}</option>
              <option value="MAS_DATOS_INSIGHTS">{t(locale, "Más datos / insights", "More data / insights")}</option>
              <option value="GESTION_ADMINISTRATIVA">{t(locale, "Gestión administrativa", "Administrative management")}</option>
              <option value="MANTENER_ESTANDAR">{t(locale, "Mantener estándar", "Maintain standard")}</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900">
              {t(locale, "Comentario (opcional)", "Comment (optional)")}
            </label>
            <textarea
              disabled={disabled}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t(locale, "Cuéntanos más…", "Tell us more…")}
              className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          <button
            type="button"
            onClick={submit}
            disabled={disabled}
            className={[
              "inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all",
              disabled ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]",
            ].join(" ")}
          >
            {submitting ? t(locale, "Enviando…", "Sending…") : t(locale, "Enviar", "Submit")}
          </button>
        </div>
      </section>
    </main>
  );
}
