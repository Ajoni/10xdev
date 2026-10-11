# Add a todo and see the ordered working list Implementation Plan

## Overview

A signed-in person can add a private todo and see it on `/todos`, ordered by sooner deadline, then lower complexity, then older creation time. An unsigned visitor who opens that list gets a not-found response. Deadlines are a date and time: the browser takes the local clock, the database stores UTC, and the browser shows that UTC instant back in the local timezone.

## Current State Analysis

Sign-in works. There is no todo table, no todo API, and no list UI. The only protected page is `/dashboard`, and unsigned visitors are redirected to sign-in. The product rule for this slice is already written in the PRD and in roadmap slice S-01: add, private visibility, and ordering ship together. Marking a todo done and editing one are later slices.

The auth API posts a form and redirects. Pages that need interaction mount a React island with `client:load`. Shared types, zod validation, and SQL migrations are conventions in `AGENTS.md` and are not used in the app yet. `scripts/smoke.mjs` checks HTTP status and redirect location only; it does not read a response body, and it keeps a single cookie jar.

## Desired End State

A signed-in user opens `/todos`, enters what needs to be done, accepts or overrides a complexity guess, enters a local date and time, and sees that todo on their own list. The guess is 1 when the trimmed description is under 20 characters, 2 under 50, 3 under 200, 4 under 1000, and 5 otherwise. The user can set any integer from 1 to 5 instead.

Order is sooner deadline first, then lower complexity, then the earlier `created_at`. In a browser at UTC+2, "Pay rent" due 2026-10-15 09:00 and "Call bank" due 2026-10-15 17:00, both complexity 2, store as `2026-10-15T07:00:00.000Z` and `2026-10-15T15:00:00.000Z`. Pay rent is above Call bank. Both clocks display as 09:00 and 17:00 local, not as the UTC instants. A third todo with the same deadline and complexity as Pay rent, added later, sits between them.

An unsigned `GET /todos` returns 404. `GET /dashboard` still redirects an unsigned visitor to `/auth/signin`. Another signed-in user does not see these todos.

### Key Discoveries:

- `src/middleware.ts` redirects unsigned visitors on `PROTECTED_ROUTES` (`["/dashboard"]`) to `/auth/signin`. Putting `/todos` on that list would redirect instead of returning 404.
- `src/pages/api/auth/signin.ts` is the handler pattern: `POST`, form data, redirect on success or error. `src/components/auth/SignInForm.tsx` posts that way and only cancels submit when client validation fails.
- `scripts/smoke.mjs` asserts the dashboard redirect (`302` to `/auth/signin`) and a signed-in `200`. New ordering checks need the response body and a second cookie jar.
- Local Supabase PostgREST `max_rows` is 1000 (`supabase/config.toml`). This slice does not paginate.

## What We're NOT Doing

- Marking a todo done, or any history of done todos (S-02, FR-005, FR-006).
- Editing a todo, or reordering after an edit (S-03, FR-002).
- Update or delete RLS policies. This slice grants select and insert for the owner only.
- Changing the unsigned `/dashboard` redirect.
- Reminders, projects, tags, folders, shared lists, drag-to-reorder, a smart complexity model, and email confirmation.
- A designed 404 page. The list route returns status 404.
- Recomputing complexity on the server. The server stores the integer the form submitted, after checking it is 1–5.

## Implementation Approach

Follow the existing form-post and React-island patterns. Add one `todos` table with row-level security so a signed-in user can select and insert only their own rows. The page loads that user's rows in order and renders the descriptions in the HTML. A React island updates the complexity guess while typing, converts the local deadline to a UTC instant on submit, and formats stored UTC instants into the local clock after the browser loads. The server rejects a deadline that is not an absolute instant, trims the description, and rejects a blank one. `/todos` is gated with a 404 in middleware and is not added to `PROTECTED_ROUTES`.

The date-time rule is written into `AGENTS.md` before the table and the form, so later slices use the same clock.

## Critical Implementation Details

- **Timing & lifecycle.** `datetime-local` has no timezone. The submit handler converts that local value to a UTC instant (ISO-8601 with `Z`) before the browser posts. The server rejects a naive string. Server HTML includes the description order and the UTC instant. It does not print a local clock from the server's timezone. The browser reads the UTC instant and writes the local clock after load.
- **User experience spec.** Once the user edits the complexity field, further description edits do not replace that override for the rest of this add. Until they edit it, the field tracks the guess from the trimmed description. Do not add `/todos` to `PROTECTED_ROUTES`.

## Phase 1: Date-time convention and private todo table

### Overview

Record the clock rule and add the `todos` table so later phases insert and read a private row with a UTC deadline.

### Changes Required:

#### 1. Date-time convention

**File**: `AGENTS.md`

