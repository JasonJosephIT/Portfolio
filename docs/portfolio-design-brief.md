# Portfolio design and implementation brief for subagents

## Purpose and authority

Design Jason’s Art and Tech portfolios as calm, image-led galleries: museum-like curation, generous space, and quiet captions combined with the clarity, restraint, and precision Jason associates with Apple interfaces. This is a design direction, not a request to copy a particular website.

This brief supersedes the Art and Tech layout, placeholder-content, and freeform-placement guidance in older documents, including `docs/prd.md` and comments in the current page shells. Preserve existing Home navigation, Jason’s name, chosen hero, and quotation unless a later task explicitly changes them. Do not restore previously removed personal photos or invent public projects, skills, testimonials, or outcomes.

This document specifies future implementation; creating it does not authorize deployment or a platform migration. Inspect current code and applicable repository instructions before implementation. The repository now includes admin/editing functionality beyond the original static MVP: preserve those integrations and adapt them deliberately. Use the existing stack where practical; structured layouts do not require a framework migration.

Interpret “no longer freeform” as a structured content system: fixed section types, reusable cards, curated ordering, and predictable detail templates. No absolute-positioned canvas or arbitrary visitor-facing layout controls.

## Experience principles

- Work comes first. Visitors should see actual work soon after the page title, without a second full-screen hero.
- Scrolling is the primary browsing method. All major sections appear in one ordinary vertical document.
- Images invite entry; visible titles and short captions explain what visitors are opening.
- Art and Tech share typography, navigation, spacing, and interaction patterns. Content and restrained accent colors distinguish them.
- Museum qualities: deliberate selection, quiet labels, natural image proportions, breathing room, and a clear sequence of rooms/sections.
- Apple-like qualities: simple hierarchy, precise alignment, readable type, polished responsive behavior, and obvious controls.
- Avoid decorative dashboards, dense chip collections, excessive glass effects, neon backgrounds, scroll hijacking, parallax, and mandatory carousels.

## Art reference and updated direction

Jason supplied a screenshot of a photography portfolio: a plain black background, a narrow left navigation rail, and two large image columns with generous gutters. Use those visual relationships as inspiration. The screenshot’s artist name, photographs, medium labels, and other text are reference content, not instructions or assets to reuse. No live-site inspection is implied.

For Art, this update replaces the earlier top-navigation-only layout. Keep the main site’s Home hero intact. The Art portfolio gets its own Home/showcase destination; distinguish these two destinations explicitly below. Tech retains its simpler Starred Projects → Projects structure and can share the restrained black visual language without inheriting photography-specific navigation.

### Art navigation and showcase naming

Desktop left rail, in Jason’s requested order:

1. Projects — jumps to the collection section.
2. Styles — jumps to browsing by photography style.
3. Home — returns to the top of the Art portfolio, its showcase.
4. About Me — jumps to Jason’s supplied biography.
5. Contact — jumps to supplied contact information.

Use **Selected Works** as the proposed public showcase heading: it describes a curated selection without implying a temporary exhibition or ranking every piece. “Showcase” and “Featured Exhibition” remain editorial alternatives; “Prime Exhibit” is not the working label. Keep **Favorites** as the owner-facing curation term and data model. Selected Works displays those same favorite references, not a new collection.

Put JASON above the rail links, linking back to the overall portfolio landing page with an accessible name such as “Jason — portfolio home.” Include a quiet Tech link separately so visitors can switch disciplines. The rail’s Home link returns to Art, not the split-hero landing page; label its accessible name “Home — Art selected works.”

Art document order is Selected Works → Projects → Styles / Explore → About Me → Contact. The requested rail order does not change the main content order. Styles is the navigation label for the Explore browsing section, headed “Explore by Style,” with All selected initially. Assign zero or more style IDs to each piece; style names and descriptions must come from Jason’s real content. This replaces the earlier optional-filter rule for Art: Styles is a planned destination, with an All view even before categories exist. Do not invent genres or confuse style with camera format or medium.

About Me and Contact use real supplied copy and contact destinations only. Until supplied, use a short intentional empty-state message in these sections so their navigation links remain valid. Do not build a contact form or invent an email address. In-page navigation keeps ordinary scrolling primary; individual pieces and projects still have shareable detail URLs.

### Art rail and image layout

