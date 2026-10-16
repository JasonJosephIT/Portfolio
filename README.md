# Jason's portfolio

Astro site, fully prerendered, served from a Cloudflare Worker.

- `pnpm install`
- `pnpm dev` needs a bundle: `pnpm pull:preview` then `BUNDLE_DIR=content/bundle-preview PREVIEW=1 pnpm dev`, or `BUNDLE_DIR=tests/fixtures/bundle pnpm dev`
- `pnpm test` builds the fixture bundle and checks the pages and scripts
- `pnpm build` builds `content/bundle/` into `dist/`
- `pnpm pull` copies the approved Open Thoughts export into `content/bundle/` on a branch and opens a PR
- Deploys run on Cloudflare Workers Builds (commands in `wrangler.jsonc`)
- Chatbot production deploy command: `pnpm wrangler deploy && node chatbot/scripts/build-index.mjs` (rebuilds the search index from `content/bundle/`; roll back with `node chatbot/scripts/rollback-index.mjs <b-namespace>`)
- Daily pull: launchd setup in `scripts/launchd/README`
