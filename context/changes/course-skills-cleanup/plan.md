# Ignore course skills and purge them from git history — Implementation Plan

## Overview

Stop tracking every 10x course skill and the five course-control files that index them, keep those files on disk in this clone, and rewrite `master` so the purged paths never appear in any commit reachable from `master`. Then publish that history to `origin` with a lease-protected force-push. Project prose that names slash commands stays.

## Current State Analysis

`master` is `3c0120bedebed8661112330a31291159e795e845`, even with `origin/master` (0 ahead, 0 behind) at `https://github.com/Ajoni/10xdev.git`. The only local ref besides the existing stash is `master`. There are no tags. The working tree is clean except the untracked `context/changes/course-skills-cleanup/` folder. One stash exists (`stash@{0}`, message `zmiany z review planu. Nie ufam im`); its file list has no skill paths.

`.gitignore` ends at `.idea/` and has no skill or course-CLI rule (`c:\src\10xdev\.gitignore`). There is no `.cursorignore`.

Every skill in the repo is a course skill. Twenty-eight `10x-*` folders are tracked under `.cursor/skills/`. `10x-cli-guide` and `10x-cli-setup` are also tracked under `.agents/skills/`, `.claude/skills/`, and `.grok/skills/`. There is no project-local skill. Also tracked, and in scope because they name the skills:

- `.cursor/.10x-cli-manifest.json`
- `.cursor/rules/10x-course.mdc`
- `.cursor/prompts/skill-explainer.md`
- `skills-lock.json`
- `.10x-cli.json`

`.cursor/prompts/` also contains five lesson prompts that stay tracked: `m3l2-ad-hoc-testing.md` and `m1l5-1-plan-integration.md` through `m1l5-4-store-plan.md`. `.cursor/hooks.json` and `.cursor/hooks/` stay tracked. `context/foundation/test-plan.md` line 7 contains `/10x-test-plan` and stays as written.

`HEAD` has 47 commits. Eleven of them touch a purged path. Four of those eleven contain nothing else, so a path filter will make them empty and `git filter-repo` will drop them:

- `2e6b146` `setup`
- `cff5af6` `m2l2 skills`
- `c22bc3d` `pull skills m2l5`
- `66278a1` `get skills for m3l1`

The other seven keep non-purged files (the app scaffold, hooks, foundation docs, the other prompts). Python 3.14.2 is installed. `pip` is not on `PATH`. `git-filter-repo` is not installed.

## Desired End State

A fresh view of `master` on this clone and on `origin` has no blob or tree entry for the four skill directories or the five control files in any commit reachable from `master`. `.gitignore` ignores those paths. This working tree still has the files, so the course skills remain usable here. `context/foundation/test-plan.md` still contains `/10x-test-plan`. The other five lesson prompts and the hook files are still tracked. History is 43 rewritten commits plus one new commit that only changes `.gitignore`. `origin/master` points at that new commit.

### Key Discoveries:

- Skill text and app changes share commits. The bootstrap commit `48ade93` keeps 53 non-skill paths, including the app scaffold. The filter has to drop paths inside a commit and keep the rest of that commit.
- `c:\src\10xdev\.cursor\prompts\skill-explainer.md` is one file in a directory of lesson prompts. Ignoring or deleting `.cursor/prompts/` would remove prompts the user kept.
- `git filter-repo` removes the `origin` remote and deletes filtered paths from the worktree. The local copies have to be parked outside the repo before the rewrite and copied back after `.gitignore` is in place.
- The user authorized a force-push of `master` to `origin` during planning on 2026-10-31. The push uses `--force-with-lease` and no other branch.

## What We're NOT Doing

- Scrubbing slash commands or skill names out of `context/`, foundation docs, plans, the roadmap, or `README.md` (the starter URL stays).
- Deleting the skill trees or the five control files from this working tree.
- Ignoring or purging `.cursor/prompts/m3l2-ad-hoc-testing.md` or the four `m1l5-*` prompts.
- Ignoring or purging `.cursor/hooks.json` or `.cursor/hooks/`.
- Editing product source, `AGENTS.md`, or tests.
- Adding `git-filter-repo` to `package.json`.
- Asking GitHub Support to expire unreachable objects. An old SHA such as `3c0120b` may still open until GitHub drops it.
- Dropping, applying, or rewriting `stash@{0}`.
- Rewriting any ref other than `master`.

## Implementation Approach