**Intent**: Make the clock rule a project convention so every later date or time follows it, not only this form.

**Contract**: Under `### Key conventions`, add one bullet: take the time from the browser and store it as UTC; when the browser receives a date, treat it as UTC and convert it to the local timezone for display. Apply this whenever the product deals with a date or time.

#### 2. Todos table

**File**: `supabase/migrations/<YYYYMMDDHHmmss>_create_todos.sql`

**Intent**: Store one owner's todo with the fields the order rule needs, and refuse other owners' rows.

**Contract**: Table `public.todos` with `id` uuid primary key, `user_id` uuid not null referencing `auth.users(id)` on delete cascade, `description` text not null, `complexity` smallint not null, `deadline` timestamptz not null, `created_at` timestamptz not null default `now()`. `description` equals its trimmed form and is non-blank. `complexity` is between 1 and 5. Enable RLS. Policies for `authenticated`: select using `user_id = auth.uid()`, insert with check `user_id = auth.uid()`. No update or delete policy. Index `(user_id, deadline, complexity, created_at)`.

#### 3. Shared todo type

**File**: `src/types.ts`

**Intent**: Give the API and the page one type for a todo row.

**Contract**: Export a todo type whose deadline and `created_at` are UTC ISO-8601 strings, plus `id`, `user_id`, `description`, and `complexity` (integer 1–5).

### Success Criteria:

#### Automated Verification:

- AGENTS.md Key conventions states that browser local time is stored as UTC and that a received date is treated as UTC then shown in the local timezone
- The todos migration enables RLS and adds select and insert policies for the owner only
- `npm run lint` passes

#### Manual Verification:

- The migration applies on local Supabase

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Add a todo and show the ordered list

### Overview

A signed-in user can add a todo and see only their own working list on `/todos`. Unsigned visitors get 404.

### Changes Required:

#### 1. Guess and persistence

**File**: `src/lib/todos.ts`

**Intent**: Keep the length buckets and the list query in one place so the form and the page do not drift.

**Contract**: `guessComplexity` takes a description, trims both ends, and returns 1 if the length is under 20, else 2 if under 50, else 3 if under 200, else 4 if under 1000, else 5. Length is JavaScript `string.length` (UTF-16 code units). A loader returns the signed-in user's rows ordered by `deadline` ascending, `complexity` ascending, `created_at` ascending. Insert sets `user_id` from the session user, never from the form, stores the trimmed description, and stores `deadline` as `timestamptz`.

#### 2. Add endpoint

**File**: `src/pages/api/todos.ts`

**Intent**: Accept one todo from the form and send the user back to the list, using the same post-and-redirect shape as sign-in.

**Contract**: `export const prerender = false` and `POST`. Validate with zod: trimmed description non-blank, `complexity` an integer 1–5, `deadline` an absolute instant (offset or `Z`), not a zone-less string. Missing session redirects to `/todos` only after middleware has already returned 404 for unsigned callers; a signed-in failure redirects to `/todos?error=`. Success redirects to `/todos`. Add the `zod` dependency. Do not retrofit zod onto the auth routes.

#### 3. Working list page and form

**File**: `src/pages/todos.astro`

**Intent**: Show the ordered list to the signed-in user and host the add form.

**Contract**: Server-render the session user's rows in query order. The HTML includes each description in that order and each deadline as a UTC instant. It does not preformat the clock in the server timezone. Mount the form island with `client:load`.

**File**: `src/components/todos/WorkingList.tsx`

**Intent**: Let the user accept or override the guess, submit a UTC instant, and see local clocks.

**Contract**: Description field, complexity control (1–5) initialized from `guessComplexity`, and a `datetime-local` deadline. Until the user edits complexity, description changes refresh the guess from the trimmed text. After they edit complexity, description changes leave it alone. Submit posts `description`, `complexity`, and a UTC ISO deadline to `/api/todos`, cancelling submit only when the description is blank or the deadline is missing. After load, write each visible clock in the local timezone from the UTC instant. A description of 18 letters with two leading spaces shows guess 1.

#### 4. Not-found gate

**File**: `src/middleware.ts`

**Intent**: Match S-01: an unsigned person who opens the list gets not-found, without changing dashboard.

**Contract**: If the path starts with `/todos` and `locals.user` is null, return status 404 and do not redirect. Leave `PROTECTED_ROUTES` as `["/dashboard"]`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- A signed-in user can add a todo and see it on /todos
- The complexity guess follows trimmed length and does not change after the user edits the complexity field
- A deadline entered as a local clock displays as that same local clock
- An unsigned visit to /todos returns 404, and an unsigned visit to /dashboard still redirects to /auth/signin
- A description that is only spaces is rejected

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Smoke coverage for not-found, privacy, and order

### Overview

Extend the existing smoke script so the not-found gate, the three-part order, and private visibility fail the build check when they break. The dashboard redirect stays covered.

