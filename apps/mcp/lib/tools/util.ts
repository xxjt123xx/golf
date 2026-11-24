import { NotFoundError, ValidationError } from "@golf/db";
import * as z from "zod";

export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const id = z.string().min(1);

type Result = { content: { type: "text"; text: string }[]; isError?: boolean };

/** Run a tool body; return JSON, or a readable error for not-found / validation problems. */
export async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    const data = await fn();
    return { content: [{ type: "text", text: JSON.stringify(data ?? { ok: true }, null, 2) }] };
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ValidationError) {
      return { content: [{ type: "text", text: e.message }], isError: true };
    }
    // Postgres check/unique violations are user-fixable input problems.
    const pg = e as { code?: string; detail?: string; message?: string };
    if (pg.code === "23514" || pg.code === "23505" || pg.code === "22P02" || pg.code === "22007") {
      return { content: [{ type: "text", text: `Invalid input: ${pg.detail ?? pg.message}` }], isError: true };
    }
    throw e;
  }
}
