# Jason's portfolio

Astro site, fully prerendered, served from a Cloudflare Worker.

- `pnpm install`
- `pnpm pull` reads Open Thoughts' approved public enrichment API into `content/bundle-public/`; `pnpm dev` and `pnpm build` use that source by default
- `pnpm test` builds the fixture bundle and checks the pages and scripts
- `pnpm build` builds `content/bundle-public/` into `dist/`
- `OPEN_THOUGHTS_PUBLIC_URL` overrides the public API base URL; the configured default is `https://open-thoughts-enrichment.slothdev-joseph.workers.dev`
- An empty public snapshot produces an empty project list. Draft exports and notes are never a fallback. Run `pnpm pull` and rebuild to refresh additions, changes, or withdrawals.
- For development tests only, `BUNDLE_DIR=tests/fixtures/bundle pnpm build` selects fixture content explicitly
- `pnpm pull:bundle` retains the legacy exported-file/PR workflow as an explicit command; it is not the site's default source
- Deploys run on Cloudflare Workers Builds (commands in `wrangler.jsonc`)
- Chatbot production deploy command: `pnpm wrangler deploy && node chatbot/scripts/build-index.mjs` (rebuilds the search index from `content/bundle-public/`; roll back with `node chatbot/scripts/rollback-index.mjs <b-namespace>`)
- Daily pull: launchd setup in `scripts/launchd/README`
- `PUBLIC_CHAT_URL` (build env): the chat Worker endpoint, e.g. `https://<worker>/chat`; empty means the Tech chat panel is a contact link only
- `PUBLIC_TURNSTILE_SITEKEY` (build env): the Turnstile site key the chat panel renders on first send
