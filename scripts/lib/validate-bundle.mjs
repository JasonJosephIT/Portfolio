// Validate an Open Thoughts bundle folder against the vendored schemas/bundle.schema.json.
// Mirrors Open Thoughts scripts/bundle_schema.py (shape + cross-file rules), plus the Portfolio's
// own gates: a too-new schema_version and an unapproved bundle (unless allowPending).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

export const SUPPORTED_SCHEMA_VERSION = 1;
const SCHEMA = JSON.parse(readFileSync(new URL("../../schemas/bundle.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ allErrors: true });
const checker = (name) => ajv.compile({ $ref: `#/$defs/${name}`, $defs: SCHEMA.$defs });
const check = { manifest: checker("manifest"), project: checker("project"), profile: checker("profile"), relation: checker("relation") };

const shape = (name, data, where) =>
  check[name](data) ? [] : check[name].errors.map((e) =>
    // ajv's additionalProperties message omits the field name, so append it
    `${where}${e.instancePath}: ${e.message}${e.params.additionalProperty ? ` '${e.params.additionalProperty}'` : ""}`);

/** Throws one Error listing every problem; returns nothing when the bundle is valid. */
export function validateBundle(dir, { allowPending = false } = {}) {
  const problems = [];
  const load = (p) => JSON.parse(readFileSync(join(dir, p), "utf8"));
  const manifest = load("bundle.json");
  problems.push(...shape("manifest", manifest, "bundle.json"));
  if (manifest.schema_version > SUPPORTED_SCHEMA_VERSION)
    problems.push(`bundle.json: schema_version ${manifest.schema_version} is newer than ${SUPPORTED_SCHEMA_VERSION}; update Portfolio first`);
  if (manifest.approval !== "approved" && !allowPending)
    problems.push(`bundle.json: approval is ${JSON.stringify(manifest.approval)}, not "approved" (preview only: PREVIEW=1 build, --preview pull)`);

  const files = readdirSync(join(dir, "projects")).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
  const records = Object.fromEntries(files.map((f) => [f, load(`projects/${f}.json`)]));
  for (const f of files) {
    problems.push(...shape("project", records[f], `projects/${f}.json`));
    if (records[f].slug !== f) problems.push(`projects/${f}.json: slug ${JSON.stringify(records[f].slug)} != filename stem`);
  }
  problems.push(...shape("profile", load("profile.json"), "profile.json"));
  const relations = load("relations.json");
  relations.forEach((e, i) => problems.push(...shape("relation", e, `relations.json[${i}]`)));

  const listed = new Set(manifest.records?.projects ?? []);
  if ([...listed].sort().join() !== files.join())
    problems.push(`bundle.json: index [${[...listed].sort()}] != projects/ files [${files}]`);
  for (const f of files) {
    const po = records[f].part_of;
    if (po != null && (po === f || !listed.has(po))) problems.push(`projects/${f}.json: part_of ${JSON.stringify(po)} is not another listed project`);
  }
  for (const e of relations)
    for (const end of [e.from, e.to])
      if (!listed.has(end)) problems.push(`relations.json: edge end ${JSON.stringify(end)} is not a listed project`);

  if (problems.length) throw new Error(`Invalid bundle at ${dir}:\n  ${problems.join("\n  ")}`);
}
