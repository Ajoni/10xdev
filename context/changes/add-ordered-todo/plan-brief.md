# Add a todo and see the ordered working list — Plan Brief

> Full plan: `context/changes/add-ordered-todo/plan.md`

## What & Why

Busy professionals lose the next action when todos live in a plain list. This slice lets a signed-in person add a todo and see only their own working list, ordered by sooner deadline, then lower complexity. That is roadmap S-01 and the primary success criterion in the PRD.

## Starting Point

Email/password sign-in, cookie sessions, and a `/dashboard` stub exist. Unsigned visitors to `/dashboard` are redirected to `/auth/signin`. There is no todo table, no todo API, and no list UI. `scripts/smoke.mjs` covers the auth flow and that dashboard redirect.

## Desired End State

A signed-in user adds a todo on `/todos` with a description, a complexity guess they can override (1–5 from trimmed length), and a local date and time. The list shows their todos only: sooner deadline first, then lower complexity, then the older item. The clock they typed is the clock they see; the database stores UTC. An unsigned visit to `/todos` returns 404. `/dashboard` still redirects when unsigned.

In a UTC+2 browser, Pay rent at 2026-10-15 09:00 sits above Call bank at 2026-10-15 17:00 when both have complexity 2, and both display as 09:00 and 17:00 local.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Equal deadline and complexity | Older `created_at` first | Adding a twin must not change which item is next. |
| Deadline grain | Date and time | Sooner can distinguish two tasks on the same calendar day. |
| Clock | Browser local time stored as UTC; received values treated as UTC and shown local | The entered clock and the shown clock stay the same, and the rule is written into `AGENTS.md` for every later date. |
| Description length | Trimmed, then JavaScript `string.length` | Two leading spaces on an 18-letter description stay in bucket 1; a spaces-only description is rejected. |
| List location | New `/todos` route, 404 when unsigned | S-01 gets not-found without changing the dashboard redirect the smoke test already checks. |
| Override | Guess tracks typing until the user edits complexity | The override they set is what gets stored; the server checks 1–5 and does not recompute the guess. |

## Scope

**In scope:**

- `AGENTS.md` date-time convention
- `todos` table with owner select and insert RLS
- Add form, ordered `/todos` page, UTC storage, local display
- Unsigned 404 for `/todos`
- Smoke coverage for 404, order, and a second user

**Out of scope:**

- Mark done, history, and edit (S-02, S-03)
- Update or delete policies
- Changing the `/dashboard` redirect
- Reminders, projects, tags, folders, shared lists, drag-to-reorder, smart complexity, email confirmation

## Architecture / Approach

The page reads the session user's rows in order and renders descriptions plus UTC instants. A React island guesses complexity, converts `datetime-local` to a UTC instant on submit, and formats clocks in the browser. `POST /api/todos` validates with zod and redirects back to `/todos`. Middleware returns 404 for unsigned `/todos` and does not add that path to `PROTECTED_ROUTES`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Date-time convention and private todo table | `AGENTS.md` clock rule and the RLS-backed `todos` table | A policy that is not limited to the session user leaks rows |
| 2. Add a todo and show the ordered list | `/todos` form, ordered list, local clocks, unsigned 404 | Server-side clock formatting would ignore the browser zone |
| 3. Smoke coverage for not-found, privacy, and order | HTTP proof of 404, the three-part order, and a second user | The current smoke helper does not read a body or hold two sessions |

**Prerequisites:** Local Supabase for the migration and for smoke. The app already signs in with `SUPABASE_URL` and `SUPABASE_KEY`.
**Estimated effort:** About 2–3 sessions across 3 phases.

## Open Risks & Assumptions

- Smoke and the migration need a running local Supabase. `npm run smoke` also needs the dev server.
- HTTP smoke cannot see the local clock. Phase 3 still needs a person to confirm the displayed time matches what they entered.
- Lists longer than PostgREST `max_rows` (1000) are out of this slice. The PRD expects a small list.

## Success Criteria (Summary)

- A signed-in user adds a todo and sees it on their own ordered working list.
- Sooner deadline, then lower complexity, then older creation time, decides the order.
- An unsigned visitor gets 404 on `/todos`, and another signed-in user does not see the todo.
