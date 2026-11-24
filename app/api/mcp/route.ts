import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import { auth, mcpResource } from "@/lib/auth";
import { insertRound, listRounds } from "@/lib/rounds";

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

/** Build the MCP server for one signed-in golfer. Stateless: one per request. */
function golfServer(userId: string) {
  const server = new McpServer({ name: "golf-rounds", version: "0.1.0" });

  server.registerTool(
    "log_round",
    {
      title: "Log a round",
      description:
        "Save a round of golf for the signed-in golfer. Example: 'Shot 84 at Torrey Pines South today with 32 putts'.",
      inputSchema: z.object({
        course_name: z.string().min(1).describe("Course name, e.g. 'Torrey Pines South'"),
        played_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date played, YYYY-MM-DD"),
        score: z.number().int().min(18).max(200).describe("Total strokes"),
        holes: z.union([z.literal(9), z.literal(18)]).default(18),
        putts: z.number().int().min(0).max(100).optional(),
        notes: z.string().max(2000).optional(),
      }),
    },
    async (args) => {
      const round = await insertRound(userId, {
        course_name: args.course_name,
        played_on: args.played_on,
        holes: args.holes,
        score: args.score,
        putts: args.putts ?? null,
        notes: args.notes ?? null,
      });
      return json({ saved: round });
    },
  );

  server.registerTool(
    "list_rounds",
    {
      title: "List rounds",
      description: "List the signed-in golfer's most recent rounds, newest first.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(10) }),
      annotations: { readOnlyHint: true },
    },
    async ({ limit }) => json(await listRounds(userId, limit)),
  );

  return server;
}

// requireMcpAuth checks the Bearer token (signature, issuer, audience = this endpoint)
// and answers 401 with a WWW-Authenticate challenge so Claude starts sign-in.
const handler = requireMcpAuth(
  auth,
  async (request, claims) => {
    const userId = claims.sub;
    if (!userId) return new Response("Token has no subject", { status: 401 });
    return createMcpHandler(() => golfServer(userId)).fetch(request);
  },
  { resource: mcpResource },
);

export { handler as GET, handler as POST, handler as DELETE };
