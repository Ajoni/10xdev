---
date: 2026-10-18T11:25:54+02:00
researcher: unknown
git_commit: 54259e9b2630d51eef30672de373f8fb49884372
branch: master
repository: Ajoni/10xdev
topic: "Ground Phase 1 tests for a private ordered list"
tags: [research, codebase, todos, privacy, ordering, deadlines, tests]
status: complete
last_updated: 2026-10-18
last_updated_by: unknown
last_updated_note: Installed Astro API redirect defaults to status 302 with a null body. Cited product paths were clean in a later git status.
---

# Research: Ground Phase 1 tests for a private ordered list

**Date**: 2026-10-18T11:25:54+02:00
**Researcher**: unknown
**Git Commit**: 54259e9b2630d51eef30672de373f8fb49884372
**Branch**: master
**Repository**: Ajoni/10xdev

## Research Question

Ground rollout Phase 1 of `context/foundation/test-plan.md` ("Private ordered list") so a later plan can place tests on the real failure paths.

Risks to verify: #1 (another signed-in person sees or changes a todo), #2 (the top item is not the next action), #4 (an unsigned person opens the working list), #6 (a UTC round-trip changes who is on top).

The test plan's response guidance is a hypothesis. This note checks it against the tree at commit `54259e9b2630d51eef30672de373f8fb49884372`. The session-start git status listed untracked files under `.cursor/` only; the product paths cited below were not in that list.

## Summary

On this commit, the working list page is `src/pages/todos.astro`. When `user` and `supabase` are both set, that page calls `listTodos(supabase, user.id)` (`src/pages/todos.astro:16-18`). The query adds `.eq("user_id", userId)` plus three `.order()` calls: `deadline` ascending, then `complexity` ascending, then `created_at` ascending (`src/lib/todos.ts:37-44`). A glob of `supabase/migrations/*` returned one file. That file enables row-level security and defines two policies, `todos_select_own` and `todos_insert_own`, both `to authenticated` and both `user_id = auth.uid()` (`supabase/migrations/20261010123900_create_todos.sql:15-27`). The file contains no update policy and no delete policy.

An unsigned `GET` whose path starts with `/todos` is rewritten to `/not-found` and returned with status 404 (`src/middleware.ts:18-21`). The not-found page does not query todos (`src/pages/not-found.astro:1-16`). `PROTECTED_ROUTES` in that same middleware file is the one-element list `["/dashboard"]`, and an unsigned dashboard request redirects to `/auth/signin` (`src/middleware.ts:4`, `src/middleware.ts:23-26`). `POST /api/todos` with no `locals.user` returns `context.redirect("/todos")` (`src/pages/api/todos.ts:18-21`). The path `/api/todos` does not start with `/todos`, so the 404 branch above does not apply to it.

`scripts/smoke.mjs` already runs in CI job `smoke` against `astro preview` and a local Supabase anon key (`.github/workflows/ci.yml:37-53`). On this file, that script checks unsigned `GET /todos` for status 404 only (`scripts/smoke.mjs:75`), checks a four-todo HTML order for two fixed UTC instants (`scripts/smoke.mjs:11-15`, `scripts/smoke.mjs:111-126`), and checks that a second cookie jar's `GET /todos` body excludes the first user's four descriptions (`scripts/smoke.mjs:148-152`). A search of `package.json` for `vitest`, `jest`, `playwright`, and `cypress` returned no matches. A glob of `**/*.{test,spec}.{ts,tsx,js,mjs,cjs}` returned two files, both under `.cursor/skills/`: `10x-research/scripts/prose-json-check.test.mjs` and `10x-plan/scripts/metadata-guard.test.mjs`.

The length guess is the pure function `guessComplexity` (`src/lib/todos.ts:15-21`). A grep of `src` for `guessComplexity` found the definition and two calls, at `src/components/todos/WorkingList.tsx:47` and `:71`. `insertTodo` stores `input.complexity` after `asComplexity` and does not call `guessComplexity` (`src/lib/todos.ts:71-80`). The deadline conversion that can change the stored instant is file-private `toUtcInstant` (`src/components/todos/WorkingList.tsx:37-42`). The clock effect sets `textContent` on existing `<time>` nodes and does not move list items (`src/components/todos/WorkingList.tsx:53-65`).

