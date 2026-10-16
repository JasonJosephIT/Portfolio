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
};
export const profile = JSON.parse(readFileSync(join(root, "profile.json"), "utf8")) as Profile;
export const isDraft = manifest.approval !== "approved";

/** Projects in a stable order: parents first, then by name. */
export async function projects() {
  const all = (await getCollection("projects")).map((p) => p.data);
  return all.sort((a, b) => Number(!!a.part_of) - Number(!!b.part_of) || a.name.localeCompare(b.name));
}

export async function relationsFor(slug: string) {
  const edges = (await getCollection("relations")).map((r) => r.data);
  return edges.filter((e) => e.from === slug || e.to === slug).map((e) => ({ ...e, other: e.from === slug ? e.to : e.from, outgoing: e.from === slug }));
}

export const RELATION_LABEL: Record<string, [string, string]> = {
  "part-of": ["Part of", "Includes"],
  "built-with": ["Built with", "Used to build"],
  uses: ["Uses", "Used by"],
  "related-to": ["Related", "Related"],
};

/** A project's docs (features first), empty when the bundle ships none. */
export async function docsFor(slug: string) {
  const all = await getCollection("docs");
  return all.filter((d) => d.data.parent === slug).sort((a, b) => b.data.kind.localeCompare(a.data.kind));
}

export const DOC_TITLE = { features: "Features", decisions: "Decisions" } as const;
