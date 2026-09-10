---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["art.html","tech.html"]
---

# Surface brief: public site (index.html, art.html, tech.html)

## Scope and mode

Whole public site, three pages, one visual world. Visitor mode: Experience (the work leads, the interface recedes). The Tech page borrows Read scanability for project labels. Admin area out of scope; it inherits tokens only.

## Audience, job, action

Prospective clients for photography (portraits, available light) and for software (tools to full-stack). Job: judge quality in under a minute on phone or laptop. Action: get in touch to hire or book. Proof on hand: two portraits only; all other works and projects are labeled synthetic placeholders.

## Constraints

- Markup contracts in PRODUCT.md (`.gallery > a > img`, `.projects .project-grid > .project-card` with `h3`, `p`, `.tech-tags`, `.project-link`; `.skills .skill-pills > .skill-pill`; `.page-title` present) must survive.
- No runtime JavaScript for visitors beyond the `?edit=1` loader. Fonts self-hosted in `assets/fonts/`.
- Token names read by `admin/admin.css` must survive: `--bg --text --muted --accent-art --accent-tech --space --radius --nav-height`.

## Direction contract

THESIS: The site is one matted two-panel object. The split-lit face is the diptych and the hinge down its center is the identity. It refuses the name-over-hero-plus-grids arrangement.

OWN-WORLD: Black museum board ground; charcoal mat faces; bevel hairlines, amber on Art and ice-cyan on Tech; pale graphite pencil captions in tracked caps; a wide grotesque (Archivo, width axis) set as pale ink on the board for titles; a plate number on every work; the two halves of the portrait meet with no line between them; bevels belong to the Art and Tech pages. Color lives only on bevels and in the light on the prints.

STORY: A client sees one person with two disciplines, judges the work inside the mats, and finds the contact label on the back of the frame.

FIRST VIEWPORT: Full-viewport portrait cut into two panels that meet edge to edge down the center of the face, with no line between them. JASON embossed across both panels. Under each window a pencil caption, Art left, Tech right, with the tagline as the mat's title line. Each panel is the link and swings on its hinge on hover.

FORM: The Hinged Diptych, candidate 7 of 7 (the brief's literal reading, the one allowed), seed 583cb758, code-led.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved

- Contact address to publish (placeholder until Jason supplies one).
- Whether self-hosted font files satisfy the PRD's "no external fonts" intent (assumed yes).
