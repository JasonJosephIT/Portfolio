---
id: P02
title: Rebase the Astro branch onto phase A; fixture bundle and build-seam tests
status: open
type: AFK
phase: B
repo: Portfolio, branch redesign/astro-tech (~/Projects/Portfolio-astro)
model: opus
claimed-by:
---
# P02 — Bring `redesign/astro-tech` onto phase A and add the site test seam

**Blocked by:** P01 (the phase A branch must exist; it need not be merged)
**Spec:** Testing Decisions → Seam 1; Further Notes → Tech preview.

## What to build
`redesign/astro-tech` was cut from `c373b21`, before phase A, so it still carries `admin/`, `gallery.js`, `lib/`, the art piece pages and the old `tests/*.mjs`. Merge the phase A branch into it (resolve with `mattpocock-skills:resolving-merge-conflicts`; phase A wins on deletions, the Astro commits win on `package.json`, `.gitignore`, `astro.config.mjs`).

Then make the build testable from a fixture:
- `src/content.config.ts` and `src/lib/bundle.ts` read the bundle from `process.env.BUNDLE_DIR ?? "content/bundle"` (one constant, shared).
- `tests/fixtures/bundle/`: a small valid bundle (3 projects, one with `part_of`; profile; 2 relations) written by hand from the shape of `~/Projects/Open Thoughts/exports/bundle`. No real client names; `approval: "approved"`.
- `tests/site.test.mjs` (`node --test`): builds once into a temp `outDir` with `BUNDLE_DIR` set to the fixture, then asserts on the HTML in `dist/`.
- `package.json` gains `"test": "node --test tests/"`.

## Acceptance criteria
- [ ] `git log redesign/astro-tech` contains the phase A commit; `admin/`, `gallery.*`, `lib/`, `art/pieces/` and the old `tests/portfolio-*.test.mjs` are gone (phase A's deletions) unless phase A kept them.
- [ ] `pnpm test` builds from the fixture and passes with no `content/bundle/` present.
- [ ] One test: `/tech/index.html` lists exactly the fixture's three project names.
- [ ] One test: `/tech/<slug>/index.html` exists for each fixture slug.
- [ ] `pnpm build` with neither `BUNDLE_DIR` nor `content/bundle/` fails with a message naming the missing folder.

## Notes for implementer
- Load `anthropic-skills:ponytail`, then `mattpocock-skills:tdd`. No test framework beyond `node:test`.
- Build once per test file (`before`), not per test.
