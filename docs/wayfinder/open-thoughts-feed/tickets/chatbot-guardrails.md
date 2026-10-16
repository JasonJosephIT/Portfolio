---
title: What guardrails does the chatbot ship with?
type: wayfinder:grilling
status: closed
claimed-by: jason
---

## Question

Input from the corpus ticket: conversations ARE stored to learn what visitors ask, so decide storage location, retention, the privacy/AI-disclosure notice, PII scrubbing, access and deletion. Settled: Cloudflare Turnstile is the bot check (confirm free-tier pricing here). Turn the safety checklist into decisions: input and output filtering, injection handling, rate and cost limits, Turnstile, refusal and off-topic policy, persona boundaries (speaks about Jason in third person? claims?), logging and retention, privacy notice, kill switch, an eval set that must pass before launch.

## Blocked by

- [What does the chatbot read and how is it built?](chatbot-corpus-and-architecture.md)

## Resolution

Decided with Jason, 2026-10-16:

Chats are stored only in a D1 table owned by the chatbot Worker; AI Gateway logging is off for chat traffic and Workers Logs carry no message bodies. Deleted after 90 days by a scheduled Worker; read only by Jason behind Cloudflare Access; deletion on request via the contact page. A visible notice before the first message (AI assistant, answers from published work, chats stored 90 days, don't share personal info), which also covers the EU AI Act disclosure (confirm the text on eur-lex before launch). Turnstile on the first message per session verified server-side (confirm free-tier pricing), 10 messages/min/session, 500-char cap, AI Gateway daily spend limit, one-flag kill switch. Retrieved text delimited as untrusted, system prompt never revealed, emails/phones scrubbed from stored and shown text; non-streaming responses so AI Gateway Guardrails can check them. Launch gate: a fixed eval set in CI (injection, off-topic, private-data probes, unknown facts, abuse) plus one manual red-team pass by Jason.
