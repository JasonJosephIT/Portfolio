---
title: How does Open Thoughts enrich the bundle with relations?
type: wayfinder:grilling
status: closed
claimed-by: jason
---

## Question

Relations from maps and graphs: which sources (Jason's Map pages in daydream/map, graphify graphs of project repos, curator saves), relation types (uses, built-with, related-to, part-of), who computes them (librarian vs script), how they get approved, and what the site and the chatbot do with them (related-project links, retrieval boosting). Read OT's graphify-out/GRAPH_REPORT.md first.

## Blocked by

- [What is the bundle format?](bundle-format.md)

## Resolution

Decided with Jason, 2026-10-16:

- **Sources and types**: relations are proposed from four sources: project notes (tools/skills mentioned), Jason's Map pages and anchors (for the profile), each project's graphify graph, and shared tools across projects. Four edge types: `uses`, `part-of`, `built-with`, `related-to`. Only edges between public records are exported; an edge to a non-public item is dropped silently at export.
- **Who computes**: scripts extract candidate edges (deterministic, no LLM); the librarian selects and labels them; each edge lists its evidence on the review card; edges are approved with the record.
- **Tags**: free-form on the first enrichment run, then consolidated into a controlled vocabulary kept in Open Thoughts; after that a new tag needs Jason's approval.
- **Engines**: enrichment should use TypeSafe Jev and Jason's Claude API, not only the claude CLI/ollama engines in the v1 spec. The split and the privacy handling are a new ticket (Which engines do the enrichment?).
