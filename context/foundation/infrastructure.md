---
project: Work slop
researched_at: 2026-09-30
recommended_platform: Cloudflare Workers
runner_up: Netlify
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 7
  runtime: Cloudflare Workers (workerd)
---

## Recommendation

**Deploy on Cloudflare Workers.**

Work slop is a stateless Astro 7 SSR app (`astro` ^7.3.2, `@astrojs/cloudflare` ^14.3.1, React 19) with Supabase kept as an external database. Cloudflare Workers is the only candidate that already matches that adapter, passes all five agent-operations criteria, and can stay at $0 for a small single-region MVP. The free plan’s 10 ms CPU cap is the real constraint: signed-in server rendering often lands at 10–20 ms, and a steady overage means Workers Paid at $5/month. That is still the cheapest viable paid floor among the hosts that fit this stack. Cost was the top priority, there is no existing platform familiarity, one region is enough, and external services are acceptable.

## Platform Comparison

Researched 2026-09-30. Hard filter: the app is request/response only, so serverless hosts stay in. Every candidate can run TypeScript. Cost is weighted hardest. Single-region reach and an external Supabase database did not promote edge networks or co-located databases.

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | 5 Pass |
| Vercel | Pass | Pass | Pass | Pass | Partial | 4 Pass, 1 Partial |
| Netlify | Partial | Pass | Pass | Pass | Pass | 4 Pass, 1 Partial |
| Fly.io | Pass | Pass | Pass | Pass | Partial | 4 Pass, 1 Partial |
| Railway | Partial | Pass | Pass | Pass | Partial | 3 Pass, 2 Partial |
| Render | Partial | Pass | Partial | Pass | Pass | 3 Pass, 2 Partial |

Cloudflare Workers scores a full pass. `npx wrangler deploy`, `npx wrangler rollback <version-id>`, and `npx wrangler tail` cover the loop. Docs publish `llms.txt` and per-page markdown. Official MCP servers exist for docs, Workers, and observability. The `cf` CLI is a technical preview (checked 2026-09-30) and is not the deploy path. Free tier: 100,000 requests/day and 10 ms CPU. Paid is $5/month with a 30-second default CPU limit. Supabase network wait does not count as CPU.

Vercel runs Astro SSR through `@astrojs/vercel` on Node Fluid compute (GA). CLI deploy, rollback, and logs are first-class. `llms.txt` is published. The Vercel MCP server is Public Beta (checked 2026-09-30). Hobby is $0 for non-commercial personal use; a commercial app needs Pro at $20/month. That price, plus swapping off `@astrojs/cloudflare`, drops it under the cost weight.

Netlify runs Astro SSR as Functions via `@astrojs/netlify`, with middleware on Edge Functions. `netlify deploy --prod` and `netlify logs` are solid. Rollback is `netlify api restoreSiteDeploy` or the dashboard, so CLI-first is Partial. Docs have `llms.txt`. `@netlify/mcp` has no beta label in current docs (treated as GA, checked 2026-09-30). New accounts since 2025-09-04 get $0 and 300 credits, then the site pauses. About 100,000 web requests are ~20 credits; SSR compute and production deploys (15 credits each) are what actually empty the pool. Netlify Blobs is Beta.

Fly.io runs Astro through `@astrojs/node` in a Docker Machine. `fly deploy`, `fly logs`, and `fly deploy -i <image>` are a full CLI loop. Docs are MDX plus `llms.txt`. `fly mcp` is experimental / beta (checked 2026-09-30). New organizations have a short trial (2 VM-hours or 7 days), then the smallest shared Machine is about $1.94/month until the 2026-10-01 price update ($2.19) and is often created as two Machines. Managed Postgres v2 is beta and region-limited to `dfw` (checked 2026-09-30). External Supabase avoids that.

Railway runs Astro SSR as a Node container (`@astrojs/node`, Railpack). `railway up` and `railway logs` work. Arbitrary rollback is dashboard-only. Docs publish `llms.txt`. Remote MCP at `https://mcp.railway.com` is in public testing (checked 2026-09-30). Hobby is $5/month even at zero usage. Nixpacks is deprecated. Redis HA is beta.

Render runs Astro SSR as a Node web service, again via `@astrojs/node`. `render deploys create` and `render logs --tail` exist. Rollback is the dashboard or the REST API. Per-page `.md` docs exist; the claimed `https://render.com/docs/llms.txt` returned 404 on 2026-09-30, so docs are Partial. Hosted MCP at `https://mcp.render.com/mcp` is GA. The docs MCP is experimental. Free web services still exist and spin down after 15 idle minutes (about a one-minute cold start). Always-on Starter is $7/month. Free Postgres expires after 30 days; this project does not need it.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

