import { before, test } from "node:test";
import assert from "node:assert/strict";
import { buildSite, page } from "./helpers.mjs";

let out;
before(() => { out = buildSite(); });

test("the public sections share the pixelated aerial ocean field", () => {
  for (const path of ["index.html", "art/index.html", "tech/index.html"]) {
    const html = page(out, path);
    assert.match(html, /class="current-field(?: current-field--quiet)?"/);
    assert.match(html, /data-current-water/);
    assert.match(html, /data-ocean-canvas/);
    assert.match(html, /image-rendering:pixelated/);
    assert.match(html, /ocean-waves|<script type="module"/);
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => page(out, m[1])).join("");
    assert.match(html + scripts, /prefers-reduced-motion:\s*reduce/);
  }
});
