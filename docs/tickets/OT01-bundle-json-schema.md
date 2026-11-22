---
id: OT01
title: Bundle JSON Schema and a fixture bundle (Open Thoughts)
status: open
type: AFK
phase: C
repo: ~/Projects/Open Thoughts, cut from build/enrichment
model: sonnet
claimed-by:
---
# OT01 — Bundle JSON Schema (Open Thoughts owns it)

**Target repo:** `~/Projects/Open Thoughts`, worktree cut from `build/enrichment` (tip `a222d26`).
**Blocked by:** —
**Spec:** Bundle contract; bundle-format ticket.

## What to build
`schemas/bundle.schema.json` (draft 2020-12) with `$defs` for: manifest (`schema_version` integer, `generated_at`, `approval` `approved|pending`, `content_hash`, `records` index), project (slug, name, summary, tags, description, media[], approved_at, source_hash, optional `part_of`), media reference (key, kind, checksum, poster_key, caption), profile (headline, bio, skills, interests, approved_at, source_hash), relation edge (`from`, `to`, `type` in `uses|part-of|built-with|related-to`), and doc frontmatter (slug, parent, kind `features|decisions`, approved_at, source_hash). Every object has `additionalProperties: false`.

`scripts/enrich.py` validates what it writes against the schema and stops on a failure. `fixtures/bundle/` holds a small valid bundle used by both repos' tests.

## Acceptance criteria
- [ ] The schema rejects a project record carrying `review` (today `enrich.py` writes Jev review data into each record; it must move to a sidecar such as `exports/review/<slug>.json`, outside the bundle folder).
- [ ] The schema rejects a relation whose `type` is not one of the four, and a manifest whose `schema_version` is not an integer.
- [ ] `fixtures/bundle/` validates; a test (pytest or a small `python3 -I` script) proves both the pass and the rejections above.
- [ ] `enrich.py --dry-run` still sends nothing; a real run's output validates.

## Notes for implementer
- Load ponytail, then tdd. Use the `jsonschema` package in the script's `uv` header; no new tooling.
- Do not touch the app (`app/`). Do not run a real enrichment (it spends API credit); test with the fixture.
