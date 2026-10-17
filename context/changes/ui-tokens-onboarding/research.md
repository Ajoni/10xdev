---
date: 2026-10-17T11:21:15+02:00
researcher: unknown
git_commit: c22bc3d827aeaee7a73d8c9a38533e11c3cbbc2a
branch: master
repository: Ajoni/10xdev
topic: "Design-system contract and charges for the /todos view"
tags: [research, codebase, todos, tokens, shadcn]
status: complete
last_updated: 2026-10-17
last_updated_by: unknown
last_updated_note: Planning resolved the three open questions. Charge 4 is in the plan as a token-styled page with status 404.
---

# Research: Design-system contract and charges for the /todos view

**Date**: 2026-10-17T11:21:15+02:00
**Researcher**: unknown
**Git Commit**: c22bc3d827aeaee7a73d8c9a38533e11c3cbbc2a
**Branch**: master
**Repository**: Ajoni/10xdev

## Research Question

For the already-rendered `/todos` view, where do this repo's tokens and shared components live, which literals on that view are charges, and which entry-point behavior is already a settled product rule?

## Summary

On the inspected tree at commit `c22bc3d827aeaee7a73d8c9a38533e11c3cbbc2a`, plus the uncommitted `/todos` page and API files in the working tree, the shadcn token file is `src/styles/global.css`. `:root` holds the light values (`src/styles/global.css:6-38`), `.dark` reassigns the same names (`src/styles/global.css:41-73`), and `@theme inline` publishes them as `--color-*` (`src/styles/global.css:75-110`). `src/layouts/Layout.astro:14` renders `<html lang="en">` with no `class` attribute. A search of `src/**/*.{astro,tsx,ts,js,mjs}` found no `class="dark"`, `setTheme`, or `prefers-color-scheme` handler, so the `.dark` block is not applied by app code on this path.

A search of `src/**/*.{astro,tsx,ts,css}` for `bg-card`, `text-muted-foreground`, and `text-destructive` returned no matches. In that same search, `bg-primary` matched `src/components/ui/button.tsx:12`, `bg-background` matched `src/components/ui/button.tsx:16` and `src/styles/global.css:122`, and `text-foreground` matched `src/styles/global.css:122`. `/todos` does not use those classes. Its shell uses `bg-cosmic` (`src/pages/todos.astro:29`), a hex gradient utility (`src/styles/global.css:113-115`).

`src/components/ui/` contains `button.tsx` and `LibBadge.astro`. There is no `input.tsx`, `select.tsx`, `label.tsx`, or `card.tsx` in that directory. The add button imports `Button` and passes palette classes (`src/components/auth/SubmitButton.tsx:15-18`). `FormField`, `SubmitButton`, and `ServerError` are imported by `WorkingList.tsx`, `SignInForm.tsx`, and `SignUpForm.tsx`.

An unsigned `GET /todos` returns the text `Not found` with status 404 (`src/middleware.ts:18-19`). That status is a written product rule in `context/changes/add-ordered-todo/plan.md:19` and `:40`, and a designed 404 page is listed under what that plan is not doing (`plan.md:35`).

## Charges

Each charge is evidence for `/10x-plan`. Charges that plan does not take stay here, marked deferred, with a reason.

### 1. Missing tokens — shell and list

`src/pages/todos.astro:29-43` paints the screen with `bg-cosmic`, `border-white/10`, `bg-white/10`, `text-white`, `from-blue-200`, `to-purple-200`, and `text-blue-100/*`. A signed-in user sees a blue-purple glass panel, so editing `--card`, `--foreground`, or `--muted-foreground` does not change this list.

Role tokens already defined for the non-gradient bits: `card`, `border`, `foreground`, `muted-foreground` (`src/styles/global.css:8-23` and `:80-96`). `bg-cosmic` has no role token; its values are the two hex stops in `src/styles/global.css:114`.

### 2. Missing tokens — focus and errors on the form

On this path, description, complexity, deadline, and server errors use palette classes: `src/components/auth/FormField.tsx:6`, `:37`, `:41`, `:53`, `:59`; `src/components/todos/WorkingList.tsx:110`, `:120`, `:131`, `:135`, `:149-155`; `src/components/auth/ServerError.tsx:11`. Those fields call `focus:outline-none` and `focus:ring-purple-400` (or `focus:ring-red-400` when invalid). They do not use `focus-visible` or `ring`. The shared button does: `focus-visible:border-ring focus-visible:ring-ring/50` at `src/components/ui/button.tsx:8`. A keyboard user gets a purple or red ring on the fields, and an invalid deadline is red text that does not follow `--destructive` or `--ring`.

`FormField.tsx` and `ServerError.tsx` are also imported by the sign-in and sign-up forms. See Open Questions.

### 3. Missing shared component — button override and hand-rolled fields

