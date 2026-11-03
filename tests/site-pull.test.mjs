import { after, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { editJson, fixture } from "./helpers.mjs";

const script = resolve("scripts/pull-bundle.mjs");
const tmp = mkdtempSync(join(tmpdir(), "site-pull-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

let n = 0;
/** Temp origin + clone (main holds `committed` as content/bundle, if given), a stub gh, and an export copy of the fixture.
 *  The clone's path has a space. `inRepo`: run the script copied into the clone, without PORTFOLIO_REPO (as pull-daily does). */
function setup({ committed = false, inRepo = false } = {}) {
  const root = join(tmp, `c ${n++}`);
  mkdirSync(root);
  const origin = join(root, "origin.git"), repo = join(root, "repo"), bin = join(root, "bin"), exp = join(root, "export");
  git(root, "init", "-q", "--bare", "-b", "main", origin);
  git(root, "clone", "-q", origin, repo);
  git(repo, "config", "user.email", "t@t"); git(repo, "config", "user.name", "t");
  git(repo, "checkout", "-q", "-b", "main");
  writeFileSync(join(repo, "README"), "x");
  if (committed) cpSync(fixture, join(repo, "content", "bundle"), { recursive: true });
  if (inRepo) {
    for (const d of ["scripts", "schemas", "standards"]) cpSync(resolve(d), join(repo, d), { recursive: true });
    symlinkSync(resolve("node_modules"), join(repo, "node_modules"));
    writeFileSync(join(repo, ".gitignore"), "node_modules\n");
  }
  git(repo, "add", "-A"); git(repo, "commit", "-q", "-m", "init"); git(repo, "push", "-q", "-u", "origin", "main");
  mkdirSync(bin);
  const ghLog = join(root, "gh.log");
  writeFileSync(join(bin, "gh"), `#!/bin/sh\nprintf 'CALL %s\\n' "$*" >> "${ghLog}"\nif [ "$2" = list ]; then if [ -f "${root}/prexists" ]; then echo '[{"number":1}]'; else echo '[]'; fi; fi\nif [ "$2" = create ] && [ -f "${root}/failonce" ]; then rm "${root}/failonce"; exit 1; fi\n`);
  chmodSync(join(bin, "gh"), 0o755);
  cpSync(fixture, exp, { recursive: true });
  const env = { ...process.env, OPEN_THOUGHTS_BUNDLE: exp, PORTFOLIO_REPO: repo, PATH: `${bin}:${process.env.PATH}` };
  if (inRepo) delete env.PORTFOLIO_REPO;
  const run = (...args) => spawnSync("node", [inRepo ? join(repo, "scripts/pull-bundle.mjs") : script, ...args], { encoding: "utf8", env });
  const ghCalls = () => (existsSync(ghLog) ? readFileSync(ghLog, "utf8").split(/^CALL /m).slice(1) : []);
  const creates = () => ghCalls().filter((c) => c.startsWith("pr create"));
  return { repo, exp, run, ghCalls, creates, origin, root };
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
  assert.equal(ghCalls().length, 1);
  assert.match(ghCalls()[0], /^pr create /);
  assert.match(ghCalls()[0], /alpha-tool/);
  assert.equal(git(repo, "rev-parse", "--abbrev-ref", "HEAD"), "main");
  assert.equal(git(repo, "rev-parse", "--verify", "bundle/bbbbbbbbbbbb^{commit}") !== "", true);
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

test("a slug removed from the export is removed from the committed bundle", () => {
  const { repo, exp, run, ghCalls } = setup({ committed: true });
  rmSync(join(exp, "projects", "gamma-lib.json"));
  editJson(join(exp, "relations.json"), (r) => r.splice(1));
  editJson(join(exp, "bundle.json"), (m) => { m.records.projects = ["alpha-tool", "beta-site"]; m.content_hash = "c".repeat(64); });
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.match(ghCalls()[0], /gamma-lib/);
  assert.throws(() => git(repo, "cat-file", "-e", "bundle/cccccccccccc:content/bundle/projects/gamma-lib.json"));
  git(repo, "cat-file", "-e", "bundle/cccccccccccc:content/bundle/projects/alpha-tool.json");
});

test("--dry-run: no push, no gh, checkout restored, repeatable", () => {
  const { repo, exp, run, ghCalls, origin } = setup({ committed: true });
  change(exp);
  for (let i = 0; i < 2; i++) {
    const r = run("--dry-run");
    assert.equal(r.status, 0, r.stderr);
  }
  assert.deepEqual(ghCalls(), []);
  assert.equal(git(origin, "branch", "--list", "bundle/*"), "");
  assert.equal(git(repo, "branch", "--list", "bundle/*"), "");
  assert.equal(git(repo, "rev-parse", "--abbrev-ref", "HEAD"), "main");
});

test("gh fails once after the push: the next run opens the PR", () => {
  const { exp, run, creates, root, origin } = setup({ committed: true });
  change(exp);
  writeFileSync(join(root, "failonce"), "");
  assert.notEqual(run().status, 0);
  assert.match(git(origin, "branch", "--list", "bundle/*"), /bbbbbbbbbbbb/);
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(creates().length, 2); // failed attempt + successful retry
  assert.equal(run().status, 0);
});

test("branch pushed and PR already open: quiet", () => {
  const { exp, run, creates, root } = setup({ committed: true });
  change(exp);
  assert.equal(run().status, 0);
  writeFileSync(join(root, "prexists"), "");
  assert.equal(run().status, 0);
  assert.equal(creates().length, 1);
});

test("stale local working tree does not change the baseline", () => {
  const { repo, exp, run, creates } = setup({ committed: true });
  change(exp);
  // local checkout already holds the export's hash and a different alpha-tool, uncommitted
  editJson(join(repo, "content/bundle/bundle.json"), (m) => { m.content_hash = "b".repeat(64); });
  editJson(join(repo, "content/bundle/projects/alpha-tool.json"), (p) => { p.summary = "changed"; });
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(creates().length, 1);
  assert.match(creates()[0], /Changed: alpha-tool/);
});

test("run from a clone whose path has a space, without PORTFOLIO_REPO", () => {
  const missing = setup({ inRepo: true });
  rmSync(missing.exp, { recursive: true });
  const r0 = missing.run();
  assert.equal(r0.status, 0, r0.stderr);
  assert.equal(r0.stderr, "");

  const { repo, exp, run, creates } = setup({ committed: true, inRepo: true });
  change(exp);
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(creates().length, 1);
  assert.equal(git(repo, "rev-list", "--count", "origin/main..bundle/bbbbbbbbbbbb"), "1");
});

test("--preview copies a pending export to content/bundle-preview, leaving content/bundle alone", () => {
  const { repo, exp, run, ghCalls } = setup({ committed: true });
  change(exp);
  editJson(join(exp, "bundle.json"), (m) => { m.approval = "pending"; });
  const r = run("--preview");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /BUNDLE_DIR=content\/bundle-preview PREVIEW=1 pnpm dev/);
  assert.equal(JSON.parse(readFileSync(join(repo, "content/bundle-preview/bundle.json"), "utf8")).approval, "pending");
  assert.equal(git(repo, "status", "--porcelain", "--", "content/bundle"), "");
  assert.deepEqual(ghCalls(), []);
});
