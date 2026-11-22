---
title: What is the site architecture on Cloudflare?
type: wayfinder:grilling
status: closed
claimed-by: jason
---

## Question

Astro rendering mode (static plus Worker routes for the chatbot?), Pages vs Workers, repo layout, content collections fed by the bundle, how the diptych design ports to Astro components, environments (preview vs production), domain, build triggers. Decides where the chatbot Worker lives relative to the site.

## Blocked by

- [What do the Cloudflare pieces cost and allow?](cloudflare-facts.md)
- [How does Portfolio pull the bundle?](delivery.md)

## Resolution

Decided with Jason, 2026-10-16:

- **Hosting**: one Cloudflare Worker with static assets (not Pages); Astro prerenders every page from the bundle at build time, nothing rendered per request.
- **Chatbot**: a separate Worker (own routes, secrets, Vectorize binding, spend limits) that the site calls. The kill switch and rate limits never touch the static site, and the site works with the chatbot off.
- **Repo**: Astro at the Portfolio repo root replaces the static HTML. `content/bundle/` loads through Astro content collections with a schema check; the diptych design (styles.css, DESIGN.md) is ported into Astro components; old pages are removed once their Astro versions ship.
- **Previews**: a preview URL per PR, including the scheduled pull PR; merging to main deploys production.
- **Domain**: workers.dev first; the custom domain (needs Cloudflare nameservers) at launch.
