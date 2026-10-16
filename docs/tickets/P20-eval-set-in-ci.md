---
id: P20
title: Full fixed eval set and site tests in CI
status: open
type: AFK
phase: F
repo: Portfolio, branch redesign/chatbot
model: sonnet
claimed-by:
---
# P20 — The eval set gates every PR

**Blocked by:** P17, P19
**Spec:** story 29; Testing Decisions → Seam 2.

## What to build
Complete `chatbot/test/evals.json` to the spec's list: injection attempts (direct and via a poisoned fixture chunk), off-topic requests, private-data probes (client names not in the bundle, Jason's address or phone), unknown facts, abuse text, rate limit, character cap and kill switch. `.github/workflows/test.yml` runs `pnpm test` (site seam) and the chatbot evals on every PR with no Cloudflare credentials (fixture index, stubbed AI).

## Acceptance criteria
- [ ] At least 5 cases per category; every case has an expected outcome the test asserts.
- [ ] The workflow passes locally with `act` or by running its steps by hand.
- [ ] A deliberately broken guard (e.g. cap raised to 501) makes CI fail (shown once, then reverted).

## Notes for implementer
- Load ponytail, then tdd. Model-quality evals against a live model are out of scope (spec: "after launch").
