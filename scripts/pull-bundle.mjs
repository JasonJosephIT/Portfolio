// Pull the public bundle Open Thoughts exports into content/bundle/ (delivery ticket: Portfolio pulls,
// Open Thoughts never pushes). Refuses a bundle with a newer schema. A bundle still awaiting approval
// is only allowed with --preview; production builds check bundle.json's approval field again.
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SCHEMA_VERSION = 1;
const src = process.env.OPEN_THOUGHTS_BUNDLE ?? join(homedir(), "Projects", "Open Thoughts", "exports", "bundle");
const dest = new URL("../content/bundle/", import.meta.url).pathname;
const preview = process.argv.includes("--preview");

if (!existsSync(join(src, "bundle.json"))) throw new Error(`no bundle at ${src}`);
const manifest = JSON.parse(readFileSync(join(src, "bundle.json"), "utf8"));
if (manifest.schema_version > SCHEMA_VERSION)
  throw new Error(`bundle schema ${manifest.schema_version} is newer than ${SCHEMA_VERSION}; update Portfolio first`);
if (manifest.approval !== "approved" && !preview)
  throw new Error("bundle is not approved yet; pass --preview to pull drafts for a preview build");

rmSync(dest, { recursive: true, force: true }); // full snapshot: replace wholesale
cpSync(src, dest, { recursive: true });
console.log(`pulled ${manifest.records.projects.length} projects (${manifest.approval}) from ${src}`);
