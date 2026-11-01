# Remove Dashboard And Align Navigation Implementation Plan

## Overview

Remove the dashboard stub, send a signed-in person from the home top bar to their todo list, and put Home and Sign out on that list. Then restyle the home page and the auth shells onto the same light role tokens `/todos` already uses, so the public pages match the list.

## Current State Analysis

`/dashboard` is a signed-in stub. `PROTECTED_ROUTES` is `["/dashboard"]` (`src/middleware.ts:4`), and an unsigned visit is redirected to `/auth/signin` (`src/middleware.ts:23-26`). The page itself is `src/pages/dashboard.astro`. The product list is `/todos`. Sign-in already redirects there (`src/pages/api/auth/signin.ts`). An unsigned `/todos` visit is rewritten to `/not-found` with status 404 (`src/middleware.ts:18-21`). That not-found page is a token-styled card whose only action is Sign in (`src/pages/not-found.astro`).

The home page is `src/pages/index.astro` rendering `Welcome.astro`. `Topbar.astro` is the only home control that branches on `Astro.locals.user`. When someone is signed in it shows their email, a link labeled Dashboard pointing at `/dashboard`, and a POST form to `/api/auth/signout` (`src/components/Topbar.astro:6-17`). The hero always shows Sign in and Sign up (`src/components/Welcome.astro:28-40`). Nothing in `src/` links to `/todos`.

`src/pages/todos.astro` is a token-styled card with the list and the add form. It has no Home control and no sign-out control. Sign-out already clears the session and redirects to `/` (`src/pages/api/auth/signout.ts`).

`scripts/smoke.mjs` expects unsigned `/dashboard` to be 302 to `/auth/signin` (line 166), signed-in `/dashboard` to be 200 (line 348), and post-sign-out `/dashboard` to be 302 to `/auth/signin` (line 350). Requests use `redirect: "manual"` (line 83), so the status and `Location` are the first response.

