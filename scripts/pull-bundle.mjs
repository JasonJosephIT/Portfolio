// Pull the public bundle Open Thoughts exports into content/bundle/ and open a PR for Jason to merge
// (Open Thoughts never pushes; Portfolio pulls). Quiet when the export folder is missing or unchanged.
// An invalid export, or one still awaiting approval, is refused (exit 1) unless --preview, which copies
// the draft locally for a preview build and never commits. --dry-run commits locally but skips push and gh.
import { cpSync, existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { validateBundle } from "./lib/validate-bundle.mjs";

const src = process.env.OPEN_THOUGHTS_BUNDLE ?? join(homedir(), "Projects", "Open Thoughts", "exports", "bundle");
const repo = process.env.PORTFOLIO_REPO ?? new URL("..", import.meta.url).pathname;
const dest = join(repo, "content", "bundle");
const preview = process.argv.includes("--preview");
const dryRun = process.argv.includes("--dry-run");

if (!existsSync(join(src, "bundle.json"))) { console.log(`no bundle at ${src}; nothing to pull`); process.exit(0); }
try { validateBundle(src, { allowPending: preview }); } catch (e) { console.error(e.message); process.exit(1); }

const manifest = JSON.parse(readFileSync(join(src, "bundle.json"), "utf8"));
const read = (dir, p) => { try { return readFileSync(join(dir, p), "utf8"); } catch { return null; } };
const slugs = (dir) => (existsSync(join(dir, "projects")) ? readdirSync(join(dir, "projects")).map((f) => f.slice(0, -5)).sort() : []);
const swap = () => { rmSync(dest, { recursive: true, force: true }); cpSync(src, dest, { recursive: true }); }; // full snapshot

if (preview) {
  swap();
  console.log(`pulled ${manifest.records.projects.length} projects (${manifest.approval}) from ${src}`);
  process.exit(0);
}

const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
const tryGit = (...args) => { try { return git(...args); } catch { return null; } };
git("fetch", "origin");

// Baseline is what origin/main holds, never the local working tree.
const base = (p) => tryGit("show", `origin/main:content/bundle/${p}`);
const hash = manifest.content_hash;
if (hash === JSON.parse(base("bundle.json") ?? "{}").content_hash) { console.log("bundle unchanged"); process.exit(0); }

const stem = (f) => f.split("/").pop().replace(/\.json$/, "");
const was = (tryGit("ls-tree", "-r", "--name-only", "origin/main", "--", "content/bundle/projects") ?? "").split("\n").filter(Boolean).map(stem).sort();
const now = slugs(src);
const added = now.filter((s) => !was.includes(s));
const removed = was.filter((s) => !now.includes(s));
const changed = now.filter((s) => was.includes(s) && base(`projects/${s}.json`) !== read(src, `projects/${s}.json`));
const list = (title, xs) => `${title}: ${xs.length ? xs.join(", ") : "none"}`;
const body = [list("Added", added), list("Changed", changed), list("Removed", removed)].join("\n");
const branch = `bundle/${hash.slice(0, 12)}`;
const title = `bundle: ${now.length} projects (${hash.slice(0, 12)})`;
const pr = () => execFileSync("gh", ["pr", "create", "--base", "main", "--head", branch, "--title", title, "--body", body], { cwd: repo, stdio: "inherit" });

// Branch already pushed (an earlier run died at gh): open its PR unless one exists.
if (tryGit("ls-remote", "--exit-code", "--heads", "origin", branch) !== null) {
  if (dryRun) { console.log(`dry run: ${branch} is on origin; would open its PR if none exists`); process.exit(0); }
  const open = JSON.parse(execFileSync("gh", ["pr", "list", "--head", branch, "--json", "number"], { cwd: repo, encoding: "utf8" }).trim() || "[]");
  if (open.length) { console.log(`PR for ${branch} already open`); process.exit(0); }
  pr();
  process.exit(0);
}

const start = git("rev-parse", "--abbrev-ref", "HEAD");
const startRef = start === "HEAD" ? git("rev-parse", "HEAD") : start;
git("switch", "-C", branch, "origin/main");
try {
  swap();
  git("add", "content/bundle");
  git("commit", "-m", title);
  if (dryRun) console.log(`dry run: would push ${branch} and open PR "${title}"\n${body}`);
  else { git("push", "-u", "origin", branch); pr(); }
} finally {
  git(...(start === "HEAD" ? ["switch", "--detach", startRef] : ["switch", start])); // leave the checkout where we found it
  if (dryRun) git("branch", "-D", branch);
}
