---
id: P07
title: Vendor the schema; the build fails on an invalid, too-new or pending bundle
status: open
type: AFK
phase: C
repo: Portfolio, branch redesign/astro-bundle (cut from redesign/astro-tech)
model: opus
claimed-by:
---
# P07 — One validator, used by the pull and the build

**Blocked by:** P02, OT01
**Spec:** story 20; Bundle contract (Portfolio vendors and validates again).

## What to build
- Copy `schemas/bundle.schema.json` and `fixtures/bundle/` from Open Thoughts (OT01) into `schemas/` and over `tests/fixtures/bundle/`; record the source commit in `schemas/SOURCE`.
- `scripts/lib/validate-bundle.mjs`: `validateBundle(dir, { allowPending })` checks every file against the schema, refuses `schema_version` above the supported one, refuses `approval !== "approved"` unless `allowPending`, and refuses any file not listed in the manifest index. Throws one error listing every problem.
- `src/content.config.ts` calls it once at config load; the Zod schemas are aligned to the vendored schema (today they lack `checksum`, `poster_key`, `source_hash` and allow extra fields). `allowPending` is true only when `PREVIEW=1`.
- `scripts/pull-bundle.mjs` uses the same function (replacing its inline checks).

## Acceptance criteria
- [ ] Site test: a fixture with a missing `summary` fails the build, naming the file and field.
- [ ] Site test: a fixture with `schema_version` one above supported fails the build with "update Portfolio first".
- [ ] Site test: a pending fixture fails a normal build and passes with `PREVIEW=1`.
- [ ] Site test: an extra `projects/<slug>.json` not in the manifest index fails the build (so nothing outside the approved set can render).
- [ ] Site test: a record with a `review` field fails the build.

## Notes for implementer
- Load ponytail, then tdd. One dependency at most (`ajv`); no second validator.
- Test fixtures for failures are generated in a temp dir from the good fixture, not committed as copies.
