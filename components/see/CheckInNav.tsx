"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function t(locale: string, es: string, en: string) {
  return locale === "en" ? en : es;
}

function pillBase() {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold",
    "transition-all",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
    "active:scale-[0.98] active:translate-y-[1px]",
  ].join(" ");
}

function pillIdle() {
  return [
    pillBase(),
    "bg-white text-slate-900",
    "ring-2 ring-slate-300",
    "hover:bg-slate-50 hover:ring-slate-400 hover:shadow-sm",
    "active:bg-slate-100 active:ring-slate-500 active:shadow-none",
  ].join(" ");
}

function pillPrimary() {
  return [
    pillBase(),
    "bg-indigo-600 text-white",
    "ring-2 ring-indigo-600/40",
    "hover:bg-indigo-500 hover:ring-indigo-500/60 hover:shadow-sm",
    "active:bg-indigo-700 active:ring-indigo-700/60 active:shadow-none",
  ].join(" ");
}

function pillActiveDark() {
  return [
    pillBase(),
    "bg-slate-900 text-white",
    "ring-2 ring-slate-900/30",
    "hover:bg-slate-800 hover:ring-slate-900/45 hover:shadow-sm",
    "active:bg-slate-950 active:ring-slate-950/45 active:shadow-none",
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

  const qs = sp.toString();
  const withQs = (href: string) => (qs ? `${href}?${qs}` : href);

  const base = `/${locale}/wizard/${engagementId}/check-in`;

  const isRoot = pathname === base;
  const isKpis = pathname.startsWith(`${base}/kpis`);
  const isInits = pathname.startsWith(`${base}/initiatives`);
  const isSummary = pathname.startsWith(`${base}/summary`);
  const isDataPack = pathname.startsWith(`${base}/data-pack`);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={withQs(base)} className={isRoot ? pillActiveDark() : pillIdle()}>
        {t(locale, "Inicio", "Home")}
      </Link>

      <Link href={withQs(`${base}/kpis`)} className={isKpis ? pillActiveDark() : pillPrimary()}>
        {t(locale, "1) KPIs", "1) KPIs")}
      </Link>

      <Link href={withQs(`${base}/initiatives`)} className={isInits ? pillActiveDark() : pillIdle()}>
        {t(locale, "2) Iniciativas", "2) Initiatives")}
      </Link>

      <Link href={withQs(`${base}/summary`)} className={isSummary ? pillActiveDark() : pillIdle()}>
        {t(locale, "3) Resumen", "3) Summary")}
      </Link>

      <Link href={withQs(`${base}/data-pack`)} className={isDataPack ? pillActiveDark() : pillIdle()}>
        {t(locale, "Data Pack", "Data Pack")}
      </Link>
    </div>
  );
}
