import { KpiBasis } from "@prisma/client";

export type KpiPoint = { periodKey: string; value: number | null };

export function defaultMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseMonthKey(periodKey: string) {
  const [yStr, mStr] = periodKey.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  return { y, m };
}

export function monthKeyFromYM(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function addMonths(periodKey: string, deltaMonths: number) {
  const { y, m } = parseMonthKey(periodKey);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + deltaMonths);
  return monthKeyFromYM(d.getFullYear(), d.getMonth() + 1);
}

export function buildMonthKeysBack(periodKey: string, count: number) {
  // Devuelve en orden cronológico (más antiguo → más nuevo)
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(addMonths(periodKey, -i));
  }
  return out;
}

export function avg(values: Array<number | null>): number | null {
  const xs = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (xs.length === 0) return null;
  const s = xs.reduce((a, b) => a + b, 0);
  return s / xs.length;
}

export function computeEvaluatedValue(basis: KpiBasis, series: KpiPoint[], periodKey: string): number | null {
  const { y } = parseMonthKey(periodKey);

  if (basis === "A") {
    // Promedio YTD: desde enero del año actual hasta periodKey (inclusive)
    const ytd = series
      .filter((p) => p.periodKey.startsWith(`${y}-`) && p.periodKey <= periodKey)
      .map((p) => p.value);
    return avg(ytd);
  }

  // "L": Promedio últimos 12 meses (LTM/TTM) hasta periodKey
  const ltm = series.filter((p) => p.periodKey <= periodKey).map((p) => p.value);
  return avg(ltm);
}

export function computeEvaluatedSeries(basis: KpiBasis, series: KpiPoint[]): Array<number | null> {
  // Para cada mes, calcula el evaluatedValue “a esa fecha”
  return series.map((p) => computeEvaluatedValue(basis, series, p.periodKey));
}
