#!/usr/bin/env node
/**
 * Turn explicitly supplied inbox proposals into canonical draft records.
 *
 *   node scripts/import-portfolio.mjs --input FILE
 *   node scripts/import-portfolio.mjs --input FILE --content PATH [--root DIR]
 *   node scripts/import-portfolio.mjs --input FILE --download
 *
 * This script is the only thing in the workflow that writes the repository. The
 * owner editor cannot: a browser has no access to the working tree, so it
 * exports a file and this script imports one.
 *
 * It reads nothing but `--input`. It never queries the inbox, never lists
 * submissions and never marks one placed — deciding what to import is Jason's
 * job, and the proposal file is the record of that decision.
 *
 * Everything it does is all-or-nothing. A proposal that cannot be read, an image
 * that is not where it was promised, a download that fails, or a result that
 * does not validate: any of those and the canonical document is left exactly as
 * it was, with no half-written file and no orphaned asset.
 */

import { readFile, writeFile, rename, rm, mkdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { safeUrl } from '../lib/portfolio-content.mjs';
import {
  kindOf,
  parseCanonical,
  serializeCanonical,
  normalizeProposals,
  readProposal,
  importProposals,
  inboxAssetPath,
} from '../admin/content-model.mjs';

const DEFAULT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const CANONICAL = 'content/portfolio.json';

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * Where this proposal's media should live in the canonical record, or null to
 * keep whatever `src` the proposal already carries.
 *
 * An explicitly supplied `local_image` wins: those bytes are already in the
 * working tree and nothing needs fetching. A download happens only when the
 * caller asked for one and the proposal named a URL, and its bytes are written
 * to an ASCII-slugified, submission-id filename so a re-import is a no-op.
 */
async function resolveImage(entry, { root, download, fetchImpl, created }) {
  const where = `Submission ${entry.sourceSubmissionId}`;

  if (entry.localImage !== null) {
    if (safeUrl(entry.localImage, { image: true }) === null || entry.localImage.startsWith('http')) {
      return {
        error: `${where}: local_image ${JSON.stringify(entry.localImage)} is not a safe repo-relative asset path. Rename the file to plain lowercase ASCII with no spaces.`,
      };
    }
    if (!(await exists(join(root, entry.localImage)))) {
      return { error: `${where}: local_image ${JSON.stringify(entry.localImage)} is not in the working tree.` };
    }
    return { src: entry.localImage };
  }

  if (!download) return { src: null };
  if (entry.imageUrl === null) return { src: null };

  const kind = kindOf(entry.type);
  const supplied = entry.record?.[kind.imageField]?.src;
  const local = inboxAssetPath(entry.imagePath ?? entry.imageUrl ?? supplied ?? '', entry.sourceSubmissionId);
  if (local === null) {
    return { error: `${where}: cannot derive a safe asset filename from ${JSON.stringify(entry.imagePath ?? entry.imageUrl)}.` };
  }

  const target = join(root, local);
  // A file already in the working tree is not this run's to write, and above all
  // not this run's to delete. An export re-lists every submission that was
  // already imported, so without this the rollback of one bad new proposal would
  // erase the assets of every record imported before it — leaving the canonical
  // document pointing at files that are gone. It also saves the pointless
  // re-download of an asset that is already exactly where it belongs.
  if (await exists(target)) return { src: local };

  let response;
  try {
    response = await fetchImpl(entry.imageUrl);
  } catch (error) {
    return { error: `${where}: downloading ${entry.imageUrl} failed: ${error.message}` };
  }
  if (!response?.ok) {
    return { error: `${where}: downloading ${entry.imageUrl} failed with HTTP ${response?.status ?? 'no response'}.` };
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) {
    return { error: `${where}: downloading ${entry.imageUrl} returned an empty file.` };
  }

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
  // Only a file this run created may be cleaned up if the import is refused.
  created.push(target);
  return { src: local };
}

/**
 * Import the proposals in `input` into the canonical document.
 *
 * @param {object} options
 * @param {string} [options.root] working tree a `local_image` path resolves against,
 *   and where a downloaded asset is written; defaults to this repository
 * @param {string} [options.content] canonical document; defaults to content/portfolio.json under the root
 * @param {string} options.input proposal file: one object, an array, or {records: []}
 * @param {boolean} [options.download] allow fetching an explicitly supplied image_url
 * @param {Function} [options.fetchImpl] injected fetch, so tests stay offline
 * @returns {Promise<{ok: boolean, errors: string[], imported: object[], skipped: object[], assets: string[]}>}
 */
export async function runImport({
  root = DEFAULT_ROOT,
  content = null,
  input,
  download = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  const result = { ok: false, errors: [], imported: [], skipped: [], assets: [] };
  const contentPath = content === null ? join(root, ...CANONICAL.split('/')) : content;

  if (typeof input !== 'string' || input === '') {
    result.errors.push('--input needs the path of a proposal file.');
    return result;
  }

  let raw;
  try {
    raw = await readFile(input, 'utf8');
  } catch (error) {
    result.errors.push(`Could not read the proposal file ${input}: ${error.message}`);
    return result;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    result.errors.push(`The proposal file ${input} is not valid JSON: ${error.message}`);
    return result;
  }

  const proposals = normalizeProposals(payload);
  if (proposals.length === 0) {
    result.errors.push(`The proposal file ${input} contains no proposals.`);
    return result;
  }

  const canonicalText = await readFile(contentPath, 'utf8').catch((error) => error);
  if (typeof canonicalText !== 'string') {
    result.errors.push(`Could not read the canonical document ${contentPath}: ${canonicalText.message}`);
    return result;
  }
  const canonical = parseCanonical(canonicalText);
  if (canonical.document === null || canonical.errors.length > 0) {
    result.errors.push(
      ...(canonical.document === null
        ? canonical.errors
        : canonical.errors.map((error) => `${contentPath} is already invalid; fix it before importing: ${error}`)),
    );
    return result;
  }

  // Read every proposal before touching anything, so a bad one costs no writes.
  const entries = [];
  for (const proposal of proposals) {
    const read = readProposal(proposal);
    if (read.value === null) result.errors.push(...read.errors);
    else entries.push(read.value);
  }
  if (result.errors.length > 0) return result;

  const created = [];
  try {
    const resolved = [];
    for (let index = 0; index < entries.length; index += 1) {
      const image = await resolveImage(entries[index], { root, download, fetchImpl, created });
      if (image.error !== undefined) {
        result.errors.push(image.error);
        break;
      }
      resolved.push({ proposal: proposals[index], imageSrc: image.src });
    }
    if (result.errors.length > 0) throw new Error('refused');

    const imported = importProposals(canonical.document, resolved);
    if (imported.errors.length > 0) {
      result.errors.push(...imported.errors);
      throw new Error('refused');
    }

    // Write through a temporary file so an interrupted run cannot truncate the
    // canonical document; the rename is the moment the import takes effect.
    const temporary = `${contentPath}.tmp`;
    await writeFile(temporary, serializeCanonical(imported.document));
    await rename(temporary, contentPath);

    result.imported = imported.imported;
    result.skipped = imported.skipped;
    result.assets = created.map((path) => path.slice(resolve(root).length + 1));
    result.ok = true;
    return result;
  } catch (error) {
    if (error.message !== 'refused') result.errors.push(`The import failed and was rolled back: ${error.message}`);
    for (const path of created) await rm(path, { force: true });
    await rm(`${contentPath}.tmp`, { force: true });
    return result;
  }
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function parseArguments(argv) {
  const options = { input: null, content: null, root: undefined, download: false };
  const take = (argument, index, name) => {
    const value = argv[index + 1];
    if (value === undefined) throw new Error(`${name} needs a path.`);
    return value;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--download') options.download = true;
    else if (argument === '--input') {
      options.input = resolve(take(argument, index, '--input'));
      index += 1;
    } else if (argument.startsWith('--input=')) options.input = resolve(argument.slice('--input='.length));
    else if (argument === '--content') {
      options.content = resolve(take(argument, index, '--content'));
      index += 1;
    } else if (argument.startsWith('--content=')) options.content = resolve(argument.slice('--content='.length));
    else if (argument === '--root') {
      options.root = resolve(take(argument, index, '--root'));
      index += 1;
    } else if (argument.startsWith('--root=')) options.root = resolve(argument.slice('--root='.length));
    else throw new Error(`Unknown option ${argument}.`);
  }
  if (options.input === null) throw new Error('--input needs the path of a proposal file.');
  if (options.root === undefined) delete options.root;
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

  const result = await runImport(options);

  if (!result.ok) {
    process.stderr.write('Nothing was imported. The canonical document is unchanged.\n\n');
    for (const error of result.errors) process.stderr.write(`  - ${error}\n`);
    process.exitCode = 1;
    return;
  }

  for (const entry of result.imported) {
    process.stdout.write(`Imported ${entry.sourceSubmissionId} as ${entry.type} ${entry.id} (draft).\n`);
  }
  for (const entry of result.skipped) {
    process.stdout.write(`Skipped ${entry.sourceSubmissionId}: ${entry.reason} as ${entry.id}.\n`);
  }
  for (const asset of result.assets) process.stdout.write(`Saved ${asset}\n`);
  if (result.imported.length > 0) {
    process.stdout.write('Review the drafts, then publish them in the content editor. Nothing is public yet.\n');
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
