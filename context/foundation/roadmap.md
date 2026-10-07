---
project: "Work slop"
version: 1
status: draft
created: 2026-10-07
updated: 2026-10-07
prd_version: 1
main_goal: speed
top_blocker: time
milestone_id: ordered-working-list
milestone_seq: 1
milestone_status: open
---

# Roadmap: Work slop

> Derived from context/foundation/prd.md (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: Ordered working list** — Status: open

- **Intent:** A signed-in person can keep a private working list: add a todo, see it ordered by sooner deadline then lower complexity, change it without losing it, and mark it done so it leaves the list.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** every S-NN below is `done`.
- **Scope anchors:** US-01, FR-001, FR-002, FR-003, FR-004, FR-005, FR-007

## Vision recap

Busy professionals forget todos and deadlines when those live in their heads, and a plain list does not tell them what to do next. The product orders the next action from a deadline, a complexity the person accepts or overrides, and one rule: sooner deadline first, then lower complexity. Each signed-in person sees only their own tasks.

## North star

> The north star is the smallest end-to-end slice that proves the product works, placed as early as its prerequisites allow, because the other slices only matter if this one works.

**S-01: user can add a todo and see it on their own working list, ordered by sooner deadline, then lower complexity** — this is the Primary success criterion, so it is the first slice on the necessary path.

## At a glance

| ID   | Change ID           | Outcome (user can …)                                                                                      | Prerequisites | PRD refs                       | Status   |
| ---- | ------------------- | --------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------ | -------- |
| S-01 | add-ordered-todo    | add a todo and see only their own working list, ordered by sooner deadline, then lower complexity        | —             | US-01, FR-001, FR-004, FR-007  | ready    |
| S-02 | mark-todo-done      | mark a todo done and have it leave the working list, with no history view                                 | S-01          | US-01, FR-003, FR-005          | proposed |
| S-03 | edit-todo-reorder   | edit a todo and keep it on the working list, reordered when the deadline or complexity changes            | S-01          | FR-002                         | proposed |

## Baseline

What's already in place in the codebase as of 2026-10-07 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro + React + TypeScript, file-based pages, UI kit under src/components/ui/
- **Backend / API:** partial — server and sign-in/sign-up/sign-out endpoints exist; no todo product API
- **Data:** partial — database client is configured; no todo schema, migrations, or seed data
- **Auth:** present — email/password sessions and route protection in src/middleware.ts
- **Deploy / infra:** partial — Cloudflare Workers config and CI that lints and builds; no deploy workflow
- **Observability:** absent — no logging, error tracking, or metrics

## Foundations

None. Sign-in and the interface are already in place. Saving a todo, limiting it to its owner, and ordering the list are introduced in S-01, the first flow that needs them.

## Slices

### S-01: Add a todo and see the ordered working list

- **Outcome:** user can add a todo with what needs to be done, a guessed complexity default they can override, and a deadline, and see only their own working list ordered by sooner deadline, then lower complexity; a person who is not signed in and opens that list gets a not-found response.
- **Change ID:** add-ordered-todo
- **PRD refs:** US-01, FR-001, FR-004, FR-007
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Add, private visibility, and ordering land together; splitting them would ship a list that does not prove the product works.
- **Status:** ready

### S-02: Mark a todo done

- **Outcome:** user can mark a todo done and have it leave the working list, with no history view.
- **Change ID:** mark-todo-done
- **PRD refs:** US-01, FR-003, FR-005
- **Prerequisites:** S-01
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sequenced after add, because leaving the list only means something once a todo is on it; history stays out so this does not become a second view.
- **Status:** proposed

### S-03: Edit a todo without dropping it

- **Outcome:** user can edit a todo and keep it on the working list, reordered when the deadline or complexity changes.
- **Change ID:** edit-todo-reorder
- **PRD refs:** FR-002
- **Prerequisites:** S-01
- **Parallel with:** S-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sequenced beside mark-done, not inside add, so a change to deadline or complexity stays an edit of a saved todo and cannot drop it from the list.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID         | Suggested issue title                                                          | Ready for `/10x-plan` | Notes                                      |
| ---------- | ----------------- | ------------------------------------------------------------------------------ | --------------------- | ------------------------------------------ |
| S-01       | add-ordered-todo  | Add a todo and show the private list ordered by deadline, then complexity     | yes                   | Run `/10x-plan add-ordered-todo`           |
| S-02       | mark-todo-done    | Mark a todo done so it leaves the working list                                 | no                    | Waits on S-01                              |
| S-03       | edit-todo-reorder | Edit a todo without dropping it, and reorder the list                          | no                    | Waits on S-01; can be planned beside S-02  |

## Open Roadmap Questions

None. The PRD lists no open questions, and sequencing did not surface a new cross-cutting question.

## Parked

- **History of done todos** — Why parked: PRD §Non-Goals; done items leave the working list and v1 has no history view (FR-006 is not in this milestone).
- **Reminders / notifications** — Why parked: PRD §Non-Goals; not in the first session.
- **Projects, tags, or folders** — Why parked: PRD §Non-Goals; one working list.
- **Shared lists** — Why parked: PRD §Non-Goals; each signed-in user sees only their own todos.
- **Drag-to-reorder** — Why parked: PRD §Non-Goals; order comes only from sooner deadline, then lower complexity.
- **Smart complexity model** — Why parked: PRD §Non-Goals; keep a simple guessed default the user can override.
- **Email confirmation** — Why parked: PRD §Non-Goals; out of scope.

## Milestone History

(Empty. This is the first milestone.)

## Done

(Empty. Entries are added when a matching change is archived.)