The light role tokens live in `src/styles/global.css`. `/todos` and `/not-found` use `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `Card`, and `buttonVariants`. The home page, the top bar, and the auth shells still use `bg-cosmic` and literal purple and blue classes. `ui-tokens-onboarding` left those shells dark on purpose. There is no `src/pages/404.astro`. `context/foundation/roadmap.md` has no `ui-cleanup` item. `context/foundation/lessons.md` is absent.

## Desired End State

A visit to `/dashboard` returns status 404 for an anonymous person, a signed-in person, and a person who just signed out. The body is not the dashboard card. `/todos` is unchanged as a gate: unsigned visits still return 404 through the existing not-found rewrite.

A signed-in person on `/` sees Todos in the top bar, next to their email and Sign out. That link opens `/todos`. The hero still shows Sign in and Sign up. An anonymous home page has no todos link and no dashboard link.

The todos page uses that same `Topbar` above the card. On `/todos` the signed-in link says Home and opens `/`. The email and Sign out stay. Sign out posts to `/api/auth/signout` and lands on `/`.

Home, the top bar, sign-in, sign-up, and confirm-email use the same light tokens as `/todos`. The words on those pages stay the same. `npm run smoke` passes against a running server.

### Key Discoveries:

- The dashboard redirect and the page are separate. Deleting `dashboard.astro` while leaving `PROTECTED_ROUTES` keeps the unsigned 302 (`src/middleware.ts:4`, `src/middleware.ts:23-26`).
- `/not-found` is a real route used as the unsigned-list body. A direct visit is not the dashboard contract. The list rewrite must stay status 404 (`src/middleware.ts:18-21`).
- `buttonVariants({ variant: "outline", size: "sm" })` is already how Edit and Done are drawn (`src/pages/todos.astro:52`, `src/pages/todos.astro:58`).
- Smoke can see response bodies and does not follow redirects (`scripts/smoke.mjs:80-93`, `scripts/smoke.mjs:113-117`).
- The hero and the top bar are the two home surfaces. Only the top bar knows whether someone is signed in (`src/components/Topbar.astro:2`).

## What We're NOT Doing

- Redirecting `/dashboard` to `/todos`, `/`, or `/auth/signin`.
- Serving the unsigned-list not-found card for `/dashboard`.
- Adding `/todos` to a redirect-protected list, or changing the unsigned `/todos` 404.
- Hiding the hero Sign in and Sign up links when someone is signed in.
- Changing the sign-in destination or the sign-out destination.
- Changing todo create, edit, done, ordering, or validation.
- Changing token values, enabling dark mode, or running `shadcn init`.
- Restyling `src/components/ui/LibBadge.astro`. It is not rendered.
- Adding `src/pages/dev/todo-states.astro` to navigation.

## Implementation Approach

Remove the dashboard page and its middleware redirect together, then point smoke at status 404. Replace the signed-in top-bar Dashboard anchor with Todos. Mount that same top bar on the todos page, with Home in place of Todos. Sign out stays a POST to the existing endpoint. Last, move the home page, the top bar, and the three auth shells onto the light role classes `/todos` already uses, and delete the unused `bg-cosmic` utility.

## Critical Implementation Details

- **User experience spec.** The only home link to `/todos` is the signed-in top-bar anchor, labeled `Todos`. The hero anchors stay `/auth/signin` and `/auth/signup` for every visitor. The todos page mounts the same `Topbar`. There the signed-in anchor says `Home` and its href is `/`. The email and the sign-out form stay. Sign out is a `POST` form whose action is `/api/auth/signout`. Phase 4 changes color and decoration only, and keeps this path-dependent label. Visible strings that stay: `Work slop`, the hero paragraph, `Sign in`, `Sign up`, `Not signed in`, the email, `Todos`, `Home`, `Sign out`, the auth headings, both confirm-email copy branches, and the cross-links between sign-in and sign-up.
- **Timing & lifecycle.** `PROTECTED_ROUTES` contains only `/dashboard`. The redirect branch has to leave in the same phase as the page file. Leaving it keeps an unsigned 302, which smoke will still see because requests use `redirect: "manual"`. Do not rewrite `/dashboard` to `/not-found`. There is no `src/pages/404.astro`. `GET /dashboard` itself must return status 404, and the body must not contain the old dashboard heading or the sentence about authenticated users.

## Phase 1: Remove the dashboard route

### Overview

Delete the dashboard page and the redirect that still protects it. Anonymous, signed-in, and post-sign-out visits to `/dashboard` return status 404. The route docs stop describing that page.

### Changes Required:

#### 1. Dashboard page

**File**: `src/pages/dashboard.astro`

**Intent**: Remove the stub so the route is no longer a page.

**Contract**: The file is gone. No replacement page is added under `src/pages/`.

#### 2. Middleware gate

**File**: `src/middleware.ts`

**Intent**: Stop sending `/dashboard` to sign-in so every visit can miss the route.

**Contract**: `PROTECTED_ROUTES` and its redirect branch are removed. The `/todos` unsigned rewrite stays: status 404, body from `/not-found`, no redirect to sign-in. `context.locals.user` is still set for later pages.

#### 3. Smoke expectations

**File**: `scripts/smoke.mjs`

**Intent**: Make the existing dashboard steps prove the route is gone.

**Contract**: The anonymous step, the signed-in step, and the post-sign-out step each expect status 404. Each body excludes `Dashboard` and `authenticated users`. None of them expect a redirect to `/auth/signin`. The unsigned `/todos` 404 step stays as it is.

#### 4. Route docs

**File**: `AGENTS.md`, `README.md`

**Intent**: Stop telling the next reader to protect or open a dashboard page.

**Contract**: The Auth flow section in `AGENTS.md` describes the `/todos` 404 rewrite and no longer lists `PROTECTED_ROUTES` or `src/pages/dashboard.astro`. The README auth-route table no longer has a `/dashboard` row, and it no longer says to add paths to `PROTECTED_ROUTES`.

### Success Criteria:

#### Automated Verification:

- `src/pages/dashboard.astro` is absent
- `src/middleware.ts` has no `/dashboard` entry and does not redirect that path to `/auth/signin`
- `npm run lint` passes
- `npm run smoke` passes, and anonymous, signed-in, and post-sign-out `GET /dashboard` each return status 404 with a body that excludes `Dashboard` and `authenticated users`

#### Manual Verification:

- Signed in and signed out, opening `/dashboard` shows no dashboard card

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Link signed-in home to todos

### Overview

The signed-in top bar points at the todo list. The hero is unchanged. An anonymous home page still has no todos link.

### Changes Required:

#### 1. Top-bar anchor

**File**: `src/components/Topbar.astro`

**Intent**: Give a signed-in person a way to their list from home.

**Contract**: In the signed-in branch, the anchor's href is `/todos` and its text is `Todos`. The email and the sign-out form stay. The signed-out branch stays Sign in and Sign up. The hero in `Welcome.astro` is not given a `/todos` link in this phase.

#### 2. Home smoke checks

**File**: `scripts/smoke.mjs`

**Intent**: Lock the link to the signed-in home response.

**Contract**: Anonymous `GET /` stays status 200 and excludes `href="/todos"` and `href="/dashboard"`. A signed-in `GET /`, after the existing successful sign-in step, is status 200 and includes `href="/todos"` and `Todos`, and excludes `href="/dashboard"`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run smoke` passes: anonymous `GET /` is 200 and excludes `href="/todos"` and `href="/dashboard"`; signed-in `GET /` is 200 and includes `href="/todos"` and `Todos`, and excludes `href="/dashboard"`

