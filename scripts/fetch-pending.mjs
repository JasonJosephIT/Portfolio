// Usage: node scripts/fetch-pending.mjs
// Prints pending placements as JSON and downloads images into assets/.
import { writeFile, readdir } from "node:fs/promises";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY"); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const rows = await (await fetch(
  `${URL_}/rest/v1/submissions?status=eq.ready_to_place&select=*`, { headers: H }
)).json();

const existing = await readdir("assets").catch(() => []);
let n = existing.filter((f) => /^photo-(\d+)\.\w+$/.test(f))
  .reduce((m, f) => Math.max(m, +f.match(/\d+/)[0]), 0);

const out = [];
for (const r of rows) {
  const ext = (r.image_path.match(/\.(\w+)$/) || [, "jpg"])[1];
  const local = r.kind === "photo"
    ? `assets/photo-${String(++n).padStart(2, "0")}.${ext}`
    : `assets/project-${r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${ext}`;
  const img = await fetch(`${URL_}/storage/v1/object/public/portfolio-inbox/${r.image_path}`);
  if (!img.ok) {
    console.error(`Skipping submission ${r.id} (${r.title}): download failed with HTTP ${img.status}`);
    continue;
  }
  await writeFile(local, Buffer.from(await img.arrayBuffer()));
  out.push({ ...r, local_image: local });
}
console.log(JSON.stringify(out, null, 2));
