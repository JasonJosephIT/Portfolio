import { before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSite, copyFixture, fixture, page } from "./helpers.mjs";

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, v) => writeFileSync(p, JSON.stringify(v));
const build = ({ edit, env } = {}) => buildSite(copyFixture(edit), env);
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

let out;
before(() => {
  out = buildSite();
});

test("each card holds name, summary and tags, and nothing else", () => {
  const html = page(out, "tech/index.html");
  const cards = html.split('class="plate-item"').slice(1); // tag <li>s nest inside, so split rather than match
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

// The links in the list under a relation heading in "Connected work".
const group = (html, label) => {
  const at = html.indexOf(`>${label}</h3>`);
  if (at < 0) return null;
  const list = html.slice(at, html.indexOf("</ul>", at));
  return [...list.matchAll(/href="\/tech\/([a-z-]+)"/g)].map((m) => m[1]);
};

test("project page renders description markdown, tags under Tags, and relations grouped by label", () => {
  const alpha = page(out, "tech/alpha-tool/index.html");
  assert.match(alpha, /Alpha Tool sorts files into folders by type\./);
  assert.match(alpha, />Tags<\/h2>/);
  assert.doesNotMatch(alpha, />Built with<\/h2>/);
  // alpha: incoming "uses" from beta-site, outgoing "built-with" gamma-lib
  assert.deepEqual(group(alpha, "Used by"), ["beta-site"]);
  assert.deepEqual(group(alpha, "Built with"), ["gamma-lib"]);
  assert.deepEqual(group(page(out, "tech/beta-site/index.html"), "Uses"), ["alpha-tool"]);
  assert.deepEqual(group(page(out, "tech/gamma-lib/index.html"), "Used to build"), ["alpha-tool"]);
});

test("edges of one type and direction share one heading", () => {
  const o = build({
    edit: (d) => write(join(d, "relations.json"), [...read(join(d, "relations.json")), { from: "beta-site", to: "gamma-lib", type: "built-with", evidence: "x" }]),
  });
  const gamma = page(o, "tech/gamma-lib/index.html");
  assert.equal(gamma.split(">Used to build</h3>").length, 2);
  assert.deepEqual(group(gamma, "Used to build").sort(), ["alpha-tool", "beta-site"]);
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
      edit: (d) => {
        const rel = read(join(d, "relations.json"));
        rel.push({ from: "alpha-tool", to: "ghost", type: "uses", evidence: "x" });
        write(join(d, "relations.json"), rel);
      },
    }),
  );
});

test("removing a project leaves no page or card for it", () => {
  const o = build({
    edit: (d) => {
      const b = read(join(d, "bundle.json"));
      b.records.projects = b.records.projects.filter((s) => s !== "gamma-lib");
      write(join(d, "bundle.json"), b);
      rmSync(join(d, "projects", "gamma-lib.json"));
      write(join(d, "relations.json"), read(join(d, "relations.json")).filter((r) => r.to !== "gamma-lib"));
    },
  });
  assert.equal(existsSync(join(o, "tech/gamma-lib")), false);
  assert.doesNotMatch(page(o, "tech/index.html"), /gamma-lib|Gamma Lib/);
});

test("draft banner shows only in a PREVIEW build of a pending bundle", () => {
  assert.doesNotMatch(page(out, "tech/index.html"), /not yet approved/);
  const o = build({
    env: { PREVIEW: "1" },
    edit: (d) => {
      const b = read(join(d, "bundle.json"));
      b.approval = "pending";
      write(join(d, "bundle.json"), b);
    },
  });
  assert.match(page(o, "tech/index.html"), /not yet approved/);
});
