import { adjustedGrossScore, courseHandicap, scoreDifferential, summarize, type HoleStat } from "@golf/golf";
import { assertOwnsEquipment } from "./equipment.ts";
import { currentIndex } from "./handicap.ts";
import { newId, NotFoundError, pool, ValidationError } from "./pool.ts";

export interface StartRoundInput {
  course_id: string; tee_id?: string | null; played_on: string; holes_planned?: 9 | 18; starting_hole?: 1 | 10;
  equipment_ids?: string[]; notes?: string | null;
}
export interface HoleScoreInput {
  hole_number: number; strokes: number; putts?: number | null;
  fairway?: "hit" | "left" | "right" | "short" | "long" | "na" | null; gir?: boolean | null;
  penalties?: number | null; notes?: string | null;
}
export interface ShotInput {
  hole_number: number; shot_number?: number; equipment_id?: string | null; distance_yards?: number | null;
  lie?: string | null; result?: string | null; notes?: string | null;
}

async function ownedRound(userId: string, roundId: string) {
  const { rows } = await pool.query(
    `SELECT r.*, t.par AS tee_par, t.course_rating, t.slope
     FROM rounds r LEFT JOIN tees t ON t.id = r.tee_id WHERE r.id = $1 AND r.user_id = $2`,
    [roundId, userId],
  );
  if (!rows.length) throw new NotFoundError("Round not found");
  return rows[0];
}

