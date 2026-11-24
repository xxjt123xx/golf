import pg from "pg";

// One pool per serverless instance. Neon works with plain `pg` over its pooled connection string.
const g = globalThis as unknown as { __golfPool?: pg.Pool };
export const pool: pg.Pool = g.__golfPool ?? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
g.__golfPool = pool;

// DATE and NUMERIC come back as strings; keep dates as YYYY-MM-DD and parse numerics.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));

export class NotFoundError extends Error {}
export class ValidationError extends Error {}

export const newId = () => crypto.randomUUID();
