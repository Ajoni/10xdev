---
change_id: testing-private-ordered-list
title: Test privacy, order, and UTC deadlines on the working list
status: implementing
created: 2026-10-18
updated: 2026-10-18
archived_at: null
---

## Notes

Open a change folder for rollout Phase 1 of context/foundation/test-plan.md: "Private ordered list".
Risks covered: #1 A signed-in person sees or changes another person's todo. #2 The top item is not the next action: a later deadline or higher complexity ranks above a sooner, simpler todo. #4 An unsigned person opens the working list instead of receiving not-found. #6 A deadline sorts as a different moment than the person entered, so the UTC round-trip changes who is on top.
Test types planned: runner bootstrap, unit or integration.
Risk response intent: #1 prove A cannot see or change B's todo and B's list is only B's. #2 prove the sooner deadline is on top, the same deadline puts lower complexity first, and the length guess plus an in-range override both obey that. #4 prove an unsigned list request is not-found and contains no todos. #6 prove the stored deadline is UTC, sorts by that instant, and display does not move the day and change the top item.
After creating the folder, follow the downstream continuation rule.
