---
bootstrapped_at: 2026-09-27T09:21:04Z
starter_id: 10x-astro-starter
starter_name: 10x Astro Starter (Astro + Supabase + Cloudflare)
project_name: work-slop
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: work-slop
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

## Why this stack

Work slop is a small, 3-week after-hours web app with in-product email/password accounts and per-user todos. The recommended JavaScript/TypeScript web starter is Astro + React + TypeScript with auth and a database included, which matches that scope without payments, realtime, or AI. Cloudflare Pages is the starter's default host; GitHub Actions with auto-deploy on merge is the usual solo CI shape. Scaffolding support is first-class: the starter is registered, but not fully battle-tested, so expect mostly-smooth setup with occasional manual steps.

## Pre-scaffold verification

| Signal             | Value                              | Severity | Notes                              |
| ------------------ | ---------------------------------- | -------- | ---------------------------------- |
| npm package        | not run                            | n/a      | skipped — `cmd_template` starts with `git clone` |
| GitHub repo        | przeprogramowani/10x-astro-starter last pushed 2026-09-12T21:16:08Z | fresh    | `gh` CLI was not on PATH; fetched via GitHub REST API `GET /repos/przeprogramowani/10x-astro-starter` |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 30731
**Conflicts (.scaffold siblings)**: README.md.scaffold
**.gitignore handling**: moved silently
**.bootstrap-scaffold cleanup**: deleted

File-by-file move log:

- deleted: `.bootstrap-scaffold/.git/` (upstream history not kept)
- moved: `.github` (1 files)
- moved: `.husky` (1 files)
- moved: `.vscode` (3 files)
- moved: `node_modules` (30680 files)
- moved: `public` (3 files)
- moved: `scripts` (1 files)
- moved: `src` (26 files)
- moved: `supabase` (2 files)
- moved: `.env.example` (1 files)
- moved: `.gitignore`
- moved: `.nvmrc` (1 files)
- moved: `.prettierrc.json` (1 files)
- moved: `AGENTS.md` (1 files)
- moved: `astro.config.mjs` (1 files)
- moved: `CLAUDE.md` (1 files)
- moved: `components.json` (1 files)
- moved: `eslint.config.js` (1 files)
- moved: `package-lock.json` (1 files)
- moved: `package.json` (1 files)
- conflict: `README.md` → `README.md.scaffold` (cwd already had an empty `README.md`; existing wins)
- moved: `tsconfig.json` (1 files)
- moved: `wrangler.jsonc` (1 files)
- dropped: none under `context/` (scaffold had no `context/` tree)
- leftover paths: none

CLI stdout (abridged):

```
Cloning into '.bootstrap-scaffold'...
added 648 packages, and audited 649 packages in 50s
found 0 vulnerabilities
```

CLI stderr notes: npm warned about unknown env config `devdir`, and that esbuild/workerd install scripts were not yet covered by `allowScripts`.

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW
**Direct vs transitive**: not distinguished by this tool (npm audit v2 `metadata.dependencies` exposed prod/dev/optional/peer counts, not a `direct` field; `vulnerabilities` was empty so no `via` chains)

#### CRITICAL findings

none

#### HIGH findings

none

#### MODERATE findings

none

#### LOW / INFO findings

none

Raw `metadata.vulnerabilities`: info 0, low 0, moderate 0, high 0, critical 0, total 0. Dependencies: prod 377, dev 269, optional 167, total 804. Audit exit code: 0.

## Hints recorded but not acted on

| Hint                       | Value                              |
| -------------------------- | ---------------------------------- |
| bootstrapper_confidence    | first-class                        |
| quality_override           | false                              |
| path_taken                 | standard                           |
| self_check_answers         | null                               |
| team_size                  | solo                               |
| deployment_target          | cloudflare-pages                   |
| ci_provider                | github-actions                     |
| ci_default_flow            | auto-deploy-on-merge               |
| has_auth                   | true                               |
| has_payments               | false                              |
| has_realtime               | false                              |
| has_ai                     | false                              |
| has_background_jobs        | false                              |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
