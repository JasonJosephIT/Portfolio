import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { buildSite, page as read } from "./helpers.mjs";

let out;
const page = (p) => read(out, p);
before(() => { out = buildSite(); });

test("_redirects 301s the old .html paths", () => {
  const r = page("_redirects");
  for (const line of [
    "/index.html / 301",
    "/art.html /art 301",
    "/tech.html /tech 301",
    "/art/pieces/:slug/index.html /art/pieces/:slug 301",
  ]) assert.ok(r.split("\n").includes(line), line);
});

test("404 page exists, keeps the rail and links back to /", () => {
  const html = page("404.html");
  assert.match(html, /<h1 class="detail__title">Page not found<\/h1>/);
  assert.match(html, /<header class="rail" id="top">/);
  assert.match(html, /href="\/"/);
  assert.doesNotMatch(html, /href="[^"]*\.html"/);
});

test("/tech links to / and /art", () => {
  const html = page("tech/index.html");
  assert.match(html, /<a [^>]*href="\/"[^>]*>\s*Home\s*<\/a>/);
  assert.match(html, /<a [^>]*href="\/art"[^>]*>\s*Art\s*<\/a>/);
});

test("no .html file remains at the repo root", () => {
  assert.deepEqual(readdirSync(".").filter((f) => f.endsWith(".html")), []);
});
