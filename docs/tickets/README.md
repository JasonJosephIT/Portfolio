# Tickets: Portfolio becomes an Astro site fed by Open Thoughts

Spec: [`../specs/portfolio-astro-site.md`](../specs/portfolio-astro-site.md). Decisions: [`../wayfinder/open-thoughts-feed/map.md`](../wayfinder/open-thoughts-feed/map.md). Terms: [`../../CONTEXT.md`](../../CONTEXT.md).

Each ticket is a tracer-bullet vertical slice. Build each in its own `git worktree add` cut from its phase's integration-branch tip once all its blockers are merged. Close a ticket by ticking its criteria and setting `status: closed`. Nothing is pushed or merged to `main` by an agent; phase PRs are opened for Jason.

Two repos:
- **P tickets** target Portfolio. Phases B and C build on branch `redesign/astro-tech` (worktree `~/Projects/Portfolio-astro`, tip `dcf3f2c`); do not rebuild what is there.
- **OT tickets** target `~/Projects/Open Thoughts`, cut from branch `build/enrichment` (tip `a222d26`; it holds `scripts/enrich.py` and contains `build/curator` and `main`). They are slices of the not-yet-written Open Thoughts spec; when that spec lands, move them into its tracker.

HITL = needs Jason (a click, a dashboard, a judgment). AFK = an agent can do it end to end.

| ID | Title | Phase | Type | Blocked by |
|---|---|---|---|---|
| [P01](P01-land-phase-a.md) | ~~Land the staged cleanup~~ dropped: port from `main` | A | closed | — |
| [P02](P02-astro-on-phase-a-and-build-seam.md) | Fixture bundle and build-seam tests | B | AFK | — |
| [P03](P03-cloudflare-worker-deploy.md) | Deploy as a Cloudflare Worker with static assets; preview per PR | B | HITL | P02 |
| [P04](P04-diptych-layout-and-home.md) | Diptych base layout and the Home page in Astro | B | AFK | P02 |
| [P05](P05-art-page.md) | Art page and piece pages in Astro | B | AFK | P04 |
| [P06](P06-not-found-redirects-remove-static.md) | Not-found page, `.html` 301s, remove the static and generated pages | B | AFK | P04, P05 |
| [OT01](OT01-bundle-json-schema.md) | Bundle JSON Schema and a fixture bundle (Open Thoughts) | C | AFK | — |
| [P07](P07-vendor-schema-validate-build.md) | Vendor the schema; the build fails on an invalid, too-new or pending bundle | C | AFK | P02, OT01 |
| [P08](P08-tech-from-bundle.md) | Tech cards, project pages, related projects and profile from the bundle | C | AFK | P06, P07 |
| [P09](P09-pull-opens-pr.md) | Pull command validates and opens a PR; quiet on no change | C | AFK | P07 |
| [P10](P10-launchd-daily-pull.md) | Daily launchd job runs the pull | C | HITL | P09 |
| [OT02](OT02-visibility-tags.md) | Visibility tags on project notes (Open Thoughts) | C | AFK | — |
| [OT03](OT03-publish-card.md) | Publish card in the review desk (Open Thoughts) | C | AFK | OT01, OT02 |
| [OT04](OT04-export-button.md) | Export button with the export gate (Open Thoughts) | C | AFK | OT03 |
| [P11](P11-first-approved-pull.md) | First approved bundle reaches a pull PR | C | HITL | P08, P10, OT04 |
| [P12](P12-retire-admin-supabase.md) | Retire admin/, the Supabase pipeline, Instatic and place-image | D | AFK | P06 |
| [OT05](OT05-docs-records.md) | Features and decisions docs as `doc` records (Open Thoughts) | E | AFK | OT04 |
| [P13](P13-render-docs.md) | Render features and decisions docs under each project | E | AFK | P08, OT01 |
| [P14](P14-chatbot-worker-skeleton.md) | Chatbot Worker skeleton: endpoint, cap, kill switch, eval harness | F | AFK | P03 |
| [P15](P15-chatbot-index.md) | Chunk the bundle, embed, namespace per bundle hash, switch and roll back | F | AFK | P13, P14 |
| [P16](P16-chatbot-answers.md) | Grounded answers with citations behind AI Gateway | F | AFK | P15 |
| [P17](P17-chatbot-abuse-and-storage.md) | Turnstile, rate and spend limits, D1 storage with scrubbing | F | AFK | P16 |
| [P18](P18-chatbot-retention-access-delete.md) | 90-day deletion, Access-gated reading, delete on request | F | HITL | P17 |
| [P19](P19-site-chat-ui.md) | Chat on the site: notice, Turnstile, citations, works when off | F | AFK | P17 |
| [P20](P20-eval-set-in-ci.md) | Full fixed eval set and site tests in CI | F | AFK | P17, P19 |
| [P21](P21-launch-gate-and-cutover.md) | Launch gate: red-team pass, unverified facts, custom domain cutover | F | HITL | P18, P20, P11 |

