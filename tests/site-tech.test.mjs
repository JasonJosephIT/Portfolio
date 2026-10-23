import { before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSite, copyFixture, editJson, fixture, page } from "./helpers.mjs";
import { standard, legacyPortfolio } from "../standards/portfolio.mjs";
import { validateBundle } from "../scripts/lib/validate-bundle.mjs";

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, v) => writeFileSync(p, JSON.stringify(v));
const build = ({ edit, env } = {}) => buildSite(copyFixture(edit), env);
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

let out;
before(() => {
  out = buildSite();
});

test("each project panel introduces its bundle record without status, dates, or repo links", () => {
  const html = page(out, "tech/index.html");
  const cards = html.split('data-panel').slice(1).map(p => p.slice(0, p.indexOf('</article>')));
  assert.equal(cards.length, 3);
  for (const slug of ["alpha-tool", "beta-site", "gamma-lib"]) {
    const rec = read(join(fixture, "projects", `${slug}.json`));
    const card = cards.find((c) => c.includes(`href="/tech/${slug}"`));
    assert.ok(card, slug);
    for (const s of [rec.name, rec.summary, ...rec.tags]) assert.ok(text(card).includes(s), `${slug}: ${s}`);
    assert.doesNotMatch(card, /<time|github\.com|href="https?:/i);
    assert.doesNotMatch(text(card), /\d{4}-\d{2}-\d{2}|\b(draft|archived|active|shipped|status)\b/i);
  }
});

test("every project renders exactly the eight canonical sections, including missing sections", () => {
  const html = page(out, "tech/index.html");
  for (const slug of ['alpha-tool', 'beta-site', 'gamma-lib']) {
    const panel = html.split(`data-slug="${slug}"`)[1].split('</article>')[0];
    assert.deepEqual([...panel.matchAll(/data-section="([^"]+)"/g)].map(m=>m[1]),standard.sections.map(s=>s.key));
    assert.equal([...panel.matchAll(/data-demo-topic="true"/g)].length,4);
    assert.match(panel,/hasn’t been documented yet/);
    assert.doesNotMatch(panel,/source_refs|needs_input|missing_fields/);
  }
  const alpha = html.split('data-slug="alpha-tool"')[1].split('</article>')[0];
  assert.match(alpha, /href="\/tech\/alpha-tool\/features"/);
  assert.doesNotMatch(html,/Sideways for projects|Downward for the details|#d6e4d9|#e0e4f0/);
});

test("structured enrichment fields render verbatim and local metadata stays hidden", () => {
  const o = build({edit: d => {
    const file=join(d,'projects/alpha-tool.json'); const record=read(file);
    record.portfolio=legacyPortfolio(record);
    const section=record.portfolio.sections.problem_audience;
    section.fields.problem='Files accumulate in one unsorted folder.';
    section.missing_fields=section.missing_fields.filter(k=>k!=='problem');
    section.source_refs=['author:alpha-tool'];
    write(file,record);
  }});
  const html=page(o,'tech/index.html');
  assert.match(html,/Files accumulate in one unsorted folder\./);
  assert.doesNotMatch(html,/author:alpha-tool|source_refs/);
});

test("malformed eight-section records are rejected without weakening the pending-publication gate",()=>{
  const d=copyFixture(dir=>{const f=join(dir,'projects/alpha-tool.json');const r=read(f);r.portfolio=legacyPortfolio(r);delete r.portfolio.sections.reflection;write(f,r);});
  assert.throws(()=>validateBundle(d),/reflection|eight sections/);
});

test("unavailable media is omitted; a configured media origin renders the image and lightbox control", () => {
  assert.doesNotMatch(page(out, "tech/index.html"), /data-expand-image/);
  const mediaOut = build({ env: { PUBLIC_PROJECT_MEDIA_BASE: "https://media.example.test/" } });
  const html = page(mediaOut, "tech/index.html");
  assert.match(html, /src="https:\/\/media.example.test\/alpha-tool\/shot.png"/);
  assert.match(html, /data-expand-image/);
  assert.match(html, /data-section="overview"/);
});

// The slugs linked inside the "Related projects" section.
const related = (html) => {
  const at = html.indexOf('id="related"');
  if (at < 0) return null;
  return [...html.slice(at, html.indexOf("</section>", at)).matchAll(/href="\/tech\/([a-z-]+)"/g)].map((m) => m[1]);
};

test("project page uses visitor labels and one plain Related projects list", () => {
  const alpha = page(out, "tech/alpha-tool/index.html");
  assert.match(alpha, /Alpha Tool sorts files into folders by type\./);
  for (const l of ["What it is", "Made with", "Related projects", "See it working"]) assert.ok(alpha.includes(`>${l}<`), l);
  const headings = [...alpha.matchAll(/<h[23][^>]*>([^<]*)</g)].map((m) => m[1].trim());
  for (const old of ["Overview", "Tags", "Docs", "Connected work", "Prototype video", "Used by", "Uses", "Built with", "Used to build", "Part of", "Includes"]) assert.ok(!headings.includes(old), old);
  assert.match(text(alpha), /Plate \d\d · See it working/);
  assert.doesNotMatch(text(alpha), /prototype/i);
  assert.match(alpha, /aria-label="Placeholder for a video of it working/);
  assert.doesNotMatch(alpha, /<h3/);
  assert.deepEqual(related(alpha).sort(), ["beta-site", "gamma-lib"]);
  assert.deepEqual(related(page(out, "tech/beta-site/index.html")), ["alpha-tool"]);
  assert.deepEqual(related(page(out, "tech/gamma-lib/index.html")), ["alpha-tool"]);
});

test("a project related twice appears once", () => {
  const o = build({
    edit: (d) => editJson(join(d, "relations.json"), (rel) => rel.push({ from: "alpha-tool", to: "beta-site", type: "related-to", evidence: "x" })),
  });
  assert.deepEqual(related(page(o, "tech/alpha-tool/index.html")).sort(), ["beta-site", "gamma-lib"]);
});

test("breadcrumb counts plates as N of total", () => {
  const nums = ["alpha-tool", "beta-site", "gamma-lib"].map((s) => text(page(out, `tech/${s}/index.html`)).match(/Plate (\d\d) of (\d\d)/).slice(1));
  assert.deepEqual(nums.map(([, total]) => total), ["03", "03", "03"]);
  assert.deepEqual(nums.map(([n]) => n).sort(), ["01", "02", "03"]);
});

test("About shows the profile headline and every skill", () => {
  const html = page(out, "tech/index.html");
  const profile = read(join(fixture, "profile.json"));
  const about = html.slice(html.indexOf('data-about-dialog'));
  assert.ok(text(about).includes(profile.bio));
  assert.ok(text(html).includes(profile.headline));
  for (const s of [...profile.skills, ...profile.interests]) assert.ok(text(about).includes(s), s);
});

test("a relation to a slug outside the bundle fails the build", () => {
  assert.throws(() =>
    build({
      edit: (d) => editJson(join(d, "relations.json"), (rel) => rel.push({ from: "alpha-tool", to: "ghost", type: "uses", evidence: "x" })),
    }),
  );
});

test("removing a project leaves no page or card for it", () => {
  const o = build({
    edit: (d) => {
      editJson(join(d, "bundle.json"), (b) => (b.records.projects = b.records.projects.filter((s) => s !== "gamma-lib")));
      rmSync(join(d, "projects", "gamma-lib.json"));
      editJson(join(d, "relations.json"), (rel) => rel.splice(0, rel.length, ...rel.filter((r) => r.to !== "gamma-lib")));
    },
  });
  assert.equal(existsSync(join(o, "tech/gamma-lib")), false);
  assert.doesNotMatch(page(o, "tech/index.html"), /gamma-lib|Gamma Lib/);
});

test("draft banner shows only in a PREVIEW build of a pending bundle", () => {
  assert.doesNotMatch(page(out, "tech/index.html"), /not yet approved/);
  const o = build({
    env: { PREVIEW: "1" },
    edit: (d) => editJson(join(d, "bundle.json"), (b) => (b.approval = "pending")),
  });
  assert.match(page(o, "tech/index.html"), /not yet approved/);
});
