# Edit todo reorder Implementation Plan

## Overview

A signed-in person can change the description, deadline, and complexity of a todo that is still on the working list. The same row stays on the list. The list already orders open todos by sooner deadline, then lower complexity, then older `created_at`, and that order is what moves the row when the deadline or complexity changes. A text change keeps the complexity already stored. A todo that has been marked done stays off the list.

## Current State Analysis

`/todos` server-renders open rows from `listTodos` and posts each row's Done form to `/api/todos/<id>/done`. Create is `POST /api/todos`. There is no edit route and no edit control. `guessComplexity` runs in the add form while the person types, until they change the 1–5 control. The server stores the submitted integer.

Authenticated `UPDATE` is granted only on `completed_at`. The policy `todos_update_own_open` matches an owned row while `completed_at` is null, and its check requires `completed_at` to become non-null. A content update that leaves the todo open fails that policy. `created_at` and `user_id` are not updatable by `authenticated`.

Smoke reads the first form action inside the `<li>` and expects `/api/todos/<uuid>/done`. Its fixture is four open todos, then it marks `smoke-sooner-c1-older` done.

## Desired End State

On `/todos`, each open row offers an edit of description, deadline, and complexity, prefilled from the stored row. Saving reloads `/todos`. The same todo is still there. A new deadline or complexity places it by the existing sort. A new description leaves its position and its stored complexity alone. Validation that fails leaves the saved row unchanged and shows the same error redirect as create. Posting an edit for a done todo, an unknown id, or another person's id reloads `/todos` with no error, and the done todo stays absent.

### Key Discoveries:

- `listTodos` orders `deadline`, `complexity`, `created_at` ascending and keeps `completed_at` null (`src/lib/todos.ts` lines 37–45).
- The mark-done grant and policy allow `completed_at` to move from null to a timestamp only (`supabase/migrations/20261025111600_mark_todo_done.sql` lines 3–11). `markTodoDone` treats a non-uuid and a zero-row update as success (`src/lib/todos.ts` lines 93–105).
- Create validates a trimmed non-blank description, an integer complexity from 1 to 5, and an absolute deadline instant, then redirects failures to `/todos?error=` (`src/pages/api/todos.ts` lines 8–34).
- `formatLocalClock` prints `YYYY-MM-DD HH:mm` with a space (`src/lib/deadlines.ts` lines 1–12). The add form submits `datetime-local` through `toUtcInstant` into a hidden `deadline` (`src/components/todos/WorkingList.tsx` lines 117–139).
- `formActionInItem` returns the first form action in the list item (`scripts/smoke.mjs` lines 74–84).

## What We're NOT Doing

- Editing deadline and complexity while the description stays frozen.
- Re-guessing complexity from the new description length, including a guess that runs until the person touches the 1–5 control.
- Bringing a done todo back onto the list, or changing a done todo's description, deadline, or complexity while it stays done.
- Clearing `completed_at`, changing `created_at`, or changing `user_id`.
- Drag-to-reorder, a history view, delete, or an undo of Done.
- A separate edit page, a JSON patch, or a client update that skips the reload.
- A database trigger that freezes description, deadline, and complexity on the mark-done statement.

## Implementation Approach

Add a second update policy and a column grant so the owner can write `description`, `complexity`, and `deadline` only while `completed_at` stays null. Leave the mark-done policy and the `completed_at` grant in place. `POST /api/todos/<id>/edit` accepts the same three fields as create, writes the submitted complexity, and does not call `guessComplexity`. Zero matching rows redirect to `/todos` with no error. The list page reloads through `listTodos`, which stays the only sort.

The edit form sits on the open row, after the Done form, prefilled with the stored description and complexity. The browser fills the deadline in the local zone and submits it with `toUtcInstant`. The add form keeps guessing complexity while its own description changes. The edit form does not.

## Critical Implementation Details

### Policy pairing

`todos_update_own_open` stays as it is. Its check requires `completed_at` to become non-null, so a content update that leaves `completed_at` null does not pass it. A second permissive policy passes only when the owned row stays open (`completed_at` is null before and after). Permissive policies are combined with OR. An owner statement that sets `completed_at` and also changes description still passes the mark-done policy. That statement cannot run after the row is already done, and it cannot clear `completed_at`. Do not grant update on `created_at` or `user_id`.