It is already the runtime in `astro.config.mjs` and `wrangler.jsonc` (`main` is `@astrojs/cloudflare/entrypoints/server`, `nodejs_compat` is on, compatibility date `2026-05-08`). Local `npm run dev` is workerd. Deploy, rollback, logs, markdown docs, and MCP all pass. At this scale the bill is $0 unless signed-in SSR consistently exceeds 10 ms of CPU, in which case Workers Paid is $5/month.

#### 2. Netlify

Strong agent tooling and a free credit plan that covers this request volume if deploys stay few. The gap is an adapter swap, a hard pause when 300 credits run out, and rollback through the API rather than a dedicated command.

#### 3. Render

A real $0 tier, which matches the cost priority, with spin-down after 15 minutes. The gap is that cold start, a Node adapter swap, Partial docs, and rollback outside the CLI.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. Workers Free allows 10 ms of CPU per request (limits page, updated 2026-09-05). Waiting on Supabase does not count. Cloudflare’s own note says authentication and server-side rendering typically use 10–20 ms. Steady overage returns Error 1102 (`exceededCpu`, `Worker exceeded resource limits`). `astro dev` does not enforce that cap, so the failure appears only on the deployed Worker.
2. `context/foundation/tech-stack.md` still says `deployment_target: cloudflare-pages`. `@astrojs/cloudflare` 14 removed Pages support. `wrangler pages deploy` does not match this adapter. The repo is already a Worker.
3. The adapter provisions a KV namespace named `SESSION` on deploy unless `session: false` is set. This app authenticates with Supabase cookies. KV writes can take up to 60 seconds to appear in another region.
4. Production reads Worker secrets. `.dev.vars` is local only. Missing `SUPABASE_URL` or `SUPABASE_KEY` fails only after deploy. Secret values cannot be read back; rotation writes a new value.
5. The free plan allows 50 subrequests per invocation, and each redirect hop counts. Six connections may wait on response headers at once. A single todo page is inside that. A redirect chain plus several Supabase calls can still hit the cap.

### Pre-Mortem — How This Could Fail

The starter note said Cloudflare Pages, so the first deploy followed a Pages tutorial. Adapter 14 does not deploy there. The real target was a Worker, and that mismatch burned the first weekend. Locally the app looked healthy because Astro 7’s `astro dev` already runs workerd, so a CommonJS dependency that only breaks in the production bundle never showed up. The free plan’s 100,000 requests a day was plenty for a todo list. The limit that mattered was 10 milliseconds of CPU. Signed-in pages — cookie checks plus React server rendering — sat around 12–18 ms. Occasional overages were allowed, which hid the problem until Error 1102 became the normal response on “add a todo.” There was no paid plan in the budget and no second host ready. Branch previews never existed: `wrangler preview` needs Wrangler 4.135 or newer, and this repo resolves `wrangler` 4.131.1, so each change went straight to the production Worker. `wrangler rollback` reverted the code in seconds. The Supabase migration that shipped with it did not roll back. The reverted app talked to a schema it no longer understood.

### Unknown Unknowns

- `npm run dev` (`astro dev`) and `npm run preview` already use workerd through the Cloudflare Vite plugin (Astro 6+ / `@astrojs/cloudflare` 13+). `wrangler dev` is the wrong local server for this adapter. Since Astro 6, a named Cloudflare environment is chosen at build time: `CLOUDFLARE_ENV=<name> npx astro build && npx wrangler deploy`. This repo has no named environment, so a plain production deploy is `npx astro build && npx wrangler deploy`.
- Worker Previews (`npx wrangler preview`) require Wrangler 4.135.0 or later, and project commands use the local install (locked at 4.131.1), not a newer global binary. Previews do not inherit production secrets. Status checked 2026-09-30.
- `npx wrangler rollback` with no version id is interactive. An unattended rollback is `npx wrangler versions list`, then `npx wrangler rollback <version-id>`. Rollback restores Worker code only (up to 100 recent versions) and is refused if a binding such as KV was deleted between versions.
- The default `imageService` is `cloudflare-binding` (changed from `compile`). Deploy can attach an Images binding this app does not use.
- The `cf` CLI is a technical preview. Deploy, tail, and rollback stay on Wrangler 4.

## Operational Story

