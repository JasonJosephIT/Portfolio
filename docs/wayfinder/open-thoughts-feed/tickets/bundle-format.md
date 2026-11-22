---
title: What is the bundle format?
type: wayfinder:grilling
status: closed
claimed-by: jason
---

## Question

Schema of the approved bundle: file shape (JSON vs Markdown+frontmatter vs both), fields, relations, media references (video), versioning and a `schema_version`, who owns the schema (one shared definition both repos validate against?), determinism/stable ids, how a removed project disappears.

## Blocked by

- [What is the public face?](public-face.md)

## Resolution

Decided with Jason, 2026-10-16:

- **Shape**: a directory. `bundle.json` manifest (schema_version, generated_at, content hash, index of records); `projects/<slug>.json` per project; `profile.json`; `relations.json`; later `docs/<slug>.md`. Project record fields: slug, name, summary, tags, description (markdown), media references, approved_at, source_hash. Astro content collections read it natively.
- **Schema owner**: Open Thoughts owns a JSON Schema and validates before exposing a bundle. Portfolio vendors a copy, validates again at pull, and fails the build on an invalid or too-new bundle.
- **Snapshots**: every bundle is a full snapshot. The slug is the stable id. An item retagged away from public vanishes from the next bundle; Portfolio replaces content wholesale. No tombstones.
- **Media**: references only, never bytes. A record lists media by key, kind, checksum, poster key and caption; bytes live in R2 (final choice in the prototype-hosting ticket).
- **Versioning and relations**: integer schema_version; Portfolio refuses a newer major. Relations are typed edges {from, to, type} between public slugs only, in relations.json; the edge types are the enrichment ticket's call.