- At 1100px and above, use a 200px left rail, a 48px rail-to-content gap, and 48px outer gutters. Let the main gallery fill remaining space up to 1400px. Rail may be sticky; main document owns scrolling. If rail content is too tall for the viewport, allow it to scroll with the document rather than clipping links.
- Below 1100px, move the rail into a compact top identity block with visible wrapping navigation links. No offscreen sidebar, mandatory menu drawer, or horizontal navigation scrolling.
- Art grids use two generous columns at 700px and above and one below 700px, including Projects and Explore. This overrides the three-column desktop Art values below. Tech’s grid table remains applicable.
- Use black (`#000000`) for the Art canvas, white/off-white text, and square image edges (`0px` radius). Keep any warm accents minimal. Scope these overrides to Art; do not inadvertently restyle Home.
- Keep titles/captions quiet beneath images and preserve natural artwork proportions. The screenshot’s square previews do not authorize destructive crops.

### Monochrome previews, color on interaction

All Art browsing images (Selected Works, project covers, and Explore) appear black and white by default, regardless of the submitted image’s original color. Apply a presentation filter such as `grayscale(1)`; retain original files and color data. Do not permanently convert uploads.

- On a hover-capable pointer, hovering the card reveals the original color with `grayscale(0)` over 240ms. Restore grayscale when hover ends.
- Keyboard focus on the card link reveals the same color; keep a separate visible focus outline. Color must not be the only indication of interactivity.
- “Saturated” means restoring original color, not increasing saturation beyond the source. Originally monochrome photographs remain monochrome; never synthesize color.
- On touch, previews remain monochrome and one tap opens the detail in original color. Do not consume the first tap just to simulate hover. Detail pages always show original color for every input method.
- Provide a compact, accessible “Show original colors” toggle for the Art listing, default off, so visitors can inspect color without holding hover or focus. When enabled, all previews show source colors; expose state with `aria-pressed`. This control is an enhancement, not required for opening work.
- Reduced-motion mode switches filters immediately. Filter only image elements, never text, controls, or the entire page.
- These rules apply to Art previews. Do not apply them to the existing Home hero or Tech screenshots without a later request.

### Selected brand assets: Bard logo and repeating wave

Jason has selected `assets/bard.svg` as the logo and `assets/wave-pattern.svg` (supplied as “Painted Wave Stroke Pattern.svg”) as the repeating Art background. These choices supersede the plain-black-only instruction and the hold on implementing a background asset below. Keep the black canvas underneath.

Use Bard beside JASON in the shared navigation and future Art rail. Render at 40px square with preserved aspect ratio, in white on black. The adjacent name supplies the link’s accessible name, so the logo image has empty alt text. Preserve the supplied source asset.

Tile the wave at an initial 552×304px, in white/silver at 4% opacity, behind Art content only. Use a decorative, noninteractive background layer; never overlay it on photographs or apply its opacity to text. Keep the hero and Tech backgrounds unchanged. Check tile joins and visibility in the final gallery composition; do not claim that the supplied artwork is seamless without visual verification. Tune scale/opacity conservatively if needed for readability.

These are the user-selected assets, not verified examples of a particular Caribbean textile tradition. Cultural provenance research remains deferred; do not attach an invented origin or symbolism to the pattern.

### Deferred research: Caribbean tapestry background

Record only; do not source, generate, or implement a tapestry yet. Jason is considering a near-translucent silver/white Caribbean-inspired textile or tapestry over black. The desired effect is a faint background texture in negative space, with images and text still dominant.

Future research should identify the specific island/community, textile tradition, and personal connection Jason wants represented; do not treat Caribbean cultures as one generic pattern. Document provenance, meaning, and reuse rights for candidate motifs. Review subtle monochrome samples with Jason before choosing a design. Initial future visual trials may explore roughly 2–5% opacity, with no movement, no texture overlay on artwork, and solid backing wherever needed for legibility. Keep the current direction plain black until this research is requested and a treatment selected.

## Page structure and naming

Use these labels consistently. “Favorites” means Jason’s editorial selection, not a visitor bookmarking feature. “Starred Projects” is preferred to “Critical,” which implies severity rather than curation. Recent work can appear in metadata or ordering without becoming another section.

| Art | Purpose | Content |
| --- | --- | --- |
| Selected Works (owner: Favorites) | A curated opening selection | Individual pieces and/or whole art projects |
| Projects | Coherent bodies of work | Series or collections with a cover and multiple pieces |
| Explore by Style (navigation: Styles) | Browse individual works | All published standalone and project-associated pieces, filterable by supplied styles |