Park a mirror of the current repo and a copy of the purged paths outside the worktree. Rewrite this clone with `git filter-repo --force --invert-paths` on the nine paths below. That keeps every non-purged change, including app files that landed in the same commits as skills, and drops the four commits that become empty. Re-add the ignore rules, restore the parked files, and commit only `.gitignore`. After both verifications pass, re-add `origin` and force-push `master` with `--force-with-lease`.

The mirror at `c:\src\10xdev-history-backup.git` is the rollback copy. If phase 2 or 3 fails, restore `.git` from that mirror and put the parked files back. Do not push.

## Critical Implementation Details

- **Timing & lifecycle.** Run the mirror and the park copy first. `git filter-repo` then deletes the purged paths from the worktree and removes `origin`. Re-add `origin` only in phase 4, after the gitignore commit verifies. `git add -A` is safe only once the ignore rules exist; the phase 3 commit must stage `.gitignore` alone.
- **State sequencing.** `skill-explainer.md` is a single `--path` file. The sibling prompts stay in history and stay unignored. The four empty commits listed above are expected to disappear. Do not pass `--prune-empty=false` to keep them.

## Phase 1: Back up the repo and park local copies

### Overview

Create a mirror clone and a side copy of every path the rewrite will remove, both outside this worktree, while this clone stays at `3c0120b`.

### Changes Required:

#### 1. Mirror and parked tree

**File**: `c:\src\10xdev-history-backup.git` and `c:\src\10xdev-skills-park\`

**Intent**: Keep a byte-for-byte rollback of today's history, and keep a copy of the skill trees and control files so phase 3 can put them back on disk after the rewrite deletes them from the worktree.

**Contract**: The mirror is a bare clone of this repo at the current `HEAD`. The park directory preserves relative paths for `.cursor/skills/`, `.agents/skills/`, `.claude/skills/`, `.grok/skills/`, `.cursor/.10x-cli-manifest.json`, `.cursor/rules/10x-course.mdc`, `.cursor/prompts/skill-explainer.md`, `skills-lock.json`, and `.10x-cli.json`. Neither directory is created inside `c:\src\10xdev`. This phase does not commit, rewrite, or push. If `git filter-repo` later refuses the untracked change folder, move `context/changes/course-skills-cleanup/` into the park directory and move it back after the rewrite.

### Success Criteria:

#### Automated Verification:

- Mirror `HEAD` is `3c0120bedebed8661112330a31291159e795e845`: `git -C c:\src\10xdev-history-backup.git rev-parse HEAD`
- The park tree contains `c:\src\10xdev-skills-park\.cursor\skills\10x-plan\SKILL.md`, `c:\src\10xdev-skills-park\.agents\skills\10x-cli-guide\SKILL.md`, `c:\src\10xdev-skills-park\.grok\skills\10x-cli-setup\SKILL.md`, `c:\src\10xdev-skills-park\.10x-cli.json`, and `c:\src\10xdev-skills-park\.cursor\prompts\skill-explainer.md`
- This clone's `HEAD` is still `3c0120bedebed8661112330a31291159e795e845`, and `git status --porcelain` shows no staged or unstaged changes to tracked files

#### Manual Verification:

- The parked `10x-plan` `SKILL.md` opens and still contains the course skill frontmatter

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Rewrite history

### Overview

Install `git filter-repo` and rewrite `master` so the nine paths are absent from every commit. App files, hooks, the other prompts, and project prose stay.

### Changes Required:

#### 1. Path filter

**File**: git history of `master` in `c:\src\10xdev`

**Intent**: Drop the course skill trees and the five control files from every commit, and let the four commits that contain nothing else disappear.

**Contract**: Install the tool with `python -m pip` so `git filter-repo --version` works in this session. Do not add a project dependency. Run the rewrite from the repo root with `--force` because this clone already has a remote. The invocation other phases rely on is:

```powershell
git filter-repo --force --invert-paths `
  --path .cursor/skills `
  --path .agents/skills `
  --path .claude/skills `
  --path .grok/skills `
  --path .cursor/.10x-cli-manifest.json `
  --path .cursor/rules/10x-course.mdc `
  --path .cursor/prompts/skill-explainer.md `
  --path skills-lock.json `
  --path .10x-cli.json
```

Expect `git rev-list --count HEAD` to be 43. Expect `git remote` to print nothing. Leave `stash@{0}` untouched. It keeps the pre-rewrite graph reachable locally, so absence checks use `master`, not `--all`. Do not re-add `origin` in this phase.

