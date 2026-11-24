import { createMcpProtectedRequestHandler } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { authIssuer, mcpResource } from "@/lib/config";
import { golfServer } from "@/lib/server";

// Verifies the Bearer JWT issued by apps/web (signature via JWKS, issuer, audience = this endpoint)
// and answers 401 with a WWW-Authenticate challenge so Claude starts sign-in.
const handler = createMcpProtectedRequestHandler(
  { issuer: authIssuer, audience: mcpResource, jwksUrl: `${authIssuer}/jwks` },
  async (request, claims) => {
    if (!claims.sub) return new Response("Token has no subject", { status: 401 });
    const userId = claims.sub;
    return createMcpHandler(() => golfServer(userId)).fetch(request);
  },
);

export { handler as GET, handler as POST, handler as DELETE };
