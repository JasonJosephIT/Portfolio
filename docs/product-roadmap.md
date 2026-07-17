# Product Roadmap — Joseph's Portfolio

**Status:** 3/3 tasks complete
**Current Phase:** Phase 1 — Build

Reference: `docs/prd.md` (whole file — it's short).

## Phase 1 — Build
Goal: all three pages live, styled, linked, and passing the PRD acceptance checks.

- [x] Task 1: Foundation + Home page
  - Files: `index.html`, `styles.css`
  - Notes: Implement the design tokens, shared nav, hero (`assets/hero.jpg`), and duality CTAs per PRD "Home". styles.css must also carry the shared styles (nav, page title, tokens) the other two pages will reuse — but do NOT create art.html/tech.html. Verify: open index.html in a browser at 375/768/1280px; no horizontal scroll, hover states work, both CTAs link to art.html and tech.html (they will 404 until Tasks 2–3 — that's fine).
- [x] Task 2: Art page
  - Files: `art.html` (+ additions to `styles.css` only if needed)
  - Notes: Per PRD "Art". Reuse nav markup from index.html verbatim (adjust the current-page class). Photos are assets/photo-01.jpg … photo-08.jpg. Verify: grid reflows 3/2/1 columns at 1280/768/375px; every image loads and links to its file.
- [x] Task 3: Tech page
  - Files: `tech.html` (+ additions to `styles.css` only if needed)
  - Notes: Per PRD "Tech". Reuse nav markup verbatim (adjust current-page class). Placeholder content carries TODO comments. Verify: cards reflow at breakpoints; pills wrap on mobile.
