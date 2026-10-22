# Private Ordered List Tests Implementation Plan

## Overview

Prove the working list's privacy, order, unsigned gate, and deadline conversion with the cheapest check that actually exercises each path. Vitest covers the pure rules. The existing preview smoke keeps the query order and the second-session exclusion, and the unsigned step also requires the not-found page.

## Current State Analysis

The product behavior for this phase already exists. What is missing is a unit runner, a timezone-controlled call to the deadline helpers, and a body assertion on the unsigned list check.

`guessComplexity` is exported from `src/lib/todos.ts` and buckets trimmed length at 20, 50, 200, and 1000 (`src/lib/todos.ts:15-21`). Smoke posts complexity digits and never calls that function (`scripts/smoke.mjs:91-109`). List order is the three ascending `.order()` calls in `listTodos` (`src/lib/todos.ts:42-44`). Smoke already expects sooner deadline, then lower complexity, then earlier `created_at` (`scripts/smoke.mjs:111-126`).

`toUtcInstant` and `formatLocalClock` are private in `src/components/todos/WorkingList.tsx:19-42`. The hidden deadline input submits `toISOString()` output. The clock effect writes `textContent` on existing `<time>` nodes and does not move `<li>` nodes (`src/components/todos/WorkingList.tsx:53-65`). Smoke posts absolute `Z` instants (`scripts/smoke.mjs:11-15`) and Node `fetch` never runs that effect.

Unsigned `GET /todos` is rewritten to `/not-found` with status 404 (`src/middleware.ts:18-21`). The not-found page renders "Not found" and a sign-in link (`src/pages/not-found.astro:9-14`). Smoke checks status only (`scripts/smoke.mjs:75`). The working-list `<ol id="todo-list">` renders only when the page has rows (`src/pages/todos.astro:34-37`). The form label "Add todo" renders on that page for an empty list too (`src/components/todos/WorkingList.tsx:164-166`).

A second signed-in session's `GET /todos` body must exclude the first user's four descriptions (`scripts/smoke.mjs:148-152`). The migration has select and insert policies only (`supabase/migrations/20261010123900_create_todos.sql:17-27`). There is no update or delete route. `package.json` has no Vitest script. CI job `ci` runs lint, `astro check`, and build (`.github/workflows/ci.yml:20-25`). Job `smoke` runs `npm run smoke` with the local anon key (`.github/workflows/ci.yml:46-53`).

## Desired End State

`npm test` passes the complexity boundaries and the Los Angeles deadline cases, and CI job `ci` runs that command without Supabase. `npm run smoke` against the preview still passes order and the second-session exclusion. The unsigned `/todos` step fails unless the body is the not-found page. The app still has no edit or delete path.

### Key Discoveries:

- Ranking is the PostgREST order in `listTodos`, so a unit that copies the `.order()` arguments would not prove who is on top (`src/lib/todos.ts:42-44`).
- `new Date` on a `datetime-local` value uses the process timezone (`src/components/todos/WorkingList.tsx:37-42`). A date-only string parses as UTC, so the oracle has to include a time.
- Excluding `id="todo-list"` alone still passes if an unsigned response is the empty working list, because that id is absent when there are no rows (`src/pages/todos.astro:34-37`).
- Astro's testing guide configures Vitest with `getViteConfig()` from `astro/config`. This app's Astro config loads the Cloudflare adapter (`astro.config.mjs:16`).

## What We're NOT Doing

- An edit or delete API, an update or delete RLS policy, a PostgREST update from a second session, or a test that fails when the migration file gains an update policy.
- A request to an update URL this app does not implement, treated as an ownership check.
- A second Supabase harness that repeats smoke's order, second-session exclusion, or absolute-instant HTML checks.
- A browser, jsdom, or React test of the clock effect. The effect's `textContent` write stays as it is.
- A form test that types a description and toggles the complexity override. Submitted complexity is already what smoke posts, and browser suites stay out of the test plan.
- Risk #3 (deployed preview parity) and risk #5 (out-of-range complexity). Those are later rollout phases.
- A positive check that the second user creates a todo and sees it. The see oracle remains the existing exclusion of the first user's descriptions.

## Implementation Approach

Add Vitest through Astro's `getViteConfig()` helper and run `vitest run` from `npm test` in CI job `ci`. That job does not start Supabase; these tests import pure functions. Pin `TZ=America/Los_Angeles` on the Vitest worker so both phases share one timezone and a developer machine cannot supply a different one.

Phase 1 locks `guessComplexity` at the shipped boundaries. Phase 2 moves `toUtcInstant` and `formatLocalClock` into `src/lib/deadlines.ts` with the same behavior, and tests two local times around midnight under that pinned zone. Phase 3 extends the existing unsigned smoke step so the body must be the not-found page. Helpers stay in `src/lib/` per the repo convention. `WorkingList` keeps calling the same two functions.

## Critical Implementation Details

### Timezone is process state

