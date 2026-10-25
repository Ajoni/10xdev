<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Add a todo and see the ordered working list

- **Plan**: context/changes/add-ordered-todo/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-10-11
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 2 warnings 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Sign-in success lands on /todos

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: src/pages/api/auth/signin.ts:19
- **Detail**: Successful sign-in now redirects to `/todos`. Before this change it redirected to `/`. The plan said to follow the existing form-post shape and not to retrofit zod onto the auth routes. Zod was not added. It did not say to change the sign-in destination. `scripts/smoke.mjs` was updated in the same phase so "signin accepts correct password" expects location `/todos` (line 89). Unsigned `/dashboard` still redirects to `/auth/signin`.
- **Fix A ⭐ Recommended**: Document the `/todos` landing as a plan addendum and leave the redirect and smoke expectation in place.
  - Strength: The list is the slice's destination, smoke already asserts it, and the dashboard redirect rule is unchanged.
  - Tradeoff: The plan's auth flow no longer matches the pre-change sign-in landing.
  - Confidence: HIGH — the diff is one redirect string plus the matching smoke location.
  - Blind spot: None significant.
- **Fix B**: Restore the success redirect to `/` and point the smoke expectation back at `/`.
  - Strength: Keeps the auth route's previous behavior and the original smoke contract.
  - Tradeoff: A signed-in user lands on the homepage and has to open `/todos` themselves.
  - Confidence: HIGH — no other caller depends on the new location beyond smoke.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A

### F2 — Homepage rewritten as the working-list pitch

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: src/components/Welcome.astro:22
- **Detail**: The homepage hero title is now "Work slop", the supporting copy describes the private working list, and the starter feature cards are gone. `src/pages/index.astro` sets the layout title to "Work slop". The plan's page work is `/todos` only. Sign-in and sign-up links are unchanged.
- **Fix A ⭐ Recommended**: Document the homepage copy as a plan addendum and keep it.
  - Strength: The copy matches the slice a visitor now lands next to, and the auth links still work.
  - Tradeoff: The starter homepage is no longer what a fresh checkout shows.
  - Confidence: HIGH — the diff is copy and removed static cards, with no route or auth change.
  - Blind spot: None significant.
- **Fix B**: Restore the starter hero, feature cards, and default layout title.
  - Strength: Leaves the public homepage out of this slice.
  - Tradeoff: Drops the product pitch already on the page.
  - Confidence: HIGH — `Welcome.astro` and `index.astro` have no other callers that depend on the new copy.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A
