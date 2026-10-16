---
id: P15
title: Chunk the bundle, embed, namespace per bundle hash, switch and roll back
status: open
type: AFK
phase: F
repo: Portfolio, branch redesign/chatbot
model: opus
claimed-by:
---
# P15 — The index is built from the committed bundle only

**Blocked by:** P13, P14
**Spec:** story 30; Chatbot → corpus, index.

## What to build
- `chatbot/scripts/build-index.mjs`: reads the committed bundle (projects, profile, docs, relations), splits markdown by heading into chunks of about 300–500 tokens, each with `{ slug, kind, section, url, bundle_hash }`; a project chunk carries its related records' summaries. Pure function `chunkBundle(dir)` plus a thin runner.
- The runner embeds with a Workers AI embedding model (768 or 1024 dims) and upserts into Vectorize under namespace `b-<bundle_hash>`, then sets the active namespace in KV (`ACTIVE_NS`) only after every upsert succeeded.
- `chatbot/scripts/rollback-index.mjs <hash>` sets `ACTIVE_NS` back to a previous namespace.
- Runs on deploy of `main` (wired in the deploy command, not on preview).

## Acceptance criteria
- [ ] Test: `chunkBundle(fixture)` produces chunks only from files in the manifest index plus docs, each under the token cap, each with all five metadata fields.
- [ ] Test: nothing from outside `content/bundle/` (or `BUNDLE_DIR`) is read (pass a dir with a stray file next to it).
- [ ] Test (stub Vectorize and KV): a failed upsert leaves `ACTIVE_NS` unchanged; a full success switches it.
- [ ] Test: rollback sets `ACTIVE_NS` to the given namespace and refuses one that does not exist.

## Notes for implementer
- Load ponytail, then tdd. Count tokens with a simple word-based estimate; no tokenizer dependency.
- Pruning old namespaces is out of scope (spec: "pruned later").