- **Preview deploys**: After Wrangler is at least 4.135.0, `npx wrangler preview` publishes the current branch to its own URL and deployment history. Previews need their own `previews` settings and their own secrets; they do not copy production. The URL is reachable by anyone who has it, so put Cloudflare Access in front before the preview holds real user data. The locked Wrangler 4.131.1 does not provide this command. Workers Builds can post preview URLs on same-repo pull requests once Git is connected; do not give fork pull requests production secrets.
- **Secrets**: Local workerd reads gitignored `.dev.vars` (`SUPABASE_URL`, `SUPABASE_KEY`). Production values are Worker secrets set with `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY`. CLI and dashboard show names, not values. Rotation is another `secret put`, which publishes a new Worker version. Anyone who can deploy this Worker can replace a secret.
- **Rollback**: `npx wrangler versions list`, then `npx wrangler rollback <version-id>`. Traffic moves to that version immediately (seconds). Supabase SQL migrations do not roll back with the Worker. Rollback is blocked if a bound resource was deleted in between.
- **Approval**: A human creates the Cloudflare account, runs `npx wrangler login` or installs a scoped API token, writes production secrets, and approves Workers Paid if Error 1102 shows up. A human also approves any Supabase migration. An agent with a token scoped to this Worker may build, deploy, tail logs, list versions, and roll back code unattended.
- **Logs**: `npx wrangler tail` streams invocation logs, including CPU time. `observability.enabled` is already true in `wrangler.jsonc`. Cloudflare’s Workers MCP servers can read the same observability data with structured tools once connected.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Signed-in SSR exceeds the free 10 ms CPU cap and returns Error 1102 | Devil's advocate | H | H | After the first deploy, load a signed-in todo page under `npx wrangler tail`. If `exceededCpu` is steady, move this Worker to Workers Paid ($5/month). |
| Deploy aimed at Cloudflare Pages while adapter 14 only targets Workers | Devil's advocate | M | H | Deploy with `npx astro build && npx wrangler deploy` against the existing Worker config. Leave `cloudflare-pages` in the stack notes as history. |
| Deploy provisions an unused `SESSION` KV namespace | Devil's advocate | M | L | Set `session: false` in the Astro config before the first production deploy. Keep auth on Supabase cookies. |
| Production Worker missing Supabase secrets that exist only in `.dev.vars` | Devil's advocate | M | H | Run `npx wrangler secret put` for `SUPABASE_URL` and `SUPABASE_KEY` before sharing the Worker URL. |
| Free-plan subrequest or connection cap on a chatty signed-in render | Devil's advocate | L | M | Keep each page to a small number of Supabase calls. Watch `wrangler tail` for resource-limit errors. |
| Branch previews unavailable on locked Wrangler 4.131.1, so changes go straight to production | Pre-mortem | H | M | Raise `wrangler` to >=4.135.0 before using `npx wrangler preview`. Until then, verify with `npm run build` and `npm run preview` first. |
| `wrangler rollback` restores code and leaves a newer Supabase migration in place | Pre-mortem | M | H | Apply schema changes in a separate step from Worker deploys. Roll back code with an explicit version id. |
| `wrangler dev` used instead of `astro dev`, hiding workerd-only failures | Unknown unknowns | M | M | Use `npm run dev` and `npm run preview`. Both already run workerd for this adapter. |
| Default `cloudflare-binding` image service attaches an Images binding | Unknown unknowns | M | L | Set `imageService: 'compile'` on the Cloudflare adapter if the app does not transform images at runtime. |
| Interactive `wrangler rollback` blocks an unattended agent | Unknown unknowns | M | M | Agents run `npx wrangler versions list`, then `npx wrangler rollback <version-id>`. |
| `cf` CLI (technical preview) used for deploy | Research finding | L | L | Use Wrangler 4 for deploy, tail, secrets, and rollback. |

## Getting Started

These commands match Astro ^7.3.2, `@astrojs/cloudflare` ^14.3.1, and the locked Wrangler 4.131.1. The Worker config and adapter are already in the repo.

1. Sign in once: `npx wrangler login`. This is a human step.
2. Put local secrets in `.dev.vars` (`SUPABASE_URL`, `SUPABASE_KEY`). Put the same names on the Worker with `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY`.
3. Run the app with `npm run dev`. That dev server is workerd. Check a production build with `npm run build`, then `npm run preview`.
4. Deploy the default environment with `npx astro build && npx wrangler deploy`. Do not use `wrangler pages deploy`. A named Cloudflare environment, if one is added later, has to be selected at build time: `CLOUDFLARE_ENV=<name> npx astro build && npx wrangler deploy`.
5. Before branch preview URLs, raise the `wrangler` dependency from 4.131.1 to >=4.135.0, then use `npx wrangler preview`.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