### Deadline prefill

The value stored for the edit deadline is an absolute instant. The visible `datetime-local` control needs `YYYY-MM-DDTHH:mm` in the browser's zone. The space-separated string from `formatLocalClock` is the clock the person reads, and it is the wrong value for that control. Fill the control from the row's UTC `datetime` on the client, and submit through `toUtcInstant` into the hidden `deadline` field, as the add form does.

### Smoke form order

The existing smoke step reads the first form action in the `<li>` and requires `/api/todos/<uuid>/done`. The Done form stays the first form in the item. The edit form follows it.

## Phase 1: Open edit grant

### Overview

The owner can update description, deadline, and complexity on a todo that is still open. Mark-done still sets `completed_at`. Nothing in the product calls the new grant yet.

### Changes Required:

#### 1. Content update grant and policy

**File**: `supabase/migrations/<YYYYMMDDHHmmss>_edit_todo.sql`

**Intent**: Let the owner change the three content columns while the todo stays on the working list, and leave the mark-done path able to set `completed_at`.

**Contract**: Grant `authenticated` update on `description`, `complexity`, and `deadline`. Add one permissive update policy for `authenticated`. Its `using` and `with check` both require `user_id = auth.uid()` and `completed_at is null`. Do not revoke the existing `completed_at` grant. Do not drop or rewrite `todos_update_own_open`. Do not grant update on `created_at`, `user_id`, or `id`. Do not add a delete policy.

```sql
grant update (description, complexity, deadline) on table public.todos to authenticated;

create policy "todos_update_own_open_content"
on public.todos
for update
to authenticated
using (user_id = auth.uid() and completed_at is null)
with check (user_id = auth.uid() and completed_at is null);
```

### Success Criteria:

#### Automated Verification:

- The new migration grants `authenticated` update on `description`, `complexity`, and `deadline`, and adds a permissive update policy whose `using` and `with check` require `user_id = auth.uid()` and `completed_at is null`. It does not revoke the `completed_at` grant or drop `todos_update_own_open`
- `created_at` and `user_id` have no update grant for `authenticated`
- `npm run lint` passes
- `npm test` passes

#### Manual Verification:

- The migration applies on local Supabase, existing open todos still appear on `/todos`, and done todos stay off the list

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Edit control

### Overview

Each open row can save a new description, deadline, and complexity. The page reloads the working list in the existing order. The stored complexity is what the form shows and what the server writes.

### Changes Required:

#### 1. Open-row update

**File**: `src/lib/todos.ts`

**Intent**: Persist the three submitted fields on one open row the caller owns, and leave a done row untouched.

**Contract**: `updateTodo(supabase, userId, todoId, input)` returns `Promise<string | null>`, the same shape as `markTodoDone`. A non-uuid returns `null` without a query. The update sets `description` to the trimmed text, `complexity` to the submitted integer 1–5, and `deadline` to the submitted instant. It filters `id`, `user_id`, and `completed_at` null. It does not set `completed_at` or `created_at`. It does not call `guessComplexity`. A database error returns that message. Zero matching rows return `null`.

#### 2. Edit route

**File**: `src/pages/api/todos/[id]/edit.ts`

**Intent**: Accept the same three fields as create, for the id in the path, and reload the list.

**Contract**: `export const prerender = false` and a `POST` handler, sibling of `done.ts`. An unsigned caller redirects to `/todos`. The body fields `description`, `complexity`, and `deadline` use the same rules and the same messages as `createTodoSchema`: trimmed non-blank description (`Description is required`), integer complexity from 1 to 5 (`Complexity must be an integer from 1 to 5`), and an absolute instant (`Deadline must be an absolute instant`). The first issue is the `?error=` message. A missing Supabase client redirects to `/todos?error=Supabase is not configured`. `updateTodo` writes `parsed.data`. A returned message redirects to `/todos?error=`. Success, a non-uuid, a done id, an unknown id, and another person's id redirect to `/todos` with no error query.