export async function startRound(userId: string, input: StartRoundInput) {
  const course = await pool.query(`SELECT id FROM courses WHERE id = $1`, [input.course_id]);
  if (!course.rowCount) throw new NotFoundError("Course not found");
  if (input.tee_id) {
    const tee = await pool.query(`SELECT 1 FROM tees WHERE id = $1 AND course_id = $2`, [input.tee_id, input.course_id]);
    if (!tee.rowCount) throw new NotFoundError("Tee not found for this course");
  }
  await assertOwnsEquipment(userId, input.equipment_ids ?? []);
  const id = newId();
  await pool.query(
    `INSERT INTO rounds (id, user_id, course_id, tee_id, played_on, holes_planned, starting_hole, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, userId, input.course_id, input.tee_id ?? null, input.played_on, input.holes_planned ?? 18,
      input.starting_hole ?? 1, input.notes ?? null],
  );
  for (const eq of new Set(input.equipment_ids ?? [])) {
    await pool.query(`INSERT INTO round_equipment (round_id, equipment_id) VALUES ($1,$2)`, [id, eq]);
  }
  return getRound(userId, id);
}

export async function recordHoles(userId: string, roundId: string, holes: HoleScoreInput[]) {
  const round = await ownedRound(userId, roundId);
  if (round.status === "completed") throw new ValidationError("Round is already finished. Reopen it to change scores.");
  for (const h of holes) {
    if (h.putts != null && h.putts > h.strokes) throw new ValidationError(`Hole ${h.hole_number}: putts exceed strokes`);
    await pool.query(
      `INSERT INTO round_holes (round_id, hole_number, strokes, putts, fairway, gir, penalties, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (round_id, hole_number) DO UPDATE SET strokes = excluded.strokes, putts = excluded.putts,
         fairway = excluded.fairway, gir = excluded.gir, penalties = excluded.penalties, notes = excluded.notes`,
      [roundId, h.hole_number, h.strokes, h.putts ?? null, h.fairway ?? null, h.gir ?? null, h.penalties ?? null, h.notes ?? null],
    );
  }
  const { rows } = await pool.query(
    `SELECT count(*)::int AS holes_scored, COALESCE(sum(strokes), 0)::int AS strokes_so_far FROM round_holes WHERE round_id = $1`,
    [roundId],
  );
  return { round_id: roundId, ...rows[0], holes_planned: round.holes_planned };
}

export async function recordShot(userId: string, roundId: string, s: ShotInput) {
  const round = await ownedRound(userId, roundId);
  if (round.status === "completed") throw new ValidationError("Round is already finished.");
  if (s.equipment_id) await assertOwnsEquipment(userId, [s.equipment_id]);
  let shotNumber = s.shot_number;
  if (!shotNumber) {
    const { rows } = await pool.query(
      `SELECT COALESCE(max(shot_number), 0) + 1 AS n FROM shots WHERE round_id = $1 AND hole_number = $2`,
      [roundId, s.hole_number],
    );
    shotNumber = rows[0].n as number;
  }
  const { rows } = await pool.query(
    `INSERT INTO shots (id, round_id, hole_number, shot_number, equipment_id, distance_yards, lie, result, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (round_id, hole_number, shot_number) DO UPDATE SET equipment_id = excluded.equipment_id,
       distance_yards = excluded.distance_yards, lie = excluded.lie, result = excluded.result, notes = excluded.notes
     RETURNING id, hole_number, shot_number, equipment_id, distance_yards, lie, result, notes`,
    [newId(), roundId, s.hole_number, shotNumber, s.equipment_id ?? null, s.distance_yards ?? null, s.lie ?? null,
      s.result ?? null, s.notes ?? null],
  );
  // A club used for a shot is in the bag for that round.
  if (s.equipment_id) {
    await pool.query(`INSERT INTO round_equipment (round_id, equipment_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [roundId, s.equipment_id]);
  }
  return rows[0];
}

export async function setRoundBag(userId: string, roundId: string, equipmentIds: string[]) {
  await ownedRound(userId, roundId);
  await assertOwnsEquipment(userId, equipmentIds);
  await pool.query(`DELETE FROM round_equipment WHERE round_id = $1`, [roundId]);
  for (const eq of new Set(equipmentIds)) {
    await pool.query(`INSERT INTO round_equipment (round_id, equipment_id) VALUES ($1,$2)`, [roundId, eq]);
  }
  return getRound(userId, roundId);
}

/**
 * Finish a round: total from hole scores (or `total_score` if holes weren't entered),
 * then WHS adjusted gross and differential for 18-hole rounds on a rated tee.
 */
export async function finishRound(
  userId: string, roundId: string, opts: { total_score?: number; counts_for_handicap?: boolean } = {},
) {
  const round = await ownedRound(userId, roundId);
  const holes = (
    await pool.query(
      `SELECT rh.hole_number, rh.strokes, th.par, th.stroke_index
       FROM round_holes rh LEFT JOIN tee_holes th ON th.tee_id = $2 AND th.hole_number = rh.hole_number
       WHERE rh.round_id = $1 ORDER BY rh.hole_number`,
      [roundId, round.tee_id],
    )
  ).rows;

  let total: number;
  if (holes.length) {
    if (opts.total_score !== undefined) throw new ValidationError("Hole scores exist; total is calculated from them.");
    if (holes.length < round.holes_planned) {
      throw new ValidationError(`Only ${holes.length} of ${round.holes_planned} holes scored. Record the rest, or delete hole scores and give a total.`);
    }
    total = holes.reduce((s, h) => s + h.strokes, 0);
  } else if (opts.total_score !== undefined) {
    total = opts.total_score;
  } else {
    throw new ValidationError("No hole scores recorded. Provide total_score to finish.");
  }

  const counts = opts.counts_for_handicap ?? round.counts_for_handicap;
  let adjusted: number | null = null;
  let differential: number | null = null;
  const rated = round.course_rating != null && round.slope != null;
  if (round.holes_planned === 18 && rated) {
    const holeData = holes.length === 18 && holes.every((h) => h.par != null);
    if (holeData) {
      const idx = await currentIndex(userId, roundId);
      const ch = idx === null ? null : courseHandicap(idx, round.slope, Number(round.course_rating), round.tee_par);
      adjusted = adjustedGrossScore(
        holes.map((h) => ({ par: h.par, strokeIndex: h.stroke_index, strokes: h.strokes })), ch,
      );
    } else {
      adjusted = total; // no hole data to cap: use the gross score
    }
    differential = scoreDifferential(adjusted, Number(round.course_rating), round.slope);
  }

  await pool.query(
    `UPDATE rounds SET status = 'completed', total_score = $2, adjusted_gross = $3, differential = $4,
       counts_for_handicap = $5, completed_at = now() WHERE id = $1`,
    [roundId, total, adjusted, differential, counts],
  );
  const result = await getRound(userId, roundId);
  const note = differential === null
    ? round.holes_planned !== 18 ? "9-hole rounds don't produce a handicap differential yet."
      : "Add course rating and slope to the tee to get a handicap differential."
    : undefined;
  return { ...result, handicap_note: note };
}

export async function reopenRound(userId: string, roundId: string) {
  await ownedRound(userId, roundId);
  await pool.query(
    `UPDATE rounds SET status = 'in_progress', total_score = NULL, adjusted_gross = NULL, differential = NULL, completed_at = NULL WHERE id = $1`,
    [roundId],
  );
  return getRound(userId, roundId);
}

/** Quick entry: a completed round with only a total score. */
export async function logRound(
  userId: string, input: StartRoundInput & { total_score: number; counts_for_handicap?: boolean },
) {
  const r = await startRound(userId, input);
  return finishRound(userId, r.id, { total_score: input.total_score, counts_for_handicap: input.counts_for_handicap });
}

export async function getRound(userId: string, roundId: string) {
  const { rows } = await pool.query(
    `SELECT r.id, r.played_on, r.status, r.holes_planned, r.starting_hole, r.total_score, r.adjusted_gross,
            r.differential, r.counts_for_handicap, r.notes,
            json_build_object('id', c.id, 'name', c.name, 'city', c.city, 'region', c.region) AS course,
            CASE WHEN t.id IS NULL THEN NULL ELSE json_build_object('id', t.id, 'name', t.name, 'par', t.par,
              'course_rating', t.course_rating, 'slope', t.slope) END AS tee
     FROM rounds r JOIN courses c ON c.id = r.course_id LEFT JOIN tees t ON t.id = r.tee_id
     WHERE r.id = $1 AND r.user_id = $2`,
    [roundId, userId],
  );
  if (!rows.length) throw new NotFoundError("Round not found");
  const [holes, shots, bag] = await Promise.all([
    pool.query(
      `SELECT rh.hole_number, th.par, rh.strokes, rh.putts, rh.fairway, rh.gir, rh.penalties, rh.notes
       FROM round_holes rh JOIN rounds r ON r.id = rh.round_id
       LEFT JOIN tee_holes th ON th.tee_id = r.tee_id AND th.hole_number = rh.hole_number
       WHERE rh.round_id = $1 ORDER BY rh.hole_number`, [roundId]),
    pool.query(
      `SELECT s.id, s.hole_number, s.shot_number, s.distance_yards, s.lie, s.result, s.notes,
              e.id AS equipment_id, e.label AS club
       FROM shots s LEFT JOIN equipment e ON e.id = s.equipment_id
       WHERE s.round_id = $1 ORDER BY s.hole_number, s.shot_number`, [roundId]),
    pool.query(
      `SELECT e.id, e.label, e.category, e.brand, e.model FROM round_equipment re
       JOIN equipment e ON e.id = re.equipment_id WHERE re.round_id = $1 ORDER BY e.category, e.label`, [roundId]),
  ]);
  const scored = holes.rows;
  const toPar = scored.every((h) => h.par != null) && scored.length
    ? scored.reduce((s, h) => s + h.strokes - h.par, 0) : null;
  return { ...rows[0], to_par_so_far: toPar, holes: scored, shots: shots.rows, bag: bag.rows };
}

export async function listRounds(userId: string, opts: { limit?: number; status?: "in_progress" | "completed" } = {}) {
  const { rows } = await pool.query(
    `SELECT r.id, r.played_on, r.status, r.holes_planned, r.total_score, r.differential,
            c.name AS course_name, t.name AS tee_name,
            (SELECT count(*)::int FROM round_holes rh WHERE rh.round_id = r.id) AS holes_scored
     FROM rounds r JOIN courses c ON c.id = r.course_id LEFT JOIN tees t ON t.id = r.tee_id
     WHERE r.user_id = $1 AND ($2::text IS NULL OR r.status = $2)
     ORDER BY r.played_on DESC, r.created_at DESC LIMIT $3`,
    [userId, opts.status ?? null, opts.limit ?? 10],
  );
  return rows;
}

export async function deleteRound(userId: string, roundId: string) {
  const r = await pool.query(`DELETE FROM rounds WHERE id = $1 AND user_id = $2`, [roundId, userId]);
  if (!r.rowCount) throw new NotFoundError("Round not found");
}

/** Scoring stats over the last N completed rounds, plus practice time in the same window. */
export async function getStats(userId: string, lastN = 20) {
  const rounds = (
    await pool.query(
      `SELECT id, holes_planned, total_score, played_on FROM rounds
       WHERE user_id = $1 AND status = 'completed' AND total_score IS NOT NULL
       ORDER BY played_on DESC, completed_at DESC LIMIT $2`,
      [userId, lastN],
    )
  ).rows;
  const holes = rounds.length
    ? (
        await pool.query(
          `SELECT rh.round_id, th.par, rh.strokes, rh.putts, rh.fairway, rh.gir, rh.penalties
           FROM round_holes rh JOIN rounds r ON r.id = rh.round_id
           LEFT JOIN tee_holes th ON th.tee_id = r.tee_id AND th.hole_number = rh.hole_number
           WHERE rh.round_id = ANY($1)`,
          [rounds.map((r) => r.id)],
        )
      ).rows
    : [];
  const byRound = new Map<string, HoleStat[]>();
  for (const h of holes) {
    const list = byRound.get(h.round_id) ?? [];
    list.push({ par: h.par, strokes: h.strokes, putts: h.putts, fairway: h.fairway, gir: h.gir, penalties: h.penalties });
    byRound.set(h.round_id, list);
  }
  const summary = summarize(
    rounds.map((r) => ({ holesPlayed: r.holes_planned, totalScore: r.total_score, holes: byRound.get(r.id) ?? [] })),
  );
  const since = rounds.at(-1)?.played_on ?? null;
  const practice = await pool.query(
    `SELECT count(*)::int AS sessions, COALESCE(sum(duration_minutes), 0)::int AS minutes
     FROM practice_sessions WHERE user_id = $1 AND ($2::date IS NULL OR practiced_on >= $2)`,
    [userId, since],
  );
  return {
    ...summary,
    best_score: rounds.filter((r) => r.holes_planned === 18).reduce<number | null>(
      (b, r) => (b === null || r.total_score < b ? r.total_score : b), null),
    window: { rounds: rounds.length, since },
    practice_in_window: practice.rows[0],
  };
}
