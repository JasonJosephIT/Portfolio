// Shared by the site*.test.mjs files: build the site from a bundle folder and read its pages.
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const fixture = resolve("tests/fixtures/bundle");
const tmp = mkdtempSync(join(tmpdir(), "site-test-"));
process.on("exit", () => rmSync(tmp, { recursive: true, force: true }));
let n = 0;

/** `pnpm astro build` into a fresh temp dir; returns it. Throws (with stdout/stderr) when the build fails. */
export function buildSite(bundleDir = fixture, env = {}) {
  const out = join(tmp, `out${n++}`);
  execFileSync("pnpm", ["astro", "build", "--outDir", out], {
    env: { ...process.env, PREVIEW: "", BUNDLE_DIR: bundleDir, ...env },
    encoding: "utf8",
    stdio: "pipe",
  });
  return out;
}

/** A temp copy of the fixture bundle, changed by `edit(dir)`. */
export function copyFixture(edit = () => {}) {
  const dir = join(tmp, `bundle${n++}`);
  cpSync(fixture, dir, { recursive: true });
  edit(dir);
  return dir;
}

export const page = (out, p) => readFileSync(join(out, p), "utf8");
export const editJson = (file, fn) => {
  const data = JSON.parse(readFileSync(file, "utf8"));
  fn(data);
  writeFileSync(file, JSON.stringify(data));
};
