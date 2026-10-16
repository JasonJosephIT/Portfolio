---
title: What does the chatbot read and how is it built?
type: wayfinder:grilling
status: closed
claimed-by: jason
---

## Question

Corpus is the public face plus generated docs, decided by Jason: the same approved layer that feeds the site. Decide chunking, embedding model, Vectorize index per bundle version, re-index on each bundle pull, citation of sources, model choice, conversation limits, what it says when it does not know.

## Blocked by

- [What do the Cloudflare pieces cost and allow?](cloudflare-facts.md)
- [What is industry standard for a public RAG chatbot's safety?](chatbot-safety-standards.md)
- [What is the bundle format?](bundle-format.md)
- [How does Open Thoughts enrich the bundle with relations?](enrichment.md)

## Resolution

Decided with Jason, 2026-10-16:

- **Corpus**: the committed bundle only: public project records, the profile, generated docs and relations. Never raw notes, journal, sessions, curator data, or context-only/private items.
- **Chunking**: split by markdown heading into chunks of about 300-500 tokens, each carrying record slug, kind, section title and bundle hash. Relations pull in the summaries of related records when a question touches them.
- **Index**: Workers AI embeddings (768 or 1024 dims, under Vectorize's 1536 cap). Each deploy builds a new Vectorize namespace named by the bundle hash; the chatbot Worker switches to it after the build succeeds; old namespaces are pruned later; rollback is switching back.
- **Answer model**: a Workers AI chat model behind AI Gateway first (free daily allowance as cost ceiling); moving to a Claude model later is a config change.
- **Behavior**: answers only from retrieved chunks and cites the project page used; says it does not know and points to the contact page when retrieval is weak; talks about Jason in the third person; no general chat, code writing or off-topic opinions.
- **Conversations are stored** (Jason's choice) to learn what visitors ask. Consequence handed to the guardrails ticket: where they are stored, retention period, a visible privacy and AI-disclosure notice, PII scrubbing, who can read them, and a delete path. Note from research: AI Gateway logs prompts and responses by default and Workers Logs cannot redact. The browser still sends the last 3 turns per question with a length cap, so follow-ups work without server-side session state.
