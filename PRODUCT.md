# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Prospective clients for either half of Jason's work: people looking to book a photographer (portrait and self-portrait work shot in available light) and people looking to hire a software developer (small tools through full-stack products). They arrive from a link, a social profile, or search, usually on a phone or laptop, and are deciding in under a minute whether the work is good enough to get in touch about. Confirmed 2026-09-05.

## Product Purpose

A personal portfolio in two halves, Art and Tech, that shows both bodies of work at their best and gets a visitor to reach out to hire or book. Success is a contact from a real client.

## Positioning

One person, two disciplines, presented as a single identity rather than two sites. The site's governing idea is the Jekyll-and-Hyde line "Man is not truly one, but truly two." The split-lit portrait (warm light on one side, cool light on the other) is the literal image of that idea and the source of the site's two accent roles: warm for Art, cool for Tech.

## Operating Context

- Static site: plain HTML and CSS, no build step, no framework, served from GitHub Pages (repo `JasonJosephIT/Portfolio`).
- Content pipeline: Jason submits photos and projects through a private admin area (`/admin/`, Supabase magic-link auth + storage inbox), drags them into place on the live page with `?edit=1`, and a Claude Code command (`/place-image`, see `.claude/commands/place-image.md`) bakes each placement into the HTML and CSS and commits it.
- The admin area is out of scope for the 2026-09-05 redesign; it stays functional and inherits tokens from `styles.css`.

## Capabilities and Constraints

- Three public pages: `index.html` (home), `art.html` (photography), `tech.html` (software). Shared nav markup on all three.
- Public pages carry no runtime JavaScript for visitors except the three-line `?edit=1` loader on `art.html` and `tech.html`. No analytics, no lightbox, no dark/light toggle.
- **Markup contracts the pipeline depends on (must not change):**
  - `art.html`: gallery container is `.gallery`; each work is `<a href="assets/photo-NN.jpg"><img src="assets/photo-NN.jpg" alt="..." loading="lazy"></a>` as a direct child of `.gallery`. Placement specs reference `.gallery > :nth-child(n)`.
  - `tech.html`: projects container is `.project-grid` inside `.projects`; each project is `.project-card` containing `h3`, `p`, `.tech-tags` (spans), `.project-link`. Skills are `.skills .skill-pills > .skill-pill`.
  - `admin/edit.js` resolves `.gallery`, `.projects .project-grid`, and `.page-title` by selector; those hooks must exist.
- Image files live in `assets/`, named `photo-NN.jpg` (art) or `project-<slug>.jpg` (tech), lazy-loaded, with meaningful alt text.
- Design tokens live in `styles.css` as CSS custom properties; the admin stylesheet reads `--bg`, `--text`, `--muted`, `--accent-art`, `--accent-tech`, `--space`, `--radius`, `--nav-height`, so those names must survive any token overhaul.
- Fonts: the original PRD pinned a system stack and forbade font CDNs. Inferred (not confirmed): the intent was "no third-party runtime dependencies on public pages"; self-hosted font files in `assets/fonts/` are acceptable.
- Undecided: the contact address to publish. Until Jason supplies one, contact links carry a clearly marked placeholder.

## Brand Commitments

- Name: "JASON" as the wordmark.
- Tagline, verbatim: "Man is not truly one, but truly two."
- Hero asset: `assets/hero.jpg` (split-lit portrait, warm left / cool right). Alternate take: `assets/hero-soul.jpg`. Both are AI-generated portraits standing in for Jason's own.
- The warm/cool duality as the two accent roles: Art is warm, Tech is cool. The exact hues may be re-derived from the photograph; the roles may not be swapped or collapsed.
- A dark ground is pinned by the photography: the portraits are lit against near-black and must sit in the page, not on it.

## Evidence on Hand

- Two portraits: `assets/hero.jpg`, `assets/hero-soul.jpg`. No other photographs of Jason's work exist in the repo yet.
- No real project names, descriptions, links, or screenshots yet.
- No testimonials, client logos, press, or metrics. None may be invented.
- Placeholder photos and project cards on the public pages are synthetic, labeled for replacement, and listed in the handoff so Jason can swap in real work.

## Product Principles

1. The work leads and the interface recedes: on Art the photographs are the page; on Tech the projects are.
2. Duality is structural, not decorative: every surface knows which half it belongs to, and the home page is the hinge between them.
3. The pipeline's markup contracts are load-bearing: new looks change CSS and surrounding structure, never the container and item selectors the placement tools write into.
4. Honest placeholders: synthetic content is authored at full quality and labeled; factual claims are never fabricated.
5. Static and fast for visitors: no runtime JavaScript, no external services, images sized and lazy-loaded.
