---
name: JASON
description: A matted two-panel portfolio on black museum board. Amber bevels for Art, ice-cyan bevels for Tech, pencil captions in tracked caps.
colors:
  bg: "#08090b"
  board: "#101115"
  board-edge: "#030304"
  text: "#ece8de"
  ink-display: "#d9d4c8"
  muted: "#a5a197"
  pencil: "#8a8479"
  hairline: "rgba(236, 232, 222, 0.07)"
  accent-art: "#e98a3e"
  accent-tech: "#48c4dc"
  accent-home: "#c9c4b8"
  bevel: "color-mix(in srgb, var(--accent) 58%, var(--board))"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(3rem, 8vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "0.05em"
    fontVariation: "'wdth' 125"
  wordmark:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "0.24em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(1.5rem, 3.2vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 115"
  title:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(1.35rem, 2.2vw, 1.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 118"
  lede:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  body:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.16em"
    fontVariation: "'wdth' 108"
  label-section:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.2em"
    fontVariation: "'wdth' 108"
  note:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 100"
rounded:
  base: "2px"
spacing:
  unit: "8px"
  2x: "16px"
  3x: "24px"
  4x: "32px"
  mat: "clamp(14px, 2.4vw, 32px)"
  mat-sm: "clamp(10px, 1.4vw, 16px)"
  gutter: "clamp(16px, 2vw, 28px)"
  pad-x: "clamp(16px, 4vw, 48px)"
  nav-height: "72px"
components:
  nav-link:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    padding: "8px 0 6px"
  nav-link-hover:
    textColor: "{colors.text}"
  nav-link-current:
    textColor: "{colors.text}"
  diptych-panel:
    backgroundColor: "{colors.board}"
    textColor: "{colors.text}"
    padding: "{spacing.mat}"
  mat-print:
    backgroundColor: "{colors.board}"
    textColor: "{colors.pencil}"
    padding: "{spacing.mat-sm}"
  mat-print-hover:
    textColor: "{colors.muted}"
  project-card:
    backgroundColor: "{colors.board}"
    textColor: "{colors.text}"
    padding: "{spacing.mat-sm}"
  wall-label-card:
    backgroundColor: "{colors.board}"
    textColor: "{colors.text}"
    padding: "clamp(24px, 3vw, 36px) clamp(24px, 3.4vw, 44px) clamp(22px, 3vw, 32px)"
  plate-caption:
    textColor: "{colors.pencil}"
    typography: "{typography.label}"
  section-heading:
    textColor: "{colors.muted}"
    typography: "{typography.label-section}"
  skill-pill:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    padding: "6px 16px"
  tech-tag:
    textColor: "{colors.pencil}"
    typography: "{typography.label}"
    padding: "3px 10px 3px 0"
  contact-link:
    textColor: "{colors.text}"
    typography: "{typography.label}"
    padding: "4px 0"
  project-link:
    textColor: "{colors.text}"
    typography: "{typography.label}"
  note:
    textColor: "{colors.pencil}"
    typography: "{typography.note}"
---

# Design System: JASON

## Overview

**Creative North Star: "The Hinged Diptych"**

The whole site is one matted object. A near-black museum board is the ground; charcoal mat faces sit on it, each cut with a one-pixel bevel that takes its color from the half of the work it frames, amber for Art and ice-cyan for Tech. Titles are a wide grotesque set as pale ink directly on the board with a single soft cast shadow. Everything else that is written on a mat is written in pencil: small, tracked, uppercase captions in graphite. Color never fills a surface; it lives on the bevels and in the light inside the prints.

The home page is the hinge between the two disciplines: a split-lit portrait cut into two panels that meet edge to edge down the center of the face, with no line between them, the name riding across both mats above it. Art and Tech pages are the same board with their works matted and plate-numbered in a run. Density is museum-quiet: one column of prose at 44-62ch, generous mats, hairline dividers, and no chrome beyond the nav and the back of the frame.

Confirmed rejections: no name-over-hero-plus-grids arrangement; no accent fills, glows, or colored shadows; no second typeface; no rounded corners on the public surfaces; no embossed or engraved type.

**Key Characteristics:**
- One near-black board, charcoal mats, one-pixel colored bevels
- One variable family (Archivo) doing all hierarchy through width and weight
- Pencil caption register for every label on a mat
- Every work carries a counter-generated plate number
- Physical depth: an inset highlight line, a cut edge, and a long soft cast
- Motion is the object moving: panels swing on their hinge, mats lift, prints develop into view

## Colors

A monochrome board-and-paper palette with two saturated hues confined to hairlines and the light inside the photographs.

### Primary
- **Amber Core** (`accent-art`): the Art accent. Appears as the bevel hairline around Art prints, the label color on Art hover, the arrow glyph in the Art caption, the current-page underline on art.html, focus rings, and text selection on Art surfaces. Never a fill.
- **Ice-Cyan Core** (`accent-tech`): the Tech accent, same roles on Tech surfaces: project-card window bevels, Tech panel label hover, arrow glyph, current-page underline on tech.html.
- **Bone** (`accent-home`): the home page's resting accent, a neutral warm grey. Drives the focus ring, current-nav underline, and selection on index.html so the home surface carries no hue outside the two panels.

### Neutral
- **Backing Board** (`bg`): page background, nav background, and the "window" plate behind each project title. Also the `theme-color`.
- **Mat Face** (`board`): every mat: diptych panels, gallery print mats, project cards, the wall-label card.
- **Cut Edge** (`board-edge`): the 1px shadow line under every mat's bottom edge.
- **Paper White** (`text`): body copy, labels at full strength, link text on hover.
- **Pale Ink** (`ink-display`): display type only (wordmark, wall name, page titles, footer name). Slightly dimmer than paper white so the big letters sit on the board rather than glare off it.
- **Graphite** (`muted`): secondary prose, nav links at rest, section headings, the tagline, skills, footer links.
- **Soft Pencil** (`pencil`): plate numbers, tech tags, the footer medium line, and the `.note` register for anything not yet real.
- **Hairline** (`hairline`): all dividers: nav bottom, section-heading rule, contact-line top, tag and skill separators, footer top.

### Derived
- **Bevel** (`bevel`): the resting hairline around every gallery print, project window, and page-title rule, computed as 58% of the in-force accent mixed into the mat face. The home diptych windows carry no bevel. It is re-declared on `body`, `.panel`, and `.project-card` so it recomputes wherever `--accent` is re-scoped.

`--board-raised` (#17181d) is declared in the token block but no public surface paints it; treat it as reserved for the admin area.

### Named Rules
**The Bevel Rule.** Color lives only on bevels and in the light on the prints. An accent may draw a 1px line, tint a glyph, or color a hovered label; it never fills a surface, a button, or a block of text.

**The Accent Scope Rule.** `--accent` is set once per scope (`body.home` bone, `body.tech` cyan, `.panel-art` / `.panel-tech` / `.project-card` per half) and `--bevel` is recomputed inside that scope. New surfaces inherit their hue by declaring which half they belong to, never by hard-coding a hex.

**The Home Is Bone Rule.** On index.html the two hues appear only inside the two panels. Everything outside the diptych (nav, focus, selection, wall label, footer) uses the neutral bone accent.

## Typography

**Display Font:** Archivo variable, self-hosted (`assets/fonts/archivo-var.woff2`, weight 100-900, width 62-125%), with Helvetica Neue / Helvetica / Arial fallback
**Body Font:** Archivo (same file)
**Label Font:** Archivo (same file), width 108%

**Character:** One grotesque, stretched wide and heavy for titles, normal for prose, slightly wide and tracked for captions. The hierarchy is built from the width axis and weight, not from size alone, so a 0.72rem caption and a 6rem title read as the same hand.

### Hierarchy
- **Display** (800, width 125%, `clamp(3rem, 8vw, 6rem)`, line-height 0.9, tracking 0.05em, pale ink): page titles on Art and Tech. The wall name on the home page uses the same register at `--name-h` (`clamp(2.25rem, 6vw, 5rem)`), tracking 0.08em, line-height 1, centered across both panels. Both carry one soft cast shadow (see Elevation).
- **Wordmark** (800, width 125%, 0.9rem, tracking 0.24em, pale ink, no shadow): "JASON" in the nav and on the back of the frame.
- **Headline** (700, width 115%, `clamp(1.5rem, 3.2vw, 2.25rem)`, line-height 1.15, `text-wrap: balance`): the wall-label h2.
- **Title** (700, width 118%, `clamp(1.35rem, 2.2vw, 1.75rem)`, line-height 1.1, balanced): project titles. The diptych panel labels ("Art", "Tech") use the same register at `clamp(1.25rem, 2.6vw, 1.75rem)` with tracking 0.02em.
- **Lede** (400, 1.05rem, line-height 1.55, graphite): page-title subline (max 44ch) and wall-label paragraph (card max 62ch).
- **Body** (400, 1rem, line-height 1.55, tabular numerals): project descriptions (max 52ch) and everything unstyled.
- **Label** (500, width 108%, 0.72rem, tracking 0.16em, uppercase, line-height 1.4): the pencil caption register. Nav links, plate numbers, tech tags, skill pills, contact and project links, footer medium and links.
- **Label / Section** (600, 0.8rem, tracking 0.2em, uppercase, graphite): the "Projects" and "Skills" headings, followed by a hairline rule that fills the row.
- **Note** (500, width 100%, 0.72rem, tracking 0.04em, sentence case, soft pencil): the register for anything not yet real ("address pending"). Sentence case is what separates a note from a label.

### Named Rules
**The One Family Rule.** Archivo is the only face. Hierarchy comes from the width axis (100 / 108 / 115 / 118 / 125) and weight (400 / 500 / 600 / 700 / 800), never from a second family.

**The Pencil Register Rule.** Anything written on a mat that is not a title or prose is set in the label register: 0.72rem, 500, width 108%, tracking 0.16em, uppercase, in graphite or soft pencil. Plate numbers are always soft pencil.

**The Plate Number Rule.** Every work carries a plate number generated by a CSS counter (`Plate 01`), with an optional title or note after a spaced middle dot (`data-title` on prints, `data-note` on project h3). Numbers are never typed into the markup.

## Layout

Everything sits inside a 1240px `.wrap` with horizontal padding `pad-x` (`clamp(16px, 4vw, 48px)`). The base spacing unit is 8px; vertical rhythm uses its multiples (16 / 24 / 32) and viewport-relative clamps for section padding (`clamp(32px, 5vh, 56px)` section tops, `clamp(48px, 8vh, 96px)` above the footer). The top nav is 72px (`nav-height`), sticky on the inner pages and absolute over the board on the home page.

Mats use two widths: `mat` (`clamp(14px, 2.4vw, 32px)`) for the diptych panels and `mat-sm` (`clamp(10px, 1.4vw, 16px)`) for gallery prints and project cards. Gaps between mats are `gutter` (`clamp(16px, 2vw, 28px)`).

- **Home:** `.wall` is a full-height (`100svh`) grid, content centered, with the diptych in the first row and the tagline in the auto row below. The two panels sit in a flex row with no gap between them, inside a 1800px perspective. Each window is a 7:10 portrait whose width is derived from the viewport height so the whole object fits above the fold, capped at 46vw; the windows run edge to edge across their panels, so the two halves of the face touch. Each window shows one half of the same image (`width: 200%`, the Tech side offset `-100%`).
- **Art:** the gallery is a CSS-columns masonry: 1 column, 2 at 700px, 3 at 1024px. Prints avoid column breaks.
- **Tech:** project cards in an auto-fit grid (min 300px) that locks to three equal columns at 960px. Skills are a wrapping row of hairline-separated pills.
- **Page title:** a two-column `auto 1fr` grid aligned to the baseline (title left, lede right) with a bevel-colored rule beneath; collapses to one column at 700px.
- **Footer:** `1fr auto` grid (name and medium left, links right, copyright spanning); stacks at 700px.

Breakpoints: 700px (mobile collapse), 960px (three project columns), 1024px (three gallery columns).

## Elevation & Depth

Depth is physical and monochrome. A mat reads as a cut piece of board through three shadows: a one-pixel inset highlight along its top edge, a one-pixel dark cut edge below it, and, on the diptych panels and on hover elsewhere, a long soft cast shadow onto the backing board. Windows carry an inset shade along their top edge where the mat overhangs the print. There are no glows, no colored shadows, and no shadow with a visible hard offset. Display type carries one soft cast shadow so it reads as ink on the board rather than as a floating layer.

### Shadow Vocabulary
- **Mat at rest** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.035), 0 1px 0 var(--board-edge)`): gallery prints and project cards at rest.
- **Mat lifted** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.035), 0 1px 0 var(--board-edge), 0 26px 34px -22px rgba(0,0,0,0.95)`): prints and cards on hover / focus, paired with `translateY(-4px)`. The wall-label card wears this cast at rest (with `-24px` spread) plus its bevel ring.
- **Panel** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.035), 0 1px 0 var(--board-edge), 0 40px 60px -40px rgba(0,0,0,0.9)`): the two diptych panels, which always cast because they stand off the wall.
- **Bevel ring** (`box-shadow: 0 0 0 1px var(--bevel)`): every gallery print and project window at rest; becomes `0 0 0 1px var(--accent)` on hover / focus. Not on the home diptych windows.
- **Window shade** (`inset 0 10px 18px -12px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(0,0,0,0.55)`): overlay on the diptych windows and project-title plates; the mat's overhang shadow on the print.
- **Ink cast** (`text-shadow: 0 4px 14px rgba(0,0,0,0.6)`): display type only (wall name, page titles); the wordmark and footer name do not carry it.

### Named Rules
**The Cut Mat Rule.** Every mat carries the inset highlight and the cut edge. No surface floats on a generic drop shadow; if it needs more depth it gets the long soft cast, never a hard offset.

**The Lift Rule.** Hover on a matted work is a 4px rise plus the cast shadow plus the bevel turning to full accent, all on the 0.7s ease-out. The diptych panels swing instead of rising.

## Shapes

Square-cut throughout. Mats, windows, prints, cards, and the hinge are all right-angled; the only rounding on public surfaces is the 1px radius on the focus ring. The `rounded.base` token (2px) is declared for the admin area's inputs and is not used on the public pages. Borders are hairlines only: 1px in `hairline` for dividers and separators, 1px in `bevel` (or accent on hover) drawn as a spread shadow around windows so it sits inside the mat without adding to layout. Windows are strict portrait rectangles (7:10 on the home page). Pills are not pills: skills are plain text separated by a left hairline; tags are plain text separated by a 1px, 0.8em-tall rule. Arrows are 24-unit stroke SVG paths at 1.5 stroke width, drawn inline or as a `currentColor` mask; there are no icon fonts or glyph characters.

## Components

There are no buttons or form fields on the public pages; every call to action is a text link in the label register. The admin area is out of scope and only inherits token names.

### Navigation
- **Style:** 72px bar on the backing board with a hairline beneath; sticky on inner pages, absolute and transparent over the wall on the home page. Wordmark left, three links right with a `clamp(18px, 3vw, 36px)` gap.
- **Links:** label register, graphite at rest, paper white on hover (0.25s ease). The current page is paper white with a 1px accent underline drawn as a bottom border (padding `8px 0 6px`).
- **Mobile:** no collapse; three short labels fit at 390px.

### The Diptych (signature)
- **Object:** `.diptych` is a centered flex row with `perspective: 1800px`: Art panel, a zero-width `.hinge`, Tech panel. `.wall-name` is absolutely positioned across the whole row at `z-index: 3`, on the mat band above the windows.
- **Panel:** `.panel` is a mat-face link whose padding reserves room for the name at top (`mat + name-h * 1.15`) and `mat` at the bottom, with no side padding so the window fills the panel width; the caption carries its own `mat` inset. Each declares its own `--accent`. Transform origin is on the hinge edge (`100% 50%` for Art, `0% 50%` for Tech).
- **Window:** a 7:10 black rectangle with the bevel ring and the window shade; the image is 200% wide so each panel shows one half of the same split-lit portrait.
- **Caption:** label (title register with a 22px inline stroke arrow tinted accent), sub (graphite 0.9rem), plate ("Panel I" / "Panel II" in soft pencil). Tech's caption is right-aligned so the two mirror across the hinge.
- **Hinge:** the seam itself. `.hinge` is a zero-width flex item kept as the fold line; the home windows carry no bevel, so the two halves of the portrait meet with no visible line.
- **Hover / Focus:** the panel swings on its hinge, `rotateY(-7deg) translateZ(6px)` for Art and `+7deg` for Tech, on a 0.9s ease-out; the light on that half comes up (`filter: brightness(1.7) saturate(1.25)` on the window image, 0.9s ease-out), the label turns accent, and the arrow nudges 5px outward. Reduced motion removes the swing entirely.

### Mat Print (gallery item)
- **Corner Style:** square.
- **Background:** mat face, `mat-sm` padding with 2px extra at the bottom; the image carries the bevel ring.
- **Caption:** generated `Plate NN` (with ` · data-title` when present) in soft pencil, tracking 0.12em, 10px below the print.
- **Hover / Focus:** lifts 4px, wears the cast, bevel to accent, caption brightens to graphite.
- **Develop:** where `animation-timeline: view()` is supported and motion is allowed, each print scrolls in from 25% opacity, desaturated and dark, to full over the first 55% of its entry.
- **Empty state:** "No plates placed yet." in soft pencil.

### Project Card
- **Corner Style:** square.
- **Background:** mat face with `mat-sm` padding; a generated backing-board "window" plate (with bevel ring and window shade) sits behind the title and description, padded `clamp(18px, 2.4vw, 28px)`.
- **Title:** title register with generated `Plate NN` (` · data-note`) in soft pencil beneath.
- **Description:** graphite body, max 52ch.
- **Tags:** soft pencil label register, separated by 1px hairline rules.
- **Link:** paper white label register with a 16px masked stroke arrow that nudges 4px on card hover; underlines on its own hover.
- **Hover / Focus-within:** lift 4px, cast shadow, window bevel to cyan.
- **Empty state:** "No projects placed yet." in soft pencil.

### Wall Label (about card)
- A 62ch mat on the home page with the bevel ring, inset highlight, and resting cast. Headline, graphite lede, then a hairline-topped contact line holding the contact link and a `.note`.

### Text Links
- **Contact link:** paper white label register with a 16px graphite stroke arrow; hover draws a 1px paper-white bottom border and nudges the arrow 3px.
- **Footer links:** graphite label register; hover goes paper white with a 1px accent bottom border.

### Skill Pill / Tech Tag
- **Skill pill:** graphite label register, `6px 16px`, left hairline border (none on the first).
- **Tech tag:** soft pencil label register, `3px 10px 3px 0`, preceded by a 1px hairline rule from the second tag on.

### Note
- Soft pencil, 0.72rem, tracking 0.04em, sentence case, normal width. The only register for placeholders and pending facts; it sits inline after the thing it qualifies.

### Frame Back (footer)
- Hairline-topped, graphite. Wordmark and "Photography · Software" in soft pencil left, links right, copyright line (0.78rem, soft pencil, sentence case) spanning below.

## Do's and Don'ts

### Do:
- **Do** declare which half a new surface belongs to by scoping `--accent` (`body.tech`, `.panel-tech`, `.project-card`) and let `--bevel` recompute; never hard-code an accent hex on a surface.
- **Do** mat every work: mat face, `mat-sm` padding, inset highlight and cut edge, and a bevel ring on the print or window.
- **Do** give every work a counter-generated plate number in soft pencil, with an optional title after a spaced middle dot.
- **Do** set every label on a mat in the pencil register (0.72rem, 500, width 108%, tracking 0.16em, uppercase).
- **Do** use the 0.7s / 0.9s `cubic-bezier(0.16, 1, 0.3, 1)` ease-out for lifts, swings, and arrow nudges, and remove transforms entirely under `prefers-reduced-motion: reduce`.
- **Do** keep the pipeline contracts intact: `.gallery > a > img`, `.projects .project-grid > .project-card` with `h3`, `p`, `.tech-tags`, `.project-link`, `.skills .skill-pills > .skill-pill`, and a `.page-title` on inner pages.
- **Do** keep the token names `--bg --text --muted --accent-art --accent-tech --space --radius --nav-height`; the admin stylesheet reads them.
- **Do** draw arrows as inline 24-unit stroke SVG (1.5 stroke, round caps) or a `currentColor` mask, sized 16-22px.

### Don't:
- **Don't** fill any surface, button, or text block with an accent; accents are 1px rings, glyph tints, and hover label color only.
- **Don't** put amber or cyan outside the two panels on the home page; the home surface's accent is bone.
- **Don't** introduce a second typeface or a system display face; use Archivo's width and weight axes.
- **Don't** round corners on public surfaces; mats, windows, and cards are square-cut.
- **Don't** use hard-offset, colored, or glowing shadows; depth is the inset highlight, the cut edge, and the long soft cast.
- **Don't** emboss, engrave, or outline display type; it is pale ink with one soft cast shadow.
- **Don't** type plate numbers into markup or add label rows above titles; the counter and the `data-title` / `data-note` attributes are the only caption mechanism.
- **Don't** add runtime JavaScript, icon fonts, or glyph characters to the public pages.
