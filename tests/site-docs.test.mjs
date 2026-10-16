import { before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSite, copyFixture, page } from "./helpers.mjs";

let out;
before(() => {
  out = buildSite();
});

test("the fixture project's features and decisions pages hold its headings with stable ids", () => {
  const cases = { features: ["sorting-by-type", "Sorting by type", "dry-run", "Dry run"], decisions: ["standard-library-only", "Standard library only", "folders-named-by-extension", "Folders named by extension"] };
  for (const [kind, [id1, h1, id2, h2]] of Object.entries(cases)) {
    const html = page(out, `tech/alpha-tool/${kind}/index.html`);
    assert.match(html, new RegExp(`<h2 id="${id1}">${h1}</h2>`), kind);
    assert.match(html, new RegExp(`<h2 id="${id2}">${h2}</h2>`), kind);
    assert.match(html, new RegExp(`href="#${id1}"`), `${kind} outline`);
    assert.match(html, /href="\/tech\/alpha-tool"/, `${kind} back link`);
    assert.match(html, new RegExp(`<title>Alpha Tool · ${kind[0].toUpperCase()}${kind.slice(1)}`), `${kind} title`);
  }
});

test("the project page links to its docs only when they exist", () => {
  const alpha = page(out, "tech/alpha-tool/index.html");
  assert.match(alpha, /href="\/tech\/alpha-tool\/features"/);
  assert.match(alpha, /href="\/tech\/alpha-tool\/decisions"/);
  const beta = page(out, "tech/beta-site/index.html");
  assert.doesNotMatch(beta, /\/tech\/beta-site\/(features|decisions)/);
  assert.ok(!existsSync(join(out, "tech/beta-site/features")));
  assert.ok(!existsSync(join(out, "tech/beta-site/decisions")));
});

test("a bundle with no docs folder builds and has no doc pages", () => {
  const o = buildSite(copyFixture((d) => rmSync(join(d, "docs"), { recursive: true })));
  assert.ok(!existsSync(join(o, "tech/alpha-tool/features")));
  assert.doesNotMatch(page(o, "tech/alpha-tool/index.html"), /\/tech\/alpha-tool\/features/);
});

test("build: a doc whose parent is not a bundle project fails", () => {
  const dir = copyFixture((d) => {
    const f = join(d, "docs/alpha-tool-features.md");
    writeFileSync(f, readFileSync(f, "utf8").replace("parent: alpha-tool", "parent: nope"));
  });
  assert.throws(() => buildSite(dir), (e) => /parent "nope" is not a listed project/.test(`${e.stdout}${e.stderr}`));
});
