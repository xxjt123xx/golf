import { handicapIndex } from "@golf/golf";
import { newId, pool } from "./pool.ts";

/** Calculated index from the golfer's own rounds, plus their latest officially recorded index. */
export async function getHandicap(userId: string, excludeRoundId?: string) {
  const { rows } = await pool.query(
    `SELECT r.id, r.played_on, r.differential, r.total_score, r.adjusted_gross, c.name AS course_name
     FROM rounds r JOIN courses c ON c.id = r.course_id
     WHERE r.user_id = $1 AND r.status = 'completed' AND r.counts_for_handicap AND r.differential IS NOT NULL
       AND ($2::text IS NULL OR r.id <> $2)
     ORDER BY r.played_on DESC, r.completed_at DESC LIMIT 20`,
    [userId, excludeRoundId ?? null],
  );
  const calc = handicapIndex(rows.map((r) => Number(r.differential)));
  const official = await pool.query(
    `SELECT handicap_index, recorded_on, source, notes FROM handicap_records
     WHERE user_id = $1 ORDER BY recorded_on DESC, created_at DESC LIMIT 1`,
    [userId],
  );
  return {
    calculated_index: calc.handicapIndex,
    calculation_note: calc.note ?? "WHS: average of the lowest differentials from your most recent 20 eligible 18-hole rounds.",
    differentials_used: calc.differentialsUsed,
    recent_scores: rows,
    official: official.rows[0] ?? null,
  };
}

export async function recordHandicap(
  userId: string,
  r: { handicap_index: number; recorded_on: string; source?: string | null; notes?: string | null },
) {
  const { rows } = await pool.query(
    `INSERT INTO handicap_records (id, user_id, handicap_index, recorded_on, source, notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING handicap_index, recorded_on, source, notes`,
    [newId(), userId, r.handicap_index, r.recorded_on, r.source ?? null, r.notes ?? null],
  );
  return rows[0];
}

/** The index to use for stroke allocation: calculated if available, else the latest official one. */
export async function currentIndex(userId: string, excludeRoundId?: string): Promise<number | null> {
  const h = await getHandicap(userId, excludeRoundId);
  return h.calculated_index ?? (h.official ? Number(h.official.handicap_index) : null);
}
