# Private Ordered List Tests — Plan Brief

> Full plan: `context/changes/testing-private-ordered-list/plan.md`
> Research: `context/changes/testing-private-ordered-list/research.md`

## What & Why

Phase 1 of the test plan has to prove that another signed-in person cannot see someone else's todos, that the top item is the next action, that an unsigned list request is not-found, and that a UTC round-trip keeps the same top item. The app already implements those paths. The gap is a unit runner for the complexity buckets and the deadline conversion, plus a body check on the unsigned smoke step.

## Starting Point

Smoke already checks HTML order (sooner deadline, then lower complexity, then earlier `created_at`) and a second session whose body excludes the first user's descriptions. Unsigned `GET /todos` returns 404 with no body check. `guessComplexity` is untested. The deadline conversion and the local clock live as private functions in `WorkingList.tsx`, and smoke posts absolute `Z` instants instead of going through them.

## Desired End State

`npm test` fails on a wrong complexity bucket or on a deadline conversion that only holds in the machine timezone. CI runs that command in job `ci`. Smoke still proves order and the second-session exclusion, and the unsigned step fails unless the body is the not-found page rather than the working list.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Change proof | See-path only | The app has no update path, and a missing URL is not an ownership test | Plan |
| See oracle | Existing second-session exclusion | That smoke step is the check that reads another user's list through the app | Research |
| Order oracle | Existing smoke HTML order | Rank is the `listTodos` query, and smoke already expects the description order | Research |
| Guess proof | Unit boundaries of `guessComplexity` | Smoke posts complexity digits and never calls the guess | Research |
| UTC proof | Pinned-TZ unit after moving the helpers to `src/lib/deadlines.ts` | The helpers are private, and a pass in the developer timezone is the named anti-pattern | Plan |
| Display reorder | No DOM test | The clock effect only sets `textContent`, and the test plan excludes browser suites | Research |
| Unsigned proof | Extend the smoke body check | Status 404 is already asserted; the body is the gap | Research |
| Runner | Vitest via `getViteConfig()`, `TZ=America/Los_Angeles`, environment `node` | The test plan and Astro's docs name that helper, and the Cloudflare adapter must not become the test runtime | Plan |

## Scope

**In scope:**

- Vitest, `npm test`, and a `npm test` step on CI job `ci`
- Boundary tests for `guessComplexity`, including trimmed whitespace
- Moving `toUtcInstant` and `formatLocalClock` into `src/lib/deadlines.ts` and testing the midnight pair under `America/Los_Angeles`
- Body checks on the existing unsigned smoke step: include `Not found`, exclude `Add todo` and `id="todo-list"`

**Out of scope:**

- An edit API, a live RLS update, or a migration-policy snapshot
- A second Supabase harness for order, visibility, or stored instants
- A browser or jsdom test of the clock effect
- Deployed-list parity and out-of-range complexity

## Architecture / Approach

Pure rules run under Vitest in Node, with the timezone pinned on the worker before `Date` is constructed. Order, visibility, and the unsigned gate stay on `scripts/smoke.mjs` against the preview and local Supabase. `WorkingList` imports the moved helpers and still submits the ISO instant and rewrites clock text in place.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Runner and complexity buckets | `npm test` in CI, with bucket boundaries locked | `getViteConfig()` loads the Cloudflare adapter |
| 2. Pinned-timezone deadlines | Helpers in `src/lib/deadlines.ts` and the Los Angeles midnight oracle | Setting `TZ` inside a test does not change `Date` |
| 3. Unsigned list body | Smoke rejects a working-list body on unsigned `GET /todos` | Excluding only `id="todo-list"` misses the empty list shell |

**Prerequisites:** Node 22, the existing Astro app, and a local Supabase plus preview for the Phase 3 smoke run.
**Estimated effort:** One session across 3 phases.

## Open Risks & Assumptions

- Phase 1 is the first run of `getViteConfig()` against this Cloudflare config. `test.environment: "node"` is the mitigation, and it is unproven until that run.
- "Cannot change" stays green if a later slice adds a permissive update policy. That was the accepted limit of the see-path decision.
- No test executes the clock effect, so a future change that reorders `<li>` nodes would still pass `npm test`.
- Research did not read the local `SUPABASE_KEY`. CI smoke writes the local anon key, which is the key these session checks assume.

## Success Criteria (Summary)

- `npm test` passes the complexity boundaries and the two Los Angeles instants around local midnight.
- Job `ci` runs `npm test` without Supabase secrets.
- Preview smoke passes, including an unsigned `/todos` response that is the not-found page and not the working list.
