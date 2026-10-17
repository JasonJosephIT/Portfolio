// Turn the committed bundle into search chunks: { text, metadata: { slug, kind, section, title, url, bundle_hash } }.
// title is "<project name> · <section>" (the section alone for the profile): the chat Worker's citation label.
// Reads only bundle.json, profile.json, relations.json, the indexed projects/<slug>.json and docs/*.md.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import GithubSlugger from "github-slugger";
import { frontmatter, validateBundle } from "../../scripts/lib/validate-bundle.mjs";

export const CAP = 400;
const AIM = 300;
// ponytail: no tokenizer; words x 1.3 with a chars/4 ceiling (code, URLs), and the cap sits well under bge's 512
export const tokens = (s) => Math.ceil(Math.max(s.split(/\s+/).filter(Boolean).length * 1.3, s.length / 4));

// A paragraph over the cap: pack words greedily, slicing any single word longer than the cap allows.
const hardSplit = (p) => {
  const out = [];
  let cur = "";
  for (const w of p.split(/\s+/).filter(Boolean).flatMap((w) => w.match(/.{1,1200}/gs))) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && tokens(next) > CAP) { out.push(cur); cur = w; } else cur = next;
  }
  return cur ? [...out, cur] : out;
};

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
      ({ text, metadata: { slug: meta.slug, kind: meta.kind, section, title: meta.name ? `${meta.name} · ${section}` : section,
        url: meta.url + anchor(id), bundle_hash } })));

  for (const [slug, p] of Object.entries(projects)) {
    const related = relations.filter((e) => e.from === slug || e.to === slug)
      .map((e) => { const o = projects[e.from === slug ? e.to : e.from]; return `- ${e.type}: ${o.name}: ${o.summary}`; });
    const head = [`${p.name}: ${p.summary}`, `Tags: ${p.tags.join(", ")}`, related.length && `Related:\n${related.join("\n")}`];
    add(`${head.filter(Boolean).join("\n\n")}\n\n${p.description}`, { slug, name: p.name, kind: "project", url: `/tech/${slug}`, preface: "Overview" });
  }
  add(`${profile.headline}\n\n${profile.bio}\n\nSkills: ${profile.skills.join(", ")}\n\nInterests: ${profile.interests.join(", ")}`,
    { slug: "profile", kind: "profile", url: "/tech#about", preface: "About" });
  for (const f of readdirSync(join(dir, "docs")).filter((f) => f.endsWith(".md")).sort()) {
    const { data: { slug, parent, kind }, body } = frontmatter(read(`docs/${f}`));
    add(body, { slug, name: projects[parent].name, kind, url: `/tech/${parent}/${kind}`, preface: kind }, (id) => id ? `#${id}` : "");
  }
  return chunks;
}

// Split markdown at ##/### headings, then pack: merge small neighbours up to AIM, split oversize at paragraphs.
// Heading ids follow Astro: github-slugger over every heading's plain text, in document order.
// ponytail: strips links, images, code and emphasis marks only; raw HTML in a heading would still drift
const plain = (h) => h.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*~]|(?<!\w)_+|_+(?!\w)/g, "");

function split(md, preface) {
  const slugger = new GithubSlugger();
  const sections = [{ section: preface, id: "", lines: [] }];
  let fence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^(```|~~~)/.test(line)) fence = !fence;
    const h = !fence && /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) {
      const text = plain(h[2]);
      const id = slugger.slug(text);
      if (h[1].length === 2 || h[1].length === 3) sections.push({ section: text, id, lines: [] });
    }
    sections.at(-1).lines.push(line);
  }
  const pieces = [];
  for (const s of sections) {
    const text = s.lines.join("\n").trim();
    if (!text) continue;
    // oversize: break at paragraphs, and a lone giant paragraph at words
    const paras = text.split(/\n\s*\n/).flatMap((p) => tokens(p) <= CAP ? [p] : hardSplit(p));
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
