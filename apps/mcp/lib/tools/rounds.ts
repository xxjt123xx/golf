import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import {
  deleteRound, finishRound, getRound, getStats, listRounds, logRound, recordHoles, recordShot, reopenRound, setRoundBag, startRound,
} from "@golf/db";
import { date, id, run } from "./util";

const holeScore = z.object({
  hole_number: z.number().int().min(1).max(18),
  strokes: z.number().int().min(1).max(20),
  putts: z.number().int().min(0).max(10).optional(),
  fairway: z.enum(["hit", "left", "right", "short", "long", "na"]).optional().describe("Tee shot result; 'na' on par 3s"),
  gir: z.boolean().optional().describe("Green in regulation"),
  penalties: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(500).optional(),
});

const startFields = {
  course_id: id, tee_id: id.optional(), played_on: date,
  holes_planned: z.union([z.literal(9), z.literal(18)]).default(18),
  starting_hole: z.union([z.literal(1), z.literal(10)]).default(1),
  equipment_ids: z.array(id).optional().describe("Equipment in the bag for this round"),
  notes: z.string().max(2000).optional(),
};

export function registerRoundTools(server: McpServer, userId: string) {
  server.registerTool("start_round", {
    title: "Start round",
    description: "Create a round at a course (find it with search_courses first). Then record scores with record_hole_scores.",
    inputSchema: z.object(startFields),
  }, (args) => run(() => startRound(userId, args)));

  server.registerTool("record_hole_scores", {
    title: "Record hole scores",
    description: "Save scores for one or more holes of an in-progress round. Re-sending a hole overwrites it.",
    inputSchema: z.object({ round_id: id, holes: z.array(holeScore).min(1).max(18) }),
  }, ({ round_id, holes }) => run(() => recordHoles(userId, round_id, holes)));

  server.registerTool("record_shot", {
    title: "Record shot",
    description: "Log a single shot on a hole: club used, distance, lie and result. Shot number auto-increments if omitted.",
    inputSchema: z.object({
      round_id: id, hole_number: z.number().int().min(1).max(18), shot_number: z.number().int().min(1).max(20).optional(),
      equipment_id: id.optional().describe("Club used (from list_equipment)"),
      distance_yards: z.number().int().min(0).max(450).optional(),
      lie: z.enum(["tee", "fairway", "rough", "sand", "recovery", "green", "other"]).optional().describe("Where the ball was hit from"),
      result: z.enum(["fairway", "rough", "sand", "green", "water", "out_of_bounds", "recovery", "holed", "other"]).optional(),
      notes: z.string().max(500).optional(),
    }),
  }, ({ round_id, ...shot }) => run(() => recordShot(userId, round_id, shot)));

  server.registerTool("set_round_bag", {
    title: "Set round bag",
    description: "Replace the list of equipment used in a round.",
    inputSchema: z.object({ round_id: id, equipment_ids: z.array(id) }),
  }, ({ round_id, equipment_ids }) => run(() => setRoundBag(userId, round_id, equipment_ids)));

  server.registerTool("finish_round", {
    title: "Finish round",
    description:
      "Complete a round. The total comes from hole scores; if no holes were entered, pass total_score. Calculates the handicap differential for 18-hole rounds on rated tees.",
    inputSchema: z.object({
      round_id: id, total_score: z.number().int().min(18).max(200).optional(),
      counts_for_handicap: z.boolean().optional().describe("False for casual or non-rules rounds"),
    }),
  }, ({ round_id, ...opts }) => run(() => finishRound(userId, round_id, opts)));

  server.registerTool("reopen_round", {
    title: "Reopen round",
    description: "Set a finished round back to in progress so scores can be corrected.",
    inputSchema: z.object({ round_id: id }),
  }, ({ round_id }) => run(() => reopenRound(userId, round_id)));

  server.registerTool("log_round", {
    title: "Log completed round",
    description: "Quickly save a finished round with just the total score (no hole-by-hole detail).",
    inputSchema: z.object({ ...startFields, total_score: z.number().int().min(18).max(200), counts_for_handicap: z.boolean().optional() }),
  }, (args) => run(() => logRound(userId, args)));

  server.registerTool("get_round", {
    title: "Get round",
    description: "A round with hole scores, shots, and the equipment bag.",
    inputSchema: z.object({ round_id: id }),
    annotations: { readOnlyHint: true },
  }, ({ round_id }) => run(() => getRound(userId, round_id)));

  server.registerTool("list_rounds", {
    title: "List rounds",
    description: "Recent rounds, newest first. Filter by status to find a round in progress.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(10), status: z.enum(["in_progress", "completed"]).optional() }),
    annotations: { readOnlyHint: true },
  }, (args) => run(() => listRounds(userId, args)));

  server.registerTool("delete_round", {
    title: "Delete round",
    description: "Permanently delete a round and its scores and shots. Confirm with the user first.",
    inputSchema: z.object({ round_id: id }),
    annotations: { destructiveHint: true },
  }, ({ round_id }) => run(async () => { await deleteRound(userId, round_id); return { deleted: round_id }; }));

  server.registerTool("get_stats", {
    title: "Get stats",
    description: "Scoring average, putts, fairways and greens hit, penalties, scoring by par, and practice time over recent rounds.",
    inputSchema: z.object({ last_n_rounds: z.number().int().min(1).max(100).default(20) }),
    annotations: { readOnlyHint: true },
  }, ({ last_n_rounds }) => run(() => getStats(userId, last_n_rounds)));
}
