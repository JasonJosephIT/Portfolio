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

- An Astro site, fully prerendered, served as static assets from a Cloudflare Worker.
- Public pages: `/` (home), `/art` (photography) with a page per art piece, `/tech` (software) with a page per project and its doc and build pages. Tech is fed by the public bundle Open Thoughts exports (pulled into `content/bundle/` by PR); Art is hand-managed in `src/data/art.json`.

## Capabilities and Constraints

- No analytics, no lightbox, no dark/light toggle. Fonts are self-hosted in `public/fonts/`.
- Undecided: the contact address to publish. Until Jason supplies one, contact links carry a clearly marked placeholder.

## Brand Commitments

- Name: "JASON" as the wordmark.
- Tagline, verbatim: "Man is not truly one, but truly two."
- Hero asset: `src/assets/hero.jpg` (split-lit portrait, warm left / cool right), an AI-generated portrait standing in for Jason's own.
- The warm/cool duality as the two accent roles: Art is warm, Tech is cool. The exact hues may be re-derived from the photograph; the roles may not be swapped or collapsed.
- A dark ground is pinned by the photography: the portraits are lit against near-black and must sit in the page, not on it.

## Evidence on Hand

- One portrait: `src/assets/hero.jpg`. No other photographs of Jason's work exist in the repo yet.
- No real project names, descriptions, links, or screenshots yet.
- No testimonials, client logos, press, or metrics. None may be invented.
- Placeholder photos and project cards on the public pages are synthetic, labeled for replacement, and listed in the handoff so Jason can swap in real work.

## Product Principles

1. The work leads and the interface recedes: on Art the photographs are the page; on Tech the projects are.
2. Duality is structural, not decorative: every surface knows which half it belongs to, and the home page is the hinge between them.
3. Honest placeholders: synthetic content is authored at full quality and labeled; factual claims are never fabricated.
4. Progressive enhancement only: every page works with JavaScript off. No external services, except Turnstile and the chat Worker behind the Tech chat widget; images sized and lazy-loaded.
