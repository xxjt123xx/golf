import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adjustedGrossScore, courseHandicap, differentialsToUse, handicapIndex, scoreDifferential, strokesReceived,
} from "../src/handicap.ts";
import { summarize } from "../src/stats.ts";

test("score differential matches the WHS formula", () => {
  // (113 / 125) × (90 − 71.5) = 16.724 -> 16.7
  assert.equal(scoreDifferential(90, 71.5, 125), 16.7);
  assert.equal(scoreDifferential(72, 72.0, 113), 0);
});

test("differentials-to-use table", () => {
  assert.equal(differentialsToUse(2), null);
  assert.deepEqual(differentialsToUse(3), { count: 1, adjustment: -2 });
  assert.deepEqual(differentialsToUse(6), { count: 2, adjustment: -1 });
  assert.deepEqual(differentialsToUse(10), { count: 3, adjustment: 0 });
  assert.deepEqual(differentialsToUse(20), { count: 8, adjustment: 0 });
  assert.deepEqual(differentialsToUse(35), { count: 8, adjustment: 0 });
});

test("handicap index: fewer than 3 rounds has no index", () => {
  assert.equal(handicapIndex([10, 12]).handicapIndex, null);
});

test("handicap index: 3 rounds = lowest minus 2", () => {
  assert.equal(handicapIndex([15.2, 12.1, 18]).handicapIndex, 10.1);
});

test("handicap index: 20+ rounds averages the lowest 8 of the most recent 20", () => {
  const recent = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const older = [0, 0, 0]; // beyond the 20 most recent: ignored
  // lowest 8 of recent: 1..8 -> avg 4.5
  assert.equal(handicapIndex([...recent, ...older]).handicapIndex, 4.5);
});

test("strokes received by stroke index", () => {
  assert.equal(strokesReceived(10, 1), 1);
  assert.equal(strokesReceived(10, 10), 1);
  assert.equal(strokesReceived(10, 11), 0);
  assert.equal(strokesReceived(20, 2), 2);
  assert.equal(strokesReceived(20, 3), 1);
  assert.equal(strokesReceived(0, 1), 0);
  assert.equal(strokesReceived(-2, 18), -1); // plus 2 gives back on the two easiest holes
  assert.equal(strokesReceived(-2, 17), -1);
  assert.equal(strokesReceived(-2, 16), 0);
});

test("adjusted gross caps each hole at net double bogey", () => {
  const holes = [
    { par: 4, strokeIndex: 1, strokes: 9 }, // cap 4+2+1 = 7
    { par: 3, strokeIndex: 18, strokes: 6 }, // cap 3+2+0 = 5
    { par: 5, strokeIndex: 5, strokes: 6 }, // under cap
  ];
  assert.equal(adjustedGrossScore(holes, 10), 7 + 5 + 6);
  // No handicap yet: par + 5
  assert.equal(adjustedGrossScore([{ par: 4, strokeIndex: 1, strokes: 12 }], null), 9);
});

test("course handicap", () => {
  // 12.4 × 130/113 + (71.2 − 72) = 14.27 − 0.8 = 13.47 -> 13
  assert.equal(courseHandicap(12.4, 130, 71.2, 72), 13);
});

test("summarize stats", () => {
  const s = summarize([
    {
      holesPlayed: 2,
      totalScore: 9,
      holes: [
        { par: 4, strokes: 5, putts: 2, fairway: "hit", gir: false, penalties: 0 },
        { par: 3, strokes: 4, putts: 2, fairway: "na", gir: true, penalties: 1 },
      ],
    },
  ]);
  assert.equal(s.scoringAverage18, 81);
  assert.equal(s.puttsPerRound18, 36);
  assert.equal(s.fairwaysHitPct, 100);
  assert.equal(s.greensInRegulationPct, 50);
  assert.equal(s.scoringByPar.par3, 4);
});
