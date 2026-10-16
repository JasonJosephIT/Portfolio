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

const hash = manifest.content_hash;
if (hash === JSON.parse(read(dest, "bundle.json") ?? "{}").content_hash) { console.log("bundle unchanged"); process.exit(0); }

const was = slugs(dest), now = slugs(src);
const file = (dir, s) => read(dir, `projects/${s}.json`);
const added = now.filter((s) => !was.includes(s));
const removed = was.filter((s) => !now.includes(s));
const changed = now.filter((s) => was.includes(s) && file(dest, s) !== file(src, s));
const list = (title, xs) => `${title}: ${xs.length ? xs.join(", ") : "none"}`;
const body = [list("Added", added), list("Changed", changed), list("Removed", removed)].join("\n");
const branch = `bundle/${hash.slice(0, 12)}`;
const title = `bundle: ${now.length} projects (${hash.slice(0, 12)})`;

const run = (cmd, ...args) => execFileSync(cmd, args, { cwd: repo, stdio: "inherit" });
run("git", "fetch", "origin");
run("git", "switch", "-c", branch, "origin/main");
swap();
run("git", "add", "content/bundle");
run("git", "commit", "-m", title);
if (dryRun) { console.log(`dry run: would push ${branch} and open PR "${title}"\n${body}`); process.exit(0); }
run("git", "push", "-u", "origin", branch);
run("gh", "pr", "create", "--base", "main", "--head", branch, "--title", title, "--body", body);