`SubmitButton` renders `Button` and then sets `bg-purple-600`, `text-white`, and `hover:bg-purple-500` (`src/components/auth/SubmitButton.tsx:15-18`), while the default variant is `bg-primary text-primary-foreground` (`src/components/ui/button.tsx:12`). `Button` merges that `className` with `cn`, and `cn` calls `twMerge` (`src/components/ui/button.tsx:47`, `src/lib/utils.ts:1-6`). The class-variance-authority package source was not in the workspace search path, so this note does not claim which background utility wins after the merge. The user-facing effect is that the add control is not styled only by the shared variant.

Complexity is a raw `<select>` (`src/components/todos/WorkingList.tsx:109-128`). Deadline is a raw `datetime-local` input (`src/components/todos/WorkingList.tsx:130-160`) that copies the description field's red/purple error classes instead of using `FormField`. `src/components/ui/` has no Input, Select, Label, or Card. The add action and the two extra fields do not share one field component, so focus and error styling can diverge between description, complexity, and deadline.

### 4. Accidental architecture — unsigned body is raw text

`src/middleware.ts:18-19` returns `new Response("Not found", { status: 404 })` when `/todos` has no user. `src/middleware.ts:22-25` redirects an unsigned `/dashboard` visitor to `/auth/signin`. An unsigned visitor who opens `/todos` sees the plain text `Not found`, not a page.

**Taken by the plan.** Status stays 404, and `/todos` stays off `PROTECTED_ROUTES` (`context/changes/add-ordered-todo/plan.md:19`, `:23`, `:40`, `:47`). The plan replaces the raw body with a token-styled page. It does not redirect to sign-in. The earlier exclusion of a designed 404 page (`plan.md:35`) is reopened for this body only.

## Detailed Findings

### Token publication

`src/styles/global.css:1` imports Tailwind v4. `src/styles/global.css:4` defines `@custom-variant dark (&:is(.dark *));`, so a `dark:` utility matches an element that is a descendant of `.dark`. Values sit on `:root` and `.dark`. `@theme inline` points `--color-background` at `var(--background)` and the other role colours the same way (`src/styles/global.css:80-97`). `@layer base` applies `border-border` and `outline-ring/50` on `*` and `bg-background text-foreground` on `body` (`src/styles/global.css:117-123`). `components.json:6-10` points shadcn at that CSS file with `cssVariables: true` and `baseColor: "neutral"`.

The light `--primary` in force while `.dark` is absent is `oklch(0.205 0 0)` with a near-white foreground (`src/styles/global.css:14-15`). The dark `--background` is `oklch(0.145 0 0)` (`src/styles/global.css:42`). Putting `class="dark"` on a wrapper would inherit those variables to descendants. Nothing in `Layout.astro` does that today.

`bg-cosmic` is a separate `@utility` with hex stops `#0a0e1a` and `#0f1529` (`src/styles/global.css:113-115`). Class `bg-cosmic` appears on these six files: `src/pages/todos.astro:29`, `src/pages/dashboard.astro:8`, `src/pages/auth/signin.astro:9`, `src/pages/auth/signup.astro:9`, `src/pages/auth/confirm-email.astro:22`, `src/components/Welcome.astro:5`. This change's view is the todos file. The other five are out of scope unless a shared component edit reaches them.

### Todos render path

`src/pages/todos.astro:2-3` imports `Layout` and `WorkingList`. `Layout.astro:2` imports `global.css`. The page renders the shell and either the empty sentence or the `<ol>` (`src/pages/todos.astro:29-49`), then `<WorkingList client:load>` (`src/pages/todos.astro:51`). `WorkingList.tsx:3-5` imports `FormField`, `ServerError`, and `SubmitButton`. `SubmitButton.tsx:3` imports `Button`.

`POST /api/todos` redirects validation and insert failures to `/todos?error=` (`src/pages/api/todos.ts:31-43`) and an unsigned POST to `/todos` with no query (`src/pages/api/todos.ts:19-21`). The page reads `error` at `src/pages/todos.astro:10` and passes `formError ?? loadError` into the island (`src/pages/todos.astro:25`, `:51`). `ServerError` renders that string (`src/components/todos/WorkingList.tsx:164`, `src/components/auth/ServerError.tsx:8-14`).

### State matrix (current code, this path)

| State | On this path | Anchor |
| --- | --- | --- |
| default | Shell, list, and form render with the literals above | `src/pages/todos.astro:29-51` |
| hover | Submit sets `hover:bg-purple-500`. List rows, select, and inputs have no `hover:` class | `src/components/auth/SubmitButton.tsx:18`; `src/pages/todos.astro:40` |
| focus-visible | `Button` uses `focus-visible` and `ring`. The three fields use `focus:` and `focus:outline-none` | `src/components/ui/button.tsx:8`; `src/components/auth/FormField.tsx:6`; `src/components/todos/WorkingList.tsx:120`, `:149` |
| disabled | Submit sets `disabled` while `useFormStatus` is pending. Inputs and the select are not disabled | `src/components/auth/SubmitButton.tsx:12-17`; `src/components/ui/button.tsx:8` |
| error | Blank description and deadline are client-blocked. Server messages render in `ServerError`. The select has no error branch | `src/components/todos/WorkingList.tsx:84-94`, `:150-158`; `src/components/auth/FormField.tsx:53-61` |
| empty | When `loadError` is null and `todos.length === 0`, the page shows `No todos yet.` When `loadError` is set, that branch renders nothing | `src/pages/todos.astro:35-36` |
| loading | The list is awaited in the page before HTML. The submit control shows `Adding...` and a spinner while pending | `src/pages/todos.astro:15-20`; `src/components/auth/SubmitButton.tsx:20-23` |