## Detailed Findings

### Risk #1 — another person sees or changes a todo

**See.** For a request that reaches `src/pages/todos.astro` with `Astro.locals.user` set, the page passes `user.id` into `listTodos` (`src/pages/todos.astro:16-18`). The query filters `.eq("user_id", userId)` (`src/lib/todos.ts:41`). The React island `WorkingList` receives `serverError` only (`src/pages/todos.astro:50`, `src/components/todos/WorkingList.tsx:13-15`); it does not receive the row array and does not filter it. A search of `src` for `.from("todos")` found two call sites, both in `src/lib/todos.ts`: the select in `listTodos` (`src/lib/todos.ts:39`) and the insert in `insertTodo` (`src/lib/todos.ts:76`). `src/pages/api/` on this tree contains `todos.ts` plus `auth/signin.ts`, `auth/signup.ts`, and `auth/signout.ts`. `src/pages/api/todos.ts` exports `POST` and `prerender` (`src/pages/api/todos.ts:6`, `src/pages/api/todos.ts:18`). The create schema fields are `description`, `complexity`, and `deadline` (`src/pages/api/todos.ts:8-16`). The insert writes `user_id: userId` from the `userId` argument (`src/lib/todos.ts:77`), and the route passes `user.id` (`src/pages/api/todos.ts:41`).

The select policy repeats the same owner check for the `authenticated` role (`supabase/migrations/20261010123900_create_todos.sql:17-21`). This research did not read `.env` or `.dev.vars`. CI job `smoke` writes `ANON_KEY` into `SUPABASE_KEY` (`.github/workflows/ci.yml:46`). Job `ci` uses repository secrets (`ci.yml:24-25`); those secret values were not read. Whether a key with the `service_role` bypass would be used on a request with no session token was not executed.

**Change.** Roadmap rows S-02 and S-03 are `proposed` (`context/foundation/roadmap.md:45-46`). The add-ordered-todo plan says this slice does not add update or delete policies (`context/changes/add-ordered-todo/plan.md:32`). The migration text matches that sentence: the policies in the file are the select policy and the insert policy cited above. A search of `src/**/*.{ts,tsx,astro,sql}` for `.update(` or `.delete(` found no matches. There is no app function in that search that updates a todo by id. A test that only requests a missing update URL would observe a missing handler. It would not observe an ownership check on an update. This research did not send an update or delete through PostgREST, so a runtime denial is not an observed result.

**Guidance check.** "Signed-in means owner" is not how this path works: the list query and the select policy both compare `user_id` to the session user. "A cannot see B's todo" is already the smoke step that uses `otherJar` and `excludes: descriptions` (`scripts/smoke.mjs:148-152`). That step does not post as the second user against the first user's row id, because this route module has no id route. The anti-pattern still applies: a mock that returns only the current user would not exercise the `.eq` or the policy. The cheapest existing signal for the see path is that smoke step against local Supabase, not a new mocked unit. The "cannot change" sentence in the test plan describes a mutation this slice does not implement. Flag it as a response correction: prove the see path; do not add an edit API in order to test it. Locking the missing update policy would be a separate real-Supabase attempt, and that attempt was not run here.

**Hot-spot correction.** `src/components/auth` is not a `.from("todos")` caller in the search above. `src/components/todos/WorkingList.tsx` does not apply the owner filter. The see path is `src/pages/todos.astro`, `src/lib/todos.ts`, and the select policy. `src/pages/api/todos.ts` is the create path.

### Risk #2 — the top item is not the next action

