---
type: spec
status: ready-for-agent
repo: Portfolio
source: docs/wayfinder/open-thoughts-feed/map.md
sibling: Open Thoughts spec (not yet written; shares the bundle contract)
---
# Spec: Portfolio becomes an Astro site fed by Open Thoughts

Uses the terms in `CONTEXT.md`: visibility tag, public record, bundle, profile.

## Problem Statement

Jason's portfolio is hand-written static HTML. Its Tech page shows placeholder projects, and keeping it current means editing HTML by hand. Jason works on projects all the time and records that work in Open Thoughts, but nothing connects the two. Visitors can't ask questions about his work. He wants the site to update from what he approves, to explain his projects and decisions, and to answer visitors' questions safely.

## Solution

Rebuild the site in Astro on Cloudflare. It pulls an approved bundle that Open Thoughts exports, and renders Tech projects, the profile and generated docs from it. Open Thoughts never pushes. A daily local job copies the exported bundle into the repo and opens a PR; Jason merges it, which deploys. A separate chatbot Worker answers visitor questions from that same committed bundle only, with the guardrails below. The site works with the chatbot off.

## User Stories

1. As a visitor, I want the Tech page to list real projects, so that I can see what Jason has built.
2. As a visitor, I want each project card to show name, summary and tags only, so that the page stays clean.
3. As a visitor, I want no status, last-worked date, repo link or URL on cards, so that nothing stale or private shows.
4. As a visitor, I want a page per project with its description, so that I can read more.
5. As a visitor, I want a features doc and a decisions doc under each project, so that I can see how it works and why Jason built it that way.
6. As a visitor, I want to see related projects, so that I can follow connections (uses, part-of, built-with, related-to).
7. As a visitor, I want a profile about Jason, so that I know who built this.
8. As a visitor, I want `/`, `/art` and `/tech` to keep working, and old `.html` links to redirect, so that no link breaks.
9. As a visitor, I want the Art page to look as it does now, so that the redesign isn't lost.
10. As a visitor, I want to ask the chatbot about Jason's work, so that I can find things without reading every page.
11. As a visitor, I want chatbot answers to cite the project page they came from, so that I can check them.
12. As a visitor, I want the chatbot to say it doesn't know and point to the contact page when it can't answer, so that I'm not misled.
13. As a visitor, I want a notice before my first chat message (AI assistant, answers from published work, chats stored 90 days, don't share personal info), so that I know what happens to my words.
14. As a visitor, I want the site to work when the chatbot is off or down, so that the portfolio never depends on it.
15. As Jason, I want only `public` items to reach the site and the chatbot, so that client work and private notes never leak.
16. As Jason, I want a daily job that pulls the exported bundle and opens a PR, so that updates reach me without manual copying.
17. As Jason, I want no PR when the export hasn't changed, and nothing to happen when the export folder is missing, so that the job is quiet.
18. As Jason, I want to merge the PR myself, so that nothing deploys without me.
19. As Jason, I want a preview URL for every PR, including the pull PR, so that I can check before merging.
20. As Jason, I want the build to fail on an invalid or too-new bundle, so that a bad export never goes live.
21. As Jason, I want an item retagged away from `public` to vanish from the next bundle, so that withdrawing something works.
22. ~~As Jason, I want the 46 staged changes landed first~~ (dropped 2026-10-16; the port starts from `main`).
23. As Jason, I want a `static-final` tag on the last static commit, so that rollback is redeploying it.
24. As Jason, I want admin/, the Supabase pipeline, Instatic and the place-image command retired without deleting the Supabase project, so that I delete that myself later.
25. As Jason, I want the site on workers.dev first and the custom domain at launch, so that I can check everything before the switch.
26. As Jason, I want chats stored only in a D1 table, deleted after 90 days, and readable only by me behind Cloudflare Access, so that visitor data is limited.
27. As Jason, I want a delete-on-request path via the contact page, so that visitors can have their chats removed.
28. As Jason, I want Turnstile on the first message, 10 messages a minute per session, a 500-character cap, a daily spend limit and a one-flag kill switch, so that abuse and cost stay bounded.
29. As Jason, I want a fixed chatbot eval set to run in CI, plus one manual red-team pass by me before launch, so that the chatbot ships only when it's safe.
30. As Jason, I want rollback of the chatbot index to be switching back to the previous namespace, so that a bad build is quick to undo.

## Implementation Decisions

Settled in the map's tickets (all decided with Jason on 2026-10-16).

Site
- One Cloudflare Worker with static assets (not Pages). Astro prerenders every page from the bundle at build time; nothing renders per request.
- Astro lives at the repo root and replaces the static HTML. `content/bundle/` loads through Astro content collections with a schema check. The diptych design (styles.css, DESIGN.md) is ported into Astro components.
- Pages `/`, `/art`, `/tech` stay as clean URLs; old `.html` paths 301 to them. Art stays hand-managed (images in the repo or R2); the bundle covers Tech projects, the profile and docs only.
- A preview per PR; merging to main deploys production. workers.dev first, custom domain at launch.

Bundle contract (shared with the Open Thoughts spec)
- A directory: `bundle.json` manifest (schema_version, generated_at, content hash, record index), `projects/<slug>.json`, `profile.json`, `relations.json`, `docs/<slug>.md`.
- Project record: slug, name, summary, tags, description (markdown), media references, approved_at, source_hash. Media is by reference only (key, kind, checksum, poster key, caption).
- Open Thoughts owns the JSON Schema; Portfolio vendors a copy and validates again at pull. Integer schema_version; Portfolio refuses a newer major and fails the build.
- Every bundle is a full snapshot; the slug is the stable id; no tombstones. Relations are typed edges between public slugs only.

Delivery
- Open Thoughts has an Export button that writes the approved bundle to a fixed local folder. Portfolio has a pull command that copies it to `content/bundle/`, validates, and opens a PR with `gh`.
- A macOS launchd job runs the pull daily. It is a plain script, no LLM, and works when Claude is closed. No PR on no change; no-op if the export folder is missing. No auto-merge, no auto-deploy.
- The committed bundle is the single source for both the site and the chatbot index.

Docs
- Two kinds per public project: features and decisions (ADR-style). They ship in the bundle as markdown, render under each project's page, and are cited by the chatbot. Generation and approval happen in Open Thoughts.

Chatbot (separate Worker with its own routes, secrets, Vectorize binding and spend limits)
- Corpus: the committed bundle only. Chunk by markdown heading (about 300-500 tokens), each chunk carrying slug, kind, section title and bundle hash. Relations pull in related records' summaries.
- Index: Workers AI embeddings (768 or 1024 dims). Each deploy builds a Vectorize namespace named by the bundle hash; the Worker switches to it after the build succeeds; old ones are pruned later.
- Answers: a Workers AI chat model behind AI Gateway first; moving to a Claude model is a config change. Answers only from retrieved chunks with citations; says it doesn't know when retrieval is weak; third person; no general chat or code writing. The browser sends the last 3 turns per question; no server-side session state.
- Guardrails: chats in D1 only, AI Gateway logging off for chat traffic, no message bodies in Workers Logs; 90-day deletion by a scheduled Worker; read only by Jason behind Cloudflare Access. Visible notice before the first message (also covers EU AI Act disclosure). Turnstile on the first message, verified server-side. 10 messages/min/session, 500-char cap, AI Gateway daily spend limit, kill switch. Retrieved text delimited as untrusted; system prompt never revealed; emails and phones scrubbed from stored and shown text; non-streaming so AI Gateway Guardrails can check responses.

Migration phases, each its own PR
- A dropped (Jason, 2026-10-16): the staged changes would remove the side rail and skip link and restore the retired `?edit=1` overlay, so they are not landed. The port starts from `main`; C and D remove the generated-gallery system and admin/. B Astro skeleton with existing pages ported, preview deploy. C wire the bundle and replace the Tech cards from it. D retire admin/, Supabase pipeline, Instatic and place-image. E docs. F chatbot.
- Tag the last static commit `static-final`. Cut over when the workers.dev preview passes a side-by-side check.

## Testing Decisions

A good test checks external behavior only: what the built site contains and what the Worker returns. It does not test internals.

Seam 1, site: build Astro from a fixture bundle and assert on the built HTML.
- Cards show name, summary and tags only. Private and context-only items are absent. An invalid or too-new bundle fails the build. Redirects and clean URLs resolve.
- The pull script is tested at the same seam: a fixture export folder in, a validated `content/bundle/` out; unchanged export opens no PR; missing folder is a no-op.

Seam 2, chatbot: call the chatbot Worker's HTTP endpoint against a fixture index and run the fixed eval set.
- Injection attempts, off-topic requests, private-data probes, unknown facts, abuse, rate limit, character cap and kill switch. Runs in CI. The manual red-team pass by Jason is a launch gate.

Prior art: none in the repo for these. The old `tests/*.mjs` (node test runner) were deleted in the staged cleanup; reuse that runner style (`node --test`) if it fits Astro's build.

## Out of Scope

- Obsidian, in any role.
- Open Thoughts pushing anywhere.
- A CMS or admin UI inside Portfolio.
- Any host other than Cloudflare.
- Prototype hosting (deferred by Jason; the bundle already carries media references).
- The Open Thoughts side: visibility tags, public records, the review desk, enrichment engines, the Export button, the schema. These belong to the Open Thoughts spec.

## Further Notes

- Not yet specified (from the map): where Art images come from and how they flow into Astro; porting DESIGN.md into components and the image pipeline; performance and accessibility budgets; analytics, SEO and social previews; bundle refresh cadence and a "last pulled" display; chatbot quality evals and cost monitoring after launch; placeholders and contact details still owed by Jason.
- Verify before launch (flagged unverified in research): Turnstile free-tier pricing, EU AI Act Article 50 text on eur-lex, AI Gateway log retention, whether Llama Guard powers AI Gateway Guardrails.
- The spike (`spike/open-thoughts-feed`) proves only card-fill from a feed; it is superseded by phase C.
- **Existing work to start from (do not rebuild):** branch `redesign/astro-tech`, worktree `~/Projects/Portfolio-astro` (last commit dcf3f2c). It already has Astro 7, React, Tailwind v4 and shadcn/ui; content collections reading `content/bundle/` (gitignored while drafts are pending); `scripts/pull-bundle.mjs` (refuses a newer schema, and refuses an unapproved bundle unless `--preview`); `/tech` and `/tech/[slug]` in the matted-plate design; and placeholders for prototype video and the chatbot. Tickets for phases B and C start from this branch. Remaining gaps: the home and art ports, the Cloudflare Worker deploy, the review-desk approval, and the 46 staged changes (phase A).
- The bundle for that preview comes from Open Thoughts branch `build/enrichment` (`scripts/enrich.py`: Opus 5.5 drafts, Jev checks every claim, Haiku 5.5 fixes flags), writing `~/Projects/Open Thoughts/exports/bundle` with approval still pending. Reported by the Wiki process session; the branch exists but `enrich.py` was not inspected here.
- The staged changes in the main checkout are left untouched; they are not part of this build.
- Research notes: `research-cloudflare-facts.md` and `research-chatbot-safety.md` in the shared notes folder.
