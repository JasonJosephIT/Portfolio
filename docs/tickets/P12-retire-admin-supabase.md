---
id: P12
title: Retire admin/, the Supabase pipeline, Instatic and place-image
status: closed
type: AFK
phase: D
repo: Portfolio, branch redesign/retire-admin
model: sonnet
claimed-by:
---
# P12 — Remove the old editing stack (keep the Supabase project)

**Blocked by:** P06
**Spec:** story 24; Migration phase D.

## What to build
Delete `admin/`, `scripts/fetch-pending.mjs`, `scripts/mark-placed.mjs`, `docs/supabase-schema.sql`, `.claude/commands/place-image.md`, any Instatic files or references, and Supabase keys from `.env.example`. Remove dead references in `README.md`, `CLAUDE.md`, `AGENTS.md` and `docs/launch-checklist.md`. Do not touch the Supabase project itself (Jason deletes it later by hand). The `?edit=1` drag-to-place overlay is never restored, in any form.

## Acceptance criteria
- [ ] `rg -i 'supabase|instatic|place-image|/admin'` over tracked files returns only `docs/wayfinder/` and `docs/specs/` (history) hits.
- [ ] `pnpm test` and `pnpm build` pass.
- [ ] The PR body says the Supabase project was not deleted and names it (ref `nflhxvypzahwbpxjogbt`) for Jason's manual step.

## Notes for implementer
- Load ponytail. Deletion only; no replacements.
