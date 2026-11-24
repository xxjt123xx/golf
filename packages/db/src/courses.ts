import { newId, NotFoundError, pool, ValidationError } from "./pool.ts";

export interface HoleInput { hole_number: number; par: number; stroke_index?: number | null; yardage?: number | null }
export interface TeeInput {
  name: string; par: number; course_rating?: number | null; slope?: number | null; yardage?: number | null;
  holes?: HoleInput[];
}
export interface CourseInput { name: string; city?: string | null; region?: string | null; country?: string | null; tees?: TeeInput[] }

export async function searchCourses(query: string, limit = 10) {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.city, c.region, c.country,
            COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name, 'par', t.par,
              'course_rating', t.course_rating, 'slope', t.slope, 'yardage', t.yardage) ORDER BY t.yardage DESC NULLS LAST)
              FILTER (WHERE t.id IS NOT NULL), '[]') AS tees
     FROM courses c LEFT JOIN tees t ON t.course_id = c.id
     WHERE c.name ILIKE '%' || $1 || '%' OR c.city ILIKE '%' || $1 || '%'
     GROUP BY c.id ORDER BY c.name LIMIT $2`,
    [query, limit],
  );
  return rows;
}

export async function createCourse(userId: string, input: CourseInput) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const id = newId();
    await client.query(
      `INSERT INTO courses (id, name, city, region, country, created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, input.name, input.city ?? null, input.region ?? null, input.country ?? null, userId],
    );
    for (const tee of input.tees ?? []) await insertTee(client, id, tee);
    await client.query("COMMIT");
    return getCourse(id);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function addTee(courseId: string, tee: TeeInput) {
  const exists = await pool.query(`SELECT 1 FROM courses WHERE id = $1`, [courseId]);
  if (!exists.rowCount) throw new NotFoundError("Course not found");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const teeId = await insertTee(client, courseId, tee);
    await client.query("COMMIT");
    return { tee_id: teeId, course: await getCourse(courseId) };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Add or replace hole details (par, stroke index, yardage) for a tee. */
export async function setTeeHoles(teeId: string, holes: HoleInput[]) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const h of holes) await upsertHole(client, teeId, h);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getCourse(courseId: string) {
  const c = await pool.query(`SELECT id, name, city, region, country FROM courses WHERE id = $1`, [courseId]);
  if (!c.rowCount) throw new NotFoundError("Course not found");
  const tees = await pool.query(
    `SELECT t.id, t.name, t.par, t.course_rating, t.slope, t.yardage,
            COALESCE(json_agg(json_build_object('hole_number', h.hole_number, 'par', h.par,
              'stroke_index', h.stroke_index, 'yardage', h.yardage) ORDER BY h.hole_number)
              FILTER (WHERE h.hole_number IS NOT NULL), '[]') AS holes
     FROM tees t LEFT JOIN tee_holes h ON h.tee_id = t.id
     WHERE t.course_id = $1 GROUP BY t.id ORDER BY t.yardage DESC NULLS LAST, t.name`,
    [courseId],
  );
  return { ...c.rows[0], tees: tees.rows };
}

type Q = { query: (text: string, values?: unknown[]) => Promise<unknown> };

async function insertTee(client: Q, courseId: string, tee: TeeInput): Promise<string> {
  const id = newId();
  await client.query(
    `INSERT INTO tees (id, course_id, name, par, course_rating, slope, yardage) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, courseId, tee.name, tee.par, tee.course_rating ?? null, tee.slope ?? null, tee.yardage ?? null],
  );
  const seen = new Set<number>();
  for (const h of tee.holes ?? []) {
    if (seen.has(h.hole_number)) throw new ValidationError(`Hole ${h.hole_number} listed twice`);
    seen.add(h.hole_number);
    await upsertHole(client, id, h);
  }
  return id;
}

async function upsertHole(client: Q, teeId: string, h: HoleInput) {
  await client.query(
    `INSERT INTO tee_holes (tee_id, hole_number, par, stroke_index, yardage) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (tee_id, hole_number) DO UPDATE SET par = excluded.par, stroke_index = excluded.stroke_index, yardage = excluded.yardage`,
    [teeId, h.hole_number, h.par, h.stroke_index ?? null, h.yardage ?? null],
  );
}
