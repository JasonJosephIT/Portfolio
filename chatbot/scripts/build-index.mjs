// Build the chatbot search index from the committed bundle and switch to it only after every upsert succeeded.
// Production deploy of main runs: pnpm wrangler deploy && node chatbot/scripts/build-index.mjs
//
// Cloudflare REST endpoints (checked 2026-10-16):
// - Workers AI:  POST /accounts/{id}/ai/run/{model}  body { text: string[] } -> result { shape, data: number[][] }
//   https://developers.cloudflare.com/workers-ai/models/bge-base-en-v1.5/
// - Vectorize:   POST /accounts/{id}/vectorize/v2/indexes/{index}/upsert  Content-Type application/x-ndjson,
//   one { id, values, namespace, metadata } per line -> result { mutationId }
//   https://developers.cloudflare.com/api/resources/vectorize/subresources/indexes/methods/upsert/
// - Workers KV:  PUT/GET /accounts/{id}/storage/kv/namespaces/{ns}/values/{key}  (raw value body)
//   https://developers.cloudflare.com/api/resources/kv/subresources/namespaces/subresources/values/methods/update/
import { fileURLToPath } from "node:url";
import { chunkBundle } from "./chunk.mjs";

const API = "https://api.cloudflare.com/client/v4/accounts";

/** Checks env and returns a REST helper; throws naming the first missing var before any call. */
export function cloudflare(env, fetch) {
  for (const k of ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "KV_NAMESPACE_ID"])
    if (!env[k]) throw new Error(`missing env ${k}`);
  const call = async (what, path, init = {}) => {
    const res = await fetch(`${API}/${env.CLOUDFLARE_ACCOUNT_ID}/${path}`,
      { ...init, headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, ...init.headers } });
    if (!res.ok) throw new Error(`${what} failed: ${res.status} ${await res.text()}`);
    return res;
  };
  const kv = `storage/kv/namespaces/${env.KV_NAMESPACE_ID}/values`;
  return {
    call,
    kvGet: async (key) => {
      try { return await (await call(`KV get ${key}`, `${kv}/${key}`)).text(); }
      catch (e) { if (/: 404 /.test(e.message)) return null; throw e; }
    },
    kvPut: (key, value) => call(`KV put ${key}`, `${kv}/${key}`, { method: "PUT", body: value }),
  };
}

export async function buildIndex({ dir, env, fetch = globalThis.fetch, batch = 100 }) {
  const cf = cloudflare(env, fetch);
  const index = env.VECTORIZE_INDEX || "portfolio-chat";
  const model = env.EMBED_MODEL || "@cf/baai/bge-base-en-v1.5";
  const chunks = chunkBundle(dir);
  const ns = `b-${chunks[0].metadata.bundle_hash.slice(0, 16)}`;
  for (let i = 0; i < chunks.length; i += batch) {
    const part = chunks.slice(i, i + batch);
    const res = await cf.call("embed", `ai/run/${model}`, { method: "POST", body: JSON.stringify({ text: part.map((c) => c.text) }) });
    const { data } = (await res.json()).result;
    const ndjson = part.map((c, j) => JSON.stringify({ id: `${ns}:${i + j}`, namespace: ns, values: data[j], metadata: { ...c.metadata, text: c.text } })).join("\n");
    await cf.call("upsert", `vectorize/v2/indexes/${index}/upsert`, { method: "POST", headers: { "Content-Type": "application/x-ndjson" }, body: ndjson });
  }
  // Every batch landed: record the namespace (rollback checks this list), then make it live.
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
