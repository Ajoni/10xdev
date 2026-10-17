# Todos tokens Implementation Plan

## Overview

Make the signed-in `/todos` view read the light shadcn tokens already in `src/styles/global.css`. Restyle the shared field, submit button, and server error so sign-in and sign-up pick up the same components. Replace the raw unsigned `Not found` text with a token-styled page that still returns status 404.

## Current State Analysis

`src/styles/global.css` holds light role tokens on `:root` and dark overrides on `.dark`, published through `@theme inline`. `src/layouts/Layout.astro` does not set `dark`, so the light set is the one in force. `bg-primary` is used by `src/components/ui/button.tsx`. The todos page does not use those classes. Its shell uses `bg-cosmic`, a hex gradient also used by the dashboard, the auth pages, and the homepage.

`src/components/ui/` contains `button.tsx` and `LibBadge.astro`. `WorkingList` builds complexity and deadline from raw elements and uses `FormField`, `SubmitButton`, and `ServerError`. Those three are also imported by `SignInForm` and `SignUpForm`. `SubmitButton` passes palette classes into `Button`. Field focus uses `focus:outline-none` and a purple or red ring.

An unsigned `GET /todos` returns status 404 and the text `Not found` (`src/middleware.ts:18-19`). `/todos` is not on `PROTECTED_ROUTES`. `scripts/smoke.mjs` expects that status and does not read the body. `package.json` has no Playwright dependency.

## Desired End State

A signed-in person opens `/todos` and sees a light page: page background, card, list, empty line, fields, button, and errors all come from role tokens. Keyboard focus on each control uses the ring token. A blank description or deadline, and a server error, use the destructive token. The empty list says `No todos yet.` The submit control shows a pending label and a disabled button while the post is in flight.

Sign-in and sign-up keep their cosmic page shells. Their fields, submit button, and server error use the same token-backed components, on opaque surfaces so the text stays readable on that dark shell.

An unsigned visit to `/todos` still returns status 404, still does not redirect to sign-in, and shows a short token-styled page instead of the plain text `Not found`.

A kitchen-sink page shows the todos states side by side. `AGENTS.md` tells the next agent where the tokens and components live.

### Key Discoveries:

- Light `--primary` is `oklch(0.205 0 0)` and `--card` is white (`src/styles/global.css:10-15`). Putting those text colors on a transparent field over `bg-cosmic` would make the auth forms unreadable.
- The add form is a classic `POST` to `/api/todos` (`src/components/todos/WorkingList.tsx:98`). Complexity is submitted by a named control. A Select that does not post `name="complexity"` would drop the value.
- The `/todos` guard matches every path that starts with `/todos` (`src/middleware.ts:18`). A not-found page under that prefix would call the guard again.
- `scripts/smoke.mjs` asserts status 404 for unsigned `GET /todos` and does not assert the body text.
- `context/foundation/lessons.md` is absent. No roadmap item uses this change id.

## What We're NOT Doing

- A second palette, a retint of `--primary`, or `shadcn init`.
- Setting `dark` on `<html>` or on any page shell.
- Removing `bg-cosmic` from the dashboard, the auth pages, or the homepage.
- Restyling auth page shells, auth links, or the sign-up hint that sits on the cosmic card.
- Adding `/todos` to `PROTECTED_ROUTES`, or redirecting an unsigned visitor to sign-in.
- Changing the 404 status.
- Installing Playwright or a new lint package.
- Editing `focus-visible:ring-[3px]` inside `src/components/ui/button.tsx`.
- Changing todo ordering, validation, or the date-time rule.
- A list-loading spinner. The page awaits the list before it sends HTML.

## Implementation Approach

Follow the approved order: add the missing shadcn components, record the existing token values without changing them, restyle `/todos` and the shared widgets, then cover states and the unsigned page, then write the agent rule.

