import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSite, page } from "./helpers.mjs";

let production, preview;
const resume = JSON.parse(readFileSync("src/data/resume.json", "utf8"));
before(() => {
  production = buildSite();
  preview = buildSite(undefined, { PREVIEW: "1" });
});

test("resume shows the supplied bundle's projects and skills, with valid detail links", () => {
  const html = page(production, "resume/index.html");
  for (const [slug, name] of [["alpha-tool", "Alpha Tool"], ["beta-site", "Beta Site"], ["gamma-lib", "Gamma Lib"]]) {
    assert.ok(html.includes(name));
    assert.ok(html.includes(`href="/tech/${slug}"`));
    assert.ok(page(production, `tech/${slug}/index.html`));
  }
  assert.match(html, /Builds small web tools/);
  assert.match(html, /<li(?:\s[^>]*)?>python<\/li>/);
  assert.match(html, /<li(?:\s[^>]*)?>sql<\/li>/);
});

test("pending career copy never appears in a production build", () => {
  assert.equal(resume.approved_at, null, "this test exercises the pending career record");
  const html = page(production, "resume/index.html");
  for (const entry of resume.experience) {
    assert.ok(!html.includes(entry.organization), `unapproved organization leaked: ${entry.organization}`);
    for (const bullet of entry.bullets) assert.ok(!html.includes(bullet), "unapproved bullet leaked");
  }
  assert.ok(!html.includes(resume.education));
  assert.ok(!html.includes(resume.source));
});

test("preview includes traceable career copy, dates, and explicit in-progress credentials", () => {
  const html = page(preview, "resume/index.html");
  assert.ok(html.includes("Career details are a draft for review"));
  for (const entry of resume.experience) {
    assert.ok(html.includes(entry.organization));
    assert.ok(html.includes(entry.dates));
  }
  assert.ok(html.includes("B.S. Information Technology (in progress)"));
  assert.match(html, /<h3(?:\s[^>]*)?>In progress<\/h3>/);
  assert.ok(!html.includes(resume.source));
});

test("resume is discoverable from tech and marks the correct navigation destination", () => {
  const resumeHtml = page(production, "resume/index.html");
  assert.match(resumeHtml, /aria-label="Resume navigation"/);
  assert.match(resumeHtml, /href="#selected-projects"/);
  assert.match(page(production, "tech/index.html"), /href="\/resume"/);
  assert.doesNotMatch(resumeHtml, /href="\/tech" aria-current="page"/);
  assert.match(resumeHtml, /id="print-resume"/);
});


test("website resume has its separate layout and full project record", () => {
  const html = page(preview, "resume/index.html");
  assert.match(html, /class="resume-site"/);
  assert.doesNotMatch(html, /data-current-field|class="chat-panel/);
  assert.match(html, /Print full resume/);
  assert.match(html, /Community leadership/);
});
