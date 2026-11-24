export interface HoleStat {
  par: number | null;
  strokes: number;
  putts: number | null;
  fairway: "hit" | "left" | "right" | "short" | "long" | "na" | null;
  gir: boolean | null;
  penalties: number | null;
}

export interface RoundStat {
  holesPlayed: number;
  totalScore: number;
  holes: HoleStat[];
}

export interface Summary {
  rounds: number;
  scoringAverage18: number | null; // per 18 holes
  puttsPerRound18: number | null;
  fairwaysHitPct: number | null;
  greensInRegulationPct: number | null;
  penaltiesPerRound18: number | null;
  scoringByPar: Record<string, number | null>; // average strokes on par 3s, 4s, 5s
}

const pct = (hit: number, total: number) => (total ? Math.round((hit / total) * 1000) / 10 : null);
const avg = (sum: number, n: number) => (n ? Math.round((sum / n) * 10) / 10 : null);

/** Aggregate stats across rounds. Hole-level stats only use holes where that stat was recorded. */
export function summarize(rounds: RoundStat[]): Summary {
  let holesPlayed = 0, strokes = 0;
  let puttHoles = 0, putts = 0;
  let fwChances = 0, fwHit = 0;
  let girHoles = 0, girHit = 0;
  let penHoles = 0, pens = 0;
  const byPar: Record<number, { s: number; n: number }> = { 3: { s: 0, n: 0 }, 4: { s: 0, n: 0 }, 5: { s: 0, n: 0 } };

  for (const r of rounds) {
    holesPlayed += r.holesPlayed;
    strokes += r.totalScore;
    for (const h of r.holes) {
      if (h.putts !== null) { puttHoles++; putts += h.putts; }
      if (h.fairway !== null && h.fairway !== "na" && h.par !== 3) { fwChances++; if (h.fairway === "hit") fwHit++; }
      if (h.gir !== null) { girHoles++; if (h.gir) girHit++; }
      if (h.penalties !== null) { penHoles++; pens += h.penalties; }
      if (h.par && byPar[h.par]) { byPar[h.par].s += h.strokes; byPar[h.par].n++; }
    }
  }

  return {
    rounds: rounds.length,
    scoringAverage18: holesPlayed ? Math.round((strokes / holesPlayed) * 18 * 10) / 10 : null,
    puttsPerRound18: puttHoles ? Math.round((putts / puttHoles) * 18 * 10) / 10 : null,
    fairwaysHitPct: pct(fwHit, fwChances),
    greensInRegulationPct: pct(girHit, girHoles),
    penaltiesPerRound18: penHoles ? Math.round((pens / penHoles) * 18 * 10) / 10 : null,
    scoringByPar: {
      par3: avg(byPar[3].s, byPar[3].n),
      par4: avg(byPar[4].s, byPar[4].n),
      par5: avg(byPar[5].s, byPar[5].n),
    },
  };
}
