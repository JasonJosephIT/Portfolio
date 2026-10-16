// Turn the committed bundle into search chunks: { text, metadata: { slug, kind, section, url, bundle_hash } }.
// Reads only bundle.json, profile.json, relations.json, the indexed projects/<slug>.json and docs/*.md.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import GithubSlugger from "github-slugger";
import { validateBundle } from "../../scripts/lib/validate-bundle.mjs";

const CAP = 500, AIM = 300;
// ponytail: words x 1.3 estimate, no tokenizer; bge's real limit is 512 so the cap leaves headroom
export const tokens = (s) => Math.ceil(s.split(/\s+/).filter(Boolean).length * 1.3);

export function chunkBundle(dir) {
  validateBundle(dir);
  const read = (p) => readFileSync(join(dir, p), "utf8");
  const manifest = JSON.parse(read("bundle.json"));
  const bundle_hash = manifest.content_hash;
  const projects = Object.fromEntries(manifest.records.projects.map((s) => [s, JSON.parse(read(`projects/${s}.json`))]));
  const relations = JSON.parse(read("relations.json"));
  const profile = JSON.parse(read("profile.json"));
  const chunks = [];
  const add = (md, meta, anchor = () => "") =>
    chunks.push(...split(md, meta.preface).map(({ section, id, text }) =>
      ({ text, metadata: { slug: meta.slug, kind: meta.kind, section, url: meta.url + anchor(id), bundle_hash } })));

  for (const [slug, p] of Object.entries(projects)) {
    const related = relations.filter((e) => e.from === slug || e.to === slug)
      .map((e) => { const o = projects[e.from === slug ? e.to : e.from]; return `- ${e.type}: ${o.name}: ${o.summary}`; });
    const head = [`${p.name}: ${p.summary}`, `Tags: ${p.tags.join(", ")}`, related.length && `Related:\n${related.join("\n")}`];
    add(`${head.filter(Boolean).join("\n\n")}\n\n${p.description}`, { slug, kind: "project", url: `/tech/${slug}`, preface: "Overview" });
  }
  add(`${profile.headline}\n\n${profile.bio}\n\nSkills: ${profile.skills.join(", ")}\n\nInterests: ${profile.interests.join(", ")}`,
    { slug: "profile", kind: "profile", url: "/tech#about", preface: "About" });
  for (const f of readdirSync(join(dir, "docs")).filter((f) => f.endsWith(".md")).sort()) {
    const [, fm, body] = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(read(`docs/${f}`));
    const field = (k) => new RegExp(`^${k}:\\s*["']?([^"'\\r\\n]*)`, "m").exec(fm)[1];
    const kind = field("kind");
    add(body, { slug: field("slug"), kind, url: `/tech/${field("parent")}/${kind}`, preface: kind }, (id) => id ? `#${id}` : "");
  }
  return chunks;
}

// Split markdown at ##/### headings, then pack: merge small neighbours up to AIM, split oversize at paragraphs.
// Heading ids follow Astro (github-slugger over every heading in document order).
// ponytail: slugs the raw heading text; inline markdown like [links](x) in a heading would make the id drift
function split(md, preface) {
  const slugger = new GithubSlugger();
  const sections = [{ section: preface, id: "", lines: [] }];
  let fence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^(```|~~~)/.test(line)) fence = !fence;
    const h = !fence && /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) {
      const id = slugger.slug(h[2]);
      if (h[1].length === 2 || h[1].length === 3) sections.push({ section: h[2], id, lines: [] });
    }
    sections.at(-1).lines.push(line);
  }
  const pieces = [];
  for (const s of sections) {
    const text = s.lines.join("\n").trim();
    if (!text) continue;
    // oversize: break at paragraphs, and a lone giant paragraph at word counts
    const paras = text.split(/\n\s*\n/).flatMap((p) => {
      const w = p.split(/\s+/);
      const n = Math.floor(CAP / 1.3) - 1;
      return tokens(p) <= CAP ? [p] : Array.from({ length: Math.ceil(w.length / n) }, (_, i) => w.slice(i * n, (i + 1) * n).join(" "));
    });
    let cur = null;
    for (const p of paras) {
      if (cur && tokens(cur.text) < AIM && tokens(`${cur.text}\n\n${p}`) <= CAP) cur.text += `\n\n${p}`;
      else pieces.push(cur = { ...s, text: p, first: !cur });
    }
  }
  // merge small whole sections into the previous chunk (it keeps the first section's label)
  const out = [];
  for (const p of pieces) {
    const last = out.at(-1);
    if (last && p.first && tokens(last.text) < AIM && tokens(`${last.text}\n\n${p.text}`) <= AIM) last.text += `\n\n${p.text}`;
    else out.push(p);
  }
  return out.map(({ section, id, text }) => ({ section, id, text }));
}
