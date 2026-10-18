---
title: What do the Cloudflare pieces cost and allow?
type: wayfinder:research
status: closed
claimed-by:
---

## Question

Facts only: Astro on Cloudflare (Pages vs Workers static assets, adapter, SSR vs static), Workers, Vectorize (index limits, dimensions, free tier), Workers AI embedding and chat models, R2 (video egress, public buckets, signed URLs), AI Gateway (logging, rate limits, guardrails), Turnstile, cron triggers. Current limits and pricing as of today, with sources.

## Blocked by

- none

## Resolution

Use Workers Static Assets, not Pages, for new projects; a Worker (via @astrojs/cloudflare) is needed for the chatbot and cron. Vectorize max 1536 dims (Workers AI embeddings fit); verify in the dashboard whether a Free account can create an index. R2 egress is free; production video needs a custom domain; Stream is the paid alternative. Workers AI free allowance 10,000 Neurons/day, some chat models need Paid. AI Gateway rate limits and Turnstile are free.

Full findings with source URLs: `/Users/jsloth/Library/Application Support/Claude/side-session-notes/local_5c10c56d-838a-484c-8862-b12facb6f7de/research-cloudflare-facts.md` (kept outside the repo).
