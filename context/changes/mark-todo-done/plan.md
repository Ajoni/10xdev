# Mark todo done Implementation Plan

## Overview

A signed-in person marks one of their todos done in one click. That todo leaves the working list and cannot be brought back. Adding the same words again creates a new todo. There is no history view.

## Current State Analysis

S-01 is done. `public.todos` stores `id`, `user_id`, `description`, `complexity`, `deadline`, and `created_at`. RLS allows the owner to select and insert only. `listTodos` returns every owned row, ordered by `deadline` ascending, then `complexity` ascending, then `created_at` ascending (`src/lib/todos.ts`). `/todos` renders those rows as static text and posts new todos to `POST /api/todos`, which redirects back to the list. Unsigned `/todos` is a 404 because the path starts with `/todos` (`src/middleware.ts`). Paths under `/api/todos` are not part of that gate. The dev specimen repeats the same row with no row action (`src/components/todos/TodoStateSink.tsx`). Smoke creates four todos and checks that order and that a second user cannot see them (`scripts/smoke.mjs`).

## Desired End State

The person clicks **Done** on a row. The page reloads and that todo is gone. The other rows stay in the same order.

Two todos share deadline `2026-10-15T15:00:00.000Z` and complexity 1. `smoke-sooner-c1-older` was created first, so it sits above `smoke-sooner-c1-newer`. After Done on the upper one, only the newer one remains from that pair, still above `smoke-sooner-c3` and `smoke-later-c1`. Adding `smoke-sooner-c1-older` again creates a new row that sorts below `smoke-sooner-c1-newer`. Nothing in the product puts the original row back on the list.

### Key Discoveries:

- The table has no done column, and the only write policy is insert (`supabase/migrations/20261010123900_create_todos.sql`).
- Row markup lives in `src/pages/todos.astro`, not in the add-todo island. A Done control can be a normal form there.
- `buttonVariants` is exported from `src/components/ui/button.tsx`, so the Astro page can use the shared button styles without an island per row.
- Create already redirects a missing session to `/todos` and a failure to `/todos?error=` (`src/pages/api/todos.ts`). Mark-done follows that shape.
- Smoke already has the tie fixture: `smoke-sooner-c1-older` then `smoke-sooner-c1-newer`, then complexity 3, then the later deadline (`scripts/smoke.mjs`).

## What We're NOT Doing

- A history view of done todos.
- Restoring the same todo to its old place.
- A confirmation step before Done.
- Editing description, deadline, or complexity (S-03).
- Deleting the row.
- A client-supplied done time, or showing the done time.
- Changing the empty line "No todos yet."
- Putting `/todos` on `PROTECTED_ROUTES`.
- A new list index.

## Implementation Approach

Keep the row. Add a nullable `completed_at`. The working list loads rows where that value is null and keeps the current order. Done sets `completed_at` to the server's current UTC instant. The form does not send a time. The database accepts that update only while `completed_at` is null, and only on that column, so description, deadline, and complexity stay unwritable. Zero matching rows — already done, unknown id, or another person's id — redirect to `/todos` with no error. A database failure still uses `?error=`. The button is a post to `/api/todos/<id>/done` inside the list item, outside the add form. The label is **Done**.

## Critical Implementation Details

### State sequencing

The update policy's `using` clause matches an owned row only while `completed_at` is null, and `with check` requires the new `completed_at` to be non-null. A second update matches nothing and cannot clear the time. The handler treats zero rows as success. Two overlapping requests still update one row, so the list gains no duplicate.

## Phase 1: Done time

### Overview

Store a done time and load only todos that have none. Existing rows stay on the list because the new column is null. Nothing in the product sets the column yet.

### Changes Required:

#### 1. Done column and owner update

**File**: `supabase/migrations/<YYYYMMDDHHmmss>_mark_todo_done.sql`

**Intent**: Record a done time for the owner, and leave description, deadline, and complexity unwritable so this slice does not open edit.

**Contract**: Add nullable `completed_at timestamptz` to `public.todos`. Existing rows stay null. Revoke table-level `UPDATE` from `anon` and `authenticated`, then grant `authenticated` update on `completed_at` only. One update policy for `authenticated`: `using` requires `user_id = auth.uid()` and `completed_at is null`; `with check` requires `user_id = auth.uid()` and `completed_at is not null`. Do not add a delete policy. Do not change the select or insert policies.

```sql
revoke update on table public.todos from anon, authenticated;
grant update (completed_at) on table public.todos to authenticated;

create policy "todos_update_own_open"
on public.todos
for update
to authenticated
using (user_id = auth.uid() and completed_at is null)
with check (user_id = auth.uid() and completed_at is not null);
```

#### 2. Working-list query

**File**: `src/lib/todos.ts`

**Intent**: The page should load the same working list as today, minus rows that already have a done time.

