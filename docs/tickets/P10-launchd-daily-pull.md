---
id: P10
title: Daily launchd job runs the pull
status: open
type: HITL
phase: C
repo: Portfolio, branch redesign/astro-bundle
model: sonnet
claimed-by:
---
# P10 — launchd runs `pnpm pull` once a day

**Blocked by:** P09
**Spec:** stories 16, 17; Delivery (plain script, no LLM, works when Claude is closed).

## What to build
- `scripts/launchd/com.jason.portfolio-pull.plist`: runs `scripts/pull-daily.sh` daily at a fixed hour, logs to `~/Library/Logs/portfolio-pull.log`.
- `scripts/pull-daily.sh`: `cd` to a dedicated clean checkout (not the working tree Jason edits), `git fetch`, reset that checkout to `origin/main`, run `pnpm pull`. Absolute paths for `node`, `pnpm`, `gh` (launchd has a bare `PATH`).
- `scripts/launchd/README` line: how to load and unload it.
- HITL: Jason creates the clean checkout, confirms `gh auth status` works non-interactively, and runs `launchctl bootstrap`.

## Acceptance criteria
- [ ] `plutil -lint` passes on the plist.
- [ ] `scripts/pull-daily.sh` run by hand with the export missing logs one line and exits 0.
- [ ] Jason sees one scheduled run in the log (HITL).

## Notes for implementer
- Load ponytail. No test framework for a 15-line shell script; the lint and a manual run are the checks.
