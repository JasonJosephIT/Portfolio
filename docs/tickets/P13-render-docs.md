---
id: P13
title: Render features and decisions docs under each project
status: open
type: AFK
phase: E
repo: Portfolio, branch redesign/astro-docs
model: sonnet
claimed-by:
---
# P13 — `/tech/<slug>/features` and `/tech/<slug>/decisions`

**Blocked by:** P08, OT01 (doc frontmatter in the schema; OT05 is not needed, the fixture is enough)
**Spec:** story 5; Docs.

## What to build
A `docs` content collection over `<bundle>/docs/*.md` (validated by P07's validator). Each project page links to its docs when they exist; `src/pages/tech/[slug]/[kind].astro` renders a doc with the project's name, the doc's headings as an in-page outline, and a link back to the project. Add one features and one decisions doc to the test fixture.

## Acceptance criteria
- [ ] Site test: `/tech/<slug>/features/index.html` and `/decisions/index.html` exist for the fixture project with docs and contain its markdown headings.
- [ ] Site test: a project without docs has no doc links and no doc pages.
- [ ] Site test: a doc whose `parent` is not a bundle project fails the build.
- [ ] Each heading has a stable `id` (the chatbot cites `page#heading`, P16).

## Notes for implementer
- Load ponytail, then tdd. Use Astro's built-in markdown rendering; no extra plugins.
