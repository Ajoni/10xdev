---
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
---

## Why this stack

Work slop is a small, 3-week after-hours web app with in-product email/password accounts and per-user todos. The recommended JavaScript/TypeScript web starter is Astro + React + TypeScript with auth and a database included, which matches that scope without payments, realtime, or AI. Cloudflare Pages is the starter's default host; GitHub Actions with auto-deploy on merge is the usual solo CI shape. Scaffolding support is first-class: the starter is registered, but not fully battle-tested, so expect mostly-smooth setup with occasional manual steps.
