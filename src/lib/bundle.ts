import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BUNDLE_DIR } from "./bundle-dir";
import { getCollection } from "astro:content";

const root = resolve(BUNDLE_DIR); // builds run from the repo root

export interface Profile {
  headline: string;
  bio: string;
  skills: string[];
  interests: string[];
  approved_at: string | null;
}

export const manifest = JSON.parse(readFileSync(join(root, "bundle.json"), "utf8")) as {
  schema_version: number;
  approval: "approved" | "pending";
  generated_at: string;
  records: { projects: string[] };
};
export const profile = JSON.parse(readFileSync(join(root, "profile.json"), "utf8")) as Profile;
export const isDraft = manifest.approval !== "approved";

/** Projects in a stable order: parents first, then by name. */
export async function projects() {
  // Full-snapshot membership comes from the manifest, including after a cached build.
  const included = new Set(manifest.records.projects);
  const all = (await getCollection("projects")).map((p) => p.data).filter((p) => included.has(p.slug));
  return all.sort((a, b) => Number(!!a.part_of) - Number(!!b.part_of) || a.name.localeCompare(b.name));
}

export async function relationsFor(slug: string) {
  const edges = (await getCollection("relations")).map((r) => r.data);
  const others = edges.filter((e) => e.from === slug || e.to === slug).map((e) => (e.from === slug ? e.to : e.from));
  return [...new Set(others)]; // slugs, one per project however many edges join them
}

/** A project's docs (features first), empty when the bundle ships none. */
export async function docsFor(slug: string) {
  const all = await getCollection("docs");
  return all.filter((d) => d.data.parent === slug).sort((a, b) => DOC_KINDS.indexOf(a.data.kind) - DOC_KINDS.indexOf(b.data.kind));
}

// Doc kinds in page order; the docs collection schema takes its enum from these keys.
export const DOC_TITLE = { features: "What it does", decisions: "Why it’s built this way" } as const;
const DOC_KINDS: string[] = Object.keys(DOC_TITLE);

/** Hand-written build notes, keyed by project slug (empty when the folder is missing). */
export const builds = async () => getCollection("builds");