```
       P02 ──┬── P03 ───────────────────────────── P14 ── P15 ── P16 ── P17 ──┬── P18 ──┐
             ├── P04 ── P05 ── P06 ──┬── P08 ──┬── P13 ──────┘                 └── P19 ── P20 ── P21
             │                       └── P12   │                                          (P21 also needs P11)
             └───────── P07 ──┬────────────────┘
OT01 ────────────────────────┘└── P09 ── P10 ──┐
OT02 ──┬── OT03 ── OT04 ──┬────────────────────┴── P11
OT01 ──┘                  └── OT05
```

## Waves (what can run in parallel)
1. **P02** (P01 dropped: the port starts from `main`)
2. **P03**, **P04**, **P07**
3. **P05**, **P09**
4. **P06**, **P10**
5. **P08**, **P12**
6. **P11**, **P13**
7. **P14** (may start in wave 3 after P03), then **P15 → P16 → P17**
8. **P18**, **P19**, then **P20**, then **P21**

Critical path: P02 → P04 → P05 → P06 → P08 → P13 → P15 → P16 → P17 → P19 → P20 → P21.

## Integration branches and phase PRs
- Phase A: dropped (P01). The staged changes in the main checkout stay untouched.
- Phase B: `redesign/astro-tech`. Open the B PR after P06.
- Phase C: `redesign/astro-bundle`, cut from B's tip. P07 may start on it before P06 merges; rebase once B is in. Open the C PR after P08–P10.
- Phase D: `redesign/retire-admin`, cut from C's tip (or B's if C is still open).
- Phase E, F: `redesign/astro-docs`, `redesign/chatbot`, each cut from the previous phase.
- Open Thoughts: tickets integrate on `build/enrichment`; no OT merge to `main` by an agent.

## File-ownership rules for parallel worktrees
- P04 owns `src/layouts/Diptych.astro` and `src/styles/diptych.css`; P05 and P06 only add pages that use them.
- P07 owns `src/content.config.ts`, `schemas/` and `scripts/lib/validate-bundle.mjs`; P08 and P09 import, never edit, the validator.
- P14–P18 own `chatbot/`; P19 owns `src/components/Chat*.astro` and touches nothing in `chatbot/` except the public request/response types.
- `tests/fixtures/bundle/` is created by P02; later tickets add records, never rewrite existing ones.

## Not ticketed (belongs to the Open Thoughts spec)
The `revise` proposal kind with diff, staleness marking, enrichment relations and tag vocabulary beyond what `enrich.py` already writes, Keychain keys and the monthly spend cap. The approval-flow and enrichment tickets in the map settle them.

## Status (2026-10-16)
- OT01 is merged on Open Thoughts `build/enrichment`. OT02 and OT03 are merged there too, but Jason moved the enrichment build to the T30–T39 tickets (`build/enrichment-app`): OT04 and OT05 are not built here, and P11/P13 will point at that work instead.

- Built on `redesign/astro-tech` (2026-10-16, not pushed): P02-P10, P12, P13, P14 and P15 closed, plus a final-review fix pass. P03, P10 and P11 still need Jason's hands-on steps.
