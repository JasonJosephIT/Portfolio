import { before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { buildSite, page as read } from "./helpers.mjs";

let out;
const slugs = [
  "placeholder-split-light-study", "placeholder-warm-half", "placeholder-amber-light-study",
  "placeholder-mono-contrast-study", "placeholder-cool-half", "placeholder-the-hinge",
  "placeholder-cyan-light-study", "placeholder-warm-eye", "placeholder-mono-jaw-study",
];
const page = (p) => read(out, p);
const artPages = () => ["art/index.html", ...slugs.map((s) => `art/pieces/${s}/index.html`)];

before(() => { out = buildSite(); });

test("/art has the heading, side rail, skip link and a link per piece", () => {
  const html = page("art/index.html");
  assert.match(html, /<h1 class="section__title section__title--page" id="selected-works-title">Selected Works<\/h1>/);
  assert.match(html, /<header class="rail" id="top">/);
  assert.match(html, /<a class="skip-link" href="#main">Skip to content<\/a>/);
  assert.match(html, /<main id="main">/);
  assert.match(html, /data-return-page="art"/);
  for (const slug of slugs) assert.match(html, new RegExp(`href="/art/pieces/${slug}"`));
  assert.doesNotMatch(html, /href="[^"]*\.html"/);
});

test("every piece page exists and every Art image has alt text", () => {
  for (const p of artPages()) {
    assert.ok(existsSync(join(out, p)), p);
    const imgs = page(p).match(/<img\b[^>]*>/g) ?? [];
    assert.ok(imgs.length > 0, p);
    for (const img of imgs) {
      if (img.includes('class="brand-logo"')) continue; // decorative wordmark, alt="" as on main
      assert.match(img, /\balt="[^"]+"/, `${p}: ${img}`);
    }
  }
  assert.match(page("art/pieces/placeholder-warm-eye/index.html"), /<h1 class="detail__title">Placeholder, warm eye<\/h1>/);
  assert.match(page("art/pieces/placeholder-warm-eye/index.html"), /<a class="back-link" href="\/art" data-back-link>Back to Art<\/a>/);
});

test("no Art page loads the editor hook or anything from admin/", () => {
  for (const p of artPages()) assert.doesNotMatch(page(p), /admin\/|[?&]edit=|"edit"/, p);
});

test("the Art section menu follows the page order", () => {
  const nav = page("art/index.html").match(/<nav class="rail__nav"[\s\S]*?<\/nav>/)[0];
  assert.deepEqual([...nav.matchAll(/href="#([a-z-]+)"/g)].map((m) => m[1]), ["selected-works", "explore", "about", "contact"]);
});