#### Manual Verification:

- A signed-in home top bar shows the email, Todos, and Sign out, and Todos opens `/todos`
- The hero still shows Sign in and Sign up

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Add home and sign-out on the todos view

### Overview

The todos page mounts the home `Topbar` above the card. On `/todos` that bar's signed-in link says Home. The email and Sign out stay. The sign-out endpoint is unchanged.

**Placement note (2026-11-01):** These controls were first inside the card, then in a separate bar. They now use `src/components/Topbar.astro`, the same bar as the home page, at the user's request. On `/` the link says Todos. On `/todos` it says Home. Progress rows 3.3 and 3.4 keep their original titles.

### Changes Required:

#### 1. Card controls

**File**: `src/pages/todos.astro`, `src/components/Topbar.astro`

**Intent**: Let a signed-in person leave the list for home or end the session from the list, using the home top bar.

**Contract**: `todos.astro` renders `Topbar` above the `Card`. `Topbar` is the same component the home page uses. When the path starts with `/todos`, the signed-in anchor's href is `/` and its text is `Home`. Otherwise that anchor's href is `/todos` and its text is `Todos`. The email and the sign-out form stay. The form is `method="POST"` and `action="/api/auth/signout"`. List loading, edit, and done stay as they are.

#### 2. List smoke checks

**File**: `scripts/smoke.mjs`

**Intent**: Prove the controls are on the signed-in list HTML and that sign-out still returns home.

**Contract**: The existing signed-in list step `todos list in deadline, complexity, and age order` also includes `Home`, `href="/"`, `Sign out`, and `action="/api/auth/signout"`. The existing `signout clears session` step still expects status 302 and location `/`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run smoke` passes: a signed-in `GET /todos` includes `Home`, `href="/"`, `Sign out`, and `action="/api/auth/signout"`, and `POST /api/auth/signout` returns 302 to `/`

#### Manual Verification:

- Home in the todos top bar opens `/`
- Sign out in the todos top bar ends the session and opens `/`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Restyle the landing and auth shells

### Overview

The home page, the top bar, and the auth shells drop the cosmic decoration and use the light role tokens already on `/todos`. Copy and routes stay.

### Changes Required:

#### 1. Landing

**File**: `src/components/Welcome.astro`, `src/components/Topbar.astro`

**Intent**: Make the public home page the same light surface as the list.

**Contract**: Remove the orbs, the star-field element, `bg-cosmic`, gradient title classes, and literal purple, blue, pink, and white-alpha classes. The page shell uses `bg-background`. The title uses `text-foreground`. The paragraph uses `text-muted-foreground`. The Sign in anchor uses `buttonVariants()` and the Sign up anchor uses `buttonVariants({ variant: "outline" })`, both from `src/components/ui/button`. The top bar uses `border-border`, `bg-card`, `text-foreground`, and `text-muted-foreground`. The signed-in anchor stays path-dependent: `Todos` and `/todos` on `/`, `Home` and `/` on `/todos`. The hero's Sign in and Sign up stay for every visitor.

#### 2. Auth shells

**File**: `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, `src/pages/auth/confirm-email.astro`, `src/components/auth/SignUpForm.tsx`

**Intent**: Bring the remaining public pages onto that same surface so sign-in is not a dark exception.

**Contract**: Each auth page shell follows `src/pages/not-found.astro`: `bg-background`, a `Card`, a `text-foreground` heading, and a `text-foreground` underline link. Drop `bg-cosmic`, the glass panel, and gradient headings. Headings, confirm-email emoji, both confirm-email copy branches, and the sign-in/sign-up cross-links stay. In `SignUpForm.tsx`, the password-length hint uses `text-muted-foreground`. Form fields, validation, and post actions stay.

#### 3. Cosmic utility

**File**: `src/styles/global.css`

**Intent**: Remove the dark landing background once nothing uses it.

**Contract**: The `@utility bg-cosmic` block is deleted. Other custom properties and the `body` role classes stay. `dark` is not added to `Layout.astro`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `Welcome.astro`, `Topbar.astro`, `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, `src/pages/auth/confirm-email.astro`, and `src/components/auth/SignUpForm.tsx` contain none of `bg-cosmic`, `text-purple-`, `text-blue-`, `bg-purple-`, `from-blue-`, or `from-pink-`
- `src/styles/global.css` does not define `bg-cosmic`
- `npm run smoke` passes

#### Manual Verification:

- Home, sign-in, sign-up, and confirm-email use the light page background, foreground text, and the card and button treatment already on `/todos`
- The home title is still "Work slop" and the hero paragraph is unchanged
- Sign in still opens `/auth/signin` and Sign up still opens `/auth/signup`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new unit tests. `src/lib/todos.test.ts` covers complexity guessing and does not render these pages.

### Integration Tests:

- `npm run smoke` against a running server (`BASE_URL`, default `http://localhost:4321`) with local Supabase. Phase 1 replaces the three dashboard expectations with status 404. Phase 2 adds the anonymous and signed-in home link checks. Phase 3 adds the list-control strings to the existing ordered-list step and keeps the sign-out redirect. Phase 4 keeps those steps passing after the class change.

