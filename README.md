# Golf Rounds MCP

A remote MCP server that lets golfers track rounds by chatting with Claude.
Multi-user, Google sign-in, hosted on Vercel with Neon Postgres. Stripe billing comes in a later step.

## Stack

- **Next.js** (App Router) on **Vercel**
- **MCP**: `@modelcontextprotocol/server` at `/api/mcp`
- **Auth**: [Better Auth](https://www.better-auth.com) with Google sign-in, acting as the OAuth server Claude connects through (`@better-auth/mcp`, with CIMD and dynamic client registration)
- **Database**: Postgres (Neon) via `pg`

## How sign-in works

1. A user adds `https://<your-app>/api/mcp` as a custom connector in Claude.
2. Claude gets a `401`, discovers the auth server, and registers itself.
3. The user signs in with Google at `/sign-in`, then approves Claude at `/consent`.
4. Claude receives a token for `/api/mcp`. Every tool call is scoped to that user.

## MCP tools (step 1)

| Tool | Example |
| --- | --- |
| `log_round` | "Shot 84 at Torrey Pines South today with 32 putts" |
| `list_rounds` | "Show my last 5 rounds" |

## Setup

### 1. Accounts and keys

| What | Where | Gives you |
| --- | --- | --- |
| Vercel project | vercel.com > Add New > Project > import this repo | Hosting, `BETTER_AUTH_URL` |
| Neon Postgres | Vercel project > Storage > Neon | `DATABASE_URL` (added automatically) |
| Google OAuth client | console.cloud.google.com > APIs & Services > Credentials > Create OAuth client ID > Web application | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Auth secret | `npx auth secret` | `BETTER_AUTH_SECRET` |

Google OAuth client settings:
- **Authorized redirect URIs**: `https://<your-app>.vercel.app/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`
- **OAuth consent screen**: External, add your email as a test user while in Testing mode.

### 2. Local development

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run db:migrate           # Better Auth tables + app tables
npm run dev
```

### 3. Deploy

1. Set the four env vars in Vercel (Settings > Environment Variables).
2. Run `npm run db:migrate` once against the production `DATABASE_URL`.
3. Deploy, then add `https://<your-app>.vercel.app/api/mcp` as a custom connector in Claude.

## Roadmap

1. ✅ MCP endpoint, Google sign-in, `log_round`, `list_rounds`
2. Courses, tees, per-hole scoring
3. Stats and handicap estimate
4. Stripe monthly subscription and paywall
5. Custom domain
