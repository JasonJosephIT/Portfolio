---
title: Which engines do the enrichment?
type: wayfinder:grilling
status: closed
claimed-by: jason
---

## Question

Jason wants enrichment to use TypeSafe Jev and his Claude API. Open Thoughts v1 only has the claude CLI, ollama and off (spec section 4, 6.5). Decide: what Jev does (visibility-tag proposals, tag selection, relation picking, scoring) versus what the Claude API does (drafting public records); API key storage in a Tauri app; whether `context-only` and `private` notes may be sent to either service (the existing `claude_privacy_ack` and invariant I6 say what today); cost caps; which engine is allowed to touch which tag class; fallback when offline.

## Blocked by

- none

## Resolution

Decided with Jason, 2026-10-16:

- **Engine roles**: Jev double-checks every draft (grounding in the note, tag and relation choices). Where Jev finds issues, Claude Haiku 5.5 at high effort handles them. Update (Jason): first drafts are written by Claude Opus (current Opus, `claude-opus-5-5`) through the Claude API, following Jason's writing skill (Jason named `frontend-team:better-writing`, 2026-10-16. It is an interface-copy skill: it covers the site's UI text and short summaries well, but says nothing about longer prose such as features and decisions docs, so the spec should say whether those get an extra voice guide). Each proposal card shows which engine did what.
- **What may leave the machine**: `private` items never leave. New items start private; nothing is sent until Jason presses a per-item "Consider for publishing" action. After that the note's content may go to Jev and the Claude API, with the existing privacy acknowledgement still required once.
- **Keys and cost**: API keys live in the macOS Keychain via Tauri, never in settings.json, the repo or the bundle. A monthly spend cap in the app, a cost estimate before each run, and runs refused over the cap.
- **Fallback**: with a missing key or offline, enrichment of public records pauses. No silent switching to another engine for public records. The claude CLI and ollama engines stay for internal notes.
