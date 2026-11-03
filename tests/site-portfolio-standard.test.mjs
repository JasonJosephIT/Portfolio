import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { buildSite, copyFixture, editJson, page } from "./helpers.mjs";
import { validateBundle } from "../scripts/lib/validate-bundle.mjs";
import { legacyPortfolio } from "../standards/portfolio.mjs";

function withPortfolio() {
  return copyFixture((dir) => editJson(join(dir,"projects/alpha-tool.json"),(r) => {
    r.portfolio = legacyPortfolio(r);
    r.portfolio.sections.role_scope = { fields: { ownership:"I designed the sorter and command-line interface.",team:"Solo project",timeline:"January 2026" },status:"reviewed",source_refs:["author:alpha-tool"],missing_fields:[] };
    r.portfolio.sections.links = { fields: { resources:"https://example.com/alpha#demo" }, status:"reviewed",source_refs:["author:alpha-tool"],missing_fields:[] };
  }));
}

test("the approved bundle retains all eight sections and builds a case study with the same authored facts", () => {
  const bundle = withPortfolio();
  validateBundle(bundle);
  const out = buildSite(bundle);
  const html = page(out,"tech/alpha-tool/index.html");
  for (const key of ["overview","problem_audience","role_scope","approach_decisions","challenges_solutions","outcome_evidence","reflection","links"]) {
    assert.match(html,new RegExp('data-section-key="'+key+'"'));
  }
  assert.match(html,/I designed the sorter and command-line interface/);
  assert.match(html,/January 2026/);
  assert.match(html,/href="https:\/\/example.com\/alpha#demo"/);
  assert.match(html,/Not yet documented/);
  assert.match(html,/data-cloud-base="https:\/\/open-thoughts-enrichment.slothdev-joseph.workers.dev"/);
  assert.equal((html.match(/data-demo-topic="true"/g)??[]).length,4);
});

test("draft sections, missing sections, invented provenance and executable links are refused at bundle import", () => {
  for (const corrupt of [
    (p) => delete p.sections.reflection,
    (p) => { p.sections.role_scope.status = "draft"; },
    (p) => { p.sections.role_scope.source_refs = ["/Users/private/notes.md"]; },
    (p) => { p.sections.links.fields.resources = "javascript:alert(1)"; },
  ]) {
    const bundle = withPortfolio();
    editJson(join(bundle,"projects/alpha-tool.json"),(r) => corrupt(r.portfolio));
    assert.throws(()=>validateBundle(bundle));
  }
});

test("older approved records still render eight sections without guessing role, timeline or reflection", () => {
  const out = buildSite();
  const html = page(out,"tech/alpha-tool/index.html");
  assert.match(html,/data-section-key="role_scope"/);
  assert.match(html,/data-section-key="reflection"/);
  assert.doesNotMatch(html,/January 2026/);
});