The working-list order on this page is the order of the array returned by `listTodos`. That function has three `.order()` calls and no in-memory sort (`src/lib/todos.ts:42-44`). `src/pages/todos.astro` renders `todos.map` inside `<ol id="todo-list">` (`src/pages/todos.astro:37-47`). The column types in the migration are `deadline timestamptz` and `complexity smallint`, with a check `complexity between 1 and 5` (`supabase/migrations/20261010123900_create_todos.sql:5-12`). The index columns are `(user_id, deadline, complexity, created_at)` (`supabase/migrations/20261010123900_create_todos.sql:29-30`).

`guessComplexity` returns 1 when `description.trim().length < 20`, 2 when `< 50`, 3 when `< 200`, 4 when `< 1000`, and 5 otherwise (`src/lib/todos.ts:15-21`). Those thresholds match the PRD buckets (`context/foundation/prd.md:86`) and the add-ordered-todo contract (`context/changes/add-ordered-todo/plan.md:111`). After the user changes the Select, `complexityOverridden` stops further guesses for that component state (`src/components/todos/WorkingList.tsx:78-84`). The server stores the submitted integer when it is in 1–5: zod coerces and bounds it (`src/pages/api/todos.ts:10-14`), and `asComplexity` returns null outside 1–5 (`src/lib/todos.ts:24-34`, `src/lib/todos.ts:71-73`). The server path does not recompute the guess.

The PRD order sentence is sooner deadline, then lower complexity (`context/foundation/prd.md:84`). It does not name `created_at`. The plan adds earlier `created_at` as the third key (`context/changes/add-ordered-todo/plan.md:15-17`). The query implements that third key (`src/lib/todos.ts:44`). Smoke posts four todos as complexities `"1"`, `"1"`, `"3"`, `"1"` with two deadline strings, then expects description order `descriptions[0]`, `descriptions[1]`, `descriptions[2]`, `descriptions[3]` (`scripts/smoke.mjs:91-126`). Those posts send the complexity digits directly. They do not type a description through `guessComplexity`.

**Guidance check.** "Unit if the rule is pure; integration if order exists only at the data boundary" splits on this code. `guessComplexity` is pure and exported. The ranking is the three `.order()` calls inside `listTodos`, so a test that does not execute that query does not see which row is first. Smoke already asserts one four-row order through `GET /todos` HTML. Copying the `.order()` arguments into an expected array would be the anti-pattern; the smoke expected order is description strings and the `+00:00` instant strings, which match the plan's sooner-then-lower-complexity-then-older rule if the posts stay in that sequence. A unit test of `guessComplexity` is the cheap layer for the buckets. It does not prove the top item. The hot-spot directory `src/components/todos` holds the guess wiring, not the ranking.

### Risk #4 — an unsigned person opens the working list

For a pathname that starts with `/todos` and a null `locals.user`, middleware rewrites `/not-found` and returns that body with status 404 (`src/middleware.ts:18-21`). `src/pages/not-found.astro` renders the heading "Not found" and a sign-in link. It does not import `listTodos`. Smoke's unsigned step expects `{ status: 404 }` and does not set `includes`, `excludes`, or `ordered` (`scripts/smoke.mjs:75`, `scripts/smoke.mjs:65-69`). So that step does not assert the body. The not-found page's lack of a todo query is a source fact; the smoke step does not check it.

Unsigned `GET /dashboard` is a different branch: redirect to `/auth/signin` (`src/middleware.ts:23-26`). Smoke expects that call to be status 302 and location `/auth/signin` (`scripts/smoke.mjs:74`). Using that dashboard step as the proof for `/todos` would miss the 404 branch. That matches the anti-pattern in the test plan.

`POST /api/todos` without a user is not that 404 branch. It returns `context.redirect("/todos")` (`src/pages/api/todos.ts:20-21`). The success path calls `context.redirect("/todos")` with the same one-argument shape (`src/pages/api/todos.ts:46`). Smoke expects the success step "create sooner low-complexity todo" to be status 302 and location `/todos` (`scripts/smoke.mjs:91-94`). The installed API-context helper is `redirect(path, status = 302)` and returns `new Response(null, { status, headers: { Location: path } })` (`node_modules/astro/dist/core/fetch/fetch-state.js:929`). Both call sites pass one argument, so they use that default. This research did not re-run smoke and did not request an unsigned `POST /api/todos`.

