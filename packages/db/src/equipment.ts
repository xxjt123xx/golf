import { newId, NotFoundError, pool } from "./pool.ts";

export const EQUIPMENT_CATEGORIES = [
  "driver", "fairway_wood", "hybrid", "iron", "wedge", "putter", "ball", "bag", "shoes", "rangefinder", "other",
] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export interface EquipmentInput {
  category: EquipmentCategory; label: string; brand?: string | null; model?: string | null; loft?: number | null;
  shaft?: string | null; acquired_on?: string | null; retired_on?: string | null; notes?: string | null;
}

const COLS = `id, category, label, brand, model, loft, shaft, acquired_on, retired_on, notes`;

export async function addEquipment(userId: string, e: EquipmentInput) {
  const { rows } = await pool.query(
    `INSERT INTO equipment (id, user_id, category, label, brand, model, loft, shaft, acquired_on, retired_on, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING ${COLS}`,
    [newId(), userId, e.category, e.label, e.brand ?? null, e.model ?? null, e.loft ?? null, e.shaft ?? null,
      e.acquired_on ?? null, e.retired_on ?? null, e.notes ?? null],
  );
  return rows[0];
}

export async function updateEquipment(userId: string, id: string, patch: Partial<EquipmentInput>) {
  const fields = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (!fields.length) return getEquipment(userId, id);
  const allowed = new Set(["category", "label", "brand", "model", "loft", "shaft", "acquired_on", "retired_on", "notes"]);
  const sets = fields.filter(([k]) => allowed.has(k));
  const { rows } = await pool.query(
    `UPDATE equipment SET ${sets.map(([k], i) => `${k} = $${i + 3}`).join(", ")}
     WHERE id = $1 AND user_id = $2 RETURNING ${COLS}`,
    [id, userId, ...sets.map(([, v]) => v)],
  );
  if (!rows.length) throw new NotFoundError("Equipment not found");
  return rows[0];
}

export async function getEquipment(userId: string, id: string) {
  const { rows } = await pool.query(`SELECT ${COLS} FROM equipment WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (!rows.length) throw new NotFoundError("Equipment not found");
  return rows[0];
}

export async function listEquipment(userId: string, includeRetired = false) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM equipment WHERE user_id = $1 ${includeRetired ? "" : "AND retired_on IS NULL"}
     ORDER BY array_position($2::text[], category), loft NULLS LAST, label`,
    [userId, EQUIPMENT_CATEGORIES],
  );
  return rows;
}

/** Usage across all rounds: rounds in the bag, shots hit, and distance stats per item. */
export async function equipmentStats(userId: string, equipmentId?: string) {
  const { rows } = await pool.query(
    `SELECT e.id, e.label, e.category, e.retired_on,
            (SELECT count(*)::int FROM round_equipment re WHERE re.equipment_id = e.id) AS rounds_used,
            count(s.id)::int AS shots,
            round(avg(s.distance_yards))::int AS avg_distance_yards,
            max(s.distance_yards)::int AS max_distance_yards,
            count(s.id) FILTER (WHERE s.result IN ('water','out_of_bounds'))::int AS penalty_results
     FROM equipment e LEFT JOIN shots s ON s.equipment_id = e.id
     WHERE e.user_id = $1 AND ($2::text IS NULL OR e.id = $2)
     GROUP BY e.id ORDER BY array_position($3::text[], e.category), e.loft NULLS LAST, e.label`,
    [userId, equipmentId ?? null, EQUIPMENT_CATEGORIES],
  );
  if (equipmentId && !rows.length) throw new NotFoundError("Equipment not found");
  return rows;
}

/** Throws unless every id belongs to the user. */
export async function assertOwnsEquipment(userId: string, ids: string[]) {
  if (!ids.length) return;
  const { rows } = await pool.query(`SELECT id FROM equipment WHERE user_id = $1 AND id = ANY($2)`, [userId, ids]);
  if (rows.length !== new Set(ids).size) throw new NotFoundError("One or more equipment items were not found");
}