### Changes Required:

#### 1. Smoke cases

**File**: `scripts/smoke.mjs`

**Intent**: Prove the slice over HTTP the same way auth is proved today.

**Contract**: Keep the current steps and their expected status and location. Extend `request` so a step can read the body. Unsigned `GET /todos` expects status 404 and runs while signed out. After sign-in, post four todos with distinct descriptions, then `GET /todos` and expect the descriptions in this order:

1. sooner deadline, complexity 1, created first (`deadline` `2026-10-15T15:00:00.000Z`, complexity 1)
2. same deadline, complexity 1, created second
3. same deadline, complexity 3
4. later deadline `2026-10-20T12:00:00.000Z`, complexity 1

Use a second cookie jar for another signed-in user. That user's `GET /todos` body does not contain the first user's descriptions. Do not assert the local clock string; the HTML check is description order and the stored UTC instants.

### Success Criteria:

#### Automated Verification:

- `npm run smoke` passes, including unsigned /todos returning 404 and the existing dashboard redirect
- Smoke HTML lists a sooner deadline above a later deadline
- Smoke HTML lists lower complexity first when the deadline matches
- Smoke HTML lists the older todo first when deadline and complexity match
- Smoke HTML for a second signed-in user does not include the first user's todo

#### Manual Verification:

- The clock shown on /todos matches the local time that was entered

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

There is no unit-test runner. Do not add one in this slice. The complexity buckets and the UTC reject rule are covered by the form's manual checks and by the smoke order fixture.

### Integration Tests:

`npm run smoke` against a running server (`BASE_URL`, default `http://localhost:4321`) with local Supabase. The new steps cover unsigned 404, the order fixture above, and a second user. Existing dashboard redirect steps stay as they are.

### Manual Testing Steps:

1. Sign in, open `/todos`, add a todo with a local date and time, and confirm the list shows that description and the same local clock.
2. Type a description of 18 letters with two leading spaces and confirm the guess is 1. Change complexity to 4, type more text, and confirm it stays 4.
3. Submit a description of only spaces and confirm the todo is not added.
4. Sign out and open `/todos` (404) and `/dashboard` (redirect to `/auth/signin`).
5. As a second user, confirm the first user's todo is absent.

## Performance Considerations

The list is one indexed select per page view. The PRD scale is a small list at about 20 queries per second. PostgREST `max_rows` is 1000; this slice does not page past that cap.

## Migration Notes

No todo rows exist yet. The migration only creates the table. A later Worker rollback does not undo the SQL.

## References

- Product rule: `context/foundation/prd.md` (US-01, FR-001, FR-004, FR-007, Business Logic)
- Slice: `context/foundation/roadmap.md` (S-01, change id `add-ordered-todo`)
- Redirect gate: `src/middleware.ts`
- Form post pattern: `src/components/auth/SignInForm.tsx`, `src/pages/api/auth/signin.ts`
- Smoke harness: `scripts/smoke.mjs`
- Conventions: `AGENTS.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Date-time convention and private todo table

#### Automated

- [x] 1.1 AGENTS.md Key conventions states that browser local time is stored as UTC and that a received date is treated as UTC then shown in the local timezone — 19d467a
- [x] 1.2 The todos migration enables RLS and adds select and insert policies for the owner only — 19d467a
- [x] 1.3 `npm run lint` passes — 19d467a

#### Manual

- [x] 1.4 The migration applies on local Supabase — 19d467a

### Phase 2: Add a todo and show the ordered list

#### Automated

- [x] 2.1 `npm run lint` passes — c5f259e
- [x] 2.2 `npm run build` passes — c5f259e

#### Manual

- [x] 2.3 A signed-in user can add a todo and see it on /todos — c5f259e
- [x] 2.4 The complexity guess follows trimmed length and does not change after the user edits the complexity field — c5f259e
- [x] 2.5 A deadline entered as a local clock displays as that same local clock — c5f259e
- [x] 2.6 An unsigned visit to /todos returns 404, and an unsigned visit to /dashboard still redirects to /auth/signin — c5f259e
- [x] 2.7 A description that is only spaces is rejected — c5f259e

### Phase 3: Smoke coverage for not-found, privacy, and order

#### Automated

- [x] 3.1 `npm run smoke` passes, including unsigned /todos returning 404 and the existing dashboard redirect
- [x] 3.2 Smoke HTML lists a sooner deadline above a later deadline
- [x] 3.3 Smoke HTML lists lower complexity first when the deadline matches
- [x] 3.4 Smoke HTML lists the older todo first when deadline and complexity match
- [x] 3.5 Smoke HTML for a second signed-in user does not include the first user's todo

#### Manual

- [x] 3.6 The clock shown on /todos matches the local time that was entered
