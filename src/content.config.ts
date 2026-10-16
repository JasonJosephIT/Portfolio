import { defineCollection, z } from "astro:content";
import { file, glob } from "astro/loaders";
import { BUNDLE_DIR } from "./lib/bundle-dir";
import { validateBundle } from "../scripts/lib/validate-bundle.mjs";

// One check for the whole bundle (vendored schema + cross-file rules); a pending bundle only builds with PREVIEW=1.
validateBundle(BUNDLE_DIR, { allowPending: process.env.PREVIEW === "1" });

// content/bundle/ is the Open Thoughts public bundle (bundle-format ticket), pulled by scripts/pull-bundle.mjs.
const projects = defineCollection({
  loader: glob({ pattern: "*.json", base: `${BUNDLE_DIR}/projects` }),
  schema: z.strictObject({
    slug: z.string(),
    name: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    description: z.string(),
    media: z.array(
      z.strictObject({
        key: z.string(),
        kind: z.enum(["image", "video"]),
        checksum: z.string(),
        poster_key: z.string().nullable().optional(),
        caption: z.string().optional(),
      }),
    ),
    part_of: z.string().nullable(),
    approved_at: z.string().nullable(),
    source_hash: z.string(),
  }),
});

const relations = defineCollection({
  loader: file(`${BUNDLE_DIR}/relations.json`, {
    parser: (text) => JSON.parse(text).map((e: { from: string; to: string }, i: number) => ({ id: `${e.from}-${e.to}-${i}`, ...e })),
  }),
  // ponytail: not strict, the parser above adds `id` to each edge; validateBundle already refuses extra fields
  schema: z.object({
    from: z.string(),
    to: z.string(),
    type: z.enum(["uses", "part-of", "built-with", "related-to"]),
    evidence: z.string().optional(),
  }),
});

// docs/<parent>-<kind>.md; validateBundle already checked the frontmatter (parent, kind, slug == stem).
const docs = defineCollection({
  loader: glob({ pattern: "*.md", base: `${BUNDLE_DIR}/docs` }),
  // ponytail: loose, YAML may turn an unquoted approved_at into a Date; the strict check is validateBundle's
  schema: z.object({ parent: z.string(), kind: z.enum(["features", "decisions"]) }).passthrough(),
});

// In-repo, hand-written build notes: <slug>.md. The build page refuses a slug that is not a project.
const BUILDS_DIR = process.env.BUILDS_DIR ?? "src/content/builds";
const builds = defineCollection({
  loader: glob({ pattern: "*.md", base: BUILDS_DIR }),
  schema: z.object({}).passthrough(),
});

export const collections = { projects, relations, docs, builds };
