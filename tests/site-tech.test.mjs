import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const fixture = resolve("tests/fixtures/bundle");
const tmp = mkdtempSync(join(tmpdir(), "site-tech-"));
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, v) => writeFileSync(p, JSON.stringify(v));

// Build a (possibly edited) copy of the fixture bundle; edit(dir) mutates the copy.
function build(name, { edit = () => {}, env = {} } = {}) {
  const bundle = join(tmp, `${name}-bundle`);
  const out = join(tmp, name);
  cpSync(fixture, bundle, { recursive: true });
  edit(bundle);
  execFileSync("pnpm", ["astro", "build", "--outDir", out], { env: { ...process.env, BUNDLE_DIR: bundle, ...env }, stdio: "pipe" });
  return out;
}
const page = (out, p) => readFileSync(join(out, p), "utf8");
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

let out;
before(() => {
  out = build("main");
});
after(() => rmSync(tmp, { recursive: true, force: true }));

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

test("project page renders description markdown and relations under RELATION_LABEL", () => {
  const alpha = page(out, "tech/alpha-tool/index.html");
  assert.match(alpha, /Alpha Tool sorts files into folders by type\./);
  // alpha: incoming "uses" from beta-site, outgoing "built-with" gamma-lib
  assert.match(alpha, /Used by<\/span>[\s\S]*?href="\/tech\/beta-site"|href="\/tech\/beta-site"[\s\S]*?Used by/);
  assert.match(alpha, /href="\/tech\/gamma-lib"[\s\S]*?Built with<\/span>/);
  const beta = page(out, "tech/beta-site/index.html");
  assert.match(beta, /href="\/tech\/alpha-tool"[\s\S]*?Uses<\/span>/);
  const gamma = page(out, "tech/gamma-lib/index.html");
  assert.match(gamma, /href="\/tech\/alpha-tool"[\s\S]*?Used to build<\/span>/);
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
    build("badrel", {
      edit: (d) => {
        const rel = read(join(d, "relations.json"));
        rel.push({ from: "alpha-tool", to: "ghost", type: "uses", evidence: "x" });
        write(join(d, "relations.json"), rel);
      },
    }),
  );
});

test("removing a project leaves no page or card for it", () => {
  const o = build("removed", {
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
  const o = build("pending", {
    env: { PREVIEW: "1" },
    edit: (d) => {
      const b = read(join(d, "bundle.json"));
      b.approval = "pending";
      write(join(d, "bundle.json"), b);
    },
  });
  assert.match(page(o, "tech/index.html"), /not yet approved/);
});
