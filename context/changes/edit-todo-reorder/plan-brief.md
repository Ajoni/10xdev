# Edit todo reorder — Plan Brief

> Full plan: `context/changes/edit-todo-reorder/plan.md`

## What & Why

A signed-in person can change the description, deadline, and complexity of a todo that is still on the working list. The same row stays on the list, and the list reorders when the deadline or complexity changes, using the order already shipped: sooner deadline, then lower complexity, then older `created_at`. Changing `buy milk` saved at complexity 5 into `buy oat milk` keeps complexity 5. `pay rent`, once marked done, stays off the list.

## Starting Point

`/todos` lists open todos and can add one or mark one done. Create and Done are form posts that reload the page. Authenticated updates may set `completed_at` only, and only while it is still null, so description, deadline, and complexity cannot be saved yet. The add form guesses complexity from description length until the person picks a number. The server stores the number that was submitted.

## Desired End State

Each open row has an Edit control prefilled with its stored description, stored complexity, and local deadline. Saving reloads `/todos` with that same todo still on the list. A new deadline or complexity moves it under the existing rule. A text change leaves its place and its complexity number alone. A done todo has no way back onto the list through edit.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Editable fields | Description, deadline, and complexity | FR-002 is edit a todo, and a text fix stays the same row so `created_at` still breaks ties |
| Complexity on text edit | Keep the stored number | `buy milk` saved at 5 stays 5 when the text becomes `buy oat milk`, because the server stores the submitted integer |
| Done todos | Stay off the list | `pay rent` marked done stays absent; an edit does not clear `completed_at` |
| Sort | Existing `listTodos` order | Sooner deadline, then lower complexity, then older `created_at` |
| Write path | `POST /api/todos/<id>/edit`, then reload | Same redirect style as create and Done |
| Tie and owner columns | `created_at` and `user_id` stay ungranted | An edit must leave the tiebreak and the owner on the row |

## Scope

**In scope:**

- A grant and policy so the owner can update the three content columns while `completed_at` stays null
- An edit form on each open row, prefilled, including the dev specimen
- Smoke proof of reorder, a kept complexity, a rejected blank description, and a done id that stays off the list

**Out of scope:**

- Re-guessing complexity from the new description
- Restoring a done todo, or editing one while it stays done
- Drag-to-reorder, history, delete, and undo of Done
- Changing `created_at` or `user_id`

## Architecture / Approach

One new migration adds `todos_update_own_open_content` and grants update on `description`, `complexity`, and `deadline`. The mark-done policy stays. `updateTodo` writes those three fields on an owned open row. The edit form posts them and the page loads `listTodos` again. The browser converts the deadline; the edit form does not call `guessComplexity`. The Done form remains the first form in the row so the current smoke step still finds `/done`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Open edit grant | Owner can update the three columns only while the todo is open | A policy mistake could block mark-done or allow clearing `completed_at` |
| 2. Edit control | Prefilled edit on the row saves, and the list reloads in the existing order | The Done form must stay first, and the deadline must be filled in the browser zone |
| 3. Smoke check | HTTP proof of reorder, kept complexity 5, and a done todo that stays off the list | New steps must restore the four-todo fixture before the existing mark-done checks |

**Prerequisites:** S-01 and S-02 are done. Local Supabase has both existing todo migrations. Smoke runs against a server at `BASE_URL` (default `http://localhost:4321`).
**Estimated effort:** about 2 sessions across 3 phases.

## Open Risks & Assumptions

- Permissive policies are OR'd, so one owner statement can change description and set `completed_at` together. A later statement cannot update that done row, and it cannot clear `completed_at`.
- Smoke posts absolute instants. The manual check covers the local deadline prefill, which smoke does not execute.
- `datetime-local` is minute precision. The prefilled value matches the clock on the row to the minute.

## Success Criteria (Summary)

- A person can change the words, the deadline, and the complexity of an open todo and still see that same todo on the list.
- `buy milk` at complexity 5 stays at 5 after the text becomes `buy oat milk`, and it stays in place when the deadline and complexity are unchanged. An earlier deadline moves it up.
- `pay rent`, after Done, stays off the list when an edit is posted for its id.
