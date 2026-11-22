---
title: How does approval work in the review desk?
type: wayfinder:grilling
status: closed
claimed-by: jason
---

## Question

Reuse the existing proposal/review desk (spec section 7). Decide: a 'publish' proposal per project vs per field; what re-triggers approval when a project note changes; unpublish/withdraw; whether approval of relations is separate; what the bundle is allowed to contain if nothing is approved; audit trail. Agents never approve (existing invariant).

## Blocked by

- [What is the public face?](public-face.md)

## Resolution

Decided with Jason, 2026-10-16:

- **Unit**: one publish proposal per public record (project or profile). The card shows proposed tag, full public record, relations and evidence beside the internal note; one Approve covers tag, text and relations.
- **Revise kind**: add a third proposal kind, `revise`, that replaces a whole public record and shows a diff against the approved version in Open Thoughts. The Portfolio side sees no diff in the app; it sees the change in the pull PR's git diff.
- **Staleness**: when the source note changes the record is marked stale and stays published as last approved until a revise is approved or it is unpublished. Lowering a tag to private/context-only is a direct human action effective at next export; raising to public needs an approved proposal. Agents never apply either.
- **Export gate**: Export is a human button; it re-validates the schema, re-runs the redaction scan on every record and refuses to write on any failure. Only the last approved version of each record is exported.
