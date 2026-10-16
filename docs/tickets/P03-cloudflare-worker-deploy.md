---
id: P03
title: Deploy as a Cloudflare Worker with static assets; preview per PR
status: closed
type: HITL
phase: B
repo: Portfolio, branch redesign/astro-tech
model: sonnet
claimed-by:
---
# P03 — Cloudflare Worker with static assets, workers.dev, preview per PR

**Blocked by:** P02
**Spec:** stories 19, 25; Site → one Worker with static assets, preview per PR, workers.dev first.

## What to build
- `wrangler.jsonc`: a Worker named `jason-portfolio` serving `./dist` as static assets (`assets.directory`), `not_found_handling: "404-page"`, no Worker script (fully prerendered). No `@astrojs/cloudflare` adapter: nothing renders per request.
- `package.json`: `"deploy": "astro build && wrangler deploy"`; `wrangler` as a dev dependency.
- Preview builds: until an approved bundle is committed (P11), preview builds run with `BUNDLE_DIR=tests/fixtures/bundle`. Production builds never set it.
- HITL (Jason): connect the GitHub repo in Workers Builds, production branch `main`, non-production branch builds on (preview URL per PR), build command `pnpm build`, deploy command `pnpm wrangler versions upload` for previews.

## Acceptance criteria
- [ ] `pnpm build && pnpm wrangler deploy --dry-run` succeeds locally.
- [ ] Jason has a `*.workers.dev` URL serving `/tech` from the fixture bundle.
- [ ] A PR against `redesign/astro-tech` gets its own preview URL (checked once by Jason).
- [ ] No custom domain is attached (that is P21).

## Notes for implementer
- Load ponytail, then tdd. Check current Workers Static Assets config keys in the Cloudflare docs (context7 or the docs MCP) before writing `wrangler.jsonc`; see `research-cloudflare-facts.md` in the side-session notes.
- `wrangler deploy` for real needs Jason's login: do the dry run only, then hand over.
