import { before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const fixture = resolve("tests/fixtures/bundle");
const out = mkdtempSync(join(tmpdir(), "site-"));
const slugs = ["alpha-tool", "beta-site", "gamma-lib"];
const names = ["Alpha Tool", "Beta Site", "Gamma Lib"];

before(() => {
  execFileSync("pnpm", ["astro", "build", "--outDir", out], { env: { ...process.env, BUNDLE_DIR: fixture }, stdio: "pipe" });
});

test("/tech lists exactly the fixture's projects", () => {
  const html = readFileSync(join(out, "tech/index.html"), "utf8");
  for (const n of names) assert.ok(html.includes(n), `missing ${n}`);
  const linked = [...new Set([...html.matchAll(/href="\/tech\/([a-z0-9-]+)"/g)].map((m) => m[1]))].sort();
  assert.deepEqual(linked, slugs);
});

test("each fixture slug has a detail page", () => {
  for (const s of slugs) assert.ok(existsSync(join(out, "tech", s, "index.html")), s);
});
