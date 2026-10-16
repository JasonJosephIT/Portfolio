---
id: P02
title: Fixture bundle and build-seam tests
status: open
type: AFK
phase: B
repo: Portfolio, branch redesign/astro-tech (~/Projects/Portfolio-astro)
model: sonnet
claimed-by:
---
# P02 — Make the Astro build testable from a fixture bundle

**Blocked by:** —
**Spec:** Testing Decisions → Seam 1; Further Notes → Tech preview.

## What to build
`redesign/astro-tech` is cut from `main` (`c373b21`), the source for the port (P01). Make the build testable:
- `src/content.config.ts` and `src/lib/bundle.ts` read the bundle from `process.env.BUNDLE_DIR ?? "content/bundle"` (one constant, shared).
- `tests/fixtures/bundle/`: a small valid bundle (3 projects, one with `part_of`; profile; 2 relations). Copy it from Open Thoughts' `fixtures/bundle/` on branch `build/enrichment` (OT01, it validates against `schemas/bundle.schema.json`) and add a third project if it has two. No real client names; set `approval: "approved"`.
- `tests/site.test.mjs` (`node --test`): builds once into a temp `outDir` with `BUNDLE_DIR` set to the fixture, then asserts on the HTML.
- `package.json` gains `"test": "node --test tests/site.test.mjs"` (the old `tests/portfolio-*.test.mjs` test the generated-gallery system and leave in P06).

## Acceptance criteria
- [ ] `pnpm test` builds from the fixture and passes with no `content/bundle/` present.
- [ ] One test: `/tech/index.html` lists exactly the fixture's project names.
- [ ] One test: `/tech/<slug>/index.html` exists for each fixture slug.
- [ ] `pnpm build` with neither `BUNDLE_DIR` nor `content/bundle/` fails with a message naming the missing folder.

## Notes for implementer
- Load `anthropic-skills:ponytail`, then `mattpocock-skills:tdd`. No test framework beyond `node:test`.
- Build once per test file (`before`), not per test.
- The fixture's records may carry fields the current Zod schema lacks (`checksum`, `poster_key`, `source_hash`); loosen only what the build needs. P07 aligns the schema.
