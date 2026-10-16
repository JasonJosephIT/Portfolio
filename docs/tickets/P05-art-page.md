---
id: P05
title: Art page in Astro
status: open
type: AFK
phase: B
repo: Portfolio, branch redesign/astro-tech
model: sonnet
claimed-by:
---
# P05 — `/art` in Astro

**Blocked by:** P04
**Spec:** stories 8, 9; Art stays hand-managed.

## What to build
`src/pages/art.astro` on the Diptych layout, porting phase A's `art.html` as is. Art images stay in the repo (`src/assets/art/`), hand-managed; no bundle, no CMS. Delete `art.html`.

## Acceptance criteria
- [ ] Site test: `/art/index.html` exists, has the Art heading, and every `<img>` has non-empty `alt`.
- [ ] Side-by-side screenshots at 1440 and 375 match the old page (saved to `docs/preview/`).
- [ ] `art.html` is deleted; nothing references `gallery.js` or `gallery.css`.

## Notes for implementer
- Load ponytail, then tdd. Only add files under `src/pages/` and `src/assets/art/`; do not edit `Diptych.astro` (P04 owns it). If it needs a slot, note it in the PR.
