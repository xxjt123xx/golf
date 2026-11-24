import { baseURL, mcpResource } from "@/lib/auth";

// RFC 9728: tells Claude which authorization server protects /api/mcp.
export function GET() {
  return Response.json(
    {
      resource: mcpResource,
      authorization_servers: [`${baseURL}/api/auth`],
      bearer_methods_supported: ["header"],
      resource_name: "Golf Rounds",
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } },
  );
}
