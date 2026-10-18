---
title: What is industry standard for a public RAG chatbot's safety?
type: wayfinder:research
status: closed
claimed-by:
---

## Question

Facts only: OWASP Top 10 for LLM Applications (current), prompt-injection and indirect-injection defences for RAG, NIST AI RMF / GenAI profile, abuse and cost controls (rate limits, Turnstile, token caps), PII and secrets leakage, grounding and refusal patterns, logging/retention and privacy notices, Cloudflare Guardrails / Llama Guard options. Output a checklist with sources.

## Blocked by

- none

## Resolution

Latest OWASP LLM list is 2025; key items LLM01 injection, LLM02 disclosure, LLM08 vector weaknesses, LLM09 misinformation, LLM10 unbounded consumption; RAG alone does not stop injection. NIST AI 600-1 suggests red-teaming, go/no-go thresholds, deactivation protocol, AI disclosure. Controls: Turnstile with server-side Siteverify, AI Gateway spend limits and rate limits, kill switch, citations. Caveat: Guardrails do not support streaming; Workers Logs have no redaction. EU AI Act Art. 50 disclosure applies from 2026-08-02 (confirm on eur-lex). Unverified items are flagged in the file.

Full findings with source URLs: `/Users/jsloth/Library/Application Support/Claude/side-session-notes/local_5c10c56d-838a-484c-8862-b12facb6f7de/research-chatbot-safety.md` (kept outside the repo).
