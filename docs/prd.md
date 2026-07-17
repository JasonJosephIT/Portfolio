# PRD — Joseph's Portfolio Site

## What this is
A personal portfolio site with two halves reflecting the owner's duality: **art** (photography) and **tech** (software). Three pages, static, no backend.

## Stack (final — do not substitute)
- Plain HTML + CSS. One optional tiny vanilla JS snippet only if a task explicitly calls for it.
- No frameworks, no build step, no package.json, no external fonts or CDNs. System font stack.
- Serve locally with any static server for verification.

## Files
```
index.html      home
art.html        photography portfolio
tech.html       tech portfolio
styles.css      all styling, shared
assets/         photos (photo-01..08.jpg) + hero.jpg (AI-generated split-lighting portrait)
```

## Design tokens
- Background: `#0a0a0b` (near-black). Text: `#f2f2f0`. Muted text: `#9a9a94`.
- Art accent (warm): `#ff7a4d`. Tech accent (cool): `#4dc3ff`.
- Font: `system-ui, -apple-system, "Segoe UI", sans-serif`. Headline weight 700, letter-spacing tight.
- Spacing scale: 8px base. Max content width: 1100px, centered.
- Rounded corners: 12px on cards/images.

## Pages

### Home (`index.html`)
- **Top nav**: site-wide, same markup on all 3 pages. Left: wordmark "JOSEPH" (links to index). Right: links Home / Art / Tech. Current page link visually distinct. Nav is a plain flex row, sticky top, translucent dark background with backdrop blur.
- **Hero**: `assets/hero.jpg` — a portrait lit warm on the left half, cool on the right half. Displayed large and centered (max-height ~70vh, rounded). Headline above or overlaid: "Two sides. One lens." Subline: "Art & engineering, by Joseph."
- **Duality CTAs**: directly under the hero, two large arrow links side by side:
  - Left: "← Art" → `art.html`, warm accent color.
  - Right: "Tech →" → `tech.html`, cool accent color.
  - On hover each grows slightly and its arrow slides outward (CSS transition only).
- Mobile (<700px): CTAs stack vertically, hero full-width.

### Art (`art.html`)
- Same nav. Page title "Art" with warm accent underline, one-line intro.
- Photo grid of `assets/photo-01.jpg` … `photo-08.jpg`: CSS `columns` masonry (3 cols desktop, 2 tablet, 1 mobile), 12px gaps, rounded images, subtle hover lift.
- Each image wrapped in `<a href>` to the full file (native full view; no lightbox JS).
- Meaningful alt text on every image.

### Tech (`tech.html`)
- Same nav. Page title "Tech" with cool accent underline, one-line intro.
- "Projects" section: 3 project cards in a responsive grid (auto-fit, min 300px). Each card: project name, one-sentence description, tech tags, link placeholder. Content is placeholder marked with HTML comments `<!-- TODO: replace with real project -->`.
- "Skills" section: single row of pill-shaped tags (e.g. JavaScript, Python, React, SQL, Git — placeholders, same TODO comment).

## Non-goals (YAGNI)
No contact form, no blog, no analytics, no dark/light toggle (site is dark), no animations beyond CSS hover/transition, no lightbox, no lazy-loading libs (use native `loading="lazy"`).

## Acceptance
Every page: valid HTML, no console errors, no horizontal scroll at 375px/768px/1280px widths, keyboard-focus visible on all links, all images load.
