#!/usr/bin/env node
/**
 * Build the public portfolio pages from the canonical content document.
 *
 *   node scripts/build-portfolio.mjs             write the pages into the repo
 *   node scripts/build-portfolio.mjs --check     compare only, mutate nothing
 *   node scripts/build-portfolio.mjs --out DIR   write a self-contained site
 *
 * Validation is the gate: `validatePortfolio` must return no errors before a
 * single byte is written, because `publishedPortfolio` degrades silently to an
 * empty view and a broken document would otherwise ship as an empty site.
 *
 * The `--out` directory is built from an explicit allowlist, so the canonical
 * JSON (which contains drafts), tests, docs, build scripts and dotfiles such as
 * `.env` cannot leak into a public deploy.
 */

import { mkdir, readFile, writeFile, readdir, rm, rmdir, copyFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { validatePortfolio } from '../lib/portfolio-content.mjs';
import { renderPortfolio, GENERATED_MARKER } from '../lib/portfolio-render.mjs';

const DEFAULT_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Where the build records the pages it generated, so it can clean up its own. */
const MANIFEST = 'content/generated-pages.json';

/** Everything a public deploy needs, and nothing that authors it. */
const PUBLIC_ENTRIES = ['index.html', 'styles.css', 'gallery.css', 'gallery.js', 'assets', 'admin', 'lib'];

/** Detail routes the build owns; only paths under these may be cleaned up. */
const ROUTE_DIRS = ['art/pieces', 'art/projects', 'tech/projects'];

const toSystemPath = (root, relative) => join(root, ...relative.split('/'));

const readIfPresent = async (path) => {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

async function writePage(root, relative, html) {
  const target = toSystemPath(root, relative);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
}

/** Copy a file or a directory tree, skipping dotfiles. */
async function copyEntry(from, to) {
  const info = await stat(from);
  if (!info.isDirectory()) {
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    return;
  }
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    await copyEntry(join(from, entry.name), join(to, entry.name));
  }
}

async function readManifest(root) {
  const raw = await readIfPresent(toSystemPath(root, MANIFEST));
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.pages) ? parsed.pages.filter((page) => typeof page === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Remove a page this build previously generated and no longer renders.
 *
 * Two guards keep the cleanup honest: the path must be a detail route the build
 * owns and must appear in the manifest, and the file on disk must still carry
 * the generated marker. A hand-edited page is left alone.
 */
async function removeStale(root, stale) {
  const removed = [];
  for (const relative of stale) {
    if (!ROUTE_DIRS.some((dir) => relative.startsWith(`${dir}/`)) || !relative.endsWith('/index.html')) continue;
    const target = toSystemPath(root, relative);
    const body = await readIfPresent(target);
    if (body === null || !body.includes(GENERATED_MARKER)) continue;
    await rm(target);
    removed.push(relative);
    // Prune the slug directory, then its parent, while they are empty.
    let directory = dirname(target);
    const stopAt = resolve(root);
    while (resolve(directory) !== stopAt) {
      try {
        await rmdir(directory);
      } catch {
        break;
      }
      directory = dirname(directory);
    }
  }
  return removed.sort();
}

/**
 * Render, and either write the pages, compare them, or produce a public site.
 *
 * @param {object} options
 * @param {string} [options.root] repository root to build from
 * @param {string|null} [options.out] public output directory; the root is left untouched
 * @param {boolean} [options.check] compare only; never write or delete
 * @returns {Promise<{ok: boolean, errors: string[], written: string[], removed: string[], drift: string[]}>}
 */
export async function buildSite({ root = DEFAULT_ROOT, out = null, check = false } = {}) {
  const result = { ok: false, errors: [], written: [], removed: [], drift: [] };

  const raw = await readIfPresent(toSystemPath(root, 'content/portfolio.json'));
  if (raw === null) {
    result.errors.push('content/portfolio.json is missing.');
    return result;
  }

  let document;
  try {
    document = JSON.parse(raw);
  } catch (error) {
    result.errors.push(`content/portfolio.json is not valid JSON: ${error.message}`);
    return result;
  }

  const errors = validatePortfolio(document);
  if (errors.length > 0) {
    result.errors = errors;
    return result;
  }

  const pages = renderPortfolio(document);
  const rendered = [...pages.keys()].sort();

  if (check) {
    for (const relative of rendered) {
      const current = await readIfPresent(toSystemPath(root, relative));
      if (current === null) result.drift.push(`${relative} is missing; run the build.`);
      else if (current !== pages.get(relative)) result.drift.push(`${relative} differs from the rendered output.`);
    }
    for (const relative of await readManifest(root)) {
      if (!pages.has(relative) && (await exists(toSystemPath(root, relative)))) {
        result.drift.push(`${relative} is stale; run the build.`);
      }
    }
    result.ok = result.drift.length === 0;
    return result;
  }

  if (out !== null) {
    await mkdir(out, { recursive: true });
    for (const entry of PUBLIC_ENTRIES) {
      const from = toSystemPath(root, entry);
      if (await exists(from)) await copyEntry(from, join(out, entry));
    }
    for (const relative of rendered) await writePage(out, relative, pages.get(relative));
    result.written = rendered;
    result.ok = true;
    return result;
  }

  const previous = await readManifest(root);
  for (const relative of rendered) await writePage(root, relative, pages.get(relative));
  result.written = rendered;
  result.removed = await removeStale(
    root,
    previous.filter((relative) => !pages.has(relative)),
  );
  await writePage(root, MANIFEST, `${JSON.stringify({ pages: rendered }, null, 2)}\n`);
  result.ok = true;
  return result;
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function parseArguments(argv) {
  const options = { out: null, check: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check') options.check = true;
    else if (argument === '--out') {
      const value = argv[index + 1];
      if (value === undefined) throw new Error('--out needs a directory.');
      options.out = resolve(value);
      index += 1;
    } else if (argument.startsWith('--out=')) options.out = resolve(argument.slice('--out='.length));
    else throw new Error(`Unknown option ${argument}.`);
  }
  if (options.check && options.out !== null) throw new Error('--check and --out cannot be combined.');
  return options;
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
    return;
  }

  const result = await buildSite(options);

  if (result.errors.length > 0) {
    process.stderr.write('The portfolio document is not safe to publish. Nothing was written.\n\n');
    for (const error of result.errors) process.stderr.write(`  - ${error}\n`);
    process.exitCode = 1;
    return;
  }

  if (options.check) {
    if (result.ok) {
      process.stdout.write('Generated pages are up to date.\n');
      return;
    }
    process.stderr.write('Generated pages are out of date:\n\n');
    for (const entry of result.drift) process.stderr.write(`  - ${entry}\n`);
    process.exitCode = 1;
    return;
  }

  const where = options.out === null ? 'the repository root' : options.out;
  process.stdout.write(`Wrote ${result.written.length} page(s) to ${where}.\n`);
  for (const relative of result.removed) process.stdout.write(`Removed stale ${relative}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
