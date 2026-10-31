<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Ignore course skills and purge them from git history

- **Plan**: context/changes/course-skills-cleanup/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-10-31
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | FAIL |

## Findings

### F1 — Gitignore commit also changes the plan

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: context/changes/course-skills-cleanup/plan.md:308
- **Detail**: Progress row 3.5 is still open. `a7936c9` changes `.gitignore` and `plan.md`. The plan required that commit to list only `.gitignore`. The ignore rules and the restored files match the plan. The published tip `origin/master` is this commit.
- **Fix A ⭐ Recommended**: Leave 3.5 open and do not rewrite `a7936c9`.
  - Strength: The published history already omits the skill paths, and the plan forbids a second force-push.
  - Tradeoff: The automated check stays failed.
  - Confidence: HIGH — the row is already unchecked and the push reflog shows a single update.
  - Blind spot: None significant.
- **Fix B**: Split `a7936c9` so the published commit lists only `.gitignore`, then force-push again.
  - Strength: Makes row 3.5 true.
  - Tradeoff: Rewrites the master that was just published. The plan says not to push a second time.
  - Confidence: MEDIUM — the mechanical split is possible, the second push is the part the plan rejected.
  - Blind spot: Anyone who fetched `a7936c9` would have to reset.
- **Decision**: FIXED via Fix A (no edit; row 3.5 already open, a7936c9 not rewritten)

### F2 — Phase 1 progress names a missing commit

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/course-skills-cleanup/plan.md:276
- **Detail**: Rows 1.1–1.4 end with `d3a2207`. That object is gone. The same phase 1 commit after the rewrite is `c3609c4`.
- **Fix**: Replace `d3a2207` with `c3609c4` on rows 1.1–1.4.
- **Decision**: FIXED

### F3 — Local master is two commits ahead of GitHub

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: N/A
- **Detail**: At the push, `HEAD` and `origin/master` were both `a7936c9`. Later local commits `75d6f65` and `2d304cb` record phase 4 progress and the epilogue. They were not pushed. `origin/master` is still `a7936c9`. `HEAD` is `2d304cb` (48 commits). The rewritten base before those bookkeeping commits is 44 at `c3609c4`, not the plan's 43, because the phase 1 change-folder commit survived the filter.
- **Fix**: Leave `75d6f65` and `2d304cb` local.
- **Decision**: FIXED (no edit; those commits stay unpushed)