| Tech | Purpose | Content |
| --- | --- | --- |
| Starred Projects | Jason’s selected technical work | Featured tech projects |
| Projects | Browse the full technical portfolio | All published tech projects, including starred ones |

Art follows the updated rail and document order above. Tech begins with shared global navigation, a compact page introduction, and Starred Projects / Projects anchor links. These are links to sections, not tabs hiding content.

Tech document order (Art is specified above):

```text
Global navigation: JASON · Home · Art · Tech
Page title + one short introduction
Section anchor navigation
Opening curated section
Projects
Quiet footer / back-to-top link
```

Use one H1 per page, H2 for each section, H3 for card titles where appropriate. Keep introductions within roughly two lines on desktop; never encode invented biographical claims.

## Structured content and Favorites behavior

Treat content as records with stable IDs. Favoriting must reference the original record, not create a second copy.

| Record | Required fields for publication | Optional fields |
| --- | --- | --- |
| Art piece | ID, unique slug, title, image, image alt, publication state | Year, medium, dimensions, caption, project ID, focal point |
| Art project | ID, unique slug, title, cover, cover alt, ordered piece IDs, publication state | Summary, year/date range, cover focal point |
| Art favorite | Target type (`piece` or `art-project`), target ID, explicit order | None needed initially |
| Tech project | ID, unique slug, title, cover, cover alt, summary, publication state | Role, year, screenshots, case-study sections, technologies, live URL, repository URL |
| Tech starred entry | Tech project ID, explicit order | None needed initially |

Publication state is at least draft/published. Draft records never appear in public lists or count totals. Reject duplicate favorite references, missing targets, invalid project membership, and unpublished favorite targets when publishing. Empty art projects remain drafts until they contain at least one published piece.

- A project and one of its pieces may both be favorites. Each remains separately selectable.
- Favoriting a project does not automatically favorite its pieces; favoriting a piece does not favorite its project.
- Favorites keep their curated order. Removing a favorite leaves its source record intact.
- A favored item still appears in its normal Projects or Explore listing. Repetition across sections is intentional; no duplicates within a section.
- A piece opens the same canonical detail view wherever it appears. A project opens its collection, not an arbitrary first piece.
- Unpublishing/deleting a source removes it from public curated lists without leaving broken cards.
- Initial assumption: an art piece belongs to zero or one project. If existing data supports multiple memberships, preserve it and document the mapping before changing the model.

For owner editing, prefer “Add to Favorites” / “Remove from Favorites” and “Star project” / “Unstar project.” Provide keyboard-operable ordering controls such as Move up / Move down alongside any drag interaction. Do not expose these controls to public visitors.

## Layout and visual system

Start with the existing dark palette to connect these pages to Home. Let the artwork supply most of the color. Accent color is for selected navigation and small interactive details, not large decorative panels.

| Token | Initial value | Usage |
| --- | --- | --- |
| `--gallery-bg` | `#0a0a0b` | Page background |
| `--gallery-surface` | `#141416` | Image backdrop, subtle containers |
| `--gallery-text` | `#f2f2f0` | Main text |
| `--gallery-muted` | `#a5a5a0` | Supporting text; verify contrast in context |
| `--gallery-art-accent` | `#ff7a4d` | Art interactive accent |
| `--gallery-tech-accent` | `#4dc3ff` | Tech interactive accent |
| `--gallery-max-width` | `1200px` | Centered content |
| `--gallery-gutter` | `20px / 32px / 48px` | Mobile / tablet / desktop side padding |
| `--gallery-grid-gap` | `24px / 32px / 40px` | Mobile / tablet / desktop gaps |
| `--gallery-section-gap` | `64px / 80px / 112px` | Space between sections |
| `--gallery-radius` | `8px` | Image corners; avoid pill-shaped cards |

Alias existing tokens where possible rather than creating conflicting global definitions. Scope new page styling so it does not regress Home or admin pages.

Use the system sans-serif stack. Page title: `clamp(2.5rem, 5vw, 4.5rem)`, weight 600, line-height 1.08. Section title: `clamp(1.75rem, 3vw, 2.5rem)`, weight 500–600. Card title: 18–20px. Body: 16–18px, line-height 1.5–1.65. Metadata: at least 14px. Avoid long all-caps passages and ultra-light type. Reading text should stay near 65 characters per line.

### Responsive grids

