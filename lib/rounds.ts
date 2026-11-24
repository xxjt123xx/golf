import { randomUUID } from "node:crypto";
import { pool } from "./db";

export interface Round {
  id: string;
  course_name: string;
  played_on: string; // YYYY-MM-DD
  holes: number;
  score: number;
  putts: number | null;
  notes: string | null;
}

const COLS = `id, course_name, to_char(played_on, 'YYYY-MM-DD') AS played_on, holes, score, putts, notes`;

export async function insertRound(userId: string, r: Omit<Round, "id">): Promise<Round> {
  const { rows } = await pool.query<Round>(
    `INSERT INTO rounds (id, user_id, course_name, played_on, holes, score, putts, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${COLS}`,
    [randomUUID(), userId, r.course_name, r.played_on, r.holes, r.score, r.putts, r.notes],
  );
  return rows[0];
}

export async function listRounds(userId: string, limit: number): Promise<Round[]> {
  const { rows } = await pool.query<Round>(
    `SELECT ${COLS} FROM rounds WHERE user_id = $1 ORDER BY played_on DESC, created_at DESC LIMIT $2`,
    [userId, limit],
  );
  return rows;
}
