# Remove Dashboard And Align Navigation — Plan Brief

> Full plan: `context/changes/ui-cleanup/plan.md`

## What & Why

The dashboard is a leftover stub. The working list already lives at `/todos`, and sign-in already lands there, but a signed-in person on the home page is sent to the stub and cannot reach the list from the page. The list itself has no way home and no sign-out. The home page and the auth shells are still on the cosmic dark background, while the list uses the light role tokens.

## Starting Point

`/dashboard` redirects anonymous visitors to sign-in and renders a short card for a signed-in person. The home top bar links that person to `/dashboard` and can sign them out. The hero always offers Sign in and Sign up. `/todos` is the private list, with an unsigned visit returning 404. Smoke still expects the dashboard redirect and the signed-in 200.

## Desired End State

`/dashboard` is gone and returns status 404 for everyone. A signed-in home top bar links to `/todos`; the hero still offers Sign in and Sign up. The todos page mounts that same top bar. On the list it shows the email, Home, and Sign out. Home, the top bar, sign-in, sign-up, and confirm-email use the same light tokens as the list, with the same words as today.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| `/dashboard` after removal | Status 404 for anonymous, signed-in, and post-sign-out visits | The page is removed, so a bookmark is a missing route. |
| Not-found card | Stays the unsigned `/todos` response only | That card always offers Sign in, which is the list gate. |
| Signed-in todos link | Top-bar anchor labeled Todos | The top bar is the home control that already changes when someone is signed in. |
| Hero | Sign in and Sign up stay for every visitor | The request was one signed-in link, and the hero is the public pitch. |
| Todos controls | The home `Topbar` on the list, with Home in place of Todos | One bar for both pages. Sign out stays the existing POST, and the list link would only point at the page you are already on. |
| Public shells | Home, top bar, and auth pages use the light todos tokens | Otherwise those pages stay on the dark cosmic shell after the list was restyled. |

## Scope

**In scope:**

- Delete `src/pages/dashboard.astro` and its middleware redirect
- Update smoke and the route notes in `AGENTS.md` and `README.md`
- Signed-in top-bar link to `/todos`
- Home and Sign out on `src/pages/todos.astro`
- Restyle `Welcome.astro`, `Topbar.astro`, the three auth pages, and the sign-up hint
- Remove the unused `bg-cosmic` utility

**Out of scope:**

- A redirect from `/dashboard` to the list, home, or sign-in
- Changing the unsigned `/todos` 404
- Hiding the hero links for a signed-in person
- Token value changes, dark mode, and `LibBadge.astro`
- Todo create, edit, done, and ordering

## Architecture / Approach

The middleware stops special-casing `/dashboard`, so the missing page is a normal 404. The `/todos` rewrite is left alone. Navigation is one top bar: on `/` the signed-in link is Todos, and on `/todos` that link is Home. Sign out stays in the bar. The last phase swaps cosmic classes for the role classes `/todos` and `/not-found` already use, without changing hrefs or copy.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Remove the dashboard route | Page deleted, redirect gone, smoke expects 404 | Leaving `PROTECTED_ROUTES` in place keeps the old 302 |
| 2. Link signed-in home to todos | Top-bar Todos link, hero unchanged | Putting the link on the hero would show it to anonymous visitors |
| 3. Add home and sign-out on the todos view | Home `Topbar` on the list, Home instead of Todos, sign-out still returns `/` | A second bar would not match the home page |
| 4. Restyle the landing and auth shells | Public pages use the light tokens | A transparent field on a leftover dark shell would be unreadable, so the shells change with the type |

**Prerequisites:** The light tokens and `Card` / `buttonVariants` are already in the repo. Smoke needs the usual running server and local Supabase.
**Estimated effort:** One session across four small phases.

## Open Risks & Assumptions

- There is no `src/pages/404.astro`. Phase 1 assumes an unmatched `/dashboard` returns status 404. Smoke fails if the adapter returns something else, and the fix is still status 404 without a dashboard page and without the list not-found rewrite.
- Smoke proves status, location, and body strings. It does not prove the light colors. Phase 4 has a manual visual check for that.
- `LibBadge.astro` still has palette classes and is unused, so it is left alone.

## Success Criteria (Summary)

- `/dashboard` returns 404 for an anonymous person, a signed-in person, and a person who just signed out, and the dashboard card is gone.
- A signed-in person can open `/todos` from the home top bar, then open `/` or sign out from the list. An anonymous home page has neither a todos link nor a dashboard link.
- Home and the auth pages read as the same light UI as `/todos`, and the hero still says "Work slop" with the same paragraph.
