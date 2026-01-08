// components/see/CheckInContextForm.tsx
"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

type Unit = { id: string; label: string };

export default function CheckInContextForm(props: {
  locale: string;
  engagementId: string;
  periodKey: string;
  activeAccountId: string | null;
  units: Unit[];
  labels: {
    period: string;
    unit: string;
    active: string;
    global: string;
    autoHint: string;
    startCta: string;
  };
}) {
  const { locale, engagementId, units, labels } = props;

  const [period, setPeriod] = useState(props.periodKey);
  const [accountId, setAccountId] = useState(props.activeAccountId ?? "");

  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activeUnitLabel = useMemo(() => {
    if (!accountId) return labels.global;
    const found = units.find((u) => u.id === accountId);
    return found?.label ?? accountId;
  }, [accountId, units, labels.global]);

  const baseQs = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("period", period);
    if (accountId) qs.set("accountId", accountId);
    return qs.toString();
  }, [period, accountId]);

  const kpisHref = useMemo(() => {
    return `/${locale}/wizard/${engagementId}/check-in/kpis?${baseQs}`;
  }, [locale, engagementId, baseQs]);

  function updateUrl(nextPeriod: string, nextAccountId: string) {
    const qs = new URLSearchParams();
    qs.set("period", nextPeriod);
    if (nextAccountId) qs.set("accountId", nextAccountId);

    startTransition(() => {
      router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-1">
          <label className="block text-[11px] font-semibold text-slate-700">{labels.period}</label>
          <input
            type="month"
            value={period}
            onChange={(e) => {
              const v = e.target.value;
              setPeriod(v);
              updateUrl(v, accountId);
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-700">{labels.unit}</label>
          <select
            value={accountId}
            onChange={(e) => {
              const v = e.target.value;
              setAccountId(v);
              updateUrl(period, v);
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="">{labels.global}</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-slate-600">
            <span className="font-semibold">{labels.active}</span>{" "}
            <span className="font-semibold">{period}</span>
            {" · "}
            <span className="font-semibold">{activeUnitLabel}</span>
            <span className="ml-2 text-slate-400">{labels.autoHint}</span>
            {isPending ? <span className="ml-2 text-slate-500">(…) </span> : null}
          </div>

          <Link
            href={kpisHref}
            className="inline-flex w-fit items-center justify-center rounded-full bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-all active:scale-[0.98]"
          >
            {labels.startCta}
          </Link>
        </div>
      </div>
    </div>
  );
}