### Success Criteria:

#### Automated Verification:

- `git filter-repo --version` prints a version
- `git log master --full-history -- .cursor/skills .agents/skills .claude/skills .grok/skills .cursor/.10x-cli-manifest.json .cursor/rules/10x-course.mdc .cursor/prompts/skill-explainer.md skills-lock.json .10x-cli.json` prints nothing
- `git rev-list --count HEAD` is 43
- `git rev-parse HEAD:package.json` equals `git -C c:\src\10xdev-history-backup.git rev-parse HEAD:package.json`
- `git cat-file -e HEAD:.cursor/prompts/m3l2-ad-hoc-testing.md` and `git cat-file -e HEAD:.cursor/hooks.json` and `git cat-file -e HEAD:context/foundation/test-plan.md` succeed
- `git grep -n "/10x-test-plan" -- context/foundation/test-plan.md` matches
- `git remote` prints nothing

#### Manual Verification:

- `git log --oneline` has no commit subject `setup`, `m2l2 skills`, `pull skills m2l5`, or `get skills for m3l1`, and `.cursor/skills` is absent from the worktree while the park copy still has it

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Ignore and restore

### Overview

Ignore the purged paths, copy them back from the park directory, and commit only `.gitignore` on the rewritten `master`.

### Changes Required:

#### 1. Ignore rules

**File**: `.gitignore`

**Intent**: Keep the course files local so a later CLI sync cannot commit them again, while the sibling lesson prompts and the hook files stay trackable.

**Contract**: Append these rules to the existing file. Do not add a rule for `.cursor/prompts/` or `.cursor/hooks.json`.

```gitignore
# Local 10x course skills and CLI binding. Kept on disk, never committed.
.cursor/skills/
.agents/skills/
.claude/skills/
.grok/skills/
.cursor/.10x-cli-manifest.json
.cursor/rules/10x-course.mdc
.cursor/prompts/skill-explainer.md
skills-lock.json
.10x-cli.json
```

#### 2. Restore parked files

**File**: the nine purged paths in the worktree

**Intent**: Put the course skills and control files back on disk so this clone can keep using them.

**Contract**: Copy the park tree back onto the repo root, preserving relative paths. Stage only `.gitignore`. The new commit's subject records why the files are ignored. `git ls-files` after the commit lists none of the nine paths. `git status` does not offer the restored files as untracked.

### Success Criteria:

#### Automated Verification:

- `.gitignore` contains the nine ignore rules and has no pattern for `.cursor/prompts/` or `.cursor/hooks.json`
- `git check-ignore -v` on `.cursor/skills/10x-plan/SKILL.md`, `.grok/skills/10x-cli-setup/SKILL.md`, and `.cursor/prompts/skill-explainer.md` cites `.gitignore`
- `git check-ignore -v .cursor/prompts/m3l2-ad-hoc-testing.md .cursor/hooks.json` exits 1
- `git ls-files` lists none of the nine purged paths
- `git show --stat --oneline HEAD` lists only `.gitignore`

#### Manual Verification:

- `.cursor/skills/10x-plan/SKILL.md` in the worktree is readable, and `git status` does not list it

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Publish master

### Overview

Point `origin` back at GitHub and force-push the rewritten `master` with a lease check. Confirm the remote tip matches this clone and that the published tree omits the purged paths.

### Changes Required:

#### 1. Remote update

**File**: `origin` remote and `master` on `https://github.com/Ajoni/10xdev.git`

**Intent**: Make the published history match the rewritten clone. The planning session on 2026-10-31 authorized this force-push of `master` and no other branch.

**Contract**: Re-add `origin` as `https://github.com/Ajoni/10xdev.git` (fetch and push). Push with `git push --force-with-lease origin master`. If the lease fails, stop and report the remote tip. Do not use `--force`, and do not push a second time to chase old SHAs that GitHub has not yet dropped.

### Success Criteria:

#### Automated Verification:

- `git push --force-with-lease origin master` succeeds, and `git rev-parse HEAD` equals `git rev-parse origin/master`
- `git ls-tree -r --name-only origin/master` omits the nine purged paths and still lists `package.json` and `.cursor/prompts/m3l2-ad-hoc-testing.md`

#### Manual Verification:

