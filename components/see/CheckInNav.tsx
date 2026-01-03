// components/see/CheckInNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function btn(active: boolean, primary = false) {
  if (active) {
    return [
      "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold",
      "bg-slate-900 text-white shadow-sm",
      "ring-1 ring-slate-900/10",
      "transition-all active:scale-[0.98]",
    ].join(" ");
  }

  if (primary) {
    return [
      "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold",
      "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500",
      "ring-1 ring-indigo-600/10",
      "transition-all active:scale-[0.98]",
    ].join(" ");
  }

  return [
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold",
    "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50",
    "transition-all active:scale-[0.98]",
  ].join(" ");
}

export default function CheckInNav({
  locale,
  engagementId,
}: {
  locale: string;
  engagementId: string;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();

  const qs = sp.toString(); // conserva period/accountId
  const withQs = (href: string) => (qs ? `${href}?${qs}` : href);

  const base = `/${locale}/wizard/${engagementId}/check-in`;

  const isRoot = pathname === base;
  const isKpis = pathname.startsWith(`${base}/kpis`);
  const isInits = pathname.startsWith(`${base}/initiatives`);
  const isSummary = pathname.startsWith(`${base}/summary`);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={withQs(base)} className={btn(isRoot)}>
        {t(locale, "Inicio", "Home")}
      </Link>

      <Link href={withQs(`${base}/kpis`)} className={btn(isKpis, true)}>
        {t(locale, "1) KPIs", "1) KPIs")}
      </Link>

      <Link href={withQs(`${base}/initiatives`)} className={btn(isInits)}>
        {t(locale, "2) Iniciativas", "2) Initiatives")}
      </Link>

      <Link href={withQs(`${base}/summary`)} className={btn(isSummary)}>
        {t(locale, "3) Resumen", "3) Summary")}
      </Link>
    </div>
  );
}
