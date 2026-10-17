import { before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildSite, copyFixture, editJson, fixture, page } from "./helpers.mjs";

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const build = ({ edit, env } = {}) => buildSite(copyFixture(edit), env);
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

let out;
before(() => {
  out = buildSite();
});

test("each card holds name, summary and tags, and nothing else", () => {
  const html = page(out, "tech/index.html");
  const list = html.slice(0, html.indexOf("</ol>", html.indexOf('class="plate-item"'))); // stop at the end of the card list
  const cards = list.split('class="plate-item"').slice(1); // tag <li>s nest inside, so split rather than match
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
  const about = html.slice(html.indexOf('id="about"'));
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

test("the filter shows only when two projects share a tag", () => {
  assert.doesNotMatch(page(out, "tech/index.html"), />Filter</, "fixture tags are all unique: no one-option filter");
  const o = build({ edit: (d) => editJson(join(d, "projects/beta-site.json"), (r) => r.tags.push("python")) });
  assert.match(page(o, "tech/index.html"), />Filter</);
});

test("the plate count reads 1 plate for a single project", () => {
  const o = build({
    edit: (d) => {
      editJson(join(d, "bundle.json"), (b) => (b.records.projects = ["alpha-tool"]));
      for (const s of ["beta-site", "gamma-lib"]) rmSync(join(d, "projects", `${s}.json`));
      editJson(join(d, "relations.json"), (rel) => rel.splice(0, rel.length));
    },
  });
  assert.match(page(o, "tech/index.html"), />1 plate</);
  assert.match(page(out, "tech/index.html"), />3 plates</);
});
