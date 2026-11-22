---
title: How are prototypes hosted, video first?
type: wayfinder:grilling
status: closed
claimed-by:
---

## Question

Video: storage (R2 vs Stream), format and size budget, poster frames, captions, who produces them, how the bundle references them, player. Later JS shells: sandboxed iframes on a separate origin, what a shell may do, review before publish. Decide the video path now and only the boundary for shells.

## Blocked by

- [What do the Cloudflare pieces cost and allow?](cloudflare-facts.md)
- [What is the bundle format?](bundle-format.md)

## Resolution

Deferred by Jason, 2026-10-16 ("leave the prototyping till later"); closed without a decision and moved to Not yet specified. Inputs already settled: media is referenced by key in the bundle (bytes never in it, with poster and caption fields), video first, JS shells later. Research facts for whoever picks it up: R2 egress is free, a production public bucket needs a custom domain, Wrangler uploads cap at 315 MB, Stream is the paid alternative (see research-cloudflare-facts.md in the shared notes folder).
