# Branch Consolidation Report — 2026-11-22

- **Integration branch:** `consolidate/2026-11-22`
- **Base commit (`origin/main`):** `25f70c051c6d9e18df6b9390803ac7c3f4ab1bb9`
- **Summary:** 1 merged, 3 skipped (all superseded), 0 conflicts, 0 new test failures vs `origin/main`.

## Branch Decisions

| branch | decision | reason | conflicts resolved (files) | tests |
| --- | --- | --- | --- | --- |
| `origin/claude/deploy-built-site` (`b565ec3`) | `SKIP-SUPERSEDED` | Adds `.github/workflows/deploy.yml` for GitHub Pages deploying the old static site via `node scripts/build-portfolio.mjs --check/--out`. On `origin/main`, `scripts/build-portfolio.mjs` was removed in the Astro migration and deployment moved to Cloudflare Workers Builds (`wrangler.jsonc`); CI runs `.github/workflows/test.yml` and draft privacy is enforced by `pnpm pull` (approved public snapshot only). Merging would introduce a broken Pages deploy workflow. | None (skipped) | N/A (not merged) |
| `origin/claude/portfolio-remove-editor-67a00b` (`64683b2`) | `SKIP-SUPERSEDED` | Removes the old `?edit=1` drag-to-place overlay (`admin/edit.js`, `/place-image`, `scripts/fetch-pending.mjs`, `scripts/mark-placed.mjs`, `.env.example`) and updates static-site docs. All 14 removed/modified static-site and `/admin/` files are already deleted on `origin/main` after the Astro migration, and the two surviving docs (`PRODUCT.md`, `.impeccable/surfaces/index-html.md`) already describe the Astro site with no editor or `/admin/` portal. | None (skipped) | N/A (not merged) |
| `origin/claude/ui-visual-appeal-background-7edf77-local-2026-11-22` (`5950d79`, `c6f3390`) | `MERGE` | Adds two 2026-11-02 `STATUS.md` decision entries recording the Aristocrat and Herculean final demo cuts handed to PR #16 that were not on `origin/main`. Merged via `git merge --no-ff` (`5b8c0f5`), preserving existing front-matter (`updated: 2026-11-22`) and newest-first decision order. | None (clean auto-merge on `STATUS.md`) | Same as `origin/main` baseline (0 new failures) |
| `origin/spike/open-thoughts-feed` (`d890023`, `781df4d`, `856a292`) | `SKIP-SUPERSEDED` | Early 2026-10-16 prototype syncing unapproved Claude draft summaries (`content/portfolio-feed.json`) into the removed static `tech.html` via `scripts/sync-open-thoughts.mjs`. Superseded on `origin/main` by the Astro + Open Thoughts public enrichment API and bundle pipeline (`scripts/pull-public-enrichment.mjs`, `scripts/pull-bundle.mjs`, `standards/portfolio.mjs`, `src/pages/tech/`), which explicitly forbids unapproved drafts as a fallback. | None (skipped) | N/A (not merged) |

## Test, Typecheck, and Build Results (Before vs After)

### Before (`origin/main` @ `25f70c0`)

| Check | Command | Result | Notes |
| --- | --- | --- | --- |
| Astro fixture build | `BUNDLE_DIR=tests/fixtures/bundle pnpm build` | **PASS** | Built cleanly (20 pages in 6.32s during concurrent `pnpm test` run that transiently placed a fixture build doc). |
| Chatbot tests | `pnpm --dir chatbot test` | **PASS** | 96/96 Vitest tests across 3 files (`shipped`, `admin`, `eval`) + 11/11 `node --test test/index-build.test.mjs` (**107/107 passed**). |
| Site tests | `pnpm test` | **90 passed / 16 failed** | All 16 failures are in `tests/site-chat.test.mjs` because the local Playwright cache lacks `chromium_headless_shell-1234` (pre-existing local mismatch already documented in `STATUS.md`). All 90 other site, bundle, pull, resume, routes, ocean-runtime, enrichment, art, and tech tests passed. |

### After (`consolidate/2026-11-22` @ `5b8c0f5`)

| Check | Command | Result | Notes |
| --- | --- | --- | --- |
| Astro fixture build | `BUNDLE_DIR=tests/fixtures/bundle pnpm build` | **PASS** | 19 pages built in 4.87s, 0 errors (standalone clean run with empty `src/content/builds/`). |
| Chatbot typecheck | `pnpm --dir chatbot exec tsc --noEmit` | **PASS** | Exit 0, no type errors. |
| Chatbot tests | `pnpm --dir chatbot test` | **PASS** | 96/96 Vitest tests across 3 files + 11/11 `node --test test/index-build.test.mjs` (**107/107 passed**). |
| Site tests | `pnpm test` | **90 passed / 16 failed** | Identical 16 pre-existing Playwright failures in `tests/site-chat.test.mjs` (`chromium_headless_shell-1234` missing locally). **0 new failures** vs `origin/main`. |

## Reviewer addendum (Fable, 2026-11-22)

Decision: **MERGE**. The diff against `origin/main` is two files (`STATUS.md` +2 lines, this report). Re-run on the branch: fixture build passes (19 pages), chatbot typecheck passes, chatbot tests 107/107, site tests 90/106. The 16 failures are the `tests/site-chat.test.mjs` browser tests, which need `chromium_headless_shell-1234` in the local Playwright cache; the CI `test` job passes on `origin/main` @ `25f70c0`, whose code is identical.

The three skips were checked against `origin/main` and stand: every script or page those branches touch is gone from main, and the two surviving docs carry no editor text.

### Snapshot branches not covered above

Four `wip/*-2026-11-22` branches hold snapshots of uncommitted work taken on 2026-11-22. None is merged; all stay on origin.

| branch | contents | why not merged |
| --- | --- | --- |
| `origin/wip/claude-interactive-background-waves-8140ef-2026-11-22` (`a9ae570`) | Five generated bay videos under `generated/quick/` (about 53 MB), their metadata, `spend.jsonl` | Large generated binaries and a spend log; the chosen backdrop is already on main (`5159608`). |
| `origin/wip/claude-portfolio-astro-tickets-32543e-2026-11-22` (`e5d1877`) | `.agents/skills/source-command-place-image/SKILL.md` | The place-image command is retired (ticket P12). |
| `origin/wip/codex-portfolio-explorer-review-2026-11-22` (`0b2e78e`) | An early `STATUS.md` (2026-10-25), preview screenshots, a `public/explore-demo/` prototype | The explorer shipped in PR #14 (`src/components/ProjectExplorer.astro`); main's `STATUS.md` is newer. |
| `origin/wip/main-2026-11-22` (`7c165d1`) | The dropped Phase A staged changes on the old static site (63 files, base `static-final`) | Phase A was dropped on 2026-10-16; the Astro port replaced those files. |

### Left for Jason

- PR #9 (`claude/deploy-built-site`) is still open and superseded; close it.
- GitHub Pages is still enabled, and its `pages-build-deployment` run fails on every push to main. This predates the consolidation.