Node reads `TZ` when the process starts. Set `test.env.TZ` to `America/Los_Angeles` in the Vitest config. Assigning `process.env.TZ` inside a test does not change `Date`. Oracle inputs are `YYYY-MM-DDTHH:mm` local strings. A date-only string is parsed as UTC and would hide a conversion bug. October 2026 in `America/Los_Angeles` is Pacific Daylight Time (UTC−7); the first Sunday of November 2026 is 1 November.

### Empty list omits the ordered-list id

`id="todo-list"` is rendered only when `todos.length > 0`. The unsigned body check has to require the text `Not found` and reject `Add todo`, which the working-list form renders for an empty list as well.

### Cloudflare adapter

`getViteConfig()` loads `astro.config.mjs`, including the Cloudflare adapter. Set `test.environment` to `node` so these pure modules run in Node.

## Phase 1: Runner and complexity buckets

### Overview

Add Vitest, run it in job `ci`, and lock `guessComplexity` at each shipped length boundary, including trimmed whitespace.

### Changes Required:

#### 1. Vitest runner

**File**: `package.json`, `vitest.config.ts`, `.github/workflows/ci.yml`

**Intent**: Give the repo a unit command and run it in the existing lint-and-build job, which does not need a database.

**Contract**: `package.json` gains a devDependency on Vitest and a `test` script whose command is `vitest run`. `vitest.config.ts` uses `getViteConfig` from `astro/config`, with `test.environment` `node` and `test.env.TZ` `America/Los_Angeles`. It then drops plugins whose names start with `vite-plugin-cloudflare`, and sets `test.include` to `src/**/*.{test,spec}.ts`. Job `ci` runs `npm test` after `npx astro check` and before `npm run build`. That step has no `SUPABASE_URL` or `SUPABASE_KEY` env. Job `smoke` stays as it is.

```ts
export default getViteConfig({
  test: {
    environment: "node",
    env: { TZ: "America/Los_Angeles" },
    include: ["src/**/*.{test,spec}.ts"],
  },
});
```

#### 2. Complexity boundary tests

**File**: `src/lib/todos.test.ts`

**Intent**: Fail when a trimmed length crosses a bucket or when surrounding spaces change the result.

**Contract**: Import `guessComplexity` from `@/lib/todos` and `describe` / `it` / `expect` from `vitest`. Expected complexities are literals. Trimmed lengths map as: 0 and 19 → 1, 20 and 49 → 2, 50 and 199 → 3, 200 and 999 → 4, 1000 → 5. A 19-character description with leading and trailing spaces still returns 1. The test does not post a todo and does not sort rows.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, including trimmed lengths 0 and 19 → 1, 20 and 49 → 2, 50 and 199 → 3, 200 and 999 → 4, 1000 → 5, and a 19-character description wrapped in spaces → 1
- `npm run lint` passes
- `npx astro check` passes
- Job `ci` runs `npm test` with no Supabase env

---

## Phase 2: Pinned-timezone deadlines

### Overview

Make the deadline helpers importable and prove that a local time around midnight stores a UTC instant and displays the local clock, under `America/Los_Angeles`.

### Changes Required:

#### 1. Shared deadline helpers

**File**: `src/lib/deadlines.ts`, `src/components/todos/WorkingList.tsx`

**Intent**: Move the two functions out of the component so a unit can call them, without changing submit or display behavior.

**Contract**: `src/lib/deadlines.ts` exports `toUtcInstant(localValue: string): string` and `formatLocalClock(instant: string): string` with the current behavior. `toUtcInstant` returns `""` when `new Date(localValue)` is `NaN`, and otherwise returns `toISOString()`. `formatLocalClock` returns the original string when the instant is invalid, and otherwise returns `YYYY-MM-DD HH:mm` from the local calendar fields, with month, day, hour, and minute padded to two digits. `WorkingList.tsx` deletes the local copies and imports both from `@/lib/deadlines`. The effect still assigns `textContent` only. The hidden input `name="deadline"` still submits `toUtcInstant(deadlineLocal)`.

#### 2. Midnight boundary tests

**File**: `src/lib/deadlines.test.ts`

**Intent**: Fail when the stored instant or the clock text matches only the machine timezone, or when a pre-midnight local time is stored as UTC midnight.

**Contract**: Rely on the worker `TZ` from Phase 1. Do not set `TZ` inside the test. With `America/Los_Angeles`:

| Call | Expected |
| --- | --- |
| `toUtcInstant("2026-10-14T23:30")` | `2026-10-15T06:30:00.000Z` |
| `toUtcInstant("2026-10-15T00:30")` | `2026-10-15T07:30:00.000Z` |
| `formatLocalClock("2026-10-15T06:30:00.000Z")` | `2026-10-14 23:30` |
| `formatLocalClock("2026-10-15T07:30:00.000Z")` | `2026-10-15 00:30` |
| `toUtcInstant("not-a-date")` | `""` |
| `formatLocalClock("not-a-date")` | `not-a-date` |

