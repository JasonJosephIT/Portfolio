// Point the chatbot back at an earlier index: node chatbot/scripts/rollback-index.mjs <b-namespace>
// Only namespaces build-index recorded in KV `NAMESPACES` (i.e. fully upserted) are accepted.
// ponytail: the KV list, not a Vectorize query, decides "exists"; a pruned namespace must be dropped from it too
import { fileURLToPath } from "node:url";
import { cloudflare } from "./cloudflare.mjs";

export async function rollbackIndex({ ns, env, fetch = globalThis.fetch }) {
  const cf = cloudflare(env, fetch);
  const known = JSON.parse((await cf.kvGet("NAMESPACES")) ?? "[]");
  if (!known.includes(ns)) throw new Error(`${ns} is not a built namespace (known: ${known.join(", ") || "none"})`);
  await cf.kvPut("ACTIVE_NS", ns);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ns = process.argv[2];
  if (!ns) { console.error("usage: rollback-index.mjs <b-namespace>"); process.exit(1); }
  rollbackIndex({ ns, env: process.env })
    .then(() => console.log(`ACTIVE_NS = ${ns}`))
    .catch((e) => { console.error(`rollback-index: ${e.message}`); process.exit(1); });
}
