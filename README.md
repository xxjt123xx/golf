# Fairway Log (golf monorepo)

Golfers track rounds, shots, equipment, handicap and practice by chatting with Claude.
One repo, two Vercel apps, one Postgres database. ("Fairway Log" is a placeholder name.)

```
apps/
  web/        Website: info page, sign up / sign in (Google), dashboard, and the OAuth server Claude signs in through
  mcp/        MCP server (/api/mcp): the tools Claude calls
packages/
  db/         Postgres schema (migrations/) and all queries, scoped per user
  golf/       Pure golf logic: WHS handicap, adjusted gross, stats (unit tested)
```

## Stack

- **Next.js** (App Router) on **Vercel**, as two projects from this repo (Root Directory `apps/web` and `apps/mcp`)
- **Auth**: [Better Auth](https://www.better-auth.com) with Google sign-in. `apps/web` is the OAuth server for Claude (`@better-auth/mcp`, CIMD and dynamic client registration), and `apps/mcp` verifies its JWTs against the website's JWKS
- **MCP**: `@modelcontextprotocol/server` v2, stateless, one server per request bound to the signed-in user
- **Database**: Postgres (Neon) via `pg`

## What's tracked

| Area | Data | MCP tools |
| --- | --- | --- |
| Courses (shared catalog) | course, tees (par, rating, slope), holes (par, stroke index, yardage) | `search_courses`, `get_course`, `create_course`, `add_tee`, `set_tee_holes` |
| Rounds | round at a course and tee, status, hole scores (strokes, putts, fairway, GIR, penalties) | `start_round`, `record_hole_scores`, `finish_round`, `reopen_round`, `log_round` (total only), `get_round`, `list_rounds`, `delete_round` |
| Shots | club, distance, lie, result per shot | `record_shot` |
| Equipment | your clubs/balls/gear overall, the bag per round, the club per shot | `add_equipment`, `list_equipment`, `update_equipment` (retire), `set_round_bag`, `get_equipment_stats` |
| Handicap | WHS differential per 18-hole round, calculated index, official index you record | `get_handicap`, `record_handicap` |
| Practice | date, duration, focus, location, notes (no per-shot detail) | `log_practice`, `list_practice`, `delete_practice` |
| Stats | scoring average, putts, FIR %, GIR %, penalties, scoring by par, practice minutes | `get_stats` |

Example in Claude:
- "Start a round at Torrey Pines South from the blues with my driver, 8 iron and putter"
- "Hole 1: driver 265 to the fairway, 8 iron 158 to the green, two putts"
- "Log 45 minutes of putting practice today"
- "What's my handicap?"

Handicap notes: the formula is score differential = (113 / slope) × (adjusted gross − course rating). Holes are capped at net double bogey when hole data exists. The index averages the lowest differentials of the latest 20, using the WHS table for fewer than 20. Not yet included: 9-hole differentials, playing conditions calculation (PCC), and soft/hard caps.

## Setup

### 1. Accounts and keys

| What | Where | Gives you |
| --- | --- | --- |
| Vercel project **web** | vercel.com > Add New > Project > import this repo, Root Directory `apps/web` | the website URL |
| Vercel project **mcp** | import the same repo again, Root Directory `apps/mcp` | the MCP URL |
| Neon Postgres | in either Vercel project, Storage > Neon, then connect it to both projects | `DATABASE_URL` |
| Google OAuth client | console.cloud.google.com > APIs & Services > Credentials > Create OAuth client ID > Web application | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Auth secret | `npx auth secret` | `BETTER_AUTH_SECRET` |

For the Google OAuth client:
- **Authorized redirect URIs**: `https://<web>.vercel.app/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`
- **OAuth consent screen**: set it to External, and add yourself as a test user while it's in Testing mode

### 2. Environment variables

**web** (`apps/web/.env.example`): `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MCP_URL`

**mcp** (`apps/mcp/.env.example`): `DATABASE_URL`, `MCP_URL`, `AUTH_ISSUER` (= `<web URL>/api/auth`)

`MCP_URL` must be identical in both, e.g. `https://<mcp>.vercel.app/api/mcp`.

### 3. Local development

```bash
cp apps/web/.env.example apps/web/.env.local   # fill in
cp apps/mcp/.env.example apps/mcp/.env.local
npm install
DATABASE_URL=... npm run db:migrate             # Better Auth tables, then app tables
npm run dev                                     # web on :3000, mcp on :3001
npm test                                        # handicap and stats unit tests
```

### 4. Deploy

1. Set the env vars on both Vercel projects.
2. Run `npm run db:migrate` once against the production `DATABASE_URL` (and after any new migration).
3. Deploy both. Then, in Claude, go to Settings > Connectors > Add custom connector and enter `https://<mcp>.vercel.app/api/mcp`.

## Roadmap

1. ✅ Website, Google sign-in, MCP server
2. ✅ Courses, rounds, hole scores, shots, equipment, handicap, practice, stats
3. Stripe monthly subscription and paywall
4. Custom domain, richer dashboard (round detail, charts)
