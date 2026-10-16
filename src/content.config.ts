import { defineCollection, z } from "astro:content";
import { file, glob } from "astro/loaders";

// content/bundle/ is the Open Thoughts public bundle (bundle-format ticket), pulled by scripts/pull-bundle.mjs.
const projects = defineCollection({
  loader: glob({ pattern: "*.json", base: "./content/bundle/projects" }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    description: z.string(),
    media: z.array(z.object({ key: z.string(), kind: z.string(), caption: z.string().optional() })).default([]),
    part_of: z.string().nullable().optional(),
    approved_at: z.string().nullable(),
  }),
});

const relations = defineCollection({
  loader: file("./content/bundle/relations.json", {
    parser: (text) => JSON.parse(text).map((e: { from: string; to: string }, i: number) => ({ id: `${e.from}-${e.to}-${i}`, ...e })),
  }),
  schema: z.object({
    from: z.string(),
    to: z.string(),
    type: z.enum(["uses", "part-of", "built-with", "related-to"]),
    evidence: z.string().optional(),
  }),
});

export const collections = { projects, relations };
