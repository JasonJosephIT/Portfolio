---
id: P01
title: Phase A dropped; the port starts from main
status: closed
type: HITL
phase: A
repo: Portfolio (main checkout ~/Projects/Portfolio)
claimed-by: jason
---
# P01 — Phase A dropped (Jason, 2026-10-16)

## Resolution
The staged changes in the main checkout are not landed and are not the source for the Astro port. They would have:
- removed the 100px side rail (PR #8) and the skip link from Art and Tech;
- restored the retired `?edit=1` drag-to-place overlay in `admin/edit.js` (out of the question);
- brought back Home copy that `1e05001` removed as unverifiable.

Instead the port starts from current `main` (`c373b21`), which `redesign/astro-tech` is already cut from. The generated-gallery system and `admin/` still go away, through P06 and P12. The staged changes stay in the main checkout untouched, for Jason to discard or keep. There is no `static-final` tag on a phase A commit; P21 tags the last static `main` commit before the cutover instead.
