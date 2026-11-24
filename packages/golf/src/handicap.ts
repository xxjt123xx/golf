/**
 * World Handicap System (WHS) helpers. Simplifications for the MVP:
 * - Playing conditions calculation (PCC) is taken as 0.
 * - Only 18-hole rounds produce a differential (9-hole combining comes later).
 * - No soft/hard caps against the low handicap index yet.
 */

export interface HoleForAdjustment {
  par: number;
  strokeIndex: number | null; // 1 = hardest hole
  strokes: number;
}

/** Strokes a player receives on a hole, from their course handicap and the hole's stroke index. */
export function strokesReceived(courseHandicap: number, strokeIndex: number, holes = 18): number {
  if (courseHandicap === 0) return 0;
  if (courseHandicap < 0) {
    // Plus handicaps give strokes back, starting from the easiest hole.
    const giveBack = -courseHandicap;
    const extra = strokeIndex > holes - (giveBack % holes) ? 1 : 0;
    return -(Math.floor(giveBack / holes) + extra) || 0;
  }
  const base = Math.floor(courseHandicap / holes);
  return base + (strokeIndex <= courseHandicap % holes ? 1 : 0);
}

/**
 * Adjusted gross score: each hole is capped at net double bogey
 * (par + 2 + strokes received). Without a handicap yet, the cap is par + 5.
 */
export function adjustedGrossScore(holes: HoleForAdjustment[], courseHandicap: number | null): number {
  return holes.reduce((sum, h) => {
    let cap: number;
    if (courseHandicap === null || h.strokeIndex === null) cap = h.par + 5;
    else cap = h.par + 2 + strokesReceived(courseHandicap, h.strokeIndex);
    return sum + Math.min(h.strokes, cap);
  }, 0);
}

/** Score differential = (113 / slope) × (adjusted gross − course rating − PCC), rounded to 0.1. */
export function scoreDifferential(adjustedGross: number, courseRating: number, slope: number, pcc = 0): number {
  return round1((113 / slope) * (adjustedGross - courseRating - pcc));
}

/** How many of the lowest differentials count, and the adjustment, for n recent scores (WHS table). */
export function differentialsToUse(n: number): { count: number; adjustment: number } | null {
  if (n < 3) return null;
  if (n === 3) return { count: 1, adjustment: -2 };
  if (n === 4) return { count: 1, adjustment: -1 };
  if (n === 5) return { count: 1, adjustment: 0 };
  if (n === 6) return { count: 2, adjustment: -1 };
  if (n <= 8) return { count: 2, adjustment: 0 };
  if (n <= 11) return { count: 3, adjustment: 0 };
  if (n <= 14) return { count: 4, adjustment: 0 };
  if (n <= 16) return { count: 5, adjustment: 0 };
  if (n <= 18) return { count: 6, adjustment: 0 };
  if (n === 19) return { count: 7, adjustment: 0 };
  return { count: 8, adjustment: 0 };
}

export interface HandicapResult {
  handicapIndex: number | null; // null until 3 scores exist
  roundsConsidered: number;
  differentialsUsed: number[];
  note?: string;
}

/** Handicap index from differentials ordered newest first. Uses the most recent 20. */
export function handicapIndex(differentialsNewestFirst: number[]): HandicapResult {
  const recent = differentialsNewestFirst.slice(0, 20);
  const rule = differentialsToUse(recent.length);
  if (!rule) {
    return {
      handicapIndex: null,
      roundsConsidered: recent.length,
      differentialsUsed: [],
      note: `Need at least 3 eligible 18-hole rounds (have ${recent.length}).`,
    };
  }
  const lowest = [...recent].sort((a, b) => a - b).slice(0, rule.count);
  const avg = lowest.reduce((s, d) => s + d, 0) / lowest.length;
  const index = Math.min(54, round1(avg + rule.adjustment));
  return { handicapIndex: index, roundsConsidered: recent.length, differentialsUsed: lowest };
}

/** Course handicap = index × (slope / 113) + (course rating − par), rounded to a whole number. */
export function courseHandicap(index: number, slope: number, courseRating: number, par: number): number {
  return Math.round(index * (slope / 113) + (courseRating - par));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
