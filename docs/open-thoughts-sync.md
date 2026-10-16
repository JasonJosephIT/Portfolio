# Open Thoughts -> tech.html sync (spike)

Feed: `content/portfolio-feed.json` (emitted by Open Thoughts, opt-in per project).
Run: `node scripts/sync-open-thoughts.mjs [feed.json]` rewrites the cards between the
`open-thoughts:projects` markers in tech.html. `--check` exits 1 if tech.html is stale.
Node only, no deps, no build step: the output is plain committed HTML.

Spike caveats: summaries are unapproved Claude drafts; `.project-meta` has no CSS yet;
tech.html baseline came from the staged (uncommitted) placeholder version on main.
