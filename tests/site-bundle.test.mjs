import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync } from "node:fs";
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
