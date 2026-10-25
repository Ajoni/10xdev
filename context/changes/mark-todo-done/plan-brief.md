# Mark todo done — Plan Brief

> Full plan: `context/changes/mark-todo-done/plan.md`

## What & Why

A signed-in person can mark a todo done and have it leave the working list. The list is what to do next, so a finished item should disappear. This milestone has no history view.

## Starting Point

S-01 is done. The person can add a todo and see only their own rows, ordered by sooner deadline, then lower complexity, then earlier `created_at`. The table has no done column, the page has no row action, and policies allow select and insert only.

## Desired End State

One click on **Done** reloads the list without that todo. The other rows keep their order. Two todos that share a deadline and a complexity stay in creation order; marking the upper one done leaves the lower one, and adding the same words again creates a new todo that sorts below it. The original row cannot be put back. There is no history page.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Leave the list | The todo disappears from the working list | Done items are removed from the working list, and they do not stay visible as finished. |
| Stored done time | Keep the row and set `completed_at` | Mark-done was kept after a plain delete was rejected, and this slice never shows the row again. |
| Mistake | Gone for good | Adding it again creates a new todo, so in a deadline-and-complexity tie the new copy sorts below the one that stayed. |
| Confirmation | No extra step | The recovery choice is one click. |
| History | No history view | A history of done todos is parked for v1. |
| Edit | Description, deadline, and complexity stay unwritable | Changing those fields is the edit slice. |
| Privacy | Only the owner can set the done time | Another person still cannot see the list, and an unsigned visit to `/todos` stays a 404. |

## Scope

**In scope:**

- A nullable done time, an owner update limited to that column, and a working list that omits done rows
- A one-click Done button on each row, and the same control on the dev specimen
- Smoke proof that `smoke-sooner-c1-older` leaves the list, stays gone, and cannot be marked by the other user

**Out of scope:**

- History, undo, and a confirmation step
- Deleting the row, showing the done time, or letting the form send the time
- Edit, a new empty-state sentence, and a new index

## Architecture / Approach

The row stays in `public.todos` with `completed_at` set to the server's current UTC instant. `listTodos` adds `completed_at is null` and keeps the existing order. The update is allowed only while the column is null, and only on that column. The button posts to `/api/todos/<id>/done` and the handler redirects to `/todos`. Zero rows is success with no error. A database failure uses the existing `?error=` line.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Done time | A done column and a list that hides rows which have one | A broad update grant would let the owner edit other columns early |
| 2. Done control | One-click Done on each row and on the dev specimen | The button has to sit outside the add form, under `/api/todos`, or the not-found gate swallows it |
| 3. Smoke check | The older tie todo leaves the HTML list and stays gone | Smoke has to read the todo id from that row's form action |

**Prerequisites:** S-01 done, local Supabase for the migration, and a running server for smoke.
**Estimated effort:** about 1–2 sessions across 3 phases.

## Open Risks & Assumptions

- Revoking table-level update and granting only `completed_at` is what keeps edit closed. If `authenticated` can still update description after the migration, the grant did not stick.
- Two overlapping Done requests update the same row once. The list does not gain a second copy.
- Existing rows remain visible because `completed_at` starts null. Smoke needs that migration applied first.

## Success Criteria (Summary)

- A signed-in person clicks Done and that todo is gone, with no confirmation.
- The remaining todos keep deadline, then complexity, then age order.
- The same todo cannot be brought back. Adding the words again is a new todo and, in a tie, sorts below the one that stayed.
- Another signed-in person still cannot see those todos or mark one done.