The add-ordered-todo contract says a missing session redirects to `/todos` only after middleware has already returned 404 for unsigned callers (`context/changes/add-ordered-todo/plan.md:119`). That clause does not hold for `POST /api/todos`: the middleware condition is `pathname.startsWith("/todos")` (`src/middleware.ts:18`), and `/api/todos` does not start with `/todos`.

`src/pages/dev/todo-states.astro` renders `TodoStateSink` and does not call `listTodos` (`src/pages/dev/todo-states.astro:1-9`). Its path does not start with `/todos`, so the 404 branch does not apply. Test-plan §7 excludes that gallery. It is not the working list in risk #4.

**Guidance check.** "One HTTP check" matches `GET /todos`. The status check is already smoke step "unsigned todos is not found". The gap against "contains no todos" is the missing body assertion on that step. A new runner is not required to add it. "A sign-in redirect meets the PRD" is false for this list: the PRD says an unauthenticated user who hits a gated route sees a 404 (`context/foundation/prd.md:94`), and the `/todos` branch returns 404 rather than the dashboard redirect.

### Risk #6 — a UTC round-trip changes who is on top

The browser field is `type="datetime-local"` and has no `name` (`src/components/todos/WorkingList.tsx:138-150`). `toUtcInstant` does `new Date(localValue)` and, when the time is not `NaN`, `parsed.toISOString()` (`src/components/todos/WorkingList.tsx:37-42`). The hidden input `name="deadline"` submits that string (`src/components/todos/WorkingList.tsx:160`). The API requires `z.iso.datetime({ offset: true })` (`src/pages/api/todos.ts:15`). `insertTodo` writes `deadline: input.deadline` (`src/lib/todos.ts:80`). The sort key is the `deadline` column in the first `.order()` call (`src/lib/todos.ts:42`). Server HTML puts `todo.deadline` in both the `<time datetime>` attribute and the text node (`src/pages/todos.astro:42-44`). After mount, `formatLocalClock` parses `datetime` with `new Date` and writes local `getFullYear`, `getMonth`, `getDate`, `getHours`, and `getMinutes` into `textContent` (`src/components/todos/WorkingList.tsx:19-30`, `src/components/todos/WorkingList.tsx:58-64`). That loop does not reorder `<li>` nodes.

Smoke posts `2026-10-15T15:00:00.000Z` and `2026-10-20T12:00:00.000Z` and expects the HTML to contain `2026-10-15T15:00:00+00:00` and `2026-10-20T12:00:00+00:00` in description order (`scripts/smoke.mjs:11-15`, `scripts/smoke.mjs:111-126`). Those posts are absolute strings. They do not pass a zone-less `datetime-local` value through `toUtcInstant`. Node `fetch` in that script does not run the client effect, so the step does not observe `formatLocalClock`. A pass of that step does not show that the same local civil time survives a timezone boundary. This research did not execute `toUtcInstant` or `formatLocalClock`.

**Guidance check.** "The browser string, or a local calendar date, is the sort key" is not this query: the first `.order()` column is `deadline`. "Display does not move the day and change the top item" matches this effect, because the effect writes clock text and leaves the `<ol>` child order as rendered. That was read from the effect, not from a browser run. The conversion that can store a different instant, and therefore change who is on top, is `toUtcInstant` before insert. Both helpers are file-private, so a unit test cannot import them without a planning decision to export them or to test them through the module. A test that calls `new Date` on a zone-less string only in the developer's timezone is the anti-pattern named in the test plan. Two fixed instants around a local midnight are the right oracle only if the process timezone is set for that case.

### Runner and existing checks

`package.json` script `smoke` is `node scripts/smoke.mjs`. A search of `package.json` found no Vitest, Jest, Playwright, or Cypress package. `astro.config.mjs` integrations are `react()` and `sitemap()`, and the Vite plugin in that file is `tailwindcss()` (`astro.config.mjs:13-16`). That config block does not register Vitest. CI job `ci` runs lint, `astro check`, and build (`.github/workflows/ci.yml:20-25`). Job `smoke` starts local Supabase, writes `API_URL` and `ANON_KEY` into `.env`, builds, runs `astro preview` on port 4321, then `BASE_URL=http://localhost:4321 npm run smoke` (`.github/workflows/ci.yml:39-53`).

