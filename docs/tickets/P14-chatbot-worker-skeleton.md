---
id: P14
title: "Chatbot Worker skeleton: endpoint, cap, kill switch, eval harness"
status: closed
type: AFK
phase: F
repo: Portfolio, branch redesign/chatbot
model: opus
claimed-by:
---
# P14 — `chatbot/`: a separate Worker that can say no

**Blocked by:** P03
**Spec:** stories 14, 28 (cap, kill switch); Chatbot (separate Worker); Testing Decisions → Seam 2.

## What to build
`chatbot/` with its own `wrangler.jsonc` (Worker `jason-portfolio-chat`, own routes, no bindings yet besides a `CHAT_ENABLED` var) and `src/index.ts`:
- `POST /chat` with `{ message, history[] }`. Rejects bodies over 500 chars in `message` (413), history over 3 turns or over the same cap per turn (400), and non-JSON (400).
- `CHAT_ENABLED !== "true"` → 503 with `{ off: true }` for every request (the kill switch).
- Otherwise a stub answer `{ answer, citations: [] }` saying it does not know yet.
- CORS limited to the site's origins.
- `chatbot/test/eval.test.ts` (Vitest with `@cloudflare/vitest-pool-workers`) calling the Worker over HTTP; the eval cases live in `chatbot/test/evals.json` so later tickets only add data.

## Acceptance criteria
- [ ] Eval: 501-char message → 413; 500-char → 200.
- [ ] Eval: 4 history turns → 400.
- [ ] Eval: kill switch off → 503 for a valid request.
- [ ] Eval: request from an unlisted origin gets no CORS allow header.
- [ ] `chatbot/` has its own `package.json`; the site build does not import it.

## Notes for implementer
- Load ponytail, then tdd. Check the current `vitest-pool-workers` setup in the Cloudflare docs before wiring tests.
- No message body is ever passed to `console.log` (story 26); add an eval-adjacent test that spies on `console` and asserts that.
