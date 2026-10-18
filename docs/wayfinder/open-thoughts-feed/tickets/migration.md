---
title: How do we migrate from static HTML and the staged changes?
type: wayfinder:grilling
status: closed
claimed-by: jason
---

## Question

Portfolio main has 46 staged/uncommitted changes (the generated-gallery system, admin, content JSON and tests deleted; styles edited) plus the spike branch and several claude/* branches. Decide: land or discard the staged changes first; what is retired (admin/, Supabase, Instatic, generated galleries); how pages move to Astro without losing the diptych design; URL preservation and redirects; cutover and rollback; what happens to the Art page's images.

## Blocked by

- [What is the site architecture on Cloudflare?](site-architecture.md)

## Resolution

Decided with Jason, 2026-10-16:

Land the 46 staged changes as they are on a branch and PR (`chore: retire the generated-gallery system`) first; nothing is discarded or reset, and the PR confirms the reversal of the generated-gallery system is intended. Order, each its own PR: A land staged cleanup; B Astro skeleton with existing pages ported, same look and URLs, preview deploy; C wire the bundle and replace the Tech cards from it; D retire admin/, the Supabase pipeline, Instatic and the place-image command; E docs; F chatbot. Keep `/`, `/art`, `/tech` as clean URLs with 301s from the old `.html` paths. Art stays hand-managed (images in repo or R2); the bundle covers Tech projects and the profile only. Never delete the Supabase project (manual, by Jason). Tag the last static commit `static-final`; rollback is redeploying that tag. Cutover when the workers.dev preview passes a side-by-side check.