**Contract**: `listTodos` keeps the `user_id` filter and the order `deadline`, `complexity`, `created_at` ascending. It also requires `completed_at` null. It still selects `id`, `user_id`, `description`, `complexity`, `deadline`, and `created_at` only. Do not add `completed_at` to the `Todo` type in `src/types.ts`.

### Success Criteria:

#### Automated Verification:

- The new migration adds nullable `completed_at timestamptz`, revokes table-level update from `anon` and `authenticated`, grants `authenticated` update on `completed_at` only, and adds an update policy whose `using` requires `user_id = auth.uid()` and `completed_at is null`, and whose `with check` requires `user_id = auth.uid()` and `completed_at is not null`
- `listTodos` returns only rows with `completed_at` null and keeps the order deadline, complexity, `created_at` ascending
- `npm run lint` passes
- `npm test` passes

#### Manual Verification:

- The migration applies on local Supabase and existing todos still appear on `/todos`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Done control

### Overview

Each visible row gets one Done button. One click reloads `/todos` without that todo. There is no confirmation and no way to restore that same row.

### Changes Required:

#### 1. Mark function

**File**: `src/lib/todos.ts`

**Intent**: Set the done time from the server, and treat "already gone" the same as success so a second click does not look like a failure.

**Contract**: `markTodoDone(supabase, userId, todoId)` returns `null` on success and a string on a database error. It updates only `completed_at`, to the current UTC instant from the server clock, where `id`, `user_id`, and `completed_at is null` all match. Zero matching rows return `null`. It does not read or write description, deadline, complexity, or `user_id`. An id that is not a uuid returns `null` without calling the database.

#### 2. Done endpoint

**File**: `src/pages/api/todos/[id]/done.ts`

**Intent**: Accept the row form and send the person back to the list, using the same redirect shape as create.

**Contract**: `export const prerender = false` and `POST`. The id comes from the route param. A missing session redirects to `/todos`. `markTodoDone` returning `null` redirects to `/todos` with no `error` query, including a bad id, an unknown id, another person's id, and an already-done id. A returned string redirects to `/todos?error=` with that message. The route does not accept a done time from the form. It lives under `/api/todos`, so the `/todos` not-found gate does not run before this handler.

#### 3. Row control

**File**: `src/pages/todos.astro`

**Intent**: Let the person mark the visible todo done in one click without a second island.

**Contract**: Inside each `<li>`, and outside the add-todo form, a `POST` form whose action is `/api/todos/<id>/done`. The submit control's visible label is `Done`. Its classes come from `buttonVariants` with variant `outline` and size `sm`. No confirm dialog. The empty line stays `No todos yet.`

#### 4. Dev specimen

**File**: `src/components/todos/TodoStateSink.tsx`

**Intent**: The default specimen stays an honest copy of the row, including the new control.

**Contract**: The default specimen's sample row includes a `Button` labeled `Done`, variant `outline`, size `sm`, `type="button"`, so it does not call the mark endpoint.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `npm test` passes

#### Manual Verification:

- One click on Done removes that todo with no confirmation
- Two todos that share a deadline and complexity: marking the upper one done leaves the lower one in place
- Adding those same words again creates a new todo that sorts below the one that stayed
- Marking the last visible todo shows "No todos yet."
- The dev specimen's default row shows a Done control

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Smoke check

### Overview

Extend smoke so a marked todo leaves the HTML list, a second post does not bring it back or surface an error, and another signed-in person cannot mark it. The existing order check still runs while all four todos are open.

### Changes Required:

#### 1. Smoke cases

**File**: `scripts/smoke.mjs`

**Intent**: Prove the slice over HTTP with the fixture smoke already creates.

**Contract**: Keep the current steps, including the four creates, the full order check, unsigned `GET /todos` 404, and the second user's exclusion of all four descriptions. After that full order check, read the form action from the `<li>` that contains `smoke-sooner-c1-older`. That action is `/api/todos/<id>/done`. `POST` it as the first user and expect status 302 and location `/todos` with no `error` query. The following `GET /todos` excludes `smoke-sooner-c1-older` and lists, in order, `smoke-sooner-c1-newer`, its stored deadline `2026-10-15T15:00:00+00:00`, `smoke-sooner-c3`, that same deadline text, `smoke-later-c1`, and `2026-10-20T12:00:00+00:00`. A second `POST` to the same action expects the same 302 to `/todos` with no `error` query, and a following `GET` still excludes `smoke-sooner-c1-older`. After the second user exists, that user `POST`s the same action and expects 302 to `/todos`. The first user's following `GET` still excludes `smoke-sooner-c1-older` and still lists the other three in that order. The second user's list still excludes all four descriptions. Do not assert the local clock string.

### Success Criteria:

#### Automated Verification:

