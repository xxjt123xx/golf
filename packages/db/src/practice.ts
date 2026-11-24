import { newId, NotFoundError, pool } from "./pool.ts";

export interface PracticeInput {
  practiced_on: string; duration_minutes: number; focus?: string | null; location?: string | null; notes?: string | null;
}
const COLS = `id, practiced_on, duration_minutes, focus, location, notes`;

export async function logPractice(userId: string, p: PracticeInput) {
  const { rows } = await pool.query(
    `INSERT INTO practice_sessions (id, user_id, practiced_on, duration_minutes, focus, location, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLS}`,
    [newId(), userId, p.practiced_on, p.duration_minutes, p.focus ?? null, p.location ?? null, p.notes ?? null],
  );
  return rows[0];
}

export async function listPractice(userId: string, opts: { limit?: number; since?: string } = {}) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM practice_sessions WHERE user_id = $1 AND ($2::date IS NULL OR practiced_on >= $2)
     ORDER BY practiced_on DESC, created_at DESC LIMIT $3`,
    [userId, opts.since ?? null, opts.limit ?? 20],
  );
  const total = rows.reduce((s, r) => s + r.duration_minutes, 0);
  return { sessions: rows, total_minutes: total };
}

export async function deletePractice(userId: string, id: string) {
  const r = await pool.query(`DELETE FROM practice_sessions WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (!r.rowCount) throw new NotFoundError("Practice session not found");
}
