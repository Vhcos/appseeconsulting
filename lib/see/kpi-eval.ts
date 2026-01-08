export type KpiBasis = "A" | "L";

export function isPercentUnit(unit?: string | null) {
  const u = (unit || "").toLowerCase();
  return u.includes("%") || u.includes("pp") || u.includes("pct") || u.includes("porc");
}

export function parseMonthKey(key: string) {
  const [y, m] = key.split("-").map((x) => Number(x));
  return { y, m };
}

export function formatMonthKey(y: number, m: number) {
  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}`;
}

export function addMonths(key: string, delta: number) {
  const { y, m } = parseMonthKey(key);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + delta);
  return formatMonthKey(d.getFullYear(), d.getMonth() + 1);
}

export function yearStartKey(key: string) {
  const { y } = parseMonthKey(key);
  return `${y}-01`;
}

export function monthKeysBetween(fromKey: string, toKey: string) {
  const out: string[] = [];
  let cur = fromKey;
  while (cur <= toKey) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

export function computeEvaluatedValue(args: {
  periodKey: string;
  basis: KpiBasis;
  unit?: string | null;
  valuesByPeriod: Map<string, number | null>;
}) {
  const { periodKey, basis, unit, valuesByPeriod } = args;

  if (basis === "A") {
    const start = yearStartKey(periodKey);
    const months = monthKeysBetween(start, periodKey);
    const nums = months
      .map((k) => valuesByPeriod.get(k) ?? null)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (nums.length === 0) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return sum / nums.length;
  }

  const start = addMonths(periodKey, -11);
  const months = monthKeysBetween(start, periodKey);
  const nums = months
    .map((k) => valuesByPeriod.get(k) ?? null)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return null;

  if (isPercentUnit(unit)) {
    const sum = nums.reduce((a, b) => a + b, 0);
    return sum / nums.length;
  } else {
    return nums.reduce((a, b) => a + b, 0);
  }
}
