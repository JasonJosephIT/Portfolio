---
id: P08
title: Tech cards, project pages, related projects and profile from the bundle
status: open
type: AFK
phase: C
repo: Portfolio, branch redesign/astro-bundle
model: sonnet
claimed-by:
---
# P08 — `/tech` shows exactly what the bundle says, nothing more

**Blocked by:** P06, P07
**Spec:** stories 1–7, 15; Testing Decisions → Seam 1.

## What to build
The `/tech` index, `/tech/[slug]` and the About section already render from the bundle (`dcf3f2c`). Lock their output to the spec with tests and strip anything beyond it: cards show name, summary and tags only; project pages show name, summary, tags, description and related projects grouped by relation type; the profile shows headline, bio, skills and interests. The draft banner (`isDraft`) only appears in preview builds.

## Acceptance criteria
- [ ] Site test: each card holds the name, summary and tags of its fixture record and no `<time>`, date string, status word, `github.com` or external `href`.
- [ ] Site test: a project page renders its description markdown and lists each related slug under the right label from `RELATION_LABEL`, linking to `/tech/<slug>`.
- [ ] Site test: a relation pointing at a slug that is not in the bundle fails the build (relations are between public slugs only).
- [ ] Site test: the About section shows the fixture profile headline and every skill.
- [ ] Site test: retagging is wholesale: building from a fixture with one project removed leaves no page or card for it.

## Notes for implementer
- Load ponytail, then tdd. Change markup only where a test fails; the matted-plate design stays.