`/todos` drops `bg-cosmic` and uses `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, and `border-border`. The shared widgets use those same roles on opaque surfaces, so they also work on the cosmic auth shells. The add button uses the default `Button` variant and drops the purple override.

The unsigned page lives outside the `/todos` prefix. Middleware still returns status 404 for an unsigned `GET /todos` and serves that page's HTML. The kitchen sink lives at `src/pages/dev/todo-states.astro`, also outside `/todos`, and is not added to navigation.

## Critical Implementation Details

- **User experience spec.** Fields, the submit button, and the server error use opaque role surfaces (`bg-background` or `bg-card`, `text-foreground`, `border-border`, `bg-primary`, `text-destructive`). Do not leave `text-foreground` on a transparent field over `bg-cosmic`. `PasswordToggle` is drawn inside the input, so its icon uses `text-muted-foreground` even though the rest of the auth page stays cosmic. Remove `[color-scheme:dark]` from the deadline input so the native picker follows the light page.
- **Timing & lifecycle.** The form still posts `description`, `complexity`, and `deadline` without a script on the success path. If the added Select does not render a control named `complexity`, keep a hidden input bound to the same React state. The not-found route must not start with `/todos`. Copy the rewritten page body and set status 404 on that response. A direct visit to the not-found route may return 200. Only unsigned `/todos` is required to return 404.

## Phase 1: Library

### Overview

Add the shared components this form and shell use. The existing `Button` stays the only button.

### Changes Required:

#### 1. shadcn components

**File**: `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/select.tsx`, `src/components/ui/card.tsx`

**Intent**: Add Input, Label, Select, and Card through the project's existing shadcn setup so the todos form and shell can import them.

**Contract**: Run `npx shadcn@latest add input label select card`. Do not run `shadcn init`. Do not add a second button. Leave `components.json` aliases as they are. The new files live under `src/components/ui/`.

### Success Criteria:

#### Automated Verification:

- `src/components/ui/input.tsx`, `label.tsx`, `select.tsx`, and `card.tsx` exist
- `npm run lint` passes

#### Manual Verification:

- `src/components/ui/button.tsx` is still the only button component

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Token values

### Overview

Record the live light tokens this change uses. Do not edit the values.

### Changes Required:

#### 1. Token record

**File**: `context/changes/ui-tokens-onboarding/token-values.md`

**Intent**: Deposit the role values the view will read, with a line naming the source file, so a later session does not invent a palette.

**Contract**: The file names `src/styles/global.css` as the source and lists the current `:root` values for `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--muted-foreground`, `--destructive`, `--border`, `--input`, and `--ring`. Do not change those values in `src/styles/global.css`. Do not add a `.dark` class anywhere. Leave the `bg-cosmic` utility in place.

### Success Criteria:

#### Automated Verification:

- `context/changes/ui-tokens-onboarding/token-values.md` names `src/styles/global.css` as the source and lists the existing `:root` roles this change uses
- `src/styles/global.css` `:root` values for `--background`, `--foreground`, `--card`, `--primary`, `--destructive`, `--border`, and `--ring` are unchanged

#### Manual Verification:

- No second palette and no `shadcn init` were added

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Todos view and shared widgets

### Overview

Point `/todos` and the shared auth widgets at the components and the light tokens. Auth page shells stay cosmic.

### Changes Required:

#### 1. Todos shell and list

**File**: `src/pages/todos.astro`

**Intent**: A signed-in list reads role tokens, including the empty sentence and each row.

**Contract**: Remove `bg-cosmic` from this page. The page uses `bg-background`. The panel uses `Card`. The title uses `text-foreground`. The empty sentence and the complexity and deadline lines use `text-muted-foreground`. Rows use `border-border`. When `loadError` is set, the empty sentence and the list still render nothing, and the error still reaches `WorkingList`. Do not change deadline ordering or the local-clock update.

#### 2. Shared field, button, and error

**File**: `src/components/auth/FormField.tsx`, `src/components/auth/SubmitButton.tsx`, `src/components/auth/ServerError.tsx`, `src/components/auth/PasswordToggle.tsx`

**Intent**: The three shared widgets, and the icon inside the field, use role tokens so `/todos`, sign-in, and sign-up share one field and one button.

**Contract**: `FormField` uses `Label` and `Input`. Focus uses `focus-visible` and `ring-ring`, not `focus:outline-none` with a purple ring. Errors use `text-destructive` and `border-destructive`. `SubmitButton` keeps `useFormStatus` and the pending label, and it does not pass palette classes that override `bg-primary`. `ServerError` uses `text-destructive` on `bg-card` with `border-destructive`. There is no `--destructive-foreground` token, and `text-white` would fail the scan of this file. `PasswordToggle` uses `text-muted-foreground`. Do not edit `src/pages/auth/signin.astro` or `src/pages/auth/signup.astro`.

#### 3. Complexity and deadline

**File**: `src/components/todos/WorkingList.tsx`

**Intent**: Complexity and deadline use the same field treatment as description, and the post body stays intact.

**Contract**: Both controls use `Label`. Deadline uses `Input` with `type="datetime-local"`. Complexity uses `Select` if that component submits `name="complexity"`; otherwise the visible control updates React state and a hidden input named `complexity` submits it. Client validation, the UTC hidden deadline, and the local-clock effect stay as they are. Remove `[color-scheme:dark]`.

### Success Criteria:

#### Automated Verification:

- The hardcoded-value scan on `src/pages/todos.astro`, `src/components/todos/WorkingList.tsx`, `src/components/auth/FormField.tsx`, `src/components/auth/SubmitButton.tsx`, `src/components/auth/ServerError.tsx`, and `src/components/auth/PasswordToggle.tsx` reports no matches
- `npm run lint` passes

#### Manual Verification:

- A signed-in `/todos` page uses the light background, and the list, empty line, and form use role tokens
- Sign-in and sign-up still use `bg-cosmic` on the page shell, and their fields, button, and error stay readable
- Adding a todo still submits description, complexity, and deadline, and a blank description or deadline shows an error

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: States and unsigned entry

### Overview

Show the seven states for this view, and serve a token-styled body for the unsigned 404.

### Changes Required:

#### 1. Kitchen sink

**File**: `src/pages/dev/todo-states.astro`

**Intent**: One page shows the todos presentation in the states that apply, for review screenshots at desktop and one mobile width.

**Contract**: The route is `/dev/todo-states`, not under `/todos`, and it is not linked from the app nav. It renders the same card, list row, empty line, field, and submit button used on `/todos`. Shown states: default, hover, focus-visible, submit disabled, error, empty, and submit loading. Field disabled is N/A: the product does not disable description, complexity, or deadline. List loading is N/A: the page awaits `listTodos` before HTML. The sink does not post to `/api/todos`.

#### 2. Unsigned page

**File**: `src/pages/not-found.astro`, `src/middleware.ts`

**Intent**: An unsigned visitor who opens `/todos` sees a token-styled page, and the response status stays 404.

**Contract**: `src/pages/not-found.astro` uses `Layout` and the same card and foreground tokens as `/todos`, with the text `Not found` and a link to `/auth/signin`. Its route does not start with `/todos`. For an unsigned request whose path starts with `/todos`, middleware rewrites to that page and returns the body with status 404. `/todos` stays off `PROTECTED_ROUTES`. Do not change the smoke test's expected status.

```ts
const rewritten = await context.rewrite("/not-found");
return new Response(rewritten.body, { status: 404, headers: rewritten.headers });
```

### Success Criteria:

#### Automated Verification:

- `src/pages/dev/todo-states.astro` exists and is not under the `/todos` path
- `npm run lint` passes
- `scripts/smoke.mjs` still expects unsigned `GET /todos` to return status 404

#### Manual Verification:

- The kitchen sink shows default, hover, focus-visible, error, empty, and submit loading and disabled; field disabled and list loading are marked N/A with the reasons in this phase
- Desktop and one mobile width both show that sink
- An unsigned visit to `/todos` shows the token-styled page and the HTTP status is 404

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Guard

### Overview

Tell the next agent where the tokens and components live.

### Changes Required:

#### 1. Agent rule

**File**: `AGENTS.md`

**Intent**: The next change uses the token file and `src/components/ui/` instead of palette classes.

**Contract**: Add a short UI block to `AGENTS.md`. Do not edit `.cursor/rules/10x-course.mdc`, and do not put the block inside a `10x-cli` marker. The block names `src/styles/global.css` as the token source, names `src/components/ui/` as the component directory, says to check that directory before creating a component and to add missing ones with `npx shadcn@latest add [name]`, forbids literal colours, palette classes, and arbitrary values in views, and names `src/pages/dev/todo-states.astro` as the kitchen sink. Do not add a lint package.

### Success Criteria:

#### Automated Verification:

- `AGENTS.md` has a UI block outside any `10x-cli` marker that names `src/styles/global.css`, `src/components/ui/`, `npx shadcn@latest add`, forbids literal colours and palette classes in views, and names `src/pages/dev/todo-states.astro`
- No new lint package was added to `package.json`

#### Manual Verification:

- `.cursor/rules/10x-course.mdc` is unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new unit-test runner. The form post contract is covered by the existing smoke status checks plus the manual add-todo check.

### Integration Tests:

- `scripts/smoke.mjs` still expects unsigned `GET /todos` to return status 404. Run it against a local server when phase 4 is verified.

### Manual Testing Steps:

1. Sign in, open `/todos` with no rows, and confirm the light page and the empty sentence.
2. Submit a blank description and a blank deadline, then submit a valid todo, and confirm the row appears and the button shows the pending state.
3. Open sign-in and sign-up and confirm the cosmic shell, readable fields, and a readable password icon.
4. Open `/todos` signed out and confirm the token-styled page and status 404.
5. Open `/dev/todo-states` at a desktop width and one mobile width.

## Performance Considerations

This change is markup and CSS. It does not add queries, change the todo payload, or change list ordering.

## Migration Notes

No data migration. Sign-in and sign-up change appearance only where they render `FormField`, `SubmitButton`, `ServerError`, or `PasswordToggle`. Their page shells stay on `bg-cosmic`.

## References

- Related research: `context/changes/ui-tokens-onboarding/research.md`
- Prior 404 rule: `context/changes/add-ordered-todo/plan.md`
- Token source: `src/styles/global.css:6-38`
- Unsigned guard: `src/middleware.ts:18-19`
- Shared widgets: `src/components/auth/FormField.tsx`, `src/components/auth/SubmitButton.tsx`, `src/components/auth/ServerError.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Library

