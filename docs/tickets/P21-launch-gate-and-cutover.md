---
id: P21
title: "Launch gate: red-team pass, unverified facts, custom domain cutover"
status: open
type: HITL
phase: F
repo: Portfolio
claimed-by:
---
# P21 — Launch

**Blocked by:** P18, P20, P11
**Spec:** stories 25, 29; Further Notes → verify before launch; migration (cutover after side-by-side check).

## What to do (Jason, an agent may prepare the checklist)
- [ ] Manual red-team pass on the chat Worker's preview; findings filed as tickets and fixed before launch.
- [ ] Verify: Turnstile free-tier pricing, EU AI Act Article 50 text on eur-lex (and the notice wording against it), AI Gateway log retention, whether Llama Guard powers AI Gateway Guardrails. Update the notice if any differ.
- [ ] Side-by-side check of the workers.dev site against the current GitHub Pages site.
- [ ] Move the domain's nameservers to Cloudflare, attach the custom domain to both Workers, retire GitHub Pages.
- [ ] Confirm rollback: `static-final` redeploys, and `rollback-index` switches the chat namespace.
