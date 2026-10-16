#!/bin/bash
# Daily job: reset a dedicated clean clone to origin/main, then run `pnpm pull`.
set -euo pipefail
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') pull-daily: $*"; }
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/Library/pnpm:$PATH"
CLONE="${PORTFOLIO_PULL_CLONE:-$HOME/Library/Application Support/portfolio-pull/Portfolio}"

if [ ! -d "$CLONE/.git" ]; then
  log "clone missing at $CLONE; run the setup step in scripts/launchd/README"
  exit 0
fi
for tool in git node pnpm gh; do
  command -v "$tool" >/dev/null || { log "missing tool: $tool"; exit 1; }
done

cd "$CLONE"
git fetch --quiet origin
git switch --quiet main
git reset --quiet --hard origin/main
pnpm install --frozen-lockfile --silent
log "start"
pnpm pull
log "done"
