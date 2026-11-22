---
id: P22
title: Visitor-facing labels on project pages; a build page per project
status: closed
type: AFK
phase: E
repo: Portfolio, branch redesign/astro-tech
model: sonnet
claimed-by:
---
# P22 — Labels for visitors, not the data model; `/tech/<slug>/build`

**Blocked by:** P08, P13
**Decided:** Jason, 2026-10-16 (build content gets its own page; labels taken from the recommendation under his standing approval).

## What to build
On `src/pages/tech/[slug].astro` and the doc pages:
- "Overview" → "What it is"; "Tags" → "Made with"; "Prototype video" → "See it working" (placeholder figure caption too).
- Docs: link text and page titles "Features" → "What it does", "Decisions" → "Why it's built this way" (URLs stay `/features`, `/decisions`).
- "Connected work" with typed sub-headings (Uses / Used by / Built with / Used to build / Part of / Includes / Related) → one plain list under "Related projects", no type sub-headings, de-duplicated by slug.
- Plate numbering stays.
- Build pages: a `builds` content collection over `src/content/builds/<slug>.md` (hand-written for now; the bundle does not carry builds). `src/pages/tech/[slug]/build.astro` exists only for slugs with a file, on the Tech layout, titled "<Project> · How it was built", back link to the project. The project page links "How it was built" only when the file exists. A build file whose slug is not a bundle project fails the build.

## Acceptance criteria
- [ ] Site test: a project page shows "What it is", "Made with", "Related projects" and none of the old labels or relation sub-headings.
- [ ] Site test: doc links read "What it does" / "Why it's built this way".
- [ ] Site test: with a fixture build file for alpha-tool, `/tech/alpha-tool/build/index.html` exists and the project page links to it; beta-site has no link and no page.
- [ ] Site test: a build file for an unknown slug fails the build.
- [ ] `RELATION_LABEL` and any code only the typed groups used are removed.