#### 3. Row edit form

**File**: `src/pages/todos.astro`

**Intent**: Each open row can post its three stored fields without taking the Done action's place in the item.

**Contract**: After the Done form, each `<li>` contains a form whose action is `/api/todos/${todo.id}/edit` and whose method is `POST`. The Done form remains the first form in the item. The edit form's description value is `todo.description`. Its complexity control submits the stored `todo.complexity` and offers 1 through 5. Its visible deadline control is `datetime-local` and is not named `deadline`. A hidden `deadline` input carries the instant the client will set. Input ids include the todo id so they do not collide with the add form. The submit label is `Save`. The control that identifies the form is labeled `Edit`.

#### 4. Prefill without a new guess

**File**: `src/components/todos/WorkingList.tsx`

**Intent**: The edit deadline is the row's instant in the browser's local zone, and a description edit does not replace the stored complexity.

**Contract**: The existing client island, which already rewrites `<time>` text, sets each edit row's `datetime-local` value from that row's UTC `datetime` as `YYYY-MM-DDTHH:mm`. On submit it writes `toUtcInstant` of that value into the hidden `deadline` field. A blank description or a blank deadline cancels submit and shows `Description is required` or `Deadline is required` on that edit form. Changing the edit description does not call `guessComplexity` and does not change the edit complexity control. The add form still calls `guessComplexity` while its description changes and the add complexity has not been overridden.

#### 5. Default specimen

**File**: `src/components/todos/TodoStateSink.tsx`

**Intent**: The kitchen-sink row shows the same Done-then-Edit order as the working list.

**Contract**: The Default specimen's list item keeps the Done form first and shows an Edit control after it. That specimen control does not submit.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `npm test` passes

#### Manual Verification:

- The edit control on an open row is prefilled with that row's description, stored complexity, and local deadline, and typing a new description does not change the complexity control
- Saving a text-only change keeps that todo on the list in the same position
- Saving an earlier deadline shows that todo higher in the list after reload
- The add form still changes its complexity guess while the description is typed
- The dev specimen's default row shows Done first and an Edit control after it

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Smoke check

### Overview

Extend smoke so an edit reorders an open todo, a text change keeps its place and its submitted complexity, and a done todo stays off the list. The existing mark-done steps still see the original four-todo fixture.

### Changes Required:

#### 1. Smoke cases

**File**: `scripts/smoke.mjs`

**Intent**: Prove the edit route over HTTP with the fixture smoke already creates, then hand that fixture back to the mark-done steps.

**Contract**: Keep the current steps: unsigned `GET /todos` returns 404, the four creates, the full order check, mark-done of `smoke-sooner-c1-older`, the second POST to that done action, and the second user's privacy checks. The Done form stays the action those steps read.

Before any mark-done step, derive an edit URL from a row's done action by replacing the trailing `/done` with `/edit`. An unsigned `POST` to `/api/todos/00000000-0000-4000-8000-000000000000/edit` redirects to `/todos`. A `POST` for an open todo with a blank description redirects to a location that starts with `/todos?error=` and contains `Description is required`, and the following `GET /todos` still shows the original four-todo order.

Then `POST` `smoke-later-c1` with its same description, complexity `1`, and deadline `2026-10-10T15:00:00.000Z`. The next `GET` lists `smoke-later-c1` first, then `smoke-sooner-c1-older`, `smoke-sooner-c1-newer`, and `smoke-sooner-c3`, and the moved row's stored deadline text is `2026-10-10T15:00:00+00:00`. Restore that row with deadline `2026-10-20T12:00:00.000Z` and complexity `1`. The following `GET` matches the original order: `smoke-sooner-c1-older`, `2026-10-15T15:00:00+00:00`, `smoke-sooner-c1-newer`, that same deadline text, `smoke-sooner-c3`, that same deadline text, `smoke-later-c1`, `2026-10-20T12:00:00+00:00`.

