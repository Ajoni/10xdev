# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-10-31

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "<the
   team is worried about X, and the failure would surface somewhere in
   <area>>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src` (7 commits in the last 30 days).

## 2. Risk Map

Ordered by impact × likelihood. The Source column is evidence that the risk rose, not a code location (§1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|-------------------------|--------|------------|--------------------------------|
| 1 | A signed-in person sees or changes another person's todo. | High | High | Interview Q1; PRD guardrail, FR-007; roadmap S-01 in progress; `src/components/todos` (3 commits/30d), `src/pages/api` (2 commits/30d) |
| 2 | The top item is not the next action: a later deadline or higher complexity ranks above a sooner, simpler todo. | High | High | Interview Q3; PRD business logic, US-01; roadmap S-01; `src/components/todos` (3 commits/30d) |
| 3 | The list looks right locally and comes up empty, unordered, or broken only after deploy. | High | High | Interview Q2; `infrastructure.md` (CPU cap and missing secrets appear after deploy) |
| 4 | An unsigned person opens the working list instead of receiving not-found. | High | Medium | PRD Access Control; roadmap S-01; `src/components/auth` (3 commits/30d), `src/pages/api` (2 commits/30d) |
| 5 | A complexity outside 1–5, or a deadline the person did not enter, is stored and changes who is on top. | Medium | Medium | PRD scale 1–5 and override; untrusted-input lens; roadmap S-01 |
| 6 | A deadline sorts as a different moment than the person entered, so the UTC round-trip changes who is on top. | High | Medium | AGENTS.md date rule; PRD ordering rule; interview Q3 |

Secret leakage and a Worker CPU overage stay off this map. The overage is one way #3 appears. Mark-done and edit-without-drop wait for roadmap S-02 and S-03 (§7).

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | A cannot see or change B's todo. B's list is only B's. | Signed-in means owner. | Owner binding, a second session, cross-id read and update. | Two-session integration. | A mock that returns only the current user. |
| #2 | Sooner deadline is on top. Same deadline: lower complexity first. The length guess and an in-range override both obey that. | The right todos means they are ordered. | Inputs, tie-break, where order is applied. | Unit if the rule is pure; integration if order exists only at the data boundary. | Expected order copied from the code under test. |
| #3 | The same add-and-list case is non-empty and ordered on the production preview. | A local pass means the deploy works. | What preview smoke already asserts. Environment failure versus logic. | Extend the preview smoke. | A second browser harness for local behavior. |
| #4 | An unsigned list request is not-found and contains no todos. | A sign-in redirect meets the PRD. | Gated routes. Anonymous status for the list. | One HTTP check. | Treating another route's redirect as cover for the list. |
| #5 | Out-of-range complexity is not the sort key. The stored value is an in-range guess or override. | A 1–5 control means the server stores 1–5. | Reject versus store today. If no check exists, flag this risk back. | Direct API post. | A browser click, or today's bad values as the oracle. |
| #6 | The stored deadline is UTC and sorts by that instant. Display does not move the day and change the top item. | The browser string, or a local calendar date, is the sort key. | Conversion point, stored value, compared value. | Two fixed instants around a timezone boundary. | A pass that holds only in the developer's timezone. |

## 3. Phased Rollout

Each row opens its own change folder via `/10x-new`. The orchestrator updates Status and Change folder as artifacts appear.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|---------------|------------|--------|---------------|
| 1 | Private ordered list | Prove another person cannot see or change a todo, the top item is the next action, an unsigned request is not-found, and a UTC round-trip keeps the same top item. Bootstrap the runner and run it in CI. | #1, #2, #4, #6 | runner bootstrap, unit or integration | complete | context/archive/2026-10-18-testing-private-ordered-list/ |
| 2 | Deployed list parity | Fail the preview check when the deployed build returns an empty, unordered, or broken list for the add-and-list case that passes locally. | #3 | preview smoke | not started | — |
| 3 | Untrusted input | Prove an out-of-range complexity, or a deadline the person did not enter, does not decide who is on top. | #5 | API integration | not started | — |

## 4. Stack

Test-base profile: **Vitest** for pure rules, and `scripts/smoke.mjs` for the preview. No Jest or Playwright config. Skill `*.test.mjs` files are not the app.

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| unit + integration | Vitest | ^5.0.5 | `npm test` (`vitest run`) in CI job `ci`, with no Supabase env. `vitest.config.ts` uses `getViteConfig()`, environment `node`, `TZ=America/Los_Angeles`, include `src/**/*.{test,spec}.ts`, and drops plugins named `vite-plugin-cloudflare*`. Checked 2026-10-31. The Worker preview stays on smoke. |
| API mocking | none | — | Keep the ownership check real. CI already starts local Supabase for smoke. |
| e2e | none | — | Excluded (§7). Astro documents Playwright. Checked 2026-10-18. |
| preview smoke | `scripts/smoke.mjs` | — | CI job `smoke` runs it against the production preview and local Supabase. Phase 2 tightens that run. |
| accessibility | none | — | Excluded (§7). |
| AI-native | none | — | §2 is covered by deterministic checks. Checked 2026-10-18. |

**Stack grounding tools (current session):**

- Docs: none — no docs MCP in this session. Official Astro testing and v7 pages were opened via search. Checked: 2026-10-18.
- Search: Cursor web search — Astro documents Vitest through `getViteConfig()` and Playwright for end-to-end tests. Checked: 2026-10-18.
- Runtime/browser: Cursor browser — available, not used as a test layer. Checked: 2026-10-18.
- Provider/platform: none — no GitHub, Cloudflare, or Supabase MCP. CI already runs smoke with local Supabase. Checked: 2026-10-18.

## 5. Quality Gates

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint + `astro check` | local + CI | required | syntax and type drift |
| production build | CI | required | Worker bundle failure |
| preview smoke | CI job `smoke` | required; Phase 2 strengthens it | empty, unordered, or broken list on the preview |
| unit + integration | local + CI | required after Phase 1; Phase 3 adds out-of-range complexity | privacy, order, unsigned not-found, UTC sorting, untrusted complexity |

## 6. Cookbook Patterns

Filled in when the matching phase ships. Until then, the pointer below is the pattern to follow.

### 6.1 Adding a unit test

Put the file in `src/**/*.{test,spec}.ts` and run `npm test`. The worker timezone is `America/Los_Angeles` from `vitest.config.ts`; do not set `TZ` inside the test. Import the pure function and assert literals. Shipped examples: `guessComplexity` boundaries in `src/lib/todos.test.ts` (trimmed lengths 0 and 19 → 1, 20 and 49 → 2, 50 and 199 → 3, 200 and 999 → 4, 1000 → 5; surrounding spaces do not change the bucket), and the Los Angeles midnight pair in `src/lib/deadlines.test.ts`. A unit does not post a todo and does not sort rows.

### 6.2 Adding an integration test

Extend `scripts/smoke.mjs` and run it against the production preview with local Supabase. Shipped checks: a second cookie jar's `GET /todos` excludes the first user's descriptions; unsigned `GET /todos` is status 404, includes `Not found`, and excludes `Add todo` and `id="todo-list"`. Do not add a second Supabase harness for the same checks.

### 6.3 Adding an e2e test

Browser and visual suites are excluded (§7). Deployed-list signal stays on the preview smoke (§3 Phase 2).

### 6.4 Adding a test for a new API endpoint

Ownership of the working list is the smoke second-session exclusion (§6.2), not a new route. Out-of-range complexity is still §3 Phase 3.

### 6.5 Adding a test for order or a deadline

Order is the smoke HTML step: sooner deadline, then lower complexity, then earlier `created_at`. Do not copy the `.order()` arguments into an expected list. The UTC round-trip is the unit pair in `src/lib/deadlines.test.ts`: `2026-10-14T23:30` stores `2026-10-15T06:30:00.000Z` and displays `2026-10-14 23:30`; `2026-10-15T00:30` stores `2026-10-15T07:30:00.000Z` and displays `2026-10-15 00:30`. A pass that holds only in the developer timezone is not proof.

### 6.6 Per-rollout-phase notes

- **Phase 1 — Private ordered list** (archived 2026-10-31 → `context/archive/2026-10-18-testing-private-ordered-list/`). See-path only: there is no edit or delete API, so "cannot change" is not an update request. The clock effect only writes `textContent` and has no browser test.

## 7. What We Deliberately Don't Test

- **UI testing** — browser suites, snapshots, visual diffs, and pixel checks. Re-evaluate if a failure cannot be proved by the rule, the API, or the preview smoke. (Source: Phase 2 interview Q5.)
- **Design gallery** — the todo-states page. Re-evaluate if it becomes a product path.
- **Parked product scope** — history, reminders, shared lists, drag-to-reorder, a smart complexity model, and email confirmation. Re-evaluate if the PRD non-goals change.
- **Mark done and edit-without-drop** — roadmap S-02 and S-03 are still proposed. Re-evaluate with `/10x-test-plan --refresh` when those slices exist.

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-10-18
- Stack versions last verified: 2026-10-18
- AI-native tool references last verified: 2026-10-18

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