| Width | Favorites / Starred | Projects | Explore |
| --- | --- | --- | --- |
| Below 700px | 1 column | 1 column | 1 column |
| 700–1099px | 2 columns | 2 columns | 2 columns |
| 1100px and above | 2 columns | 3 columns | 3 columns |

Favorites use larger images to feel curated. Start with up to four items visible, then a “Show all selected works” control if needed. Tech uses the same pattern for starred work. Expanding reveals content in place without removing later sections. Art rail, canvas, corners, and column overrides above take precedence over this shared token/grid baseline.

Use CSS Grid in DOM reading order. Avoid CSS-column masonry that causes visual and keyboard reading order to diverge. Unequal artwork proportions are acceptable within aligned rows; negative space is preferable to cropping meaningful art. Projects and Tech covers use a consistent 4:3 preview frame. Art pieces retain natural proportions; a contained image may sit on the surface color. Full views never crop the work. Store editorial focal points where cover cropping is necessary.

A single item should not stretch across the entire desktop viewport: retain normal card width. There is no fixed count of required portfolio entries.

## Cards and detail views

Every card has a visible image, title, and concise metadata beneath it. No essential text appears only on hover. Keep the card container visually quiet: avoid default heavy borders and shadows. Make the image/title area one coherent link with an accessible name that identifies its destination. Do not nest links or buttons inside that link.

Art Favorites identify type with a quiet “Piece” or “Project” label. Art project cards can show the number of published pieces. Explore cards can show year or medium when provided. Tech cards show title and one-sentence summary, with optional role/year; keep technology inventories in the detail view.

### Art piece detail

Open a dedicated, shareable detail URL with an uncropped image, title, supplied metadata, caption if available, and an optional link to its project. Include a clear return link to the originating section when that context is known; direct arrivals get “Back to Art.” Preserve browser Back behavior and restore list position when possible.

An optional enlarged image dialog is an enhancement to the detail page, not the only way to access the work. If implemented: keyboard-accessible open/close controls, Escape to close, focus containment and restoration, visible zoom controls if zoom exists, and no gesture-only operations.

### Art project detail

Show project title, short description if provided, and its ordered pieces in a comfortable vertical gallery. Each piece opens its canonical detail. Include “Back to Projects.” Avoid forcing visitors through slides to discover the contents of a project.

### Tech project detail

Show title, summary, large image, role/year when supplied, then content-driven sections such as Overview, Approach, and Outcome. Render only sections backed by real content. Place live-site and repository links here if valid URLs exist. Do not render fake links, empty case-study sections, or fabricated metrics. Screenshots can form a simple vertical gallery.

## Navigation, motion, and browsing

- Global navigation stays compact and consistent. Mark the current page with `aria-current="page"` and a visible cue beyond color.
- Section links wrap on mobile; do not hide them behind horizontal overflow. If sticky, use an opaque-enough background, avoid stacking oversized sticky bars, and account for height with `scroll-margin-top`.
- Anchor navigation must work without JavaScript. If an active-section indicator is added, it must not alter focus or continuously announce scroll changes.
- No automatic scrolling, scroll snapping, autoplay, or animation that delays content visibility.
- Hover may gently change an underline or surface over 160ms. Keyboard focus must be at least as clear. Avoid zooming the artwork on hover.
- Honor reduced-motion preferences, including disabling smooth scrolling.
- Explore initially shows up to 12 pieces, Projects up to 9, with a labeled “Load more” control if needed. Use a real paginated link fallback and preserve existing results on failure. Avoid infinite scroll.
- Filtering is optional, only when real content warrants it (roughly 12+ pieces). Use categories from actual metadata; never ship nonfunctional filter controls. Default is “All.”

## States and content resilience

| State | Required behavior |
| --- | --- |
| No published work on a page | Keep navigation/title and a restrained “Work will appear here soon.” message; no fake cards or dead section links |
| Empty Favorites / Starred | Art retains its Home/Selected Works destination with a restrained empty state; Tech omits empty Starred and starts with Projects |
| Empty Projects or Explore | Omit that section and anchor; do not imply unseen work exists |
| Loading media | Reserve dimensions to prevent layout shifts; keep captions available |
| Failed image | Preserve card dimensions and title; show a quiet “Image unavailable” fallback |
| Load-more failure | Keep existing items visible and offer Retry |
| Unpublished or missing detail | Return an appropriate not-found state with a useful Art/Tech return link |
| Long title or caption | Wrap naturally; no essential text clipped or hidden behind ellipses |
| Missing optional metadata | Omit its label and separator entirely |
| Disabled control | Explain unavailability where needed; do not use disabled styling for ordinary links |

