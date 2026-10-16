---
id: P17
title: Turnstile, rate and spend limits, D1 storage with scrubbing
status: open
type: AFK
phase: F
repo: Portfolio, branch redesign/chatbot
model: opus
claimed-by:
---
# P17 — Bound abuse and cost; store chats in D1 only

**Blocked by:** P16
**Spec:** stories 26, 28; Guardrails.

## What to build
- Turnstile: the first message of a session carries a token, verified server-side with siteverify; the Worker then issues a short-lived signed session id. Later messages need that id.
- Rate limit: 10 messages per minute per session (Workers rate limiting binding), 429 beyond.
- D1 table `chats(id, session_id, created_at, question, answer, citations)`; question and answer stored with emails and phones scrubbed. Nothing else stores message bodies: AI Gateway logging off for chat traffic (config), no bodies in Workers Logs.
- AI Gateway daily spend limit set in config; the kill switch from P14 stays one flag.

## Acceptance criteria
- [ ] Eval: first message without a Turnstile token → 403; with a valid (test-key) token → 200 and a session id.
- [ ] Eval: the 11th message in a minute on one session → 429.
- [ ] Eval: after a chat, D1 holds one row whose question has its email scrubbed.
- [ ] Eval: `console` spy sees no question or answer text during a full request.
- [ ] `wrangler.jsonc` documents the AI Gateway id with logging off and the daily limit (HITL to set in the dashboard is listed in the PR).

## Notes for implementer
- Load ponytail, then tdd. Use Turnstile's published test secret keys in tests.
