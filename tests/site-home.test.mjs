import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const fixture = resolve("tests/fixtures/bundle");
const out = mkdtempSync(join(tmpdir(), "site-"));

before(() => {
  execFileSync("pnpm", ["astro", "build", "--outDir", out], { env: { ...process.env, BUNDLE_DIR: fixture }, stdio: "pipe" });
});
after(() => rmSync(out, { recursive: true, force: true }));

test("/ is the diptych Home with clean nav links", () => {
  const html = readFileSync(join(out, "index.html"), "utf8");
  assert.match(html, /<h1 class="wall-name"[^>]*>JASON<\/h1>/);
  assert.match(html, /Man is not truly one, but truly two\./);
  assert.match(html, /<body class="home"/);
  assert.match(html, /href="\/art"/);
  assert.match(html, /href="\/tech"/);
  assert.doesNotMatch(html, /href="[^"]*\.html"/);
});

test("diptych CSS resolves the font and carries no Tailwind", () => {
  const html = readFileSync(join(out, "index.html"), "utf8");
  const css = [...html.matchAll(/href="(\/_astro\/[^"]+\.css)"/g)].map((m) => readFileSync(join(out, m[1]), "utf8")).join("")
    + [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("");
  assert.match(css, /url\(\/fonts\/archivo-var\.woff2\)|url\("\/fonts\/archivo-var\.woff2"\)/);
  assert.match(css, /\.diptych/);
  assert.doesNotMatch(css, /tailwindcss/);
  assert.ok(readdirSync(join(out, "fonts")).includes("archivo-var.woff2"));
});
