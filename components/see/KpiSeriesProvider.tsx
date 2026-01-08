"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type SeriesPayload = {
  months: string[];
  scopeKey: string;
  items: Array<{
    kpiId: string;
    unit: string | null;
    basis: "A" | "L";
    targetValue: number | null;
    monthly: Array<number | null>;
    evaluated: Array<number | null>;
  }>;
};

type Ctx = {
  loading: boolean;
  error: string | null;
  months: string[];
  byKpiId: Map<string, SeriesPayload["items"][number]>;
};

const SeriesContext = createContext<Ctx | null>(null);

export function useKpiSeries() {
  const ctx = useContext(SeriesContext);
  if (!ctx) throw new Error("useKpiSeries must be used inside KpiSeriesProvider");
  return ctx;
}

export default function KpiSeriesProvider(props: {
  engagementId: string;
  periodKey: string;
  accountId?: string | null;
  children: React.ReactNode;
}) {
  const { engagementId, periodKey, accountId, children } = props;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SeriesPayload | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        qs.set("period", periodKey);
        if (accountId) qs.set("accountId", accountId);

        const res = await fetch(`/api/wizard/${engagementId}/kpis/series?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as SeriesPayload;

        if (!alive) return;
        setPayload(json);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Error");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [engagementId, periodKey, accountId]);

  const byKpiId = useMemo(() => {
    const m = new Map<string, SeriesPayload["items"][number]>();
    for (const it of payload?.items || []) m.set(it.kpiId, it);
    return m;
  }, [payload]);

  const ctx: Ctx = {
    loading,
    error,
    months: payload?.months || [],
    byKpiId,
  };

  return <SeriesContext.Provider value={ctx}>{children}</SeriesContext.Provider>;
}
