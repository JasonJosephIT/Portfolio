import { before, test } from "node:test";
import assert from "node:assert/strict";
import { buildSite, page } from "./helpers.mjs";

let out;
before(() => { out = buildSite(); });

// The bay backdrop (Backdrop.astro) replaced the CurrentField ocean as the site's ground.
test("the public sections share the persistent bay backdrop, each at its own camera spot", () => {
  for (const [path, pos] of [["index.html", "0"], ["art/index.html", "-1"], ["tech/index.html", "1"]]) {
    const html = page(out, path);
    assert.match(html, /data-astro-transition-persist="bay" class="backdrop"/);
    assert.match(html, /<video class="pan"[^>]*src="\/media\/bay-pan\.mp4"/);
    assert.match(html, /<canvas class="foam">/);
    assert.match(html, new RegExp(`data-bay-pos="${pos}"`));
    assert.doesNotMatch(html, /class="current-field/);
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => page(out, m[1])).join("");
    assert.match(html + scripts, /prefers-reduced-motion:\s*reduce/);
  }
});
