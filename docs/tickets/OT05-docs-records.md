---
id: OT05
title: Features and decisions docs as doc records (Open Thoughts)
status: open
type: AFK
phase: E
repo: ~/Projects/Open Thoughts, cut from build/enrichment
model: opus
claimed-by:
---
# OT05 — `doc` records: features and decisions per public project

**Target repo:** `~/Projects/Open Thoughts`, worktree cut from `build/enrichment`.
**Blocked by:** OT04
**Spec:** story 5; Docs; docs-generation ticket.

## What to build
For each `public` project, `enrich.py` drafts two docs, a features doc and an ADR-style decisions doc, from that project's note and ADRs only (Opus drafts, Jev checks each claim, Haiku fixes flags, same as records). Each becomes a `publish` proposal of kind `doc` linked to its parent slug; approval stores `public/docs/<parent>-<kind>.md`. Export (OT04) includes approved docs as `docs/<parent>-<kind>.md` with schema-valid frontmatter.

## Acceptance criteria
- [ ] No doc is drafted for a project that is not `public` (test with a fixture note set).
- [ ] An approved doc appears in the next export and validates; a doc whose parent is lowered to `private` disappears with it.
- [ ] Every claim in a fixture-generated doc is traceable to the note (the Jev check runs; unresolved flags block approval).

## Notes for implementer
- Load ponytail, then tdd. Use stubbed engines in tests; never spend API credit in CI.
