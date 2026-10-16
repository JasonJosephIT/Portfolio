---
id: OT04
title: Export button with the export gate (Open Thoughts)
status: open
type: AFK
phase: C
repo: ~/Projects/Open Thoughts, cut from build/enrichment
model: opus
claimed-by:
---
# OT04 — Export writes the approved bundle, or nothing

**Target repo:** `~/Projects/Open Thoughts`, worktree cut from `build/enrichment`.
**Blocked by:** OT03
**Spec:** stories 15, 21; delivery and approval-flow tickets (export gate).

## What to build
An Export button (human-only, no agent path) that builds `exports/bundle/` from the public section: only records whose note is currently `public`, at their last approved version; relations only between exported slugs; `bundle.json` with `approval: "approved"`, `generated_at`, `content_hash` over the record files, and the record index. Before writing it validates every file against the schema and re-runs the redaction scan; any failure writes nothing and names the failing record. It writes to a temp folder and swaps it in, so a half-written bundle never exists.

## Acceptance criteria
- [ ] Rust test: a project lowered to `private` after approval is absent from the next export, and so are its edges.
- [ ] Rust test: a schema failure or redaction hit leaves the previous `exports/bundle/` untouched.
- [ ] Rust test: exporting twice with no change yields the same `content_hash` (stable key order, no timestamps inside records).
- [ ] The exported folder validates and Portfolio's `pnpm pull` (P09) accepts it.
- [ ] No `review` data and no internal note text appear anywhere under `exports/bundle/`.

## Notes for implementer
- Load ponytail, then tdd. `generated_at` lives only in `bundle.json` and is excluded from `content_hash`, so P09 can detect "no change".
