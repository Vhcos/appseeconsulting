export type NpsBucket = "promoter" | "passive" | "detractor";

export function bucketFromScore(score: number): NpsBucket {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

export function computeNpsScore(scores: number[]) {
  const total = scores.length;
  if (total === 0) {
    return {
      total: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      nps: 0,
      distribution: Array.from({ length: 11 }, (_, i) => ({ score: i, count: 0 })),
    };
  }

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  const dist = Array.from({ length: 11 }, (_, i) => ({ score: i, count: 0 }));

  for (const s of scores) {
    const clamped = Math.max(0, Math.min(10, Math.round(s)));
    dist[clamped].count += 1;

    const b = bucketFromScore(clamped);
    if (b === "promoter") promoters += 1;
    else if (b === "passive") passives += 1;
    else detractors += 1;
  }

  const nps = Math.round(((promoters / total) - (detractors / total)) * 100);

  return { total, promoters, passives, detractors, nps, distribution: dist };
}