`POST` `smoke-sooner-c1-newer` with description `smoke-sooner-c1-newer-edited`, complexity `1`, and `2026-10-15T15:00:00.000Z`. The next `GET` lists `smoke-sooner-c1-older`, then `smoke-sooner-c1-newer-edited`, then `smoke-sooner-c3`, then `smoke-later-c1`. Restore the description `smoke-sooner-c1-newer` with complexity `1` and the same deadline before mark-done.

`POST` `smoke-sooner-c3` with that same description, complexity `5`, and `2026-10-15T15:00:00.000Z`. The next `GET` shows `smoke-sooner-c3` followed by `Complexity 5`, still after both complexity-1 todos that share its deadline and before `smoke-later-c1`. Restore complexity `3` before mark-done.

After `smoke-sooner-c1-older` is marked done, `POST` its edit URL with a valid description, complexity `1`, and `2026-10-15T15:00:00.000Z`. Expect status 302 and location `/todos` with no `error` query. The following `GET` still excludes `smoke-sooner-c1-older` and still lists `smoke-sooner-c1-newer`, then `smoke-sooner-c3`, then `smoke-later-c1`.

After the second user exists, that user `POST`s the edit URL of a remaining open todo and expects 302 to `/todos`. The first user's following `GET` still excludes `smoke-sooner-c1-older` and still lists the other three in that order. Do not assert the local clock string.

### Success Criteria:

#### Automated Verification:

- `npm run smoke` passes, including the existing unsigned `/todos` 404, order fixture, mark-done steps, and second-user privacy checks
- An unsigned POST to `/api/todos/00000000-0000-4000-8000-000000000000/edit` redirects to `/todos`
- A blank description POST to an open todo's edit route redirects to `/todos?error=` with `Description is required`, and the original four-todo order stays
- Editing `smoke-later-c1` to deadline `2026-10-10T15:00:00.000Z` and complexity 1 lists it first, and restoring `2026-10-20T12:00:00.000Z` returns the original four-todo order
- Editing `smoke-sooner-c1-newer` to `smoke-sooner-c1-newer-edited` while submitting complexity 1 leaves it below `smoke-sooner-c1-older`, and the original description is restored before mark-done
- Submitting complexity 5 for short `smoke-sooner-c3` shows `Complexity 5` on that row, and complexity 3 is restored before mark-done
- After `smoke-sooner-c1-older` is marked done, a POST to its edit route redirects to `/todos` with no `error` query and the description stays absent
- A second signed-in user's POST to an open todo's edit route leaves the first user's list unchanged

#### Manual Verification:

- The edit deadline matches the local clock already shown on that row, to the minute

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

`npm test` stays green. It covers complexity buckets and deadline helpers. Do not add a database unit test for `updateTodo`. The migration contract and smoke prove the write.

### Integration Tests:

`npm run smoke` against a running server (`BASE_URL`, default `http://localhost:4321`) with this migration applied on local Supabase. New steps cover the edit fixture above and restore the four open todos before the existing mark-done steps. Existing unsigned 404, full order, privacy, and dashboard steps stay.

### Manual Testing Steps:

1. Apply the migration, sign in, and confirm existing open todos are still on `/todos` and a done todo is still absent.
2. On an open todo saved at complexity 5 with a short description, open Edit. Confirm the complexity control shows 5 and the deadline matches the local clock on the row, to the minute.
3. Change `buy milk` to `buy oat milk` and save without touching complexity. Confirm the row stays on the list, still at complexity 5, in the same place among todos that share its deadline.
4. Give that todo an earlier deadline than the row above it and save. Confirm it moves up. Set the deadline back and confirm it returns.
5. Type in the add form's description and confirm its complexity guess still changes until you override it.
6. Mark a todo done. Confirm it leaves the list. Confirm there is no Edit control for it on `/todos`.
7. Open `/dev/todo-states` and confirm the default specimen shows Done first and Edit after it.

## Performance Considerations

The working list is still one select per page view. The PRD scale is a small list at about 20 queries per second. The existing `(user_id, deadline, complexity, created_at)` index stays. An edit is one update by primary key. This slice does not add an index or pagination.

## Migration Notes

Existing open rows are editable as soon as the new grant and policy exist. Done rows stay frozen because both update policies require `completed_at` to be null in `using`. No backfill. A Worker rollback does not undo the SQL. Reversing the grant is a later migration, not this slice.

