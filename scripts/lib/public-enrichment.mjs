import { createHash } from "node:crypto";
import { portfolioError, legacyPortfolio, standard } from "../../standards/portfolio.mjs";

const object = v => !!v && typeof v === "object" && !Array.isArray(v);
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const approved = record => typeof record?.approved_at === "string" && Number.isFinite(Date.parse(record.approved_at));

/** Adapt only the approved public API. Never reads drafts, notes, or private/local records. */
export function publicSnapshotToBundle(snapshot) {
  if (!object(snapshot) || snapshot.source !== "open-thoughts" || snapshot.schema_version !== 1 || snapshot.portfolio_standard_version !== standard.standard_version || !object(snapshot.records) || !Array.isArray(snapshot.relations) || typeof snapshot.updated_at !== "string" || !Number.isFinite(Date.parse(snapshot.updated_at))) throw new Error("Unsupported Open Thoughts public snapshot");
  const projects = [];
  let profile = { headline: "", bio: "", skills: [], interests: [], approved_at: null, source_hash: digest(null) };
  for (const [slug, input] of Object.entries(snapshot.records)) {
    if (!slugPattern.test(slug) || !object(input) || !approved(input)) throw new Error(`Public record is not approved: ${slug}`);
    if ("review" in input || "tag" in input || "visibility" in input || "excluded_at" in input) throw new Error(`Unexpected publishing metadata in public record: ${slug}`);
    if (slug === "profile") {
      profile = Object.fromEntries(["headline", "bio", "skills", "interests", "approved_at"].map(k => [k, input[k]]));
      profile.source_hash = digest(profile);
      continue;
    }
    if (input.slug !== slug) throw new Error(`Public record slug mismatch: ${slug}`);
    const record = Object.fromEntries(["slug", "name", "summary", "tags", "description", "media", "approved_at"].map(k => [k, input[k]]));
    record.portfolio = input.portfolio ?? legacyPortfolio(record);
    const error = portfolioError(record.portfolio);
    if (error) throw new Error(`Invalid public enrichment for ${slug}: ${error}`);
    record.part_of = null;
    // The public API intentionally omits private source hashes. Hash the public record for local integrity.
    record.source_hash = digest(record);
    projects.push(record);
  }
  projects.sort((a, b) => a.slug.localeCompare(b.slug));
  const slugs = new Set(projects.map(p => p.slug));
  const relations = snapshot.relations.filter(r => object(r) && slugs.has(r.from) && slugs.has(r.to)).map(r => ({ from: r.from, to: r.to, type: r.type }));
  const manifest = { schema_version: 1, generated_at: snapshot.updated_at, approval: "approved", content_hash: digest({ projects, profile, relations }), records: { projects: [...slugs], profile: "profile.json", relations: "relations.json" } };
  return { manifest, projects, profile, relations };
}
