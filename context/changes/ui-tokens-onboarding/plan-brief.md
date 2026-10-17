# Todos tokens — Plan Brief

> Full plan: `context/changes/ui-tokens-onboarding/plan.md`
> Research: `context/changes/ui-tokens-onboarding/research.md`

## What & Why

`/todos` renders, and it ignores the shadcn tokens already in `src/styles/global.css`. The list, the form, and the errors use a blue-purple glass look. This change makes that view read the live light tokens, and restyles the shared field, button, and error so sign-in and sign-up use the same components.

## Starting Point

Tokens and `Button` exist. Nothing sets `dark`, so the light `:root` values are the ones in force. `/todos` uses `bg-cosmic` and palette classes. `FormField`, `SubmitButton`, and `ServerError` are shared with the auth forms. An unsigned `GET /todos` returns status 404 and the plain text `Not found`.

## Desired End State

A signed-in person sees a light `/todos` page built from role tokens: card, list, empty sentence, fields, button, and errors. Focus uses the ring token. Sign-in and sign-up keep the cosmic page shell, with those same fields readable on it. An unsigned visitor to `/todos` sees a short token-styled page and still gets status 404.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Token source | Existing `:root` tokens in `src/styles/global.css` | The file already publishes role tokens, and this change does not add a palette. | Research |
| Shared widgets | Restyle `FormField`, `SubmitButton`, and `ServerError` | Sign-in and sign-up then use the same field and button as `/todos`. | Plan |
| Todos shell | Light `bg-background` surface; drop `bg-cosmic` on this page only | Those are the tokens in force, and the other pages keep the cosmic shell. | Plan |
| Auth shells | Stay on `bg-cosmic` | The shell choice was for `/todos`. Shared fields use opaque surfaces so they stay readable here. | Plan |
| Password icon | `PasswordToggle` uses `text-muted-foreground` | The icon sits inside the input, so a white icon would disappear on the light field. | Plan |
| Unsigned body | Token-styled page, status 404, not a sign-in redirect | The status and the redirect rule stay; the raw text is what changes. | Plan |
| Visual gate | Kitchen sink at `src/pages/dev/todo-states.astro` | `package.json` has no Playwright dependency. | Plan |
| Lint | No new lint package | The guard is the `AGENTS.md` block plus the existing scan command. | Plan |

## Scope

**In scope:**

- Add Input, Label, Select, and Card with `npx shadcn@latest add`.
- Record the current `:root` roles in `token-values.md`.
- Restyle `/todos`, the three shared widgets, and `PasswordToggle`.
- Kitchen sink, unsigned 404 page, and an `AGENTS.md` UI block.

**Out of scope:**

- Retinting tokens, setting `dark`, or removing `bg-cosmic` from other pages.
- Auth page shells, auth links, and the sign-up hint on the cosmic card.
- A sign-in redirect, a 404 status change, Playwright, or a new lint package.
- Todo ordering, validation, and the date-time rule.

## Architecture / Approach

The page and the shared widgets import `src/components/ui/` and use role classes from `src/styles/global.css`. Middleware still catches unsigned `/todos`, rewrites to `/not-found` (a path outside that prefix), and returns that HTML with status 404. The form keeps a classic post: `complexity` still submits under that name.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Library | Input, Label, Select, and Card | The CLI touches more files than those four |
| 2. Token values | A record of the live `:root` roles | Someone edits the values while copying them |
| 3. Todos view and shared widgets | Light `/todos` page and token-backed auth fields | A Select that does not post `complexity` |
| 4. States and unsigned entry | Kitchen sink and a styled 404 body | The not-found route sits under `/todos` and loops |
| 5. Guard | UI block in `AGENTS.md` | The block lands inside the CLI-managed rule file |

**Prerequisites:** `components.json` and `src/components/ui/button.tsx` are already present. Manual checks need a signed-in session and a local server.
**Estimated effort:** About two sessions across five phases.

## Open Risks & Assumptions

- shadcn Select may not render `name="complexity"`. The plan keeps a hidden input in that case.
- A direct visit to `/not-found` may return 200. Unsigned `/todos` is the response that must return 404.
- Sign-in and sign-up will look mixed on purpose: cosmic shell, light fields.

## Success Criteria (Summary)

- A signed-in `/todos` page uses role tokens for the shell, list, empty state, fields, button, and errors.
- Sign-in and sign-up keep `bg-cosmic` and their fields stay readable.
- Unsigned `/todos` returns status 404 with a token-styled page, and the kitchen sink shows the applicable states.
