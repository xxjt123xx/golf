import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import { addTee, createCourse, getCourse, searchCourses, setTeeHoles } from "@golf/db";
import { id, run } from "./util";

const hole = z.object({
  hole_number: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(6),
  stroke_index: z.number().int().min(1).max(18).optional().describe("Handicap ranking, 1 = hardest"),
  yardage: z.number().int().min(50).max(800).optional(),
});
const tee = z.object({
  name: z.string().min(1).describe("Tee name, e.g. 'Blue'"),
  par: z.number().int().min(27).max(80),
  course_rating: z.number().min(25).max(85).optional().describe("USGA course rating, e.g. 72.4"),
  slope: z.number().int().min(55).max(155).optional().describe("Slope rating, e.g. 131"),
  yardage: z.number().int().optional(),
  holes: z.array(hole).max(18).optional().describe("Per-hole par, stroke index and yardage"),
});

export function registerCourseTools(server: McpServer, userId: string) {
  server.registerTool("search_courses", {
    title: "Search courses",
    description: "Find golf courses by name or city. Always search before creating a course to avoid duplicates.",
    inputSchema: z.object({ query: z.string().min(2), limit: z.number().int().min(1).max(25).default(10) }),
    annotations: { readOnlyHint: true },
  }, ({ query, limit }) => run(() => searchCourses(query, limit)));

  server.registerTool("get_course", {
    title: "Get course",
    description: "Course details with every tee and its holes (par, stroke index, yardage).",
    inputSchema: z.object({ course_id: id }),
    annotations: { readOnlyHint: true },
  }, ({ course_id }) => run(() => getCourse(course_id)));

  server.registerTool("create_course", {
    title: "Create course",
    description: "Add a golf course to the shared catalog, optionally with tees (rating, slope) and hole details.",
    inputSchema: z.object({
      name: z.string().min(2), city: z.string().optional(), region: z.string().optional().describe("State or province"),
      country: z.string().optional(), tees: z.array(tee).optional(),
    }),
  }, (args) => run(() => createCourse(userId, args)));

  server.registerTool("add_tee", {
    title: "Add tee",
    description: "Add a set of tees to an existing course.",
    inputSchema: tee.extend({ course_id: id }),
  }, ({ course_id, ...t }) => run(() => addTee(course_id, t)));

  server.registerTool("set_tee_holes", {
    title: "Set tee holes",
    description: "Add or update hole details (par, stroke index, yardage) for a tee.",
    inputSchema: z.object({ tee_id: id, holes: z.array(hole).min(1).max(18) }),
  }, ({ tee_id, holes }) => run(async () => { await setTeeHoles(tee_id, holes); return { ok: true, holes_updated: holes.length }; }));
}
