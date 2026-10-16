---
id: OT02
title: Visibility tags on project notes (Open Thoughts)
status: open
type: AFK
phase: C
repo: ~/Projects/Open Thoughts, cut from build/enrichment
model: opus
claimed-by:
---
# OT02 — `public` / `context-only` / `private` on every project

**Target repo:** `~/Projects/Open Thoughts`, worktree cut from `build/enrichment`.
**Blocked by:** —
**Spec:** story 15, 21; public-face and approval-flow tickets; CONTEXT.md → visibility tag.

## What to build
Tags live in `public/visibility.json` (`{"<slug>": "public" | "context-only" | "private"}`); a missing file or slug means `private`. (Decided at build time, 2026-10-16: notes have no frontmatter and `build.py` renders them as is, and proposals can only target `notes/*.md`, so a sidecar keeps agents out structurally.) The Output view shows the tag on each project. Jason can **lower** a tag (to `context-only` or `private`) directly from the view; it takes effect at the next export. Raising to `public` is not possible here: it only happens by approving a publish card (OT03). Agents never write the field.

## Acceptance criteria
- [ ] Rust test: a note with no `visibility` reads as `private`; an unknown value reads as `private` and is reported.
- [ ] Rust test: the lower command changes only that slug's entry in `public/visibility.json` (base-checked atomic save, same as the note editor) and refuses `public`.
- [ ] TS test: the Output view shows the tag and offers lower actions only below the current tag.
- [ ] The librarian and any proposal apply path cannot change `visibility` (test: applying a proposal that edits the field is refused).

## Notes for implementer
- Load ponytail, then tdd. Reuse the note editor's base-checked save and `changes::slug`; read `app/src-tauri/src/notes.rs` and `proposals.rs` first. Consult `graphify-out/GRAPH_REPORT.md` before reading code.
- Run in-app checks only with `OPEN_THOUGHTS_ROOT=<worktree>` and a temp `OPEN_THOUGHTS_APP_DIR`, never the defaults.