- `npm run smoke` passes, including the existing unsigned `/todos` 404, order fixture, and second-user privacy checks
- After marking `smoke-sooner-c1-older` done, smoke HTML excludes that description and lists `smoke-sooner-c1-newer`, then `smoke-sooner-c3`, then `smoke-later-c1`
- A second POST to that same done action redirects to `/todos` with no `error` query, and the description stays absent
- A second signed-in user posting that same action does not put `smoke-sooner-c1-older` back and still does not see the first user's descriptions

#### Manual Verification:

- The clock shown on a remaining todo still matches the local time that was entered

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

`npm test` stays green. It covers complexity buckets and deadline helpers. Do not add a database unit test for the filter or the update. Those are proved by the migration contract and by smoke.

### Integration Tests:

`npm run smoke` against a running server (`BASE_URL`, default `http://localhost:4321`) with the migration applied on local Supabase. New steps cover the done fixture above. Existing unsigned 404, full order, privacy, and dashboard steps stay.

### Manual Testing Steps:

1. Apply the migration, sign in, and confirm existing todos are still on `/todos` in the same order.
2. Add two todos with the same deadline and the same complexity. Confirm the earlier one is above the later one. Click Done on the upper one. Confirm there is no confirmation step and only the lower one remains.
3. Add the upper todo's words again with the same deadline and complexity. Confirm the new row sorts below the one that stayed.
4. Mark Done until the list is empty. Confirm the page shows "No todos yet."
5. On a remaining todo, confirm the clock still matches the local time that was entered.
6. Open `/dev/todo-states` and confirm the default specimen shows Done.

## Performance Considerations

The working list is still one select per page view, now with `completed_at is null`. The PRD scale is a small list at about 20 queries per second. The existing `(user_id, deadline, complexity, created_at)` index stays. This slice does not add an index or pagination.

## Migration Notes

Existing rows gain `completed_at` null, so they remain on the working list. A Worker rollback does not undo the SQL. Reversing the column is a later migration, not this slice.

## References

- PRD: `context/foundation/prd.md` — US-01 acceptance, FR-003, FR-005, FR-006, Non-Goals
- Roadmap slice: `context/foundation/roadmap.md` — S-02 `mark-todo-done`
- Issue: https://github.com/Ajoni/10xdev/issues/2
- Prior slice: `context/archive/2026-10-10-add-ordered-todo/plan.md`
- Table: `supabase/migrations/20261010123900_create_todos.sql`
- List and insert: `src/lib/todos.ts`
- Page: `src/pages/todos.astro`
- Create route: `src/pages/api/todos.ts`
- Not-found gate: `src/middleware.ts`
- Smoke fixture: `scripts/smoke.mjs`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Done time

#### Automated

- [x] 1.1 The new migration adds nullable `completed_at timestamptz`, revokes table-level update from `anon` and `authenticated`, grants `authenticated` update on `completed_at` only, and adds an update policy whose `using` requires `user_id = auth.uid()` and `completed_at is null`, and whose `with check` requires `user_id = auth.uid()` and `completed_at is not null` — cdf54c5
- [x] 1.2 `listTodos` returns only rows with `completed_at` null and keeps the order deadline, complexity, `created_at` ascending — cdf54c5
- [x] 1.3 `npm run lint` passes — cdf54c5
- [x] 1.4 `npm test` passes — cdf54c5

#### Manual

- [x] 1.5 The migration applies on local Supabase and existing todos still appear on `/todos` — cdf54c5

### Phase 2: Done control

#### Automated

- [x] 2.1 `npm run lint` passes — 9a4851d
- [x] 2.2 `npm run build` passes — 9a4851d
- [x] 2.3 `npm test` passes — 9a4851d

#### Manual

- [x] 2.4 One click on Done removes that todo with no confirmation — 9a4851d
- [x] 2.5 Two todos that share a deadline and complexity: marking the upper one done leaves the lower one in place — 9a4851d
- [x] 2.6 Adding those same words again creates a new todo that sorts below the one that stayed — 9a4851d
- [x] 2.7 Marking the last visible todo shows "No todos yet." — 9a4851d
- [x] 2.8 The dev specimen's default row shows a Done control — 9a4851d

### Phase 3: Smoke check

#### Automated

- [x] 3.1 `npm run smoke` passes, including the existing unsigned `/todos` 404, order fixture, and second-user privacy checks
- [x] 3.2 After marking `smoke-sooner-c1-older` done, smoke HTML excludes that description and lists `smoke-sooner-c1-newer`, then `smoke-sooner-c3`, then `smoke-later-c1`
- [x] 3.3 A second POST to that same done action redirects to `/todos` with no `error` query, and the description stays absent
- [x] 3.4 A second signed-in user posting that same action does not put `smoke-sooner-c1-older` back and still does not see the first user's descriptions

#### Manual

- [x] 3.5 The clock shown on a remaining todo still matches the local time that was entered
