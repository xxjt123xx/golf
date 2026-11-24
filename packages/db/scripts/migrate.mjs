// Applies migrations/*.sql in order, once each. Run after Better Auth's `auth migrate` (needs the "user" table).
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";

const dir = new URL("../migrations/", import.meta.url);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(`CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
const done = new Set((await client.query(`SELECT name FROM app_migrations`)).rows.map((r) => r.name));
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(file)) continue;
  await client.query("BEGIN");
  try {
    await client.query(readFileSync(new URL(file, dir), "utf8"));
    await client.query(`INSERT INTO app_migrations (name) VALUES ($1)`, [file]);
    await client.query("COMMIT");
    console.log(`applied ${file}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}
await client.end();
console.log("App migrations up to date.");
