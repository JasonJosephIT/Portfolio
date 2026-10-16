import { after, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const fixture = resolve("tests/fixtures/bundle");
const script = resolve("scripts/pull-bundle.mjs");
const tmp = mkdtempSync(join(tmpdir(), "site-pull-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const editJson = (p, fn) => { const d = JSON.parse(readFileSync(p, "utf8")); fn(d); writeFileSync(p, JSON.stringify(d)); };

let n = 0;
/** Temp origin + clone (main holds `committed` as content/bundle, if given), a stub gh, and an export copy of the fixture. */
function setup({ committed = false } = {}) {
  const root = join(tmp, `c${n++}`);
  mkdirSync(root);
  const origin = join(root, "origin.git"), repo = join(root, "repo"), bin = join(root, "bin"), exp = join(root, "export");
  git(root, "init", "-q", "--bare", "-b", "main", origin);
  git(root, "clone", "-q", origin, repo);
  git(repo, "config", "user.email", "t@t"); git(repo, "config", "user.name", "t");
  git(repo, "checkout", "-q", "-b", "main");
  writeFileSync(join(repo, "README"), "x");
  if (committed) cpSync(fixture, join(repo, "content", "bundle"), { recursive: true });
  git(repo, "add", "-A"); git(repo, "commit", "-q", "-m", "init"); git(repo, "push", "-q", "-u", "origin", "main");
  mkdirSync(bin);
  const ghLog = join(root, "gh.log");
  writeFileSync(join(bin, "gh"), `#!/bin/sh\nprintf 'CALL %s\\n' "$*" >> "${ghLog}"\n`);
  chmodSync(join(bin, "gh"), 0o755);
  cpSync(fixture, exp, { recursive: true });
  const run = (...args) => spawnSync("node", [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, OPEN_THOUGHTS_BUNDLE: exp, PORTFOLIO_REPO: repo, PATH: `${bin}:${process.env.PATH}` },
  });
  const ghCalls = () => (existsSync(ghLog) ? readFileSync(ghLog, "utf8").split(/^CALL /m).slice(1) : []);
  return { repo, exp, run, ghCalls, origin };
}
const change = (exp) => {
  editJson(join(exp, "projects", "alpha-tool.json"), (p) => { p.summary = "changed"; });
  editJson(join(exp, "bundle.json"), (m) => { m.content_hash = "b".repeat(64); });
};

test("changed export: one commit on a bundle branch, one gh pr create naming the slug", () => {
  const { repo, exp, run, ghCalls, origin } = setup({ committed: true });
  change(exp);
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(repo, "rev-list", "--count", "origin/main..bundle/bbbbbbbbbbbb"), "1");
  assert.match(git(origin, "branch", "--list", "bundle/*"), /bundle\/bbbbbbbbbbbb/);
  const calls = ghCalls();
  assert.equal(calls.length, 1);
  assert.match(calls[0], /^pr create /);
  assert.match(calls[0], /alpha-tool/);
});

test("unchanged export: exit 0, no commit, no gh", () => {
  const { repo, run, ghCalls } = setup({ committed: true });
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(repo, "branch", "--list", "bundle/*"), "");
  assert.deepEqual(ghCalls(), []);
});

test("missing export folder: exit 0, nothing written", () => {
  const { repo, exp, run, ghCalls } = setup();
  rmSync(exp, { recursive: true });
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(repo, "content")), false);
  assert.deepEqual(ghCalls(), []);
});

test("invalid or pending export: exit 1, content/bundle untouched", () => {
  for (const bad of [(e) => editJson(join(e, "projects", "alpha-tool.json"), (p) => { delete p.name; }),
                     (e) => editJson(join(e, "bundle.json"), (m) => { m.approval = "pending"; })]) {
    const { repo, exp, run, ghCalls } = setup({ committed: true });
    change(exp); bad(exp);
    const before = readFileSync(join(repo, "content/bundle/projects/alpha-tool.json"), "utf8");
    const r = run();
    assert.equal(r.status, 1);
    assert.equal(readFileSync(join(repo, "content/bundle/projects/alpha-tool.json"), "utf8"), before);
    assert.deepEqual(ghCalls(), []);
  }
});

test("a slug removed from the export is removed from content/bundle", () => {
  const { repo, exp, run, ghCalls } = setup({ committed: true });
  rmSync(join(exp, "projects", "gamma-lib.json"));
  editJson(join(exp, "relations.json"), (r) => r.splice(1));
  editJson(join(exp, "bundle.json"), (m) => { m.records.projects = ["alpha-tool", "beta-site"]; m.content_hash = "c".repeat(64); });
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(repo, "content/bundle/projects/gamma-lib.json")), false);
  assert.match(ghCalls()[0], /gamma-lib/);
});

test("--dry-run: commits locally but neither pushes nor calls gh", () => {
  const { repo, exp, run, ghCalls, origin } = setup({ committed: true });
  change(exp);
  const r = run("--dry-run");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(ghCalls(), []);
  assert.equal(git(origin, "branch", "--list", "bundle/*"), "");
});
