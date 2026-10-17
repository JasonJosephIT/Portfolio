import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { buildSite, page } from "./helpers.mjs";

let out;
before(() => { out = buildSite(); });

test("/ is the diptych Home with clean nav links", () => {
  const html = page(out, "index.html");
  assert.match(html, /<h1 class="wall-name"[^>]*>JASON<\/h1>/);
  assert.match(html, /Man is not truly one, but truly two\./);
  assert.match(html, /<body class="home"/);
  assert.match(html, /href="\/art"/);
  assert.match(html, /href="\/tech"/);
  assert.doesNotMatch(html, /href="[^"]*\.html"/);
});

test("diptych CSS resolves the font and carries no Tailwind", () => {
  const html = page(out, "index.html");
  const css = [...html.matchAll(/href="(\/_astro\/[^"]+\.css)"/g)].map((m) => page(out, m[1])).join("")
    + [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("");
  assert.match(css, /url\(\/fonts\/archivo-var\.woff2\)|url\("\/fonts\/archivo-var\.woff2"\)/);
  assert.match(css, /\.diptych/);
  assert.doesNotMatch(css, /tailwindcss/);
  assert.ok(readdirSync(join(out, "fonts")).includes("archivo-var.woff2"));
});

test("/ starts with a skip link to main and marks Home as the current page", () => {
  const html = page(out, "index.html");
  assert.match(html, /<body class="home">\s*<a class="skip-link" href="#main">Skip to content<\/a>/);
  assert.match(html, /<main class="wall" id="main">/);
  assert.match(html, /<a href="\/" class="current" aria-current="page">Home<\/a>/);
});
