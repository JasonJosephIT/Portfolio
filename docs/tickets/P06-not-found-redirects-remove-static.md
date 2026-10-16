---
id: P06
title: Not-found page, .html 301s, remove the static pages
status: open
type: AFK
phase: B
repo: Portfolio, branch redesign/astro-tech
model: sonnet
claimed-by:
---
# P06 — 404, old `.html` redirects, last static files out

**Blocked by:** P04, P05
**Spec:** story 8; Site → clean URLs, old `.html` paths 301.

## What to build
- `src/pages/404.astro` on the Diptych layout, porting phase A's `404.html`; delete `404.html`.
- `public/_redirects` with 301s: `/index.html → /`, `/art.html → /art`, `/tech.html → /tech`.
- Delete `tech.html` and the root `styles.css` once nothing imports them.

## Acceptance criteria
- [ ] Site test: `dist/_redirects` contains the three 301 lines.
- [ ] Site test: `dist/404.html` exists and links back to `/`.
- [ ] No `.html` file remains at the repo root; `rg '\.html"' src` finds no internal links to old paths.
- [ ] Manual on the workers.dev preview (P03): `/tech.html` returns 301 to `/tech`; `/nope` returns 404 with the custom page.

## Notes for implementer
- Load ponytail, then tdd. Workers Static Assets reads `_redirects` from the assets directory; confirm the syntax in the Cloudflare docs.
- After this ticket the phase B PR is ready: Jason pushes and opens it. Agents do not push.