## References

- PRD: `context/foundation/prd.md` — FR-002, the order rule, the guardrail that changing complexity or deadline keeps the todo on the list
- Roadmap slice: `context/foundation/roadmap.md` — S-03 `edit-todo-reorder`
- Issue: https://github.com/Ajoni/10xdev/issues/3
- Prior slices: `context/archive/2026-10-10-add-ordered-todo/plan.md`, `context/archive/2026-10-25-mark-todo-done/plan.md`
- Table and mark-done policy: `supabase/migrations/20261010123900_create_todos.sql`, `supabase/migrations/20261025111600_mark_todo_done.sql`
- List, insert, and mark-done: `src/lib/todos.ts`
- Page: `src/pages/todos.astro`
- Add form: `src/components/todos/WorkingList.tsx`
- Create route: `src/pages/api/todos.ts`
- Done route: `src/pages/api/todos/[id]/done.ts`
- Smoke fixture: `scripts/smoke.mjs`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Open edit grant

#### Automated

- [x] 1.1 The new migration grants `authenticated` update on `description`, `complexity`, and `deadline`, and adds a permissive update policy whose `using` and `with check` require `user_id = auth.uid()` and `completed_at is null`. It does not revoke the `completed_at` grant or drop `todos_update_own_open` — 0760706
- [x] 1.2 `created_at` and `user_id` have no update grant for `authenticated` — 0760706
- [x] 1.3 `npm run lint` passes — 0760706
- [x] 1.4 `npm test` passes — 0760706

#### Manual

- [x] 1.5 The migration applies on local Supabase, existing open todos still appear on `/todos`, and done todos stay off the list — 0760706

### Phase 2: Edit control

#### Automated

- [x] 2.1 `npm run lint` passes — bdb0ccf
- [x] 2.2 `npm run build` passes — bdb0ccf
- [x] 2.3 `npm test` passes — bdb0ccf

#### Manual

- [x] 2.4 The edit control on an open row is prefilled with that row's description, stored complexity, and local deadline, and typing a new description does not change the complexity control — bdb0ccf
- [x] 2.5 Saving a text-only change keeps that todo on the list in the same position — bdb0ccf
- [x] 2.6 Saving an earlier deadline shows that todo higher in the list after reload — bdb0ccf
- [x] 2.7 The add form still changes its complexity guess while the description is typed — bdb0ccf
- [x] 2.8 The dev specimen's default row shows Done first and an Edit control after it — bdb0ccf

### Phase 3: Smoke check

#### Automated

- [x] 3.1 `npm run smoke` passes, including the existing unsigned `/todos` 404, order fixture, mark-done steps, and second-user privacy checks — 9ba649f
- [x] 3.2 An unsigned POST to `/api/todos/00000000-0000-4000-8000-000000000000/edit` redirects to `/todos` — 9ba649f
- [x] 3.3 A blank description POST to an open todo's edit route redirects to `/todos?error=` with `Description is required`, and the original four-todo order stays — 9ba649f
- [x] 3.4 Editing `smoke-later-c1` to deadline `2026-10-10T15:00:00.000Z` and complexity 1 lists it first, and restoring `2026-10-20T12:00:00.000Z` returns the original four-todo order — 9ba649f
- [x] 3.5 Editing `smoke-sooner-c1-newer` to `smoke-sooner-c1-newer-edited` while submitting complexity 1 leaves it below `smoke-sooner-c1-older`, and the original description is restored before mark-done — 9ba649f
- [x] 3.6 Submitting complexity 5 for short `smoke-sooner-c3` shows `Complexity 5` on that row, and complexity 3 is restored before mark-done — 9ba649f
- [x] 3.7 After `smoke-sooner-c1-older` is marked done, a POST to its edit route redirects to `/todos` with no `error` query and the description stays absent — 9ba649f
- [x] 3.8 A second signed-in user's POST to an open todo's edit route leaves the first user's list unchanged — 9ba649f

#### Manual

- [x] 3.9 The edit deadline matches the local clock already shown on that row, to the minute — 9ba649f
