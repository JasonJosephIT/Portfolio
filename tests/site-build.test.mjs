import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildSite, fixture, page } from "./helpers.mjs";

const builds = resolve("tests/fixtures/builds");

test("a build file makes /tech/<slug>/build and a link to it; other projects get neither", () => {
  const out = buildSite(fixture, { BUILDS_DIR: builds });
  const build = page(out, "tech/alpha-tool/build/index.html");
  assert.match(build, /<title>Alpha Tool · How it was built/);
  assert.match(build, /href="\/tech\/alpha-tool"/);
  assert.match(build, /Written by hand for the fixture\./);
  assert.match(page(out, "tech/alpha-tool/index.html"), /href="\/tech\/alpha-tool\/build"[^>]*>\s*How it was built/);
  assert.doesNotMatch(page(out, "tech/beta-site/index.html"), /How it was built|\/build/);
  assert.ok(!existsSync(join(out, "tech/beta-site/build")));
});

test("a missing builds folder builds fine with no build pages", () => {
  const out = buildSite(fixture, { BUILDS_DIR: join(tmpdir(), "no-such-builds") });
  assert.ok(!existsSync(join(out, "tech/alpha-tool/build")));
});

test("a build file for an unknown slug fails the build, naming it", () => {
  const dir = mkdtempSync(join(tmpdir(), "builds-"));
  writeFileSync(join(dir, "ghost.md"), "x\n");
  assert.throws(() => buildSite(fixture, { BUILDS_DIR: dir }), (e) => /ghost/.test(`${e.stdout}${e.stderr}`));
});
