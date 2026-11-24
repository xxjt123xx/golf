import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import { deletePractice, listPractice, logPractice } from "@golf/db";
import { date, id, run } from "./util";

export function registerPracticeTools(server: McpServer, userId: string) {
  server.registerTool("log_practice", {
    title: "Log practice",
    description: "Save a practice session: date, duration in minutes, optional focus, location and notes.",
    inputSchema: z.object({
      practiced_on: date, duration_minutes: z.number().int().min(1).max(1440),
      focus: z.string().max(100).optional().describe("e.g. 'putting', 'driving range', 'short game'"),
      location: z.string().max(200).optional(), notes: z.string().max(2000).optional(),
    }),
  }, (args) => run(() => logPractice(userId, args)));

  server.registerTool("list_practice", {
    title: "List practice",
    description: "Recent practice sessions and total minutes.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(20), since: date.optional() }),
    annotations: { readOnlyHint: true },
  }, (args) => run(() => listPractice(userId, args)));

  server.registerTool("delete_practice", {
    title: "Delete practice",
    description: "Delete a practice session. Confirm with the user first.",
    inputSchema: z.object({ practice_id: id }),
    annotations: { destructiveHint: true },
  }, ({ practice_id }) => run(async () => { await deletePractice(userId, practice_id); return { deleted: practice_id }; }));
}
