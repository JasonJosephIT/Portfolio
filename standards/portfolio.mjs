import standard from "./portfolio-enrichment.json" with { type: "json" };
export { standard };
export const fieldEntries = (portfolio) => standard.sections.flatMap((s) => Object.entries(s.fields).map(([key, label]) => ({ section: s.key, key, label, value: portfolio?.sections?.[s.key]?.fields?.[key] ?? "" })));
export function legacyPortfolio(record) {
  const sections = {};
  for (const d of standard.sections) {
    const fields = Object.fromEntries(Object.keys(d.fields).map((key) => [key, ""]));
    if (d.key === "overview") { fields.name = record.name ?? ""; fields.description = record.summary ?? ""; }
    const missing_fields = Object.keys(fields).filter((key) => !fields[key].trim());
    sections[d.key] = { fields, status: "needs_input", source_refs: Object.values(fields).some(Boolean) ? ["approved:" + record.slug] : [], missing_fields };
  }
  return { schema_version: standard.standard_version, sections };
}
export function publicUrl(value) {
  try {
    const u = new URL(value);
    return value.startsWith("https://") && !!u.hostname && !u.username && !u.password;
  } catch { return false; }
}
const object = (v) => v && typeof v === "object" && !Array.isArray(v);
export function portfolioError(p, { allowDraft = false } = {}) {
  if (!object(p) || p.schema_version !== standard.standard_version || !object(p.sections)) return "unsupported portfolio standard";
  if (Object.keys(p).some((k) => !["schema_version", "sections"].includes(k)) || Object.keys(p.sections).length !== 8) return "portfolio must contain exactly eight sections";
  for (const d of standard.sections) {
    const s = p.sections[d.key];
    if (!object(s) || !object(s.fields) || !Array.isArray(s.source_refs) || !Array.isArray(s.missing_fields)) return "missing portfolio section " + d.key;
    if (Object.keys(s).some((k) => !["fields", "status", "source_refs", "missing_fields"].includes(k))) return "unknown section metadata";
    if (Object.keys(s.fields).sort().join() !== Object.keys(d.fields).sort().join()) return "invalid fields in " + d.key;
    for (const [key, value] of Object.entries(s.fields)) {
      if (typeof value !== "string" || [...value].length > 12000) return "invalid field " + d.key + "." + key;
      if ((d.key === "links" && key === "resources") || (d.key === "overview" && key === "demo_or_image")) {
        const urls = value.split("\n").map((v) => v.trim()).filter(Boolean);
        if (urls.some((v) => !publicUrl(v)) || (key === "demo_or_image" && urls.length > 1)) return "invalid public URL";
      } else if (value.includes("://") || value.includes("www.") || value.includes("](")) return "URLs must be in links or demo";
    }
    const missing = Object.keys(s.fields).filter((k) => !s.fields[k].trim()).sort();
    if (JSON.stringify([...s.missing_fields].sort()) !== JSON.stringify(missing)) return "inconsistent missing fields in " + d.key;
    const allowed = missing.length ? ["needs_input"] : allowDraft ? ["draft", "reviewed"] : ["reviewed"];
    if (!allowed.includes(s.status)) return "unreviewed or inconsistent section " + d.key;
    if (s.source_refs.some((r) => typeof r !== "string" || !/^(note|author|approved):[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r))) return "invalid source reference";
    if (Object.values(s.fields).some((v) => v.trim()) && !s.source_refs.length) return "source references required in " + d.key;
  }
  return null;
}
export function portfolioSchema() {
  const properties = Object.fromEntries(standard.sections.map((d) => [d.key, {
    type: "object", additionalProperties: false, required: ["fields", "status", "source_refs", "missing_fields"],
    properties: {
      fields: { type: "object", additionalProperties: false, required: Object.keys(d.fields), properties: Object.fromEntries(Object.keys(d.fields).map((key) => [key, { type: "string", maxLength: 12000 }])) },
      status: { enum: ["needs_input", "draft", "reviewed"] },
      source_refs: { type: "array", items: { type: "string", pattern: "^(note|author|approved):[a-z0-9]+(?:-[a-z0-9]+)*$" } },
      missing_fields: { type: "array", uniqueItems: true, items: { enum: Object.keys(d.fields) } },
    },
  }]));
  return { type: "object", additionalProperties: false, required: ["schema_version", "sections"], properties: {
    schema_version: { const: standard.standard_version },
    sections: { type: "object", additionalProperties: false, required: standard.sections.map((d) => d.key), properties },
  }};
}
