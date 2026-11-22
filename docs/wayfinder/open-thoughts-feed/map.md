---
type: wayfinder:map
status: cleared
---
# Map: Portfolio becomes an Astro site fed by Open Thoughts

## Destination

A cleared map from which one `/to-spec` can be written, phased: 1) Astro site on Cloudflare that pulls an approved, enriched bundle from Open Thoughts, 2) generated docs, 3) a safe RAG chatbot. Cleared means no open decision ticket remains.

## Notes

- Consult `graphify-out/GRAPH_REPORT.md` and use `/graphify query` before reading code. (Open Thoughts has a graph; Portfolio has none yet.)
- Decision tickets only, no product code. Open Thoughts is read-only unless a ticket says otherwise.
- Settled before charting: PRD "no build / no backend" rule retired; Astro; Cloudflare; no Obsidian; Portfolio pulls, Open Thoughts never pushes; cards show name, summary, tags only (no status, dates, repo or URL links); prototypes on the site, video first; approval reuses Open Thoughts' review desk; the **public face** (what Jason chooses to show outwardly, enriched by Open Thoughts) is the single source for both the site and the chatbot corpus.
- Spike: branch `spike/open-thoughts-feed`, worktree `~/Projects/Portfolio-spike`, proves card-fill from `content/portfolio-feed.json` via `scripts/sync-open-thoughts.mjs`. Proof of the card step only.
- Tracker: local markdown. Each ticket is `tickets/<slug>.md`; claim by filling `claimed-by`; close by setting `status: closed`, writing the Resolution, and adding a line below.

## Spec split (Jason, 2026-10-16)

Two specs, one per repo, both written from this map:

- **Open Thoughts spec** (repo `~/Projects/Open Thoughts`): visibility tags and the "Consider for publishing" action; public records; publish and revise proposals; docs record kind; enrichment (relations, tag vocabulary, engines: Opus, Jev, Haiku 5.5, Keychain, spend cap); Export button, schema and export gate. Tickets: public face, approval flow, enrichment, enrichment engines, the Open Thoughts side of bundle format and docs generation.
- **Portfolio spec** (this repo): Astro on a Cloudflare Worker, content collections over the bundle, pull command and scheduled PR, previews, migration phases A-F, docs rendering, the chatbot Worker and its guardrails. Tickets: delivery, site architecture, migration, chatbot corpus and architecture, chatbot guardrails, the Portfolio side of bundle format and docs.
- **Shared contract**: the bundle schema (OT owns the JSON Schema, Portfolio vendors it). Both specs link to the bundle format ticket rather than restating it.

## Decisions so far

- Destination, tracker, approval starting point, out-of-scope list and chatbot corpus default were settled with Jason while charting (see Notes).
- Bot check on the chatbot: Cloudflare Turnstile (Jason, 2026-10-16). Its pricing is to be confirmed in the guardrails ticket.

- [What do the Cloudflare pieces cost and allow?](tickets/cloudflare-facts.md): Use Workers Static Assets, not Pages, for new projects; a Worker (via @astrojs/cloudflare) is needed for the chatbot and cron.
- [What is industry standard for a public RAG chatbot's safety?](tickets/chatbot-safety-standards.md): Latest OWASP LLM list is 2025; key items LLM01 injection, LLM02 disclosure, LLM08 vector weaknesses, LLM09 misinformation, LLM10 unbounded consumption; RAG alone does not stop injection.

- [What is the public face?](tickets/public-face.md): Items carry public/context-only/private tags (new = private); enrichment drafts a separate public record that Jason approves; grounded in the note, redaction blocks, names need a tick; a profile record too.
- [What is the bundle format?](tickets/bundle-format.md): Directory bundle (manifest, per-record JSON, relations.json, docs as markdown), OT owns the JSON Schema and both sides validate, full snapshots with slug ids, media by reference, integer schema_version.

- [How does Portfolio pull the bundle?](tickets/delivery.md): Export button in OT, scheduled local pull opens a PR, bundle committed to git; index rebuilt from it on each deploy.
- [How does approval work in the review desk?](tickets/approval-flow.md): One publish card per record (tag+text+relations), new `revise` kind with diff, stale records stay live until revised, human-only export gate with re-scan.
- [How does Open Thoughts enrich the bundle with relations?](tickets/enrichment.md): Four sources, four edge types (uses, part-of, built-with, related-to), scripts propose and Claude selects, approved with the record; tags free-form first then controlled; Jev + Claude API wanted.

- [What is the site architecture on Cloudflare?](tickets/site-architecture.md): One Worker with static assets, fully prerendered; separate chatbot Worker; Astro at repo root with content collections; preview per PR; workers.dev first.
- [Which engines do the enrichment?](tickets/enrichment-engines.md): Opus drafts with Jason's writing skill, Jev double-checks, Haiku 5.5 high fixes issues; private never leaves without a per-item consider action; Keychain keys, monthly cap; pause rather than switch engines.

- [What does the chatbot read and how is it built?](tickets/chatbot-corpus-and-architecture.md): Bundle-only corpus chunked by heading, namespace per bundle hash, Workers AI behind AI Gateway, answers only from retrieved chunks with citations; conversations stored (guardrails decides retention and notice).

- [What guardrails does the chatbot ship with?](tickets/chatbot-guardrails.md): Chats in D1 only, 90-day retention, visible notice, Turnstile + rate/spend limits + kill switch, non-streaming with Guardrails, eval set in CI plus manual red-team gate.
- [What docs does Open Thoughts generate and how do they ship?](tickets/docs-generation.md): Features + decisions docs per public project, same pipeline and approval (kind doc), shipped in the bundle as markdown, stale rule as records.
- [How do we migrate from static HTML and the staged changes?](tickets/migration.md): Land staged changes first on a branch; phased PRs A-F; clean URLs with 301s; Art hand-managed; retire admin/Supabase/Instatic without deleting the Supabase project; static-final tag for rollback.
- [How are prototypes hosted, video first?](tickets/prototype-hosting.md): Deferred by Jason; see Not yet specified.

## Frontier (open and unblocked)

None. The map is clear.

## Not yet specified

- Prototype hosting (video first, JS shells later): deferred by Jason; the bundle already carries media references. Revisit as a later phase of the spec.
- Opus drafts follow `frontend-team:better-writing` (Jason's pick); decide in the spec whether long docs need a voice guide beyond it.
- Art page: where art images and galleries come from (not in Open Thoughts today) and how they flow into Astro.
- Porting the diptych design (DESIGN.md) into Astro components; image pipeline; accessibility and performance budgets.
- Analytics, SEO, social previews.
- Bundle refresh cadence and the "last pulled" display, once delivery is decided.
- Chatbot quality evals and cost monitoring after launch.
- JS prototype shells beyond the boundary decided in prototype hosting.
- Placeholders and contact details still owed by Jason (from the diptych redesign).

## Out of scope

- Obsidian as a view or store.
- Open Thoughts pushing anywhere (it only exposes; Portfolio pulls).
- A CMS or admin UI inside Portfolio; admin/, Supabase and Instatic are retired (the migration ticket decides how).
- Any host other than Cloudflare.
