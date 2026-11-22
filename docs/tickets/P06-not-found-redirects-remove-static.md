---
id: P06
title: Not-found page, .html 301s, remove the static and generated pages
status: closed
type: AFK
phase: B
repo: Portfolio, branch redesign/astro-tech
model: sonnet
claimed-by:
---
# P06 — 404, old `.html` redirects, the static site leaves

**Blocked by:** P04, P05
**Spec:** story 8; Site → clean URLs, old `.html` paths 301; Migration (old pages removed once their Astro versions ship).

## What to build
- `src/pages/404.astro` porting `main`'s `404.html` (it keeps the side rail); delete `404.html`.
- `public/_redirects` with 301s: `/index.html → /`, `/art.html → /art`, `/tech.html → /tech`, `/art/pieces/:slug/index.html → /art/pieces/:slug`.
- Delete the static and generated-gallery system: `tech.html`, root `styles.css`, `gallery.css`, `gallery.js`, `content/portfolio.json`, `content/generated-pages.json`, `lib/portfolio-content.mjs`, `lib/portfolio-render.mjs`, `scripts/build-portfolio.mjs`, `scripts/import-portfolio.mjs`, `tests/portfolio-*.test.mjs`, `assets/wave-pattern.svg` if unused. `admin/` stays for P12.

## Acceptance criteria
- [ ] Site test: `dist/_redirects` contains the four 301 lines.
- [ ] Site test: `dist/404.html` exists and links back to `/`.
- [ ] No `.html` file remains at the repo root; `rg '\.html"' src` finds no internal links to old paths.
- [ ] `pnpm test` and `pnpm build` pass.
- [ ] Manual on the workers.dev preview (P03): `/tech.html` returns 301 to `/tech`; `/nope` returns 404 with the custom page.

## Notes for implementer
- Load ponytail, then tdd. Workers Static Assets reads `_redirects` from the assets directory; confirm the syntax in the Cloudflare docs.
- After this ticket the phase B PR is ready: Jason pushes and opens it. Agents do not push.