Phase 1 of the test plan still says "runner bootstrap, unit or integration" (`context/foundation/test-plan.md:64`). That runner is absent. The see check, the four-row order check, the unsigned status check, and the stored-instant HTML check already exist in `scripts/smoke.mjs` and already run in job `smoke`. Adding a second Supabase harness that repeats those four steps would duplicate that job. A runner is the remaining cheap layer for `guessComplexity` and, if the helpers are made testable, for `toUtcInstant` under a set timezone.

### What to carry into the plan

| Risk | Prove | Layer that matches this code | Do not |
|------|--------|------------------------------|--------|
| #1 see | Second session `GET /todos` body lacks the first user's descriptions | Existing smoke step against local Supabase | A client mock that returns only the current user |
| #1 change | No in-scope mutation. Migration file has select and insert policies and no update or delete policy | Optional real-Supabase update attempt; not a new edit feature | A request to a URL this app does not implement, treated as an ownership test |
| #2 rank | Sooner `deadline`, then lower `complexity`, then earlier `created_at`, on rows returned by the query | Existing smoke HTML order | An expected list copied from the `.order()` calls |
| #2 guess | Buckets in `guessComplexity` for trimmed length | Unit, if a runner is added | Treating smoke's posted `"1"` and `"3"` as proof of the guess |
| #4 | Unsigned `GET /todos` is 404 and the body is not the working list | Extend the existing smoke step's body check | The dashboard 302, or unsigned `POST /api/todos`, as the list proof |
| #6 | Stored deadline is the offset instant; sort uses that column; clock text rewrite does not move `<li>` nodes | HTTP order of two fixed instants already in smoke; timezone-controlled unit only after the private helper can be called | A pass that only formats dates in the developer timezone |

## Code References

- `src/middleware.ts:4` — `PROTECTED_ROUTES` is `["/dashboard"]`
- `src/middleware.ts:18-21` — unsigned path starting with `/todos` returns status 404 after rewrite to `/not-found`
- `src/middleware.ts:23-26` — unsigned dashboard redirects to `/auth/signin`
- `src/lib/todos.ts:15-21` — `guessComplexity` buckets
- `src/lib/todos.ts:37-44` — owner filter and three ascending orders
- `src/lib/todos.ts:66-83` — insert stamps `user_id` and stores submitted complexity and deadline
- `src/pages/todos.astro:16-18` — list loads with `user.id`
- `src/pages/todos.astro:37-47` — ordered `<ol>` and raw `todo.deadline` text
- `src/pages/api/todos.ts:8-22` — zod bounds and unsigned redirect
- `node_modules/astro/dist/core/fetch/fetch-state.js:929` — API `redirect` defaults to status 302 and a null body
- `src/pages/not-found.astro:6-14` — 404 body without a todo query
- `src/components/todos/WorkingList.tsx:19-42` — local clock text and `toUtcInstant`
- `src/components/todos/WorkingList.tsx:53-84` — text rewrite and guess override
- `supabase/migrations/20261010123900_create_todos.sql:15-27` — RLS select and insert policies
- `scripts/smoke.mjs:75` — unsigned `/todos` expects status 404 and no body check
- `scripts/smoke.mjs:111-152` — HTML order and second-user exclusion
- `.github/workflows/ci.yml:46-53` — smoke job uses the local anon key and `npm run smoke`

## Architecture Insights

Owner binding is two checks on the inspected path: the query's `user_id` argument from `locals.user`, and the select/insert policies for `authenticated`. The list order is not a pure function in application code; it is the PostgREST order of `listTodos`. Complexity guessing stays in the browser until submit; the API persists the submitted 1–5 integer. Deadline conversion stays in the browser; the API rejects a value that fails `z.iso.datetime({ offset: true })` and stores the string on `timestamptz`. Display formatting runs after server render and edits clock text in place.

