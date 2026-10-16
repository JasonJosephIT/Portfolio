// Build the chatbot search index from the committed bundle and switch to it only after every upsert succeeded
// and Vectorize has processed the last one.
// Production deploy of main runs: pnpm wrangler deploy && node chatbot/scripts/build-index.mjs
//
// Cloudflare REST endpoints (checked 2026-10-16):
// - Workers AI:  POST /accounts/{id}/ai/run/{model}  body { text: string[] } -> result { shape, data: number[][] }
//   https://developers.cloudflare.com/workers-ai/models/bge-base-en-v1.5/
// - Vectorize:   POST /accounts/{id}/vectorize/v2/indexes/{index}/upsert  Content-Type application/x-ndjson,
//   one { id, values, namespace, metadata } per line -> result { mutationId }
//   https://developers.cloudflare.com/api/resources/vectorize/subresources/indexes/methods/upsert/
// - Vectorize:   GET /accounts/{id}/vectorize/v2/indexes/{index}/info
//   -> result { dimensions, vectorCount, processedUpToMutation, processedUpToDatetime }
//   https://developers.cloudflare.com/api/resources/vectorize/subresources/indexes/methods/info/
// - Workers KV:  PUT/GET /accounts/{id}/storage/kv/namespaces/{ns}/values/{key}  (raw value body)
//   https://developers.cloudflare.com/api/resources/kv/subresources/namespaces/subresources/values/methods/update/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as wait } from "node:timers/promises";
import { chunkBundle } from "./chunk.mjs";
import { cloudflare } from "./cloudflare.mjs";

export async function buildIndex({ dir, env, fetch = globalThis.fetch, batch = 100, pollMs = 5000, timeoutMs = 300_000, sleep = wait }) {
  const cf = cloudflare(env, fetch);
  const index = env.VECTORIZE_INDEX || "portfolio-chat";
  const model = env.EMBED_MODEL || "@cf/baai/bge-base-en-v1.5";
  const chunks = chunkBundle(dir);
  if (!chunks.length) throw new Error(`no chunks from ${dir}`);
  const ns = `b-${JSON.parse(readFileSync(join(dir, "bundle.json"), "utf8")).content_hash.slice(0, 16)}`;
  const info = async () => (await (await cf.call("index info", `vectorize/v2/indexes/${index}/info`)).json()).result;
  const { dimensions } = await info();

  // Embed everything first, so a bad embed response stops the run before any upsert.
  const vectors = [];
  for (let i = 0; i < chunks.length; i += batch) {
    const part = chunks.slice(i, i + batch);
    const res = await cf.call("embed", `ai/run/${model}`, { method: "POST", body: JSON.stringify({ text: part.map((c) => c.text) }) });
    const data = (await res.json()).result?.data;
    if (data?.length !== part.length || data.some((v) => v?.length !== dimensions))
      throw new Error(`embed returned ${data?.length} vectors of ${data?.[0]?.length} dims for ${part.length} texts; index wants ${dimensions} dims`);
    vectors.push(...data);
  }

  let mutation;
  for (let i = 0; i < chunks.length; i += batch) {
    const ndjson = chunks.slice(i, i + batch).map((c, j) =>
      JSON.stringify({ id: `${ns}:${i + j}`, namespace: ns, values: vectors[i + j], metadata: { ...c.metadata, text: c.text } })).join("\n");
    const res = await cf.call("upsert", `vectorize/v2/indexes/${index}/upsert`, { method: "POST", headers: { "Content-Type": "application/x-ndjson" }, body: ndjson });
    mutation = (await res.json()).result.mutationId;
  }

  // Upserts apply asynchronously: wait until the index has processed the last one before going live.
  // ponytail: equality check; a concurrent writer moving processedUpToMutation past ours would time out, rerun then
  for (let t = 0; (await info()).processedUpToMutation !== mutation; t += pollMs) {
    if (t >= timeoutMs) throw new Error(`mutation ${mutation} not processed after ${timeoutMs / 1000}s; ACTIVE_NS unchanged`);
    await sleep(pollMs);
  }

  // Record the namespace (rollback checks this list), then make it live.
  const known = JSON.parse((await cf.kvGet("NAMESPACES")) ?? "[]");
  if (!known.includes(ns)) await cf.kvPut("NAMESPACES", JSON.stringify([...known, ns]));
  await cf.kvPut("ACTIVE_NS", ns);
  return ns;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.env.BUNDLE_DIR || fileURLToPath(new URL("../../content/bundle", import.meta.url));
  buildIndex({ dir, env: process.env })
    .then((ns) => console.log(`ACTIVE_NS = ${ns}`))
    .catch((e) => { console.error(`build-index: ${e.message}`); process.exit(1); });
}
