import { before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { buildSite, page } from "./helpers.mjs";

let out;
const slugs = ["alpha-tool", "beta-site", "gamma-lib"];
const names = ["Alpha Tool", "Beta Site", "Gamma Lib"];

before(() => { out = buildSite(); });

test("/tech lists exactly the fixture's projects", () => {
  const html = page(out, "tech/index.html");
  for (const n of names) assert.ok(html.includes(n), `missing ${n}`);
  const linked = [...new Set([...html.matchAll(/href="\/tech\/([a-z0-9-]+)"/g)].map((m) => m[1]))].sort();
  assert.deepEqual(linked, slugs);
});

test("each fixture slug has a detail page", () => {
  for (const s of slugs) assert.ok(existsSync(join(out, "tech", s, "index.html")), s);
});
