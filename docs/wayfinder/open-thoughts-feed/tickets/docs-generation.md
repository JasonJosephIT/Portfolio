---
title: What docs does Open Thoughts generate and how do they ship?
type: wayfinder:grilling
status: closed
claimed-by: jason
---

## Question

Docs on portfolio features and decisions: what sources (ADRs, specs, project notes), who generates (librarian), the approval path (same review desk?), output format (Markdown into Astro content collections?), how docs relate to the bundle, which docs the chatbot may cite.

## Blocked by

- [What is the bundle format?](bundle-format.md)
- [How does approval work in the review desk?](approval-flow.md)

## Resolution

Decided with Jason, 2026-10-16:

Two doc kinds per public project: a features doc and a decisions doc (ADR-style); the Portfolio is itself one of those projects. Docs are generated only for public items and state only what their notes and ADRs contain. Same pipeline as public records (Opus drafts with Jason's writing skill, Jev checks, a review card, one Approve), as record kind `doc` linked to a parent project slug. Docs ship in the bundle as `docs/<slug>.md`, render in Astro under each project's page, and are cited by the chatbot. When the source note or ADR changes a doc is stale by the record rule: live until revised or unpublished.
