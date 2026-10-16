// Pull the public bundle Open Thoughts exports into content/bundle/ (delivery ticket: Portfolio pulls,
// Open Thoughts never pushes). Refuses an invalid bundle or one with a newer schema. A bundle still awaiting
// approval is only allowed with --preview; the build runs the same validateBundle again.
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { validateBundle } from "./lib/validate-bundle.mjs";

const src = process.env.OPEN_THOUGHTS_BUNDLE ?? join(homedir(), "Projects", "Open Thoughts", "exports", "bundle");
const dest = new URL("../content/bundle/", import.meta.url).pathname;
const preview = process.argv.includes("--preview");

if (!existsSync(join(src, "bundle.json"))) throw new Error(`no bundle at ${src}`);
validateBundle(src, { allowPending: preview });
const manifest = JSON.parse(readFileSync(join(src, "bundle.json"), "utf8"));

rmSync(dest, { recursive: true, force: true }); // full snapshot: replace wholesale
cpSync(src, dest, { recursive: true });
console.log(`pulled ${manifest.records.projects.length} projects (${manifest.approval}) from ${src}`);
