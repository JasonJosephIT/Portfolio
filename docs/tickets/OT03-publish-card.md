---
id: OT03
title: Publish card in the review desk (Open Thoughts)
status: open
type: AFK
phase: C
repo: ~/Projects/Open Thoughts, cut from build/enrichment
model: opus
claimed-by:
---
# OT03 — `publish` proposals: one card, one Approve

**Target repo:** `~/Projects/Open Thoughts`, worktree cut from `build/enrichment`.
**Blocked by:** OT01, OT02
**Spec:** approval-flow ticket (unit, export gate); public-face ticket.

## What to build
`enrich.py` writes its drafts to `exports/drafts/` (bundle-shaped, `approval: "pending"`) instead of `exports/bundle/`; the app imports each draft as a `publish` proposal, so the app stays the only writer of its proposal store (decided at build time, 2026-10-16). The review desk shows one card per record (project or profile): proposed tag, the full public record, relations, and the Jev review beside the internal note. One Approve sets the project's tag to `public` in `public/visibility.json`, stamps `approved_at`, and stores the approved record in a public section (`public/<slug>.json`, `public/profile.json`, `public/relations.json`). Reject leaves everything private. Agents never approve (existing invariant).

## Acceptance criteria
- [ ] Rust test: approving a publish proposal writes `public/<slug>.json` that validates against `schemas/bundle.schema.json` and sets the note's tag to `public`.
- [ ] Rust test: a record with a redaction hit cannot be approved (the Approve is refused with the hit named).
- [ ] Rust test: a client or person name in the record without the "named publicly" tick blocks approval.
- [ ] TS test: the card renders tag, record, relations and the review side by side; Approve is a single action.
- [ ] `enrich.py` writes `exports/drafts/`, not `exports/bundle/` (that is OT04's job).

## Notes for implementer
- Load ponytail, then tdd. Extend `proposals.rs` with the new kind; do not add the `revise` kind (Open Thoughts spec).
- Consult `graphify-out/GRAPH_REPORT.md` and `/graphify query` before reading code.
