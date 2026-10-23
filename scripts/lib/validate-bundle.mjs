// Validate an Open Thoughts bundle folder against the vendored schemas/bundle.schema.json.
// Mirrors Open Thoughts scripts/bundle_schema.py (shape + cross-file rules), plus the Portfolio's
// own gates: a too-new schema_version and an unapproved bundle (unless allowPending).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { portfolioError } from "../../standards/portfolio.mjs";

export const SUPPORTED_SCHEMA_VERSION = 1;
const SCHEMA = JSON.parse(readFileSync(new URL("../../schemas/bundle.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ allErrors: true });
const checker = (name) => ajv.compile({ $ref: `#/$defs/${name}`, $defs: SCHEMA.$defs });
const check = { manifest: checker("manifest"), project: checker("project"), profile: checker("profile"), relation: checker("relation"), doc: checker("doc_frontmatter") };

const shape = (name, data, where) =>
  check[name](data) ? [] : check[name].errors.map((e) =>
    // ajv's additionalProperties message omits the field name, so append it
    `${where}${e.instancePath}: ${e.message}${e.params.additionalProperty ? ` '${e.params.additionalProperty}'` : ""}`);

/** Throws one Error listing every problem; returns nothing when the bundle is valid. */
export function validateBundle(dir, { allowPending = false } = {}) {
  const problems = [];
  const fail = () => { throw new Error(`Invalid bundle at ${dir}:\n  ${problems.join("\n  ")}`); };
  const load = (p) => {
    try { return JSON.parse(readFileSync(join(dir, p), "utf8")); }
    catch (e) { problems.push(`${p}: ${e.code === "ENOENT" ? "missing" : `not valid JSON (${e.message})`}`); }
  };
  const manifest = load("bundle.json");
  if (!manifest) fail();
  problems.push(...shape("manifest", manifest, "bundle.json"));
  if (manifest.schema_version > SUPPORTED_SCHEMA_VERSION)
    problems.push(`bundle.json: schema_version ${manifest.schema_version} is newer than ${SUPPORTED_SCHEMA_VERSION}; update Portfolio first`);
  if (manifest.approval !== "approved" && !allowPending)
    problems.push(`bundle.json: approval is ${JSON.stringify(manifest.approval)}, not "approved" (preview only: PREVIEW=1 build, --preview pull)`);

  // Only the bundle layout ships: anything else in the folder would be copied into a commit unreviewed.
  const all = readdirSync(dir, { recursive: true }).filter((p) => statSync(join(dir, p)).isFile());
  for (const p of all)
    if (!/^((bundle|profile|relations)\.json|projects\/[^/]+\.json|docs\/[^/]+\.md)$/.test(p) && basename(p) !== ".DS_Store") // ponytail: Finder litter, gitignored
      problems.push(`${p}: not part of a bundle`);

  const files = all.filter((p) => /^projects\/[^/]+\.json$/.test(p)).map((p) => p.slice(9, -5)).sort();
  const records = Object.fromEntries(files.map((f) => [f, load(`projects/${f}.json`)]).filter(([, r]) => r));
  for (const [f, r] of Object.entries(records)) {
    problems.push(...shape("project", r, `projects/${f}.json`));
    if (r.portfolio) {
      const error = portfolioError(r.portfolio, { allowDraft: allowPending && manifest.approval === "pending" });
      if (error) problems.push(`projects/${f}.json: ${error}`);
    }
    if (r.slug !== f) problems.push(`projects/${f}.json: slug ${JSON.stringify(r.slug)} != filename stem`);
  }
  const profile = load("profile.json");
  if (profile) problems.push(...shape("profile", profile, "profile.json"));
  const relations = load("relations.json") ?? [];
  relations.forEach((e, i) => problems.push(...shape("relation", e, `relations.json[${i}]`)));

  const listed = new Set(manifest.records?.projects ?? []);
  if ([...listed].sort().join() !== files.join())
    problems.push(`bundle.json: index [${[...listed].sort()}] != projects/ files [${files}]`);
  for (const [f, r] of Object.entries(records)) {
    const po = r.part_of;
    if (po != null && (po === f || !listed.has(po))) problems.push(`projects/${f}.json: part_of ${JSON.stringify(po)} is not another listed project`);
  }
  for (const e of relations)
    for (const end of [e.from, e.to])
      if (!listed.has(end)) problems.push(`relations.json: edge end ${JSON.stringify(end)} is not a listed project`);

  for (const p of all.filter((p) => /^docs\/[^/]+\.md$/.test(p))) {
    const fm = frontmatter(readFileSync(join(dir, p), "utf8"))?.data;
    if (!fm) { problems.push(`${p}: no frontmatter`); continue; }
    problems.push(...shape("doc", fm, p));
    if (fm.slug !== basename(p, ".md")) problems.push(`${p}: slug ${JSON.stringify(fm.slug)} != filename stem`);
    const want = `${fm.parent}-${fm.kind}`; // also rules out two docs for one (parent, kind) page
    if (fm.slug !== want) problems.push(`${p}: slug ${JSON.stringify(fm.slug)} != ${JSON.stringify(want)} (<parent>-<kind>)`);
    if (!listed.has(fm.parent)) problems.push(`${p}: parent ${JSON.stringify(fm.parent)} is not a listed project`);
  }

  if (problems.length) fail();
}

/** A markdown file's frontmatter fields and body, or null without frontmatter. Skips a BOM and `#` comment lines.
 * ponytail: flat `key: value` lines only (all doc_frontmatter is); a YAML parser if Open Thoughts ever nests */
export function frontmatter(text) {
  const m = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(text);
  if (!m) return null;
  const data = Object.fromEntries(m[1].split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).map((l) => {
    const i = l.indexOf(":");
    const v = l.slice(i + 1).trim();
    return [l.slice(0, i).trim(), v === "null" ? null : v.replace(/^(["'])(.*)\1$/, "$2")];
  }));
  return { data, body: m[2] };
}