- The GitHub `master` file view has no `.cursor/skills`, and `context/foundation/test-plan.md` on `master` still contains `/10x-test-plan`
- If `https://github.com/Ajoni/10xdev/commit/3c0120bedebed8661112330a31291159e795e845` still opens, record that and stop

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No product unit tests. This change does not edit `src/`.

### Integration Tests:

- The automated criteria are git predicates: path absence on `master`, blob equality of `package.json` against the mirror, ignore-rule matches, and remote-tip equality after the push.

### Manual Testing Steps:

1. Read the parked skill file before the rewrite, and the restored worktree copy after phase 3.
2. Scan `git log --oneline` for the four dropped subjects.
3. On GitHub, open the `master` tree and `context/foundation/test-plan.md`.
4. Note whether the pre-rewrite commit URL still loads, then stop.

## Performance Considerations

The history is 47 commits. The rewrite is a local CPU and disk operation with no runtime budget. The costly step is publishing the rewritten `master`, not the filter itself.

## Migration Notes

Rollback before the push is the mirror at `c:\src\10xdev-history-backup.git`. Replace this repo's `.git` from that mirror and copy `c:\src\10xdev-skills-park\` back if phase 2 or 3 is wrong. After a successful phase 4 push, rollback means another force-push of the mirror's `master`, which the user would have to authorize separately. `stash@{0}` will still point at pre-rewrite commits, so `git log --all` can still show the purged paths locally. Leave the stash until the user asks for it. Verify `master` only. GitHub may keep unreachable objects for the old `master` until its own garbage collection. That residual reachability is accepted.

## References

- Change notes: `context/changes/course-skills-cleanup/change.md`
- No `research.md` and no `frame.md`. Evidence is the local git inspection on 2026-10-31: `master` = `origin/master` = `3c0120b`, 47 commits, 11 commits touching the purged paths, 4 of those empty after the filter.
- Ignore file today: `.gitignore` lines 1–28
- Prose that must survive: `context/foundation/test-plan.md` line 7 (`/10x-test-plan`)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Back up the repo and park local copies

#### Automated

- [x] 1.1 Mirror HEAD is 3c0120bedebed8661112330a31291159e795e845 — d3a2207
- [x] 1.2 Parked tree contains the 10x-plan skill, both CLI helper copies, .10x-cli.json, and skill-explainer.md — d3a2207
- [x] 1.3 This clone HEAD is still 3c0120b and tracked files are clean — d3a2207

#### Manual

- [x] 1.4 Parked 10x-plan SKILL.md opens and contains the course skill frontmatter — d3a2207

### Phase 2: Rewrite history

#### Automated

- [x] 2.1 git filter-repo --version prints a version — 27bc532
- [x] 2.2 git log master for the nine purged paths prints nothing — 27bc532
- [x] 2.3 git rev-list --count HEAD is 43 — 27bc532
- [x] 2.4 HEAD package.json blob matches the mirror's HEAD package.json blob — 27bc532
- [x] 2.5 Other prompt, hooks.json, and test-plan.md still exist at HEAD — 27bc532
- [x] 2.6 git grep finds /10x-test-plan in context/foundation/test-plan.md — 27bc532
- [x] 2.7 git remote prints nothing — 27bc532

#### Manual

- [x] 2.8 Log has none of the four dropped subjects, worktree skills are gone, and the park copy remains — 27bc532

### Phase 3: Ignore and restore

#### Automated

- [x] 3.1 .gitignore has the nine rules and does not ignore sibling prompts or hooks.json — a7936c9
- [x] 3.2 git check-ignore cites .gitignore for a skill, a grok helper, and skill-explainer.md — a7936c9
- [x] 3.3 git check-ignore exits 1 for m3l2-ad-hoc-testing.md and hooks.json — a7936c9
- [x] 3.4 git ls-files lists none of the nine purged paths — a7936c9
- [ ] 3.5 HEAD commit stat lists only .gitignore

#### Manual

- [x] 3.6 Worktree 10x-plan SKILL.md is readable and git status does not list it — a7936c9

### Phase 4: Publish master

#### Automated

- [x] 4.1 force-with-lease push succeeds and HEAD equals origin/master — 75d6f65
- [x] 4.2 origin/master tree omits the purged paths and still lists package.json and m3l2-ad-hoc-testing.md — 75d6f65

#### Manual

- [x] 4.3 GitHub master has no .cursor/skills and test-plan.md still contains /10x-test-plan — 75d6f65
- [x] 4.4 If the pre-rewrite commit URL still opens, record it and stop — 75d6f65
