---
id: P04
title: Diptych base layout and the Home page in Astro
status: closed
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
Port `main`'s `index.html` and the parts of `styles.css` it uses (the diptych redesign, `DESIGN.md`) into `src/layouts/Diptych.astro` and `src/styles/diptych.css`, then `src/pages/index.astro` with the same markup, copy and look. Remove the `"/": "/tech"` redirect from `astro.config.mjs`. Static images move under `src/assets/` and go through `astro:assets`. Links become clean URLs (`/art`, `/tech`).

Source is `main` as it is (P01): do not take copy, styles or markup from the staged changes in the main checkout.

## Acceptance criteria
- [ ] Site test: `/index.html` contains the Home headline and nav links to `/art` and `/tech` (no `.html`).
- [ ] Side-by-side screenshots at 1440 and 375 of `main`'s `index.html` and the new `/` show no visible difference beyond image encoding (save to `docs/preview/`).
- [ ] `index.html` at the repo root is deleted.
- [ ] No Tailwind classes in the diptych layout; the Tech layout is untouched.

## Notes for implementer
- Load ponytail, then tdd. Use Playwright async for screenshots (sync API and headless mobile captures are known not to work here).
- Copy CSS as is; do not refactor it into Tailwind. Leave `styles.css` at the root until P06 (Art still uses it).
