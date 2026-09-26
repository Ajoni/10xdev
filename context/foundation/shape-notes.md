---
project: "Work slop"
context_type: greenfield
created: 2026-09-26
updated: 2026-09-26
product_type: web-app
target_scale:
  users: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: 2026-11-01
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: context type
      decision: greenfield (user override; auto-detect proposed brownfield from git history)
    - topic: pain category
      decision: workflow friction; forgetting action order
    - topic: primary persona
      decision: busy professional; people like the author; multi-user
    - topic: insight
      decision: a plain list is not enough because it does not order the next action
    - topic: moment
      decision: whenever there are a lot of tasks
    - topic: auth strategy
      decision: login with email + password; flat model — each signed-in user sees only their own tasks; no extra roles
    - topic: complexity suggestion
      decision: simple guessed default from description length (1:<20, 2:<50, 3:<200, 4:<1000, 5:over 1000; first matching bucket); user can override; not a smart estimator
    - topic: mvp timeline
      decision: three weeks after-hours; no v1 nice-to-have
    - topic: FR-006 history
      decision: skip for MVP; done todos leave the working list with no history view in v1
    - topic: prioritization rule
      decision: sooner deadline first; equal deadline → lower complexity first (scale 1–5); reorder after edit
    - topic: NFRs
      decision: privacy only for v1 — another signed-in user never sees my todos
    - topic: product kind
      decision: website / web app
    - topic: audience size
      decision: a handful (small); ordering rule would not change at 100×
    - topic: timing
      decision: after-hours; hard deadline 2026-11-01
    - topic: non-goals
      decision: no history; no reminders; no projects/tags/folders; no shared lists; no drag-reorder; no smart complexity model
  frs_drafted: 7
  quality_check_status: accepted
---

## Seed idea

a personal todo app for my own tasks, with deadlines, a complexity estimate I enter, and one prioritization rule. Open: exact rule, how complexity is entered, and what access control looks like for a single user. Optional later, not in scope unless you choose them: reminders, projects, or a public URL.

## Vision & Problem Statement

Busy professionals forget todos and deadlines when those live in their heads. Keeping track there is not reliable.

A plain list is not enough: when there are a lot of tasks, they also lose the order of what to do next. The product should use a deadline, a complexity estimate the person enters, and one prioritization rule so the next action is ordered. At a much larger list or user count, that rule would not change.

## User & Persona

Primary persona: a busy professional. People like the author, not only the author (multi-user).

They reach for this when there are a lot of tasks. Pain: forgotten todos and deadlines, and forgotten action order. Cost today: relying on memory; current workaround tool was not named.

## Success Criteria

### Primary
- A signed-in busy professional can enter what needs to be done, accept or override a simple guessed complexity default, enter a deadline, add the todo, and see it in a list ordered by deadline and complexity.

### Secondary
- None for v1.

### Guardrails
- Another signed-in user must not see my tasks.
- Changing complexity or deadline must not drop the task from the list.

## User Stories

### US-01: Add a todo and see it ordered

- **Given** a signed-in user
- **When** they add a todo with what needs to be done, accept or override the guessed complexity, and enter a deadline
- **Then** they see it on the working list ordered by deadline and complexity

#### Acceptance Criteria
- Complexity starts as a simple guessed default from description length (1 if <20 chars, else 2 if <50, else 3 if <200, else 4 if <1000, else 5); the user can override
- Another signed-in user does not see this todo
- Marking the todo done removes it from the working list
- There is no history view in v1

## Functional Requirements

### Todos
- FR-001: User can add a todo with what needs to be done, a complexity (simple guessed default from description length they can override), and a deadline. Priority: must-have
  > Socrates: Counter-argument considered: guessed complexity will be ignored so stop suggesting it; a todo without a real deadline makes order meaningless. Resolution: kept as written.
- FR-002: User can edit a todo. Priority: must-have
  > Socrates: Counter-argument considered: edit reshuffles the list; delete-and-re-add is enough for three weeks. Resolution: kept as written.
- FR-003: User can mark a todo as done. Priority: must-have
  > Socrates: Counter-argument considered: delete is enough; or done items should stay on the working list. Resolution: kept as written.

### List and history
- FR-004: User can see the working list ordered by deadline and complexity. Priority: must-have
  > Socrates: Counter-argument considered: people will trust drag-order more; an unsorted list is enough. Resolution: kept as written.
- FR-005: Done todos are removed from the working list. Priority: must-have
  > Socrates: Counter-argument considered: vanishing completed items makes work feel like it disappeared. Resolution: kept as written.
- FR-006: User can see done todos in history. Priority: nice-to-have
  > Socrates: Counter-argument considered: history is a second product; skip it for three weeks. Resolution: skipped for MVP; demoted to nice-to-have.

### Access
- FR-007: User can see only their own todos. Priority: must-have
  > Socrates: Counter-argument considered: a shared household/team list would be more useful. Resolution: kept as written.

## Non-Functional Requirements

- Another signed-in user never sees my todos.

## Business Logic

Sooner deadline first; if two todos share a deadline, lower complexity comes first.

The rule consumes the deadline the user enters and the complexity they accept or override. Complexity is a 1–5 scale (1 is lower). The add flow starts from a simple guessed default based on todo description length, first matching bucket: 1 if <20 characters, 2 if <50, 3 if <200, 4 if <1000, 5 if over 1000. It does not consume other inputs.

The output is the order of the working list: the next action is the top item.

The user encounters it after a todo is added, and again after they edit deadline or complexity: the working list is reordered. Changing those fields must not drop the todo from the list.

## Access Control

Login with email and password. Flat user model: each signed-in user sees only their own tasks. No extra roles (no admin / member / guest split).

## Non-Goals

- No history of done todos — skipped for v1; done items leave the working list.
- No reminders / notifications — parked; not in the first session.
- No projects, tags, or folders — one working list.
- No shared lists — each signed-in user stays on their own todos only.
- No drag-to-reorder — order comes only from sooner deadline, then lower complexity.
- No “smart” complexity model — keep a simple 1–5 guessed default the user can override.

## Open Questions

None remaining.

## Quality cross-check

No gaps. All six greenfield checks present. User accepted 2026-09-26.