### Manual Testing Steps:

1. Signed out, open `/`, `/dashboard`, `/auth/signin`, and `/auth/signup`.
2. Sign in. Confirm the top bar Todos link opens `/todos`, and that the hero still shows Sign in and Sign up.
3. On `/todos`, use Home, then sign in again if needed and use Sign out.
4. Open `/dashboard` while signed in and again after signing out.
5. Compare home and the auth pages with `/todos` for the light background, card, and buttons. Read the hero title and paragraph.

## Performance Considerations

These are server-rendered class and route changes. No new queries, clients, or caches.

## Migration Notes

No database change. A bookmarked `/dashboard` returns 404. There is no compatibility redirect.

## References

- Change notes: `context/changes/ui-cleanup/change.md`
- Token source this phase follows: `context/changes/ui-tokens-onboarding/plan.md`
- Middleware gates: `src/middleware.ts:4`, `src/middleware.ts:18-26`
- Signed-in home chrome: `src/components/Topbar.astro:6-17`
- Hero links: `src/components/Welcome.astro:28-40`
- Todos card: `src/pages/todos.astro:32-58`
- Sign-out redirect: `src/pages/api/auth/signout.ts`
- Smoke dashboard steps: `scripts/smoke.mjs:166`, `scripts/smoke.mjs:348`, `scripts/smoke.mjs:350`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Remove the dashboard route

#### Automated

- [x] 1.1 `src/pages/dashboard.astro` is absent — bed68a7
- [x] 1.2 `src/middleware.ts` has no `/dashboard` entry and does not redirect that path to `/auth/signin` — bed68a7
- [x] 1.3 `npm run lint` passes — bed68a7
- [x] 1.4 `npm run smoke` passes, and anonymous, signed-in, and post-sign-out `GET /dashboard` each return status 404 with a body that excludes `Dashboard` and `authenticated users` — bed68a7

#### Manual

- [x] 1.5 Signed in and signed out, opening `/dashboard` shows no dashboard card — bed68a7

### Phase 2: Link signed-in home to todos

#### Automated

- [x] 2.1 `npm run lint` passes — c841f43
- [x] 2.2 `npm run smoke` passes: anonymous `GET /` is 200 and excludes `href="/todos"` and `href="/dashboard"`; signed-in `GET /` is 200 and includes `href="/todos"` and `Todos`, and excludes `href="/dashboard"` — c841f43

#### Manual

- [x] 2.3 A signed-in home top bar shows the email, Todos, and Sign out, and Todos opens `/todos` — c841f43
- [x] 2.4 The hero still shows Sign in and Sign up — c841f43

### Phase 3: Add home and sign-out on the todos view

#### Automated

- [x] 3.1 `npm run lint` passes — fac5a2d
- [x] 3.2 `npm run smoke` passes: a signed-in `GET /todos` includes `Home`, `href="/"`, `Sign out`, and `action="/api/auth/signout"`, and `POST /api/auth/signout` returns 302 to `/` — fac5a2d

#### Manual

- [x] 3.3 Home on the todos card opens `/` — fac5a2d
- [x] 3.4 Sign out on the todos card ends the session and opens `/` — fac5a2d

### Phase 4: Restyle the landing and auth shells

#### Automated

- [x] 4.1 `npm run lint` passes
- [x] 4.2 `Welcome.astro`, `Topbar.astro`, `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, `src/pages/auth/confirm-email.astro`, and `src/components/auth/SignUpForm.tsx` contain none of `bg-cosmic`, `text-purple-`, `text-blue-`, `bg-purple-`, `from-blue-`, or `from-pink-`
- [x] 4.3 `src/styles/global.css` does not define `bg-cosmic`
- [x] 4.4 `npm run smoke` passes

#### Manual

- [x] 4.5 Home, sign-in, sign-up, and confirm-email use the light page background, foreground text, and the card and button treatment already on `/todos`
- [x] 4.6 The home title is still "Work slop" and the hero paragraph is unchanged
- [x] 4.7 Sign in still opens `/auth/signin` and Sign up still opens `/auth/signup`
