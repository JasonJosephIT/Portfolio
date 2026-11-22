# Graph Report - wt-Portfolio  (2026-11-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 464 nodes · 811 edges · 20 communities (19 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76606c53`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19

## God Nodes (most connected - your core abstractions)
1. `buildSite()` - 15 edges
2. `page()` - 14 edges
3. `gl` - 13 edges
4. `validateBundle()` - 12 edges
5. `legacyPortfolio()` - 12 edges
6. `editJson()` - 9 edges
7. `projects()` - 9 edges
8. `portfolioError()` - 9 edges
9. `compilerOptions` - 9 edges
10. `scripts` - 9 edges

## Surprising Connections (you probably didn't know these)
- `record()` --calls--> `legacyPortfolio()`  [EXTRACTED]
  tests/site-portfolio-live.test.mjs → standards/portfolio.mjs
- `withPortfolio()` --calls--> `legacyPortfolio()`  [EXTRACTED]
  tests/site-portfolio-standard.test.mjs → standards/portfolio.mjs
- `validateBundle()` --calls--> `portfolioError()`  [EXTRACTED]
  scripts/lib/validate-bundle.mjs → standards/portfolio.mjs
- `connectPortfolio()` --indirect_call--> `publicUrl()`  [INFERRED]
  src/scripts/enrichment-live.ts → standards/portfolio.mjs
- `record()` --calls--> `legacyPortfolio()`  [EXTRACTED]
  tests/site-public-enrichment.test.mjs → standards/portfolio.mjs

## Import Cycles
- None detected.

## Communities (20 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (28): buildSite(), copyFixture(), editJson(), fixture, page(), tmp, page(), slugs (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (33): marked@^18.1.1, marked, Turn, outline, Props, colors, builds, collections (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (41): dependencies, ajv@^8.20.0, astro@^7.4.0, @astrojs/react@^7.1.0, react@^19.3.1, react-dom@^19.3.1, tailwindcss@^4.3.3, @tailwindcss/vite@^4.3.3 (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (33): accessOk(), admin(), answer(), b64(), chat(), Chunk, DONT_KNOW, fetch() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (12): Props, Props, Props, Props, images, pieces, selected, grids (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (25): devDependencies, @cloudflare/vitest-plugin@1.4.3, @cloudflare/workers-types@^5.20261015.1, github-slugger@2.0.0, typescript@^7.0.2, vitest@5.0.5, wrangler@4.151.0, name (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (20): buildIndex(), CAP, chunkBundle(), hardSplit(), plain(), split(), tokens(), cloudflare() (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (15): approved(), digest(), object(), publicSnapshotToBundle(), bundle, destination, parent, stage (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (4): Events, mount(), gl, source

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (15): added, base(), body, changed, dest, dryRun, git(), manifest (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (17): jobs, test, name, on, pull_request, push, permissions, contents (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (13): __BaseEnv_Env, *.bin, Cloudflare, Env, GlobalProps, *.html, NodeJS, ProcessEnv (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (10): compilerOptions, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck, strict, target (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.20
Nodes (9): astro/tsconfigs/strict, compilerOptions, baseUrl, jsx, jsxImportSource, paths, exclude, extends (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (6): readStore(), SECTION_LABELS, sectionLabel(), wireDetailReturn(), wireListingReturn(), writeStore()

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (3): @/assets/ocean/swell-pixel.png?url, Props, tones

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (5): allowBuilds, esbuild, workerd, minimumReleaseAgeExclude, packages

### Community 17 - "Community 17"
Cohesion: 0.40
Nodes (4): chapters, Props, stories, StoryProject

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (3): log(), PATH, pull-daily.sh script

## Knowledge Gaps
- **3 isolated node(s):** `astro/tsconfigs/strict`, `@/assets/ocean/swell-pixel.png?url`, `PATH`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 207 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Community 5` to `Community 3`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **What connects `astro/tsconfigs/strict`, `@/assets/ocean/swell-pixel.png?url`, `PATH` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08907103825136611 - nodes in this community are weakly interconnected._
- **Why does `github-slugger` connect `Community 5` to `Community 6`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06078316773816481 - nodes in this community are weakly interconnected._
- **Why does `wrangler` connect `Community 5` to `Community 2`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06025369978858351 - nodes in this community are weakly interconnected._