`2026-10-15T06:30:00.000Z` is the earlier instant and its clock text is the previous local calendar day. This file does not sort todos. Smoke's existing order step remains the sort proof.

### Success Criteria:

#### Automated Verification:

- `npm test` passes the America/Los_Angeles cases: `2026-10-14T23:30` stores `2026-10-15T06:30:00.000Z` and displays `2026-10-14 23:30`; `2026-10-15T00:30` stores `2026-10-15T07:30:00.000Z` and displays `2026-10-15 00:30`; invalid input returns `""` from `toUtcInstant` and the original string from `formatLocalClock`
- `npm run lint` passes
- `npx astro check` passes

#### Manual Verification:

- Adding a todo on `/todos` still shows a local clock, and the new row takes its place by the entered deadline

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Unsigned list body

### Overview

Extend the existing unsigned smoke step so a passing run has seen the not-found page and has not seen the working-list form.

### Changes Required:

#### 1. Unsigned body expectation

**File**: `scripts/smoke.mjs`

**Intent**: Close the gap where status 404 passes while the body is still the working list.

**Contract**: The step named `unsigned todos is not found` keeps status 404 and adds body checks through the existing `includes` and `excludes` fields. The body must include `Not found`. The body must exclude `Add todo` and `id="todo-list"`. Leave the order step and the step `second user does not see the first user's todos` unchanged.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- With the preview server running, `npm run smoke` passes, and `unsigned todos is not found` requires status 404, the text `Not found`, and excludes `Add todo` and `id="todo-list"`

---

## Testing Strategy

### Unit Tests:

- `guessComplexity` at the five boundaries above, plus surrounding whitespace.
- `toUtcInstant` and `formatLocalClock` for the two Los Angeles instants around local midnight, plus invalid input.
- No mocked Supabase client. Ownership stays on the real smoke session.

### Integration Tests:

- The existing smoke order step: sooner deadline, then lower complexity, then earlier `created_at`.
- The existing second-session step: the other cookie jar's `GET /todos` body excludes the first user's descriptions.
- The unsigned step: 404 and the not-found body.

### Manual Testing Steps:

1. Sign in and add a todo with a deadline on `/todos`.
2. Confirm the row shows a local `YYYY-MM-DD HH:mm` clock after the page hydrates.
3. Confirm that row's position follows the entered deadline relative to the other rows.
4. Sign out and open `/todos`. Confirm the not-found page, with no "Add todo" control.

## Performance Considerations

The new tests call pure functions and one existing HTTP script. No new query, index, or runtime path.

## Migration Notes

No database migration. Moving the helpers does not change values already stored in `deadline`.

## References

- Related research: `context/changes/testing-private-ordered-list/research.md`
- Test plan phase 1: `context/foundation/test-plan.md`
- Complexity buckets and 404 gate: `context/foundation/prd.md` (Business Logic, Access Control)
- Astro Vitest setup: https://docs.astro.build/en/guides/testing/
- `guessComplexity`: `src/lib/todos.ts:15-21`
- List order: `src/lib/todos.ts:42-44`
- Deadline helpers: `src/components/todos/WorkingList.tsx:19-65`
- Unsigned rewrite: `src/middleware.ts:18-21`
- Smoke steps: `scripts/smoke.mjs:75`, `scripts/smoke.mjs:111-152`
- CI jobs: `.github/workflows/ci.yml:20-25`, `.github/workflows/ci.yml:46-53`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Runner and complexity buckets

#### Automated

- [x] 1.1 `npm test` passes, including trimmed lengths 0 and 19 → 1, 20 and 49 → 2, 50 and 199 → 3, 200 and 999 → 4, 1000 → 5, and a 19-character description wrapped in spaces → 1 — ea764b3
- [x] 1.2 `npm run lint` passes — ea764b3
- [x] 1.3 `npx astro check` passes — ea764b3
- [x] 1.4 Job `ci` runs `npm test` with no Supabase env — ea764b3

### Phase 2: Pinned-timezone deadlines

#### Automated

- [x] 2.1 `npm test` passes the America/Los_Angeles cases: `2026-10-14T23:30` stores `2026-10-15T06:30:00.000Z` and displays `2026-10-14 23:30`; `2026-10-15T00:30` stores `2026-10-15T07:30:00.000Z` and displays `2026-10-15 00:30`; invalid input returns `""` from `toUtcInstant` and the original string from `formatLocalClock` — b4bcb04
- [x] 2.2 `npm run lint` passes — b4bcb04
- [x] 2.3 `npx astro check` passes — b4bcb04

#### Manual

- [x] 2.4 Adding a todo on `/todos` still shows a local clock, and the new row takes its place by the entered deadline — b4bcb04

### Phase 3: Unsigned list body

#### Automated

- [x] 3.1 `npm run lint` passes — bbab2bf
- [x] 3.2 With the preview server running, `npm run smoke` passes, and `unsigned todos is not found` requires status 404, the text `Not found`, and excludes `Add todo` and `id="todo-list"` — bbab2bf
