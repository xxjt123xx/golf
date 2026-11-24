import { authIssuer, mcpResource } from "@/lib/config";

// RFC 9728: tells Claude which authorization server (apps/web) protects /api/mcp.
export function GET() {
  return Response.json(
    {
      resource: mcpResource,
      authorization_servers: [authIssuer],
      bearer_methods_supported: ["header"],
      resource_name: "Fairway Log",
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } },
  );
}