#### Automated

- [x] 1.1 `src/components/ui/input.tsx`, `label.tsx`, `select.tsx`, and `card.tsx` exist — 970f939
- [x] 1.2 `npm run lint` passes — 970f939

#### Manual

- [x] 1.3 `src/components/ui/button.tsx` is still the only button component — 970f939

### Phase 2: Token values

#### Automated

- [x] 2.1 `context/changes/ui-tokens-onboarding/token-values.md` names `src/styles/global.css` as the source and lists the existing `:root` roles this change uses — 49a8cc3
- [x] 2.2 `src/styles/global.css` `:root` values for `--background`, `--foreground`, `--card`, `--primary`, `--destructive`, `--border`, and `--ring` are unchanged — 49a8cc3

#### Manual

- [x] 2.3 No second palette and no `shadcn init` were added — 49a8cc3

### Phase 3: Todos view and shared widgets

#### Automated

- [x] 3.1 The hardcoded-value scan on `src/pages/todos.astro`, `src/components/todos/WorkingList.tsx`, `src/components/auth/FormField.tsx`, `src/components/auth/SubmitButton.tsx`, `src/components/auth/ServerError.tsx`, and `src/components/auth/PasswordToggle.tsx` reports no matches — cae2c75
- [x] 3.2 `npm run lint` passes — cae2c75

