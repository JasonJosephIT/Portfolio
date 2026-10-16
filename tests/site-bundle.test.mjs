import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateBundle } from "../scripts/lib/validate-bundle.mjs";
import { buildSite, copyFixture as mutated, editJson as edit, fixture } from "./helpers.mjs";

const editJson = (dir, file, fn) => edit(join(dir, file), fn);
const output = (e) => `${e.stdout}${e.stderr}`;
const pending = () => mutated((d) => editJson(d, "bundle.json", (m) => (m.approval = "pending")));

test("the fixture bundle is valid", () => {
  validateBundle(fixture);
});

test("a record missing summary is refused, naming the file and field", () => {
  const dir = mutated((d) => editJson(d, "projects/alpha-tool.json", (r) => delete r.summary));
  assert.throws(() => validateBundle(dir), /projects\/alpha-tool\.json.*summary/);
});

test("a schema_version above the supported one says update Portfolio first", () => {
  const dir = mutated((d) => editJson(d, "bundle.json", (m) => (m.schema_version = 2)));
  assert.throws(() => validateBundle(dir), /update Portfolio first/);
});

test("a pending bundle is refused unless allowPending", () => {
  const dir = pending();
  assert.throws(() => validateBundle(dir), /approv/);
  validateBundle(dir, { allowPending: true });
});

test("a project file not in the manifest index is refused", () => {
  const dir = mutated((d) => {
    cpSync(join(d, "projects/gamma-lib.json"), join(d, "projects/delta-x.json"));
    editJson(d, "projects/delta-x.json", (r) => (r.slug = "delta-x"));
  });
  assert.throws(() => validateBundle(dir), /delta-x/);
});

test("a record with a review field is refused", () => {
  const dir = mutated((d) => editJson(d, "projects/beta-site.json", (r) => (r.review = "draft")));
  assert.throws(() => validateBundle(dir), /beta-site\.json.*review/);
});

test("every problem is listed in one error", () => {
  const dir = mutated((d) => {
    editJson(d, "projects/alpha-tool.json", (r) => delete r.summary);
    editJson(d, "projects/beta-site.json", (r) => (r.review = "x"));
  });
  assert.throws(() => validateBundle(dir), (e) => /alpha-tool/.test(e.message) && /beta-site/.test(e.message));
});

test("build: a pending bundle fails a normal build and passes with PREVIEW=1", () => {
  const dir = pending();
  assert.throws(() => buildSite(dir), (e) => /approv/.test(output(e)));
  buildSite(dir, { PREVIEW: "1" });
});

test("a missing folder or file is a problem naming it, not a raw ENOENT", () => {
  assert.throws(() => validateBundle(join(fixture, "nope")), (e) => /bundle\.json: missing/.test(e.message) && !/ENOENT/.test(e.message));
  const dir = mutated((d) => rmSync(join(d, "profile.json")));
  assert.throws(() => validateBundle(dir), (e) => /profile\.json: missing/.test(e.message) && !/ENOENT/.test(e.message));
});

test("bad JSON is a problem naming the file", () => {
  const dir = mutated((d) => writeFileSync(join(d, "relations.json"), "{nope"));
  assert.throws(() => validateBundle(dir), /relations\.json: not valid JSON/);
});

test("a file outside the bundle layout is refused (docs/*.md is allowed: the fixture has two)", () => {
  for (const stray of ["notes.txt", "projects/alpha-tool.md", "docs/secret.json", "extra/x.json"]) {
    const dir = mutated((d) => { mkdirSync(join(d, stray, ".."), { recursive: true }); writeFileSync(join(d, stray), "x"); });
    assert.throws(() => validateBundle(dir), new RegExp(`${stray.replace(".", "\\.")}: not part of a bundle`), stray);
  }
});

test("build: an empty bundle folder fails with Bundle folder not found", () => {
  const empty = mkdtempSync(join(tmpdir(), "site-empty-"));
  try { assert.throws(() => buildSite(empty), (e) => e.status !== 0 && /Bundle folder not found/.test(output(e))); }
  finally { rmSync(empty, { recursive: true, force: true }); }
});

const editDoc = (d, fn) => {
  const f = join(d, "docs/alpha-tool-features.md");
  writeFileSync(f, fn(readFileSync(f, "utf8")));
};

test("a doc missing a frontmatter field is refused, naming the file and field", () => {
  const dir = mutated((d) => editDoc(d, (s) => s.replace(/^source_hash:.*\n/m, "")));
  assert.throws(() => validateBundle(dir), /docs\/alpha-tool-features\.md.*source_hash/);
});

test("a doc with an unknown kind is refused", () => {
  const dir = mutated((d) => editDoc(d, (s) => s.replace("kind: features", "kind: roadmap")));
  assert.throws(() => validateBundle(dir), /docs\/alpha-tool-features\.md.*kind/);
});

test("a doc whose slug is not its filename stem is refused", () => {
  const dir = mutated((d) => editDoc(d, (s) => s.replace("slug: alpha-tool-features", "slug: other")));
  assert.throws(() => validateBundle(dir), /docs\/alpha-tool-features\.md: slug "other" != filename stem/);
});

test("a doc whose parent is not a listed project is refused", () => {
  const dir = mutated((d) => editDoc(d, (s) => s.replace("parent: alpha-tool", "parent: nope")));
  assert.throws(() => validateBundle(dir), /docs\/alpha-tool-features\.md: parent "nope" is not a listed project/);
});

test("a doc without frontmatter is refused", () => {
  const dir = mutated((d) => editDoc(d, (s) => s.replace(/^---[\s\S]*?---\n/, "")));
  assert.throws(() => validateBundle(dir), /docs\/alpha-tool-features\.md: no frontmatter/);
});

test("a doc whose slug is not <parent>-<kind> is refused (no two docs claim one page)", () => {
  const dir = mutated((d) => {
    const f = join(d, "docs/alpha-tool-decisions.md");
    writeFileSync(f, readFileSync(f, "utf8").replace("kind: decisions", "kind: features"));
  });
  assert.throws(() => validateBundle(dir), /docs\/alpha-tool-decisions\.md: slug "alpha-tool-decisions" != "alpha-tool-features" \(<parent>-<kind>\)/);
});
