# Ignore course skills and purge them from git history — Plan Brief

> Full plan: `context/changes/course-skills-cleanup/plan.md`

## What & Why

Course skill files and the CLI files that index them are tracked on `master`, and that history is already on GitHub. This plan gitignores those paths, keeps the files on disk in this clone, rewrites history so the paths never appear in a commit on `master`, and force-pushes `master` so the published repo matches.

## Starting Point

`master` and `origin/master` are both `3c0120b` on `https://github.com/Ajoni/10xdev.git` (0 ahead, 0 behind). `.gitignore` does not mention skills. Twenty-eight course skills under `.cursor/skills/` are tracked, and `10x-cli-guide` / `10x-cli-setup` are also tracked under `.agents/skills/`, `.claude/skills/`, and `.grok/skills/`. The manifest, course rule, skill explainer, `skills-lock.json`, and `.10x-cli.json` are tracked too. History is 47 linear commits. Eleven touch a purged path; four of those contain nothing else.

## Desired End State

`master` on this clone and on GitHub has no skill directory and none of the five control files in any commit. `.gitignore` ignores them. This working tree still has the files, so the course skills keep working here. `context/foundation/test-plan.md` still mentions `/10x-test-plan`. The other lesson prompts and the hook files are still in git. History is 43 rewritten commits plus one commit that only updates `.gitignore`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Skill trees | Purge all four copies | Every tracked skill is course material, including the CLI helper copies in the other harness folders |
| Control files | Purge manifest, course rule, skill explainer, `skills-lock.json`, and `.10x-cli.json` | Those files are the skill index, so leaving them would keep every skill name in git |
| Project prose | Leave it | Change records and `test-plan.md` stay readable; the starter URL in the README stays |
| Working tree | Keep the files and gitignore them | This clone can keep using the course skills |
| Publish | Force-push `master` with `--force-with-lease` | The user is the only consumer, and GitHub still has the skill history until `master` is updated |
| Tool | `git filter-repo --invert-paths` | Mixed commits keep their app and docs changes while the named paths disappear |
| Empty commits | Drop `setup`, `m2l2 skills`, `pull skills m2l5`, and `get skills for m3l1` | After the path filter those four commits have no remaining changes |
| Other `.cursor` files | Keep hooks and the other five prompts | The user named `skill-explainer.md` only, not the rest of `.cursor/prompts/` |

## Scope

**In scope:**

- Mirror backup and a side copy of the purged paths, both outside the repo
- History rewrite of the four skill directories and five control files
- `.gitignore` rules and restoring the files locally
- One new commit for `.gitignore`, then a lease-protected force-push of `master`

**Out of scope:**

- Scrubbing `/10x-…` names from `context/` and other prose
- Deleting the local skill files
- The other lesson prompts, hook scripts, product source, and `AGENTS.md`
- A GitHub Support request to expire old commit URLs
- The existing stash

## Architecture / Approach

Park a bare mirror and the files, rewrite this clone in place, restore the files behind `.gitignore`, then publish. The mirror is the rollback until the push. `git filter-repo` will remove `origin`; phase 4 adds `https://github.com/Ajoni/10xdev.git` back and pushes `--force-with-lease`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Back up the repo and park local copies | Mirror at `c:\src\10xdev-history-backup.git` and a park copy of the nine paths | A backup inside the worktree would get swept into the rewrite |
| 2. Rewrite history | 43 commits with the purged paths gone and `package.json` unchanged | `--force` drops `origin` and deletes the files from the worktree |
| 3. Ignore and restore | Files back on disk, one commit that only changes `.gitignore` | A directory ignore on `.cursor/prompts/` would hide the lesson prompts |
| 4. Publish master | `origin/master` matches the rewritten tip | A lease failure means the remote moved; stop rather than forcing |

**Prerequisites:** Python 3.14 is installed (`python -m pip`, because `pip` is not on `PATH`). Tracked files stay clean. The force-push of `master` was authorized in planning on 2026-10-31. Phase 4 needs network access to GitHub.
**Estimated effort:** One sitting across 4 gated phases. Pause for the manual check before the push.

## Open Risks & Assumptions

- The user is the only person using `https://github.com/Ajoni/10xdev.git`. Another clone would have to reset after the push.
- GitHub may keep `3c0120b` reachable by URL after `master` moves, until GitHub drops unreachable objects.
- `stash@{0}` will still point at pre-rewrite commits. Leave it alone.
- A later CLI sync will recreate the ignored files. The ignore rules are what keep them untracked.
- `git-filter-repo` is installed for the machine via pip. It is not a project dependency.

## Success Criteria (Summary)

- No commit on `master` contains the four skill directories or the five control files, and `package.json` at the rewritten tip matches the mirror.
- The files are on disk, ignored, and absent from `git status` and `git ls-files`. `test-plan.md` still contains `/10x-test-plan`.
- `origin/master` equals local `HEAD` after `git push --force-with-lease origin master`.
