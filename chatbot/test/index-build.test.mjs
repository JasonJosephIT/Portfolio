import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { chunkBundle } from "../scripts/chunk.mjs";
import { buildIndex } from "../scripts/build-index.mjs";
import { rollbackIndex } from "../scripts/rollback-index.mjs";

const FIXTURE = fileURLToPath(new URL("../../tests/fixtures/bundle", import.meta.url));
const HASH = "a".repeat(64);
const tokens = (s) => Math.ceil(Math.max(s.split(/\s+/).filter(Boolean).length * 1.3, s.length / 4));
const CAP = 400;

test("chunkBundle: chunks from indexed projects, profile and docs, each capped and fully labelled", () => {
  const chunks = chunkBundle(FIXTURE);
  for (const c of chunks) {
    assert.deepEqual(Object.keys(c.metadata).sort(), ["bundle_hash", "kind", "section", "slug", "url"]);
    for (const v of Object.values(c.metadata)) assert.ok(v, `empty metadata in ${JSON.stringify(c.metadata)}`);
    assert.equal(c.metadata.bundle_hash, HASH);
    assert.ok(tokens(c.text) <= CAP);
  }
  const bySlug = (s) => chunks.filter((c) => c.metadata.slug === s);
  assert.deepEqual([...new Set(chunks.map((c) => c.metadata.slug))].sort(),
    ["alpha-tool", "alpha-tool-decisions", "alpha-tool-features", "beta-site", "gamma-lib", "profile"]);
  assert.equal(bySlug("beta-site")[0].metadata.url, "/tech/beta-site");
  assert.equal(bySlug("beta-site")[0].metadata.kind, "project");
  assert.equal(bySlug("profile")[0].metadata.url, "/tech#about");
  const feat = bySlug("alpha-tool-features")[0];
  assert.equal(feat.metadata.kind, "features");
  assert.equal(feat.metadata.section, "Sorting by type");
  assert.equal(feat.metadata.url, "/tech/alpha-tool/features#sorting-by-type");
  // related records ride along on the project chunk, one line each
  const alpha = bySlug("alpha-tool").map((c) => c.text).join("\n");
  assert.match(alpha, /uses: Beta Site: A small site built on Alpha Tool\./);
  assert.match(alpha, /built-with: Gamma Lib: A tiny parsing library\./);
});

// copy the fixture to <tmp>/bundle so tests can put things next to it or change it
const copyFixture = () => {
  const root = mkdtempSync(join(tmpdir(), "p15-"));
  cpSync(FIXTURE, join(root, "bundle"), { recursive: true });
  return { root, dir: join(root, "bundle") };
};

test("chunkBundle: reads nothing outside the bundle dir", () => {
  const { root, dir } = copyFixture();
  writeFileSync(join(root, "stray.md"), "## Secret\n\nSTRAY-SENTINEL text that must not be indexed.");
  writeFileSync(join(root, "stray.json"), JSON.stringify({ name: "STRAY-SENTINEL" }));
  const chunks = chunkBundle(dir);
  assert.ok(chunks.length > 0);
  assert.ok(chunks.every((c) => !c.text.includes("STRAY-SENTINEL")));
});

test("chunkBundle: oversize sections split under the cap, small ones merge, anchors follow headings", () => {
  const { dir } = copyFixture();
  const words = (n, w) => Array(n).fill(w).join(" ");
  writeFileSync(join(dir, "docs/alpha-tool-features.md"), `---
slug: alpha-tool-features
parent: alpha-tool
kind: features
approved_at: "2026-01-01T00:00:00Z"
source_hash: 2222222222222222
---
### Tiny A

One line.

## Tiny A

Same heading again.

\`\`\`
## not a heading
\`\`\`

## Long one

${words(200, "alpha")}

${words(200, "beta")}

${words(900, "gamma")}

${"x".repeat(5000)}
`);
  const chunks = chunkBundle(dir).filter((c) => c.metadata.slug === "alpha-tool-features");
  for (const c of chunks) assert.ok(tokens(c.text) <= CAP, `${tokens(c.text)} tokens`);
  assert.ok(chunks.filter((c) => c.metadata.section === "Long one").length >= 3);
  assert.ok(chunks.every((c) => !/gamma|xxx/.test(c.text) || c.metadata.url.endsWith("#long-one")));
  // the tiny sections merge into one chunk labelled by the first
  const tiny = chunks.find((c) => c.metadata.section === "Tiny A");
  assert.equal(tiny.metadata.url, "/tech/alpha-tool/features#tiny-a");
  assert.match(tiny.text, /Same heading again/);
  assert.ok(!chunks.some((c) => c.metadata.section === "not a heading"));
});

