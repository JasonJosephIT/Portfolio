import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicSnapshotToBundle } from "../scripts/lib/public-enrichment.mjs";
import { legacyPortfolio } from "../standards/portfolio.mjs";

const record = () => {
  const r = JSON.parse(readFileSync(new URL("./fixtures/bundle/projects/alpha-tool.json", import.meta.url)));
  r.portfolio = legacyPortfolio(r);
  delete r.source_hash;
  delete r.part_of;
  return r;
};
const snapshot = records => ({ source: "open-thoughts", schema_version: 1, portfolio_standard_version: "1.0.0", updated_at: "2026-10-19T00:00:00Z", records, relations: [] });

test("the public project list and its eight sections come directly from the public snapshot", () => {
  const r = record();
  const result = publicSnapshotToBundle(snapshot({ [r.slug]: r }));
  assert.deepEqual(result.manifest.records.projects, [r.slug]);
  assert.deepEqual(result.projects[0].portfolio, r.portfolio);
  assert.equal(result.projects[0].description, r.description);
  assert.equal(Object.keys(result.projects[0].portfolio.sections).length, 8);
});

test("an empty public snapshot stays empty, including after a previous nonempty pull", () => {
  publicSnapshotToBundle(snapshot({ "alpha-tool": record() }));
  const empty = publicSnapshotToBundle(snapshot({}));
  assert.equal(empty.projects.length, 0);
  assert.deepEqual(empty.manifest.records.projects, []);
  assert.equal(empty.profile.bio, "");
  assert.equal(empty.profile.approved_at, null);
});

test("draft, private, excluded, and malformed public records cannot be imported", () => {
  for (const changes of [{ approved_at: null }, { tag: "private" }, { visibility: "context-only" }, { excluded_at: "2026-10-19" }, { review: "pending" }, { portfolio: { schema_version: "1.0.0", sections: {} } }]) {
    assert.throws(() => publicSnapshotToBundle(snapshot({ "alpha-tool": { ...record(), ...changes } })));
  }
});

test("a structured section without factual review is refused", () => {
  const r = record();
  const section = r.portfolio.sections.reflection;
  section.fields = { learned: "A lesson", next_steps: "An improvement" };
  section.missing_fields = [];
  section.status = "draft";
  section.source_refs = ["note:alpha-tool"];
  assert.throws(() => publicSnapshotToBundle(snapshot({ "alpha-tool": r })), /unreviewed/);
});

test("relations never retain project endpoints absent from the public snapshot", () => {
  const data = snapshot({ "alpha-tool": record() });
  data.relations = [{ from: "alpha-tool", to: "private-project", type: "related-to", evidence: "private evidence" }];
  assert.deepEqual(publicSnapshotToBundle(data).relations, []);
});
