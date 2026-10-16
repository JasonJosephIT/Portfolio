---
id: P19
title: "Chat on the site: notice, Turnstile, citations, works when off"
status: open
type: AFK
phase: F
repo: Portfolio, branch redesign/chatbot
model: opus
claimed-by:
---
# P19 — Replace `ChatPlaceholder` with the real chat

**Blocked by:** P17
**Spec:** stories 10–14; Guardrails (visible notice before the first message).

## What to build
`src/components/Chat.astro` (plus a small island if needed) replacing `ChatPlaceholder.astro`. Before the first message it shows the notice: AI assistant, answers from published work, chats stored 90 days, don't share personal info. The first send includes a Turnstile token. It sends the last 3 turns, enforces the 500-char cap in the input, renders citations as links, and shows the session id (P18). If the chat Worker answers 503 `{ off: true }`, errors or times out, the panel says chat is unavailable and links to the contact page; the rest of the page is unaffected. With JS off, the panel is a contact link.

## Acceptance criteria
- [ ] Site test: built pages contain the notice text and no chat request happens on page load.
- [ ] Browser check (Playwright async against `astro preview` with a stub chat endpoint): message → answer with a citation link.
- [ ] Browser check: stub returns 503 → "unavailable" with a contact link; navigation still works.
- [ ] Input refuses a 501st character.
- [ ] Keyboard only: open, type, send, read answer, close.

## Notes for implementer
- Load ponytail, then tdd. Only `src/components/Chat*.astro` and the call sites of `ChatPlaceholder`; do not edit `chatbot/` beyond shared types.
