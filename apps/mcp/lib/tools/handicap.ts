import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import { getHandicap, recordHandicap } from "@golf/db";
import { date, run } from "./util";

export function registerHandicapTools(server: McpServer, userId: string) {
  server.registerTool("get_handicap", {
    title: "Get handicap",
    description:
      "The golfer's calculated handicap index (World Handicap System, from their rounds), the differentials used, and their latest official index.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  }, () => run(() => getHandicap(userId)));

  server.registerTool("record_handicap", {
    title: "Record official handicap",
    description: "Save the golfer's official handicap index (e.g. from GHIN or their club).",
    inputSchema: z.object({
      handicap_index: z.number().min(-10).max(54), recorded_on: date,
      source: z.string().optional().describe("e.g. 'GHIN'"), notes: z.string().max(500).optional(),
    }),
  }, (args) => run(() => recordHandicap(userId, args)));
}
