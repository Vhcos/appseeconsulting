"use client";

import { useMemo, useState } from "react";

export default function NpsForm({ invite }: { invite: any }) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  const title = useMemo(() => {
    const who = invite?.fullName ? `Hola ${invite.fullName}` : "Hola";
    return `${who}, ¿qué tan probable es que recomiendes Casia?`;
  }, [invite]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Aquí después conectamos a tu endpoint real de respuesta (NpsResponse)
    setSent(true);
  }

  if (sent) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">¡Gracias!</h1>
        <p className="mt-2 text-slate-600">Tu respuesta quedó registrada.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">Responde en menos de 30 segundos.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setScore(n)}
              className={[
                "h-10 w-10 rounded-full border text-sm font-semibold",
                score === n ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-900",
              ].join(" ")}
            >
              {n}
            </button>
          ))}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-800">Comentario (opcional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-indigo-600"
            rows={4}
          />
        </div>

        <button
          disabled={score === null}
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </form>

      <p className="mt-6 text-xs text-slate-500">
        Invitación: <span className="font-mono">{invite?.token}</span> · Semestre: {invite?.semesterKey}
      </p>
    </section>
  );
}
