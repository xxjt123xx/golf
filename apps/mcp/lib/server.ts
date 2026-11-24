import { McpServer } from "@modelcontextprotocol/server";
import { registerCourseTools } from "./tools/courses";
import { registerEquipmentTools } from "./tools/equipment";
import { registerHandicapTools } from "./tools/handicap";
import { registerPracticeTools } from "./tools/practice";
import { registerRoundTools } from "./tools/rounds";

/** The MCP server for one signed-in golfer. Built per request (stateless). */
export function golfServer(userId: string) {
  const server = new McpServer(
    { name: "fairway-log", version: "0.2.0" },
    {
      instructions:
        "Golf tracking for the signed-in golfer. Dates are YYYY-MM-DD in the golfer's local time. " +
        "Before start_round or log_round, use search_courses and only create_course if nothing matches. " +
        "To log scores during play, find the in-progress round with list_rounds(status: 'in_progress').",
    },
  );
  registerCourseTools(server, userId);
  registerRoundTools(server, userId);
  registerEquipmentTools(server, userId);
  registerHandicapTools(server, userId);
  registerPracticeTools(server, userId);
  return server;
}