### Agent rules

`AGENTS.md:37` says to merge classes with `cn()` and not concatenate class strings. `AGENTS.md:38` says shadcn components live in `src/components/ui/` (new-york) and to add missing ones with `npx shadcn@latest add [name]`. A full read of `AGENTS.md` found no line that tells an agent to use arbitrary values such as `w-[123px]` or palette colours. `.cursor/rules/` contains `10x-course.mdc` only; `10x-course.mdc:5-9` routes UI work on a rendered view through `/10x-ui` and the normal change chain. `context/foundation/lessons.md` is not in the repo.

## Code References

- `src/styles/global.css:6-38` — light role tokens on `:root`
- `src/styles/global.css:41-73` — dark overrides, unused while no ancestor has class `dark`
- `src/styles/global.css:75-110` — `@theme inline` aliases
- `src/styles/global.css:113-115` — `bg-cosmic` hex gradient
- `src/pages/todos.astro:29-51` — shell, empty copy, list, island
- `src/components/todos/WorkingList.tsx:98-168` — form, select, deadline, errors
- `src/components/auth/FormField.tsx:6-59` — shared description field
- `src/components/auth/SubmitButton.tsx:15-18` — `Button` plus palette classes
- `src/components/ui/button.tsx:8-19` — token-backed button variants
- `src/middleware.ts:18-25` — `/todos` 404 versus `/dashboard` redirect
- `src/pages/api/todos.ts:18-46` — POST redirects
- `components.json:3-10` — existing shadcn setup, `cssVariables: true`

## Architecture Insights

The contract variant in `context/changes/ui-tokens-onboarding/change.md:14` matches the code: tokens and one shared `Button` exist; this view uses literals. Making the view read the current `:root` values, without a `.dark` ancestor, uses the light neutral set (`--primary` near black, `--card` white) on a page whose shell is a dark hex gradient. That contrast is a planning input, not a second palette.

`src/components/ui/button.tsx:8` includes `focus-visible:ring-[3px]`. That arbitrary width is inside the shared button, not in `todos.astro`. This research does not treat it as a view charge.

## Historical Context (from prior changes)

- `context/changes/ui-tokens-onboarding/change.md:12-14` — **supported.** The view files exist and import each other. The token file has `:root`, `.dark`, and `@theme inline`. The view still uses literals, which is the gap that note names. `components.json` already exists, so "do not run `shadcn init`" matches the repo.
- `context/changes/add-ordered-todo/plan.md:19` — **supported.** Unsigned `GET /todos` is specified as 404, and `src/middleware.ts:18-19` returns that status.
- `context/changes/add-ordered-todo/plan.md:23` and `:47` — **supported.** `/todos` is not in `PROTECTED_ROUTES` (`src/middleware.ts:4`).
- `context/changes/add-ordered-todo/plan.md:35` — **supported.** No designed 404 page was found; the response body is the string `Not found`.
- `context/changes/add-ordered-todo/plan.md:9` — **partial.** The sentence "There is no todo table, no todo API, and no list UI" describes the state before that change. The list UI now exists at `src/pages/todos.astro`. The rest of that plan's end state (add, order, private list) is outside this token question and was not re-audited here.
- `context/changes/add-ordered-todo/reviews/impl-review.md:49` — **supported as a scope warning.** That review says the plan's page work was `/todos` only, after homepage copy landed in `Welcome.astro`. It is a precedent against ride-along edits, not a token decision.
- `context/archive/` — **not applicable.** A search of archive `change.md`, `plan.md`, and `research.md` files found no design-token assertions. Those files are deployment and bootstrap notes.

## Related Research

No `research.md` under `context/changes/` or `context/archive/` other than this file. Searched both trees before writing.

## Open Questions

Resolved during planning on 2026-10-17. Recorded here so this note no longer reads as undecided.

1. **Shared auth widgets.** The plan restyles `FormField`, `SubmitButton`, and `ServerError`. Sign-in and sign-up pick up that restyle. Their page shells stay on `bg-cosmic`. `PasswordToggle` changes with the field because the icon is drawn inside the input.
2. **Shell colour.** `/todos` uses the light `:root` surface and drops `bg-cosmic`. `.dark` is not applied. The other five `bg-cosmic` files stay as they are.
3. **Charge 4 body.** The plan serves a token-styled page at status 404. `/todos` stays off `PROTECTED_ROUTES`.
