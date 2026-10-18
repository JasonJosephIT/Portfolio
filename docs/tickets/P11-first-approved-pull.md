---
id: P11
title: First approved bundle reaches a pull PR
status: open
type: HITL
phase: C
repo: both
claimed-by:
---
# P11 — End to end: approve, export, pull PR, preview

**Blocked by:** P08, P10, OT04
**Spec:** stories 15–21; phase C exit.

## What to do (Jason)
1. In Open Thoughts, review the publish cards from the `build/enrichment` run and approve the projects and profile to show.
2. Press Export.
3. Wait for the daily pull, or run `pnpm pull` once by hand; a PR appears.
4. Check the PR's preview URL: only approved projects, no client names without the tick, cards with name, summary and tags only.
5. Merge when happy (production deploy). Then the preview builds can drop `BUNDLE_DIR=tests/fixtures/bundle` (P03).

## Acceptance criteria
- [ ] A pull PR exists whose diff is the approved bundle.
- [ ] Its preview shows the real Tech page.
- [ ] Lowering one project to `private`, exporting and pulling yields a PR that removes it.