Suggested editorial lengths: titles 2–8 words, summaries 15–30 words. These are guidance, not destructive truncation rules. Support Unicode and unusually long words without overflow.

## Accessibility and performance requirements

- Provide a visible-on-focus skip link to `main`, semantic landmarks, correct heading order, and descriptive page titles.
- Target WCAG 2.2 AA in implementation; verify text contrast (4.5:1 normal text, 3:1 large text), meaningful control boundaries/focus indicators, and keyboard behavior rather than claiming compliance without testing.
- Use visible focus outlines with adequate offset. Sticky navigation must not cover focused elements.
- Aim for at least 44×44px touch targets for navigation and controls, with adequate separation.
- Supply useful artwork alt text based on the actual image. Decorative repeated imagery gets empty alt only when the adjacent link name already supplies its purpose. Do not fabricate descriptions from filenames.
- Keep visual order aligned with DOM order. Never require hover, drag, swipe, or precise pointer movement to browse.
- Test text zoom and reflow, including 200% zoom and a 320px-wide viewport. Content must remain reachable without horizontal page scrolling.
- Use responsive image sources, explicit width/height or aspect ratio, efficient formats with fallbacks as needed, and native lazy loading below the fold. Do not lazy-load the primary visible image.
- Public browsing must not depend on admin authentication or editor scripts. Avoid shipping full-resolution originals as every thumbnail.
- Prefer ordinary links and server/static-rendered content so essential browsing survives JavaScript failure.

## Subagent work plan and ownership

1. **Inspect and map:** Read this brief, current pages/styles, and existing content/admin contracts. Report a concise mapping of records, routes, and any conflicts. Do not treat the old PRD’s removed photos/placeholders as source content.
2. **Shared foundation:** One owner implements tokens, shell, anchor navigation, accessible card primitives, and breakpoints. Establish these contracts before parallel page work.
3. **Art implementation:** Build the rail, Selected Works (Favorites), Projects, Explore by Style, About Me, Contact, monochrome preview interactions, and detail templates using shared components and canonical records. Leave tapestry research deferred.
4. **Tech implementation:** Build Starred Projects, Projects, and the simpler detail template using the same visual language.
5. **Content integration:** Connect curation and publication rules to existing owner workflows. Coordinate changes to shared files; do not create competing data stores.
6. **Review:** A separate reviewer checks the actual implementation against this document, including content integrity, keyboard paths, mobile browsing, and Home/admin regressions.

Page agents can work in parallel after shared contracts exist. Assign a single owner to shared styles and content schemas to avoid conflicting edits. Each agent reports files changed, decisions, checks actually performed, and remaining issues. Do not invent verification evidence or expand into deployment as part of design work.

## Acceptance checklist

- [ ] Art has Selected Works → Projects → Explore by Style → About Me → Contact, with the requested Projects / Styles / Home / About Me / Contact navigation.
- [ ] Art Home and overall portfolio Home have distinct destinations and accessible labels.
- [ ] Art has a plain black canvas, desktop left rail, two-column desktop gallery, and responsive wrapping navigation.
- [ ] Art previews restore original color on hover and keyboard focus; touch detail access and the color toggle work without simulated hover.
- [ ] Uploads retain their original color data; monochrome originals are never artificially colorized.
- [ ] Bard is the shared logo and the supplied wave repeats subtly behind Art content; cultural tapestry research remains deferred.
- [ ] Art Favorites can mix projects and pieces and resolve to the correct canonical detail.
- [ ] Tech has Starred Projects → Projects, with simple image-led cards.
- [ ] Favorites/starred entries retain independent curated order without duplicating records.
- [ ] Public pages expose only published content and no owner controls.
- [ ] Empty content looks intentional and creates no broken anchors, fake projects, or missing-image requests.
- [ ] Detail navigation works from both lists and direct URLs; browser Back remains useful.
- [ ] Normal vertical scrolling reveals all sections; no required carousel or freeform canvas.
- [ ] Layouts are reviewed at 320, 375, 768, 1024, and 1440px, plus zoom and reduced motion.
- [ ] Keyboard users can reach/open every card and operate any expansion, filtering, or dialog controls.
- [ ] Contrast, focus visibility, meaningful alt text, image failure, and long content are checked.
- [ ] Existing Home and admin/editing behavior remains functional.
- [ ] Review captures desktop/mobile screenshots and reports real remaining limitations.
