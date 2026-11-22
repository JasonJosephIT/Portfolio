---
title: How does Portfolio pull the bundle?
type: wayfinder:grilling
status: closed
claimed-by: jason
---

## Question

Tension to resolve: Open Thoughts is a local desktop app, the site builds and runs on Cloudflare, and the rule is 'Portfolio pulls, Open Thoughts never pushes'. Options: (a) local `astro build` + `wrangler deploy` reading a local path; (b) OT exports to a location Portfolio can reach (git repo, R2 bucket) and Portfolio pulls from there; (c) local endpoint. Decide the pull mechanism, who triggers a deploy, how stale/failed pulls surface, and whether 'exporting to a pull location' counts as pushing.

## Blocked by

- none

## Resolution

Decided with Jason, 2026-10-16:

- **Mechanism**: Open Thoughts has an Export button (pressed by Jason) that writes the approved bundle to a fixed folder inside its own project, no network. Portfolio has a pull command that copies that folder into `content/bundle/`, validates against the schema, and commits via PR. Cloudflare builds from git. Open Thoughts never pushes; bundle history lives in git.
- **Cadence**: a scheduled pull that opens a PR for Jason to merge (no auto-merge, no auto-deploy). Caveat for the spec: the export folder is on Jason's Mac, so the schedule must run locally (launchd or a local scheduled Claude task using `gh`), not in the cloud. A pull with no change opens no PR.
- **One source**: the committed bundle is the single source. The site builds from it and the chatbot's vector index is rebuilt from the same committed version on each deploy.

- **Schedule runner** (Jason accepted the recommendation, 2026-10-16): a macOS launchd job runs the Portfolio pull script daily and opens the PR with `gh`. Plain script, no LLM, works when Claude is closed. It opens no PR when the export is unchanged and does nothing if the export folder is missing.