#### Manual

- [x] 3.3 A signed-in `/todos` page uses the light background, and the list, empty line, and form use role tokens — cae2c75
- [x] 3.4 Sign-in and sign-up still use `bg-cosmic` on the page shell, and their fields, button, and error stay readable — cae2c75
- [x] 3.5 Adding a todo still submits description, complexity, and deadline, and a blank description or deadline shows an error — cae2c75

### Phase 4: States and unsigned entry

#### Automated

- [x] 4.1 `src/pages/dev/todo-states.astro` exists and is not under the `/todos` path — 979018f
- [x] 4.2 `npm run lint` passes — 979018f
- [x] 4.3 `scripts/smoke.mjs` still expects unsigned `GET /todos` to return status 404 — 979018f

#### Manual

- [x] 4.4 The kitchen sink shows default, hover, focus-visible, error, empty, and submit loading and disabled; field disabled and list loading are marked N/A with the reasons in this phase — 979018f
- [x] 4.5 Desktop and one mobile width both show that sink — 979018f
- [x] 4.6 An unsigned visit to `/todos` shows the token-styled page and the HTTP status is 404 — 979018f

### Phase 5: Guard

#### Automated

- [x] 5.1 `AGENTS.md` has a UI block outside any `10x-cli` marker that names `src/styles/global.css`, `src/components/ui/`, `npx shadcn@latest add`, forbids literal colours and palette classes in views, and names `src/pages/dev/todo-states.astro` — 7706ef6
- [x] 5.2 No new lint package was added to `package.json` — 7706ef6

#### Manual

- [x] 5.3 `.cursor/rules/10x-course.mdc` is unchanged — 7706ef6
