"use client";

import * as React from "react";

export default function ProgressField({
  name,
  defaultValue,
  placeholder = "0–100",
}: {
  name: string;
  defaultValue: number | null | undefined;
  placeholder?: string;
}) {
  const initial = typeof defaultValue === "number" && Number.isFinite(defaultValue) ? defaultValue : 0;
  const [v, setV] = React.useState<number>(initial);

  function clamp(n: number) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        name={name}
        value={String(v)}
        inputMode="numeric"
        className="w-[84px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        placeholder={placeholder}
        onChange={(e) => {
          const n = Number(e.target.value);
          setV(clamp(n));
        }}
      />

      <div className="flex-1">
        <input
          type="range"
          min={0}
          max={100}
          value={v}
          onChange={(e) => {
            const n = Number(e.target.value);
            setV(clamp(n));
          }}
          className="w-full accent-indigo-600"
        />
      </div>
    </div>
  );
}
