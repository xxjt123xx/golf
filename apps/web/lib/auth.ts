import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { mcp } from "@better-auth/mcp";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { pool } from "@golf/db";

export const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
/** The MCP endpoint (apps/mcp) Claude connects to. Access tokens are issued for exactly this audience. */
export const mcpResource = process.env.MCP_URL ?? "http://localhost:3001/api/mcp";

export const auth = betterAuth({
  baseURL,
  database: pool,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  // The JWT plugin only signs MCP access tokens here; its own /token route isn't needed.
  disabledPaths: ["/token"],
  plugins: [
    jwt({ disableSettingJwtHeader: true }),
    mcp({
      loginPage: "/sign-in",
      consentPage: "/consent",
      resource: mcpResource,
      // Claude registers itself as an OAuth client. CIMD (below) is the modern way;
      // dynamic registration stays on for clients that still use it. Every client
      // still has to pass the consent page.
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationDefaultApplicationType: "infer",
    }),
    cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
  ],
});
