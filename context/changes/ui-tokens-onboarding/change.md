---
change_id: ui-tokens-onboarding
title: Ui tokens onboarding
status: implemented
created: 2026-10-17
updated: 2026-10-17
archived_at: null
---

## Notes

View: `/todos` — `src/pages/todos.astro`, with the island `src/components/todos/WorkingList.tsx`.

Token source: the existing shadcn tokens in `src/styles/global.css` (`:root` / `.dark`, published through `@theme inline`). Contract variant: fresh starter with a dead token file. Make this one view read those tokens. Do not add a second palette or run `shadcn init`.
