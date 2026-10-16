---
id: P09
title: Pull command validates and opens a PR; quiet on no change
status: closed
type: AFK
phase: C
repo: Portfolio, branch redesign/astro-bundle
model: sonnet
claimed-by:
---
# P09 — `pnpm pull`: export folder in, PR out

**Blocked by:** P07
**Spec:** stories 16–18, 21; Delivery.

## What to build
Extend `scripts/pull-bundle.mjs`:
- Export folder missing → print one line and exit 0 (today it throws).
- Validate the export with `validateBundle` (P07) before copying; invalid → exit 1, nothing copied.
- Compare the export's `content_hash` with the committed `content/bundle/bundle.json`; equal → exit 0, no branch, no PR.
- Otherwise copy wholesale into `content/bundle/`, commit on branch `bundle/<first 12 of hash>` from `origin/main`, push that branch, and `gh pr create` with a body listing added, changed and removed slugs. Never merge, never auto-merge.
- `--dry-run` does everything except push and `gh`.
- Remove `content/bundle/` from `.gitignore` (approved bundles are committed); `--preview` keeps its current meaning and never commits.

## Acceptance criteria
- [ ] Script test (fixture export folder, temp git repo, a stub `gh` on `PATH` that logs its args): changed export → one commit, one `gh pr create` call whose body names the changed slug.
- [ ] Script test: unchanged export → exit 0, no commit, `gh` never called.
- [ ] Script test: missing export folder → exit 0, nothing written.
- [ ] Script test: invalid or pending export → exit 1, `content/bundle/` untouched.
- [ ] Script test: a slug removed from the export is removed from `content/bundle/`.

## Notes for implementer
- Load ponytail, then tdd. Use `node:child_process` `execFileSync` for git and gh; no libraries.
- The push is the only network write and only happens in the launchd job or when Jason runs it.
