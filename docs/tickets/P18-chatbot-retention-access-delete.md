---
id: P18
title: 90-day deletion, Access-gated reading, delete on request
status: open
type: HITL
phase: F
repo: Portfolio, branch redesign/chatbot
model: sonnet
claimed-by:
---
# P18 — Chats live 90 days, only Jason reads them, visitors can ask for deletion

**Blocked by:** P17
**Spec:** stories 26, 27; Guardrails.

## What to build
- A scheduled handler (cron trigger, daily) deletes rows older than 90 days.
- `GET /admin/chats` (list) and `DELETE /admin/chats?session=<id>` on the chat Worker, served only behind Cloudflare Access; the Worker also verifies the Access JWT, so a misconfigured route still refuses.
- The site's chat panel shows the visitor their session id; the contact page says to send it to request deletion.
- HITL: Jason creates the Access application and policy (his email only).

## Acceptance criteria
- [ ] Test: the scheduled handler deletes a 91-day-old row and keeps an 89-day-old one.
- [ ] Test: `/admin/chats` without a valid Access JWT → 403.
- [ ] Test: delete by session id removes only that session's rows.
- [ ] Jason reaches `/admin/chats` through Access (HITL).

## Notes for implementer
- Load ponytail, then tdd. Check how to verify Access JWTs in a Worker in the current Cloudflare docs.
