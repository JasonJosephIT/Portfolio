// Pull Open Thoughts' approved public read model. No source edits, approvals, pushes, or draft fallback.
import { mkdirSync, mkdtempSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { resolve, join } from "node:path";
import { publicSnapshotToBundle } from "./lib/public-enrichment.mjs";
import { validateBundle } from "./lib/validate-bundle.mjs";

const base = process.env.OPEN_THOUGHTS_PUBLIC_URL ?? "https://open-thoughts-enrichment.slothdev-joseph.workers.dev";
const url = new URL(base);
if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("The public enrichment source must be an HTTPS URL without credentials");
const response = await fetch(`${base.replace(/\/$/, "")}/v1/snapshot`, { signal: AbortSignal.timeout(15000), cache: "no-store" });
if (!response.ok) throw new Error(`Public enrichment fetch failed (${response.status}); no draft fallback was used`);
const bundle = publicSnapshotToBundle(await response.json());
const parent = resolve("content");
mkdirSync(parent, { recursive: true });
const stage = mkdtempSync(join(parent, ".public-pull-"));
mkdirSync(join(stage, "projects"));
mkdirSync(join(stage, "docs"));
const write = (name, value) => writeFileSync(join(stage, name), JSON.stringify(value, null, 2) + "\n");
write("bundle.json", bundle.manifest);
write("profile.json", bundle.profile);
write("relations.json", bundle.relations);
for (const project of bundle.projects) write(`projects/${project.slug}.json`, project);
validateBundle(stage);
const destination = join(parent, "bundle-public");
if (existsSync(destination)) renameSync(destination, join(parent, `.public-previous-${Date.now()}`));
renameSync(stage, destination);
console.log(`Pulled ${bundle.projects.length} approved public projects from ${url.origin} into content/bundle-public.`);
if (!bundle.projects.length) console.log("Open Thoughts currently exposes no approved public projects. Portfolio will show its empty state.");
