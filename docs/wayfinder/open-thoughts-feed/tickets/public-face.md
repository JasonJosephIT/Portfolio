---
title: What is the public face?
type: wayfinder:grilling
status: closed
claimed-by: jason
---

## Question

Jason's framing: Open Thoughts holds everything about him; a separate out-facing layer (like Jason's Map items that go out on a resume) is what the Portfolio site and the chatbot both draw from. Decide: what the public face is as a concept; which projects are public (default private, opt in?); who writes the summaries (Claude drafts, Jason approves); which fields exist (name, summary, tags, what else); redaction rules (clients, students, family, secrets); what the spike's card fields (name, summary, tags only) imply for the schema.

## Jason's framing (2026-10-16)

Model it on Jason's Map evidence tags (`resume-safe` / `context-only` / `private`, per node; only `resume-safe` may leave the file, nothing enters that the map does not contain). Open Thoughts' enrichment decides what is outward-facing: it proposes the tag and the public wording, Jason approves, and the enriched result is placed in a separate public section. The Portfolio and the chatbot draw only from that section.

## Blocked by

- none

## Resolution

Decided with Jason, 2026-10-16:

- **Visibility tags** on every project and every claim in Open Thoughts: `public`, `context-only`, `private` (the Map's evidence-tag scheme). New items start `private`. Enrichment proposes a tag; Jason approves in the review desk.
- **Public record**: for each `public` item, enrichment drafts a separate public record (public summary, tags, long description, relations, media). Claude drafts, Jason approves. Only public records are bundled; the internal note is never published as is. No status, dates, repo or URL links.
- **Iron rule**: a public record may state only what the evidence-tagged internal note contains (no invented outcomes, numbers or names). OT's redaction check blocks approval on a hit. Client or person names need an explicit "named publicly" tick.
- **Profile**: a `profile` public record (bio, skills, interests) drawn from the Map's resume-safe items, same tags and approval.
- Which projects are public is therefore decided per item by tag, not by a list.
