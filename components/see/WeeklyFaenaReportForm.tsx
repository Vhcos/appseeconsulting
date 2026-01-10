"use client";

import { useEffect, useMemo, useState } from "react";

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

type Option = { value: string; labelEs: string };
type OptionsPayload = Record<string, Option[]>;

type ApiResponse = {
  ok: boolean;
  error?: string;
  faena?: { id: string; name: string; code?: string | null };
  token?: { weekStart: string; weekEnd: string; expiresAt: string };
  report?: any;
  options?: OptionsPayload;
};

type Props = {
  locale: string;
  token: string;
};

function isoToDateLabel(iso: string, locale: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === "en" ? "en-US" : "es-CL", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

function toggleInArray(arr: string[], value: string) {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

function numberOrNull(v: string) {
  if (v.trim() === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return n;
}

function intOrNull(v: string) {
  const n = numberOrNull(v);
  if (n == null) return null;
  return Math.trunc(n);
}

export default function WeeklyFaenaReportForm({ locale, token }: Props) {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [faena, setFaena] = useState<{ id: string; name: string; code?: string | null } | null>(null);
  const [weekStartIso, setWeekStartIso] = useState<string>("");
  const [weekEndIso, setWeekEndIso] = useState<string>("");
  const [options, setOptions] = useState<OptionsPayload>({});

  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const [form, setForm] = useState<any>({
    adminName: "",
    adminEmail: "",
    dotacionPromedio: "",
    turn: "NA",

    m2Planificados: "",
    m2Ejecutados: "",
    causasDesvio: [] as string[],
    causasDesvioOther: "",

    turnosPlanificados: "",
    turnosEntregados: "",
    detencionesHubo: false,
    detencionesEventos: "",
    detencionesHoras: "",
    detencionCausaPrincipal: "",

    sinRetrabajos: true,
    sinNoConformidades: true,
    retrabajosN: "",
    noConformidadesN: "",
    accionCorrectivaRegistrada: "NA",

    horasHombre: "",
    incidentesCasi: "",
    lesionesRegistrables: "",
    accionesHsecCerradas: "",
    sinEventosHsec: true,
    referenciaEventoHsec: "",

    reporteClienteEstado: "ON_TIME",
    reporteClienteAtrasoCausa: "",
    dataPackMesEstado: "UP_TO_DATE",

    contratoAnexosOk: true,
    planCierreOk: true,
    evidenciasOk: true,
    reportesArchivadosOk: true,
    bitacoraDetencionesOk: true,
    registroCalidadOk: true,

    semaforo: "GREEN",
    requiereApoyo: false,
    tiposApoyo: [] as string[],
    tiposApoyoOther: "",

    comentario: "",
  });

  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setApiError(null);

      if (!token) {
        setApiError(t(locale, "Falta el token en el link.", "Missing token in the link."));
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/weekly-faena-report/by-token?token=${encodeURIComponent(token)}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!alive) return;

      if (!data || !data.ok) {
        setApiError(data?.error || t(locale, "No se pudo cargar el formulario.", "Failed to load the form."));
        setLoading(false);
        return;
      }

      setFaena(data.faena || null);
      setOptions(data.options || {});
      setWeekStartIso(data.token?.weekStart || "");
      setWeekEndIso(data.token?.weekEnd || "");

      // Si viene reporte, precargamos campos básicos (sin ponerse exquisito)
      if (data.report) {
        const r = data.report as any;
        setForm((prev: any) => ({
          ...prev,
          adminName: r.adminName ?? prev.adminName,
          adminEmail: r.adminEmail ?? prev.adminEmail,
          dotacionPromedio: r.dotacionPromedio ?? prev.dotacionPromedio,
          turn: r.turn ?? prev.turn,

          m2Planificados: r.m2Planificados ?? prev.m2Planificados,
          m2Ejecutados: r.m2Ejecutados ?? prev.m2Ejecutados,
          causasDesvio: r.causasDesvio ?? prev.causasDesvio,
          causasDesvioOther: r.causasDesvioOther ?? prev.causasDesvioOther,

          turnosPlanificados: r.turnosPlanificados ?? prev.turnosPlanificados,
          turnosEntregados: r.turnosEntregados ?? prev.turnosEntregados,
          detencionesHubo: r.detencionesHubo ?? prev.detencionesHubo,
          detencionesEventos: r.detencionesEventos ?? prev.detencionesEventos,
          detencionesHoras: r.detencionesHoras ?? prev.detencionesHoras,
          detencionCausaPrincipal: r.detencionCausaPrincipal ?? prev.detencionCausaPrincipal,

          sinRetrabajos: r.sinRetrabajos ?? prev.sinRetrabajos,
          sinNoConformidades: r.sinNoConformidades ?? prev.sinNoConformidades,
          retrabajosN: r.retrabajosN ?? prev.retrabajosN,
          noConformidadesN: r.noConformidadesN ?? prev.noConformidadesN,
          accionCorrectivaRegistrada: r.accionCorrectivaRegistrada ?? prev.accionCorrectivaRegistrada,

          horasHombre: r.horasHombre ?? prev.horasHombre,
          incidentesCasi: r.incidentesCasi ?? prev.incidentesCasi,
          lesionesRegistrables: r.lesionesRegistrables ?? prev.lesionesRegistrables,
          accionesHsecCerradas: r.accionesHsecCerradas ?? prev.accionesHsecCerradas,
          sinEventosHsec: r.sinEventosHsec ?? prev.sinEventosHsec,
          referenciaEventoHsec: r.referenciaEventoHsec ?? prev.referenciaEventoHsec,

          reporteClienteEstado: r.reporteClienteEstado ?? prev.reporteClienteEstado,
          reporteClienteAtrasoCausa: r.reporteClienteAtrasoCausa ?? prev.reporteClienteAtrasoCausa,
          dataPackMesEstado: r.dataPackMesEstado ?? prev.dataPackMesEstado,

          contratoAnexosOk: r.contratoAnexosOk ?? prev.contratoAnexosOk,
          planCierreOk: r.planCierreOk ?? prev.planCierreOk,
          evidenciasOk: r.evidenciasOk ?? prev.evidenciasOk,
          reportesArchivadosOk: r.reportesArchivadosOk ?? prev.reportesArchivadosOk,
          bitacoraDetencionesOk: r.bitacoraDetencionesOk ?? prev.bitacoraDetencionesOk,
          registroCalidadOk: r.registroCalidadOk ?? prev.registroCalidadOk,

          semaforo: r.semaforo ?? prev.semaforo,
          requiereApoyo: r.requiereApoyo ?? prev.requiereApoyo,
          tiposApoyo: r.tiposApoyo ?? prev.tiposApoyo,
          tiposApoyoOther: r.tiposApoyoOther ?? prev.tiposApoyoOther,

          comentario: r.comentario ?? prev.comentario,
        }));
      }

      setLoading(false);
    }

    run();

    return () => {
      alive = false;
    };
  }, [locale, token]);

  const headerTitle = useMemo(() => {
    if (!faena) return t(locale, "Informe semanal de faena", "Weekly site report");
    return `${t(locale, "Informe semanal", "Weekly report")} — ${faena.name}`;
  }, [faena, locale]);

  function validateClient(): string[] {
    const errs: string[] = [];

    if (!form.semaforo) errs.push(t(locale, "Debes seleccionar semáforo.", "Traffic light is required."));

    if (form.detencionesHubo) {
      if (form.detencionesEventos === "" || form.detencionesHoras === "" || !form.detencionCausaPrincipal) {
        errs.push(
          t(
            locale,
            "Si hubo detenciones, completa eventos, horas y causa principal.",
            "If there were stoppages, fill events, hours and main cause."
          )
        );
      }
    }

    if (form.reporteClienteEstado === "LATE" && !form.reporteClienteAtrasoCausa) {
      errs.push(
        t(
          locale,
          "Si el reporte del cliente está con atraso, indica la causa.",
          "If the client report is late, select a cause."
        )
      );
    }

    return errs;
  }

  async function onSubmit() {
    const errs = validateClient();
    setClientErrors(errs);
    if (errs.length) return;

    setSubmitting(true);
    setApiError(null);

    const payload = {
      adminName: form.adminName?.trim() || null,
      adminEmail: form.adminEmail?.trim() || null,

      dotacionPromedio: intOrNull(String(form.dotacionPromedio ?? "")),
      turn: form.turn || null,

      m2Planificados: numberOrNull(String(form.m2Planificados ?? "")),
      m2Ejecutados: numberOrNull(String(form.m2Ejecutados ?? "")),
      causasDesvio: Array.isArray(form.causasDesvio) ? form.causasDesvio : [],
      causasDesvioOther: form.causasDesvioOther?.trim() || null,

      turnosPlanificados: intOrNull(String(form.turnosPlanificados ?? "")),
      turnosEntregados: intOrNull(String(form.turnosEntregados ?? "")),
      detencionesHubo: Boolean(form.detencionesHubo),
      detencionesEventos: intOrNull(String(form.detencionesEventos ?? "")),
      detencionesHoras: numberOrNull(String(form.detencionesHoras ?? "")),
      detencionCausaPrincipal: form.detencionCausaPrincipal || null,

      sinRetrabajos: Boolean(form.sinRetrabajos),
      sinNoConformidades: Boolean(form.sinNoConformidades),
      retrabajosN: intOrNull(String(form.retrabajosN ?? "")),
      noConformidadesN: intOrNull(String(form.noConformidadesN ?? "")),
      accionCorrectivaRegistrada: form.accionCorrectivaRegistrada || null,

      horasHombre: numberOrNull(String(form.horasHombre ?? "")),
      incidentesCasi: intOrNull(String(form.incidentesCasi ?? "")),
      lesionesRegistrables: intOrNull(String(form.lesionesRegistrables ?? "")),
      accionesHsecCerradas: intOrNull(String(form.accionesHsecCerradas ?? "")),
      sinEventosHsec: Boolean(form.sinEventosHsec),
      referenciaEventoHsec: form.referenciaEventoHsec?.trim() || null,

      reporteClienteEstado: form.reporteClienteEstado || null,
      reporteClienteAtrasoCausa: form.reporteClienteAtrasoCausa || null,
      dataPackMesEstado: form.dataPackMesEstado || null,

      contratoAnexosOk: Boolean(form.contratoAnexosOk),
      planCierreOk: Boolean(form.planCierreOk),
      evidenciasOk: Boolean(form.evidenciasOk),
      reportesArchivadosOk: Boolean(form.reportesArchivadosOk),
      bitacoraDetencionesOk: Boolean(form.bitacoraDetencionesOk),
      registroCalidadOk: Boolean(form.registroCalidadOk),

      semaforo: form.semaforo,
      requiereApoyo: Boolean(form.requiereApoyo),
      tiposApoyo: Array.isArray(form.tiposApoyo) ? form.tiposApoyo : [],
      tiposApoyoOther: form.tiposApoyoOther?.trim() || null,

      comentario: form.comentario?.trim() || null,
    };

    const res = await fetch("/api/weekly-faena-report/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, payload }),
    });

    const out = await res.json().catch(() => null);
    if (!res.ok || !out?.ok) {
      setApiError(out?.error || t(locale, "No se pudo enviar el reporte.", "Failed to submit."));
      setSubmitting(false);
      return;
    }

    setSubmittedAt(new Date().toISOString());
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">{t(locale, "Cargando…", "Loading…")}</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <h1 className="text-base font-semibold text-rose-900">
          {t(locale, "No se pudo abrir el formulario", "Could not open the form")}
        </h1>
        <p className="mt-1 text-sm text-rose-800">{apiError}</p>
      </div>
    );
  }

  if (submittedAt) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h1 className="text-lg font-semibold text-emerald-900">
          {t(locale, "Reporte recibido ✅", "Report received ✅")}
        </h1>
        <p className="mt-1 text-sm text-emerald-800">
          {t(locale, "Gracias. Quedó registrado a las", "Thanks. It was saved at")}{" "}
          {new Date(submittedAt).toLocaleString(locale === "en" ? "en-US" : "es-CL")}
        </p>
        <div className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-slate-700">
          <div className="font-medium">{faena?.name}</div>
          <div className="text-xs text-slate-600">
            {isoToDateLabel(weekStartIso, locale)} — {isoToDateLabel(weekEndIso, locale)}
          </div>
          <div className="mt-2 text-xs">
            {t(locale, "Semáforo:", "Traffic light:")} <span className="font-semibold">{form.semaforo}</span>
          </div>
        </div>
      </div>
    );
  }

  const causasDesvioOpts = options.causasDesvio || [];
  const detentionCauseOpts = options.detentionCause || [];
  const reporteEstadoOpts = options.reporteClienteEstado || [];
  const atrasoCausaOpts = options.reporteClienteAtrasoCausa || [];
  const dataPackOpts = options.dataPackEstado || [];
  const turnOpts = options.turn || [];
  const semaforoOpts = options.semaforo || [];
  const accionCorrOpts = options.accionCorrectiva || [];
  const tiposApoyoOpts = options.tiposApoyo || [];

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{headerTitle}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t(locale, "Semana", "Week")}:{" "}
          <span className="font-medium text-slate-800">
            {isoToDateLabel(weekStartIso, locale)} — {isoToDateLabel(weekEndIso, locale)}
          </span>
        </p>

        <div className="mt-4">
          <p className="text-xs font-medium text-slate-700">{t(locale, "Semáforo (obligatorio)", "Traffic light (required)")}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {semaforoOpts.map((o) => {
              const active = form.semaforo === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setForm((p: any) => ({ ...p, semaforo: o.value }))}
                  className={[
                    "rounded-xl border px-3 py-3 text-sm font-semibold",
                    active ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700",
                  ].join(" ")}
                >
                  {o.labelEs}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {(clientErrors.length > 0 || apiError) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">{t(locale, "Revisa esto:", "Please fix:")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-800">
            {clientErrors.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
            {apiError ? <li>{apiError}</li> : null}
          </ul>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Identificación", "Identification")}</h2>

        <div className="mt-3 grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-700">{t(locale, "Administrador responsable", "Responsible admin")}</span>
            <input
              value={form.adminName}
              onChange={(e) => setForm((p: any) => ({ ...p, adminName: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder={t(locale, "Nombre y apellido", "Full name")}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-700">{t(locale, "Email (opcional)", "Email (optional)")}</span>
            <input
              value={form.adminEmail}
              onChange={(e) => setForm((p: any) => ({ ...p, adminEmail: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="correo@..."
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "Dotación promedio", "Avg headcount")}</span>
              <input
                value={form.dotacionPromedio}
                onChange={(e) => setForm((p: any) => ({ ...p, dotacionPromedio: e.target.value }))}
                inputMode="numeric"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "Turno", "Shift")}</span>
              <select
                value={form.turn}
                onChange={(e) => setForm((p: any) => ({ ...p, turn: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {turnOpts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.labelEs}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" open>
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          A) {t(locale, "Plan vs Real", "Plan vs Actual")}
        </summary>

        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "m² planificados", "Planned m²")}</span>
              <input
                value={form.m2Planificados}
                onChange={(e) => setForm((p: any) => ({ ...p, m2Planificados: e.target.value }))}
                inputMode="decimal"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "m² ejecutados", "Executed m²")}</span>
              <input
                value={form.m2Ejecutados}
                onChange={(e) => setForm((p: any) => ({ ...p, m2Ejecutados: e.target.value }))}
                inputMode="decimal"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-700">{t(locale, "Causas de desvío (si aplica)", "Deviation causes (if any)")}</p>
            <div className="mt-2 grid gap-2">
              {causasDesvioOpts.map((o) => (
                <label key={o.value} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={(form.causasDesvio || []).includes(o.value)}
                    onChange={() =>
                      setForm((p: any) => ({
                        ...p,
                        causasDesvio: toggleInArray(p.causasDesvio || [], o.value),
                      }))
                    }
                    className="h-5 w-5"
                  />
                  <span className="text-sm text-slate-800">{o.labelEs}</span>
                </label>
              ))}
            </div>

            {(form.causasDesvio || []).includes("OTHER") && (
              <input
                value={form.causasDesvioOther}
                onChange={(e) => setForm((p: any) => ({ ...p, causasDesvioOther: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder={t(locale, "Especifica (otro)", "Specify (other)")}
              />
            )}
          </div>
        </div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          B) {t(locale, "Disponibilidad", "Availability")}
        </summary>

        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "Turnos planificados", "Planned shifts")}</span>
              <input
                value={form.turnosPlanificados}
                onChange={(e) => setForm((p: any) => ({ ...p, turnosPlanificados: e.target.value }))}
                inputMode="numeric"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "Turnos entregados", "Delivered shifts")}</span>
              <input
                value={form.turnosEntregados}
                onChange={(e) => setForm((p: any) => ({ ...p, turnosEntregados: e.target.value }))}
                inputMode="numeric"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3">
            <input
              type="checkbox"
              checked={Boolean(form.detencionesHubo)}
              onChange={(e) => setForm((p: any) => ({ ...p, detencionesHubo: e.target.checked }))}
              className="h-6 w-6"
            />
            <span className="text-sm font-medium text-slate-800">{t(locale, "¿Hubo detenciones?", "Were there stoppages?")}</span>
          </label>

          {form.detencionesHubo ? (
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-700">{t(locale, "Eventos", "Events")}</span>
                  <input
                    value={form.detencionesEventos}
                    onChange={(e) => setForm((p: any) => ({ ...p, detencionesEventos: e.target.value }))}
                    inputMode="numeric"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-700">{t(locale, "Horas", "Hours")}</span>
                  <input
                    value={form.detencionesHoras}
                    onChange={(e) => setForm((p: any) => ({ ...p, detencionesHoras: e.target.value }))}
                    inputMode="decimal"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700">{t(locale, "Causa principal", "Main cause")}</span>
                <select
                  value={form.detencionCausaPrincipal}
                  onChange={(e) => setForm((p: any) => ({ ...p, detencionCausaPrincipal: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">{t(locale, "Selecciona…", "Select…")}</option>
                  {detentionCauseOpts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.labelEs}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          C) {t(locale, "Calidad", "Quality")}
        </summary>

        <div className="mt-4 grid gap-3">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3">
            <input
              type="checkbox"
              checked={Boolean(form.sinRetrabajos)}
              onChange={(e) => setForm((p: any) => ({ ...p, sinRetrabajos: e.target.checked }))}
              className="h-6 w-6"
            />
            <span className="text-sm font-medium text-slate-800">{t(locale, "Sin retrabajos", "No rework")}</span>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3">
            <input
              type="checkbox"
              checked={Boolean(form.sinNoConformidades)}
              onChange={(e) => setForm((p: any) => ({ ...p, sinNoConformidades: e.target.checked }))}
              className="h-6 w-6"
            />
            <span className="text-sm font-medium text-slate-800">{t(locale, "Sin no conformidades", "No non-conformities")}</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "Retrabajos (n)", "Rework (n)")}</span>
              <input
                value={form.retrabajosN}
                onChange={(e) => setForm((p: any) => ({ ...p, retrabajosN: e.target.value }))}
                inputMode="numeric"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "No conformidades (n)", "Non-conformities (n)")}</span>
              <input
                value={form.noConformidadesN}
                onChange={(e) => setForm((p: any) => ({ ...p, noConformidadesN: e.target.value }))}
                inputMode="numeric"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-700">{t(locale, "Acción correctiva registrada", "Corrective action recorded")}</span>
            <select
              value={form.accionCorrectivaRegistrada}
              onChange={(e) => setForm((p: any) => ({ ...p, accionCorrectivaRegistrada: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {accionCorrOpts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.labelEs}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          D) {t(locale, "Seguridad (inputs)", "Safety (inputs)")}
        </summary>

        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "Horas-hombre", "Man-hours")}</span>
              <input
                value={form.horasHombre}
                onChange={(e) => setForm((p: any) => ({ ...p, horasHombre: e.target.value }))}
                inputMode="decimal"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "Incidentes casi", "Near misses")}</span>
              <input
                value={form.incidentesCasi}
                onChange={(e) => setForm((p: any) => ({ ...p, incidentesCasi: e.target.value }))}
                inputMode="numeric"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "Lesiones registrables", "Recordable injuries")}</span>
              <input
                value={form.lesionesRegistrables}
                onChange={(e) => setForm((p: any) => ({ ...p, lesionesRegistrables: e.target.value }))}
                inputMode="numeric"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "Acciones HSEC cerradas", "Closed HSEC actions")}</span>
              <input
                value={form.accionesHsecCerradas}
                onChange={(e) => setForm((p: any) => ({ ...p, accionesHsecCerradas: e.target.value }))}
                inputMode="numeric"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3">
            <input
              type="checkbox"
              checked={Boolean(form.sinEventosHsec)}
              onChange={(e) => setForm((p: any) => ({ ...p, sinEventosHsec: e.target.checked }))}
              className="h-6 w-6"
            />
            <span className="text-sm font-medium text-slate-800">{t(locale, "Sin eventos HSEC", "No HSEC events")}</span>
          </label>

          {!form.sinEventosHsec ? (
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "Referencia evento", "Event reference")}</span>
              <input
                value={form.referenciaEventoHsec}
                onChange={(e) => setForm((p: any) => ({ ...p, referenciaEventoHsec: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder={t(locale, "Ej: Incidente #123", "e.g. Incident #123")}
              />
            </label>
          ) : null}
        </div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          E) {t(locale, "Reportabilidad / Data Pack", "Reporting / Data Pack")}
        </summary>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-700">{t(locale, "Reporte cliente", "Client report")}</span>
            <select
              value={form.reporteClienteEstado}
              onChange={(e) => setForm((p: any) => ({ ...p, reporteClienteEstado: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {reporteEstadoOpts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.labelEs}
                </option>
              ))}
            </select>
          </label>

          {form.reporteClienteEstado === "LATE" ? (
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-700">{t(locale, "Causa del atraso", "Late cause")}</span>
              <select
                value={form.reporteClienteAtrasoCausa}
                onChange={(e) => setForm((p: any) => ({ ...p, reporteClienteAtrasoCausa: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">{t(locale, "Selecciona…", "Select…")}</option>
                {atrasoCausaOpts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.labelEs}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-700">{t(locale, "Data pack del mes", "Monthly data pack")}</span>
            <select
              value={form.dataPackMesEstado}
              onChange={(e) => setForm((p: any) => ({ ...p, dataPackMesEstado: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {dataPackOpts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.labelEs}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          F) {t(locale, "Carpeta auditable", "Auditable folder")}
        </summary>

        <div className="mt-4 grid gap-2">
          {[
            ["contratoAnexosOk", t(locale, "Contrato y anexos OK", "Contract & annexes OK")],
            ["planCierreOk", t(locale, "Plan de cierre OK", "Closure plan OK")],
            ["evidenciasOk", t(locale, "Evidencias OK", "Evidence OK")],
            ["reportesArchivadosOk", t(locale, "Reportes archivados OK", "Reports archived OK")],
            ["bitacoraDetencionesOk", t(locale, "Bitácora detenciones OK", "Stoppage log OK")],
            ["registroCalidadOk", t(locale, "Registro calidad OK", "Quality record OK")],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
              <input
                type="checkbox"
                checked={Boolean(form[key])}
                onChange={(e) => setForm((p: any) => ({ ...p, [key]: e.target.checked }))}
                className="h-6 w-6"
              />
              <span className="text-sm text-slate-800">{label}</span>
            </label>
          ))}
        </div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          G) {t(locale, "Escalamiento", "Escalation")}
        </summary>

        <div className="mt-4 grid gap-3">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3">
            <input
              type="checkbox"
              checked={Boolean(form.requiereApoyo)}
              onChange={(e) => setForm((p: any) => ({ ...p, requiereApoyo: e.target.checked }))}
              className="h-6 w-6"
            />
            <span className="text-sm font-medium text-slate-800">{t(locale, "Requiere apoyo", "Needs support")}</span>
          </label>

          {form.requiereApoyo ? (
            <div className="grid gap-2">
              {tiposApoyoOpts.map((o) => (
                <label key={o.value} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={(form.tiposApoyo || []).includes(o.value)}
                    onChange={() =>
                      setForm((p: any) => ({
                        ...p,
                        tiposApoyo: toggleInArray(p.tiposApoyo || [], o.value),
                      }))
                    }
                    className="h-5 w-5"
                  />
                  <span className="text-sm text-slate-800">{o.labelEs}</span>
                </label>
              ))}

              {(form.tiposApoyo || []).includes("OTHER") ? (
                <input
                  value={form.tiposApoyoOther}
                  onChange={(e) => setForm((p: any) => ({ ...p, tiposApoyoOther: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder={t(locale, "Especifica (otro)", "Specify (other)")}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </details>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">{t(locale, "Comentario final", "Final comment")}</h2>
        <textarea
          value={form.comentario}
          onChange={(e) => setForm((p: any) => ({ ...p, comentario: e.target.value }))}
          rows={4}
          maxLength={800}
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder={t(locale, "Máx. ~5 líneas. Qué pasó y qué necesitas.", "Max ~5 lines. What happened and what you need.")}
        />
      </section>

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="w-full rounded-2xl bg-indigo-600 px-4 py-4 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
      >
        {submitting ? t(locale, "Enviando…", "Submitting…") : t(locale, "Enviar reporte", "Submit report")}
      </button>

      <p className="text-center text-[11px] text-slate-500">
        {t(
          locale,
          "Al enviar, el reporte queda registrado en el sistema.",
          "After submitting, the report is saved."
        )}
      </p>
    </div>
  );
}
