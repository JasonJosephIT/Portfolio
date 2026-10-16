#!/usr/bin/env node
// Fill the project cards in tech.html from a feed file.
// Usage: node scripts/sync-open-thoughts.mjs [feed.json] [--check]
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const check = args.includes("--check");
const feedPath = args.find((a) => !a.startsWith("--")) ?? "content/portfolio-feed.json";
const START = "<!-- open-thoughts:projects:start -->";
const END = "<!-- open-thoughts:projects:end -->";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const card = (p) => `      <article class="project-card">
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.summary)}</p>
        <div class="tech-tags">${(p.tags ?? []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
      </article>`;

const { projects } = JSON.parse(readFileSync(feedPath, "utf8"));
const html = readFileSync("tech.html", "utf8");
const a = html.indexOf(START), b = html.indexOf(END);
if (a < 0 || b < a) { console.error("markers not found in tech.html"); process.exit(1); }

const out = html.slice(0, a + START.length) + "\n" + projects.map(card).join("\n") + "\n      " + html.slice(b);
if (check) { console.log(out === html ? "up to date" : "tech.html is stale"); process.exit(out === html ? 0 : 1); }
writeFileSync("tech.html", out);
console.log(`wrote ${projects.length} cards`);
