<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Edit todo reorder

- **Plan**: context/changes/edit-todo-reorder/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-10-27
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Default specimen puts Edit before Done

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/todos/TodoStateSink.tsx:78
- **Detail**: The Default specimen renders the Edit button and then the Done form. The plan requires the Done form first and an Edit control after it. Progress 2.8 is checked. The working list still keeps the Done form as the first form; its Edit summary sits before that form, which matches the page contract.
- **Fix**: Move the Edit button to after the Done form in the Default specimen.
- **Decision**: ACCEPTED: Change of plan during implementation. This is correct and expected.

### F2 — Cross-user edit posts the current values

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: scripts/smoke.mjs:321
- **Detail**: The second user posts the same description, complexity 1, and the original deadline. The following list check would still pass if that write were stored. The plan asked for a POST and an unchanged list, so the step matches the written contract, and it cannot go red on an identical unauthorized write.
- **Fix**: Post a different description and assert the owner's list still shows the original text.
- **Decision**: FIXED