`/todos` and `/dashboard` are different gates in one middleware function. `/api/todos` is outside the `/todos` prefix, so an unsigned create uses the route's redirect rather than the list 404.

## Historical Context (from prior changes)

- `context/changes/add-ordered-todo/plan.md:15-17` — third sort key is earlier `created_at`. **Supported** by `src/lib/todos.ts:44`. The roadmap outcome line names deadline then complexity and does not name `created_at` (`context/foundation/roadmap.md:44`). That shorter wording is **partial**: it matches the first two keys and omits the third key the query has.
- `context/changes/add-ordered-todo/plan.md:32` — no update or delete RLS in that slice. **Supported** by that migration file, which defines the two policies at `supabase/migrations/20261010123900_create_todos.sql:17-27` and no further policy. The glob of `supabase/migrations/*` returned this file and no second migration.
- `context/changes/add-ordered-todo/plan.md:36` — server stores the submitted complexity and does not recompute the guess. **Supported** by `src/lib/todos.ts:71-80`. A grep of `src` for `guessComplexity` found the definition at `src/lib/todos.ts:15` and the call expressions at `src/components/todos/WorkingList.tsx:47` and `:71`.
- `context/changes/add-ordered-todo/plan.md:119` — missing session redirects to `/todos` only after middleware has already returned 404. **Contradicted** for `POST /api/todos`: the route redirects (`src/pages/api/todos.ts:20-21`) and the 404 condition does not include `/api/todos` (`src/middleware.ts:18`).
- `context/changes/add-ordered-todo/plan.md:11` — smoke at plan time did not read a response body. **Contradicted** by current `scripts/smoke.mjs:44` and `scripts/smoke.mjs:65-69`, which read the body and can require ordered parts. The sentence described the pre-change script; the current script is the later state.
- `context/changes/add-ordered-todo/plan.md:35` — no designed 404 page. **Contradicted** as a description of the current tree: `src/pages/not-found.astro` is a styled page, and middleware rewrites to it (`src/middleware.ts:19-20`). The status remains 404, which still matches the plan's status sentence (`plan.md:141`).
- `context/changes/add-ordered-todo/reviews/impl-review.md:20` — Success Criteria PASS on 2026-10-11, with verdict NEEDS ATTENTION for two scope warnings (`impl-review.md:8-9`). **Partial** for today: this research did not re-run smoke, so the PASS is the review's recorded result, not a new run.
- `context/foundation/roadmap.md:44` — S-01 status `in-progress` while `add-ordered-todo` is `impl_reviewed` (`context/changes/add-ordered-todo/change.md:4`). **Supported** as two document fields. The status cells were not changed by this research. The inspected code contains the list, the filter, the order, and the unsigned 404 described for S-01 (`context/foundation/roadmap.md:68`).
- `context/archive/` — README plus `bootstrap-verification` and `deployment`. No archived todo-behavior research was in that folder listing.

## Related Research

- `context/changes/ui-tokens-onboarding/research.md` — token contract for the `/todos` view. It is not a privacy or ordering investigation. The current not-found page is the later UI result of that change's plan, cited above only for the 404 body.

## Open Questions

- The role of `SUPABASE_KEY` in local `.env` / `.dev.vars`, and of the GitHub secrets used by job `ci`, was not read. Job `smoke` writes `ANON_KEY` (`.github/workflows/ci.yml:46`). A `service_role` key on a request that has no user access token would change the RLS premise. Impact: do not claim the policies were observed against a live key.
- An authenticated update or delete of another user's row was not sent. Impact: "cannot change" is grounded as "no app update in the inspected `src` search, and no update/delete policy in the one migration," not as a measured denial.
- `toUtcInstant` and `formatLocalClock` were not executed, including a pair of instants around a local midnight. Impact: the timezone anti-pattern is identified from the `Date` calls, not from a failing or passing run.
- Smoke was not re-run in this session. Impact: the script's expected statuses are oracles written in the file, not fresh results.