// In-memory stand-in for the three Cloudflare REST endpoints the runner uses.
function fakeCloudflare({ failUpsert = 0, lag = 1, stuck = false, dims = 3 } = {}) {
  const kv = new Map(), vectors = [], calls = [];
  let upserts = 0, processed = null, infoCalls = 0;
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
  const fetch = async (url, init = {}) => {
    const u = new URL(url), method = init.method ?? "GET";
    calls.push(`${method} ${u.pathname}`);
    assert.equal(init.headers.Authorization, "Bearer tok");
    let m;
    if ((m = /\/accounts\/acc\/ai\/run\/(.+)$/.exec(u.pathname))) {
      const { text } = JSON.parse(init.body);
      return json({ success: true, result: { shape: [text.length, dims], data: text.map(() => [0.1, 0.2, 0.3].slice(0, dims)) } });
    }
    if (u.pathname === "/client/v4/accounts/acc/vectorize/v2/indexes/portfolio-chat/upsert") {
      if (++upserts === failUpsert) return json({ success: false, errors: [{ code: 1000, message: "boom" }] }, 500);
      vectors.push(...init.body.trim().split("\n").map((l) => JSON.parse(l)));
      return json({ success: true, result: { mutationId: `m${upserts}` } });
    }
    if (u.pathname === "/client/v4/accounts/acc/vectorize/v2/indexes/portfolio-chat/info") {
      // the index catches up with the latest mutation after `lag` polls (never, when stuck)
      if (upserts && !stuck && ++infoCalls > lag) processed = `m${upserts}`;
      return json({ success: true, result: { dimensions: 3, vectorCount: 0, processedUpToMutation: processed } });
    }
    if ((m = /\/accounts\/acc\/storage\/kv\/namespaces\/kvid\/values\/(.+)$/.exec(u.pathname))) {
      if (method === "PUT") { kv.set(m[1], init.body); return json({ success: true }); }
      return kv.has(m[1]) ? new Response(kv.get(m[1])) : json({ success: false }, 404);
    }
    throw new Error(`unexpected ${method} ${url}`);
  };
  return { fetch, kv, vectors, calls };
}
const ENV = { CLOUDFLARE_ACCOUNT_ID: "acc", CLOUDFLARE_API_TOKEN: "tok", KV_NAMESPACE_ID: "kvid" };
const NS = `b-${"a".repeat(16)}`;
const fast = { pollMs: 1, timeoutMs: 50, sleep: async () => {} };

test("buildIndex: full success upserts every chunk into the bundle namespace, then switches ACTIVE_NS", async () => {
  const cf = fakeCloudflare();
  cf.kv.set("ACTIVE_NS", "b-old");
  const ns = await buildIndex({ dir: FIXTURE, env: ENV, fetch: cf.fetch, batch: 2, ...fast });
  assert.equal(ns, NS);
  const chunks = chunkBundle(FIXTURE);
  assert.equal(cf.vectors.length, chunks.length);
  assert.deepEqual(cf.vectors[0], { id: `${NS}:0`, namespace: NS, values: [0.1, 0.2, 0.3], metadata: { ...chunks[0].metadata, text: chunks[0].text } });
  assert.ok(cf.calls.some((c) => c.includes("/ai/run/@cf/baai/bge-base-en-v1.5")));
  assert.equal(cf.kv.get("ACTIVE_NS"), NS);
  // the switch waits for an info poll after the last upsert (the fake reports it processed on the 2nd poll)
  const put = cf.calls.indexOf(`PUT /client/v4/accounts/acc/storage/kv/namespaces/kvid/values/ACTIVE_NS`);
  const lastUpsert = cf.calls.findLastIndex((c) => c.endsWith("/upsert"));
  assert.ok(cf.calls.slice(lastUpsert, put).filter((c) => c.endsWith("/info")).length >= 2);
});

test("buildIndex: if the index never processes the last mutation, it times out without switching", async () => {
  const cf = fakeCloudflare({ stuck: true });
  cf.kv.set("ACTIVE_NS", "b-old");
  await assert.rejects(buildIndex({ dir: FIXTURE, env: ENV, fetch: cf.fetch, batch: 2, ...fast }), /not processed/);
  assert.equal(cf.kv.get("ACTIVE_NS"), "b-old");
  assert.ok(!cf.calls.some((c) => c.startsWith("PUT")));
});

test("buildIndex: an embed response with the wrong dims fails before any upsert", async () => {
  const cf = fakeCloudflare({ dims: 2 });
  await assert.rejects(buildIndex({ dir: FIXTURE, env: ENV, fetch: cf.fetch, batch: 2, ...fast }), /embed/);
  assert.ok(!cf.calls.some((c) => c.endsWith("/upsert") || c.startsWith("PUT")));
});

test("buildIndex: a failed upsert leaves ACTIVE_NS unchanged", async () => {
  const cf = fakeCloudflare({ failUpsert: 2 });
  cf.kv.set("ACTIVE_NS", "b-old");
  await assert.rejects(buildIndex({ dir: FIXTURE, env: ENV, fetch: cf.fetch, batch: 2, ...fast }), /upsert.*500/);
  assert.equal(cf.kv.get("ACTIVE_NS"), "b-old");
  assert.ok(!cf.calls.some((c) => c.startsWith("PUT")));
});

test("build-index CLI: missing env exits 1 naming the var before any call", () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/build-index.mjs", import.meta.url))],
    { env: { PATH: process.env.PATH, BUNDLE_DIR: FIXTURE, CLOUDFLARE_ACCOUNT_ID: "acc" }, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /CLOUDFLARE_API_TOKEN/);
});

test("rollbackIndex: sets ACTIVE_NS to a namespace a build recorded, refuses an unknown one", async () => {
  const cf = fakeCloudflare();
  cf.kv.set("NAMESPACES", JSON.stringify(["b-old", NS]));
  cf.kv.set("ACTIVE_NS", NS);
  await rollbackIndex({ ns: "b-old", env: ENV, fetch: cf.fetch });
  assert.equal(cf.kv.get("ACTIVE_NS"), "b-old");
  await assert.rejects(rollbackIndex({ ns: "b-nope", env: ENV, fetch: cf.fetch }), /b-nope/);
  assert.equal(cf.kv.get("ACTIVE_NS"), "b-old");
});

test("rollbackIndex: with no recorded namespaces at all it refuses", async () => {
  const cf = fakeCloudflare();
  await assert.rejects(rollbackIndex({ ns: NS, env: ENV, fetch: cf.fetch }), /not a built namespace/);
  assert.ok(!cf.kv.has("ACTIVE_NS"));
});
