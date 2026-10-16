---
id: P04
title: Diptych base layout and the Home page in Astro
status: open
type: AFK
phase: B
repo: Portfolio, branch redesign/astro-tech
model: opus
claimed-by:
---
# P04 — Diptych layout and `/` in Astro

**Blocked by:** P02
**Spec:** stories 8, 9; Site → diptych design ported into Astro components.

## What to build
Port phase A's `index.html` and `styles.css` (the diptych redesign, `DESIGN.md`) into `src/layouts/Diptych.astro` and `src/styles/diptych.css`, then `src/pages/index.astro` with the same markup and look. Remove the `"/": "/tech"` redirect from `astro.config.mjs`. Keep the 100px side rail from `7a89ea3`. Static images move under `src/assets/` and go through `astro:assets`.

## Acceptance criteria
- [ ] Site test: `/index.html` contains the Home headline and nav links to `/art` and `/tech` (clean URLs, no `.html`).
- [ ] Side-by-side screenshots at 1440 and 375 of the old `index.html` and the new `/` show no visible difference beyond image encoding (save to `docs/preview/`).
- [ ] `index.html` at the repo root is deleted.
- [ ] No Tailwind classes in the diptych layout; the Tech layout is untouched.

## Notes for implementer
- Load ponytail, then tdd. Use Playwright async for screenshots (sync API and headless mobile captures are known not to work here).
- Copy CSS as is; do not refactor it into Tailwind.
