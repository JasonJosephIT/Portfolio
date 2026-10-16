// Minimal Cloudflare REST helper shared by build-index and rollback-index (no bundle code here).
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
