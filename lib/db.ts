import { Pool } from "pg";

// One pool per serverless instance. Neon works with plain `pg` over its pooled connection string.
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;
