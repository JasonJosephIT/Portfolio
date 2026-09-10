// admin/content-model.mjs — data transforms shared by the owner editor and the
// importer. Dependency-free: it runs unchanged in the browser and under Node,
// and it never talks to Supabase, the network or the filesystem.
//
// The canonical schema, its safety rules and its curation transforms live in
// lib/portfolio-content.mjs. Nothing here re-implements them; this module only
// adds the operations an editor needs on top: parsing a file the owner picked,
// minting ids and slugs, keeping project membership honest, addressing the
// curated lists the way moveCurated does, and turning an explicitly supplied
// submission proposal into a canonical draft.

import { createEmptyPortfolio, validatePortfolio, safeUrl } from '../lib/portfolio-content.mjs';

/* ------------------------------------------------------------------ *
 * Record kinds
 * ------------------------------------------------------------------ */

/** The three record types, in the order the editor groups them. */
export const RECORD_KINDS = [
  {
    type: 'piece',
    collection: 'artPieces',
    label: 'Art piece',
    plural: 'Art pieces',
    imageField: 'image',
    curated: 'artFavorites',
    idPrefix: 'piece',
  },
  {
    type: 'art-project',
    collection: 'artProjects',
    label: 'Art project',
    plural: 'Art projects',
    imageField: 'cover',
    curated: 'artFavorites',
    idPrefix: 'art-project',
  },
  {
    type: 'tech-project',
    collection: 'techProjects',
    label: 'Tech project',
    plural: 'Tech projects',
    imageField: 'cover',
    curated: 'techStarred',
    idPrefix: 'tech-project',
  },
];

/** The spec for one record type, or null when the type is unknown. */
export const kindOf = (type) => RECORD_KINDS.find((kind) => kind.type === type) ?? null;

const requireKind = (type) => {
  const kind = kindOf(type);
  if (kind === null) {
    throw new Error(`Unknown record type ${JSON.stringify(type)}. Expected "piece", "art-project" or "tech-project".`);
  }
  return kind;
};

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Deep clone through JSON, dropping prototype-pollution keys, as the library does. */
const clone = (value) =>
  JSON.parse(JSON.stringify(value), function reviver(key, revived) {
    return UNSAFE_KEYS.has(key) ? undefined : revived;
  });

const allRecords = (document) =>
  RECORD_KINDS.flatMap((kind) => (Array.isArray(document?.[kind.collection]) ? document[kind.collection] : [])).filter(
    isPlainObject,
  );

/* ------------------------------------------------------------------ *
 * Slugs, ids and asset paths
 * ------------------------------------------------------------------ */

/**
 * Fold a human string down to lowercase ASCII words joined by single hyphens.
 *
 * Compatibility decomposition turns "Café" into "Cafe" and "№" into "No"; every
 * character the canonical local-path and slug rules reject is then collapsed to
 * a separator. An input with nothing left returns "", never an invented value.
 */
export function slugify(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Extensions the inbox may hand us. Anything else is refused, never guessed. */
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg']);

/**
 * The repo-relative asset path an inbox object should be stored at.
 *
 * The bucket filename is ASCII-slugified, because a canonical local path may
 * contain no spaces, no non-ASCII characters and no query string. The immutable
 * submission id is appended so the same object always lands on the same path and
 * two submissions can never collide. Returns null when the extension is not a
 * known image type — a filename is never invented for it.
 */
export function inboxAssetPath(imagePath, sourceSubmissionId, directory = 'assets') {
  if (typeof imagePath !== 'string' || typeof sourceSubmissionId !== 'string') return null;
  const name = imagePath.split(/[?#]/)[0].split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return null;
  const extension = slugify(name.slice(dot + 1));
  if (!IMAGE_EXTENSIONS.has(extension)) return null;
  const stem = slugify(name.slice(0, dot));
  const id = slugify(sourceSubmissionId);
  if (id === '') return null;
  const base = stem === '' ? id : `${stem}-${id}`;
  const path = `${directory}/${base}.${extension}`;
  return safeUrl(path, { image: true }) === null ? null : path;
}

/**
 * A slug free within its own record type. `exceptId` lets a record keep the slug
 * it already owns while it is being edited.
 */
export function uniqueSlug(document, type, desired, exceptId = null) {
  const kind = requireKind(type);
  const records = Array.isArray(document?.[kind.collection]) ? document[kind.collection] : [];
  const taken = new Set(
    records.filter((record) => isPlainObject(record) && record.id !== exceptId).map((record) => record.slug),
  );
  const base = slugify(desired) || 'untitled';
  if (!taken.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`Could not find a free slug for ${JSON.stringify(desired)}.`);
}

/** A record id free across every record type, since ids are globally unique. */
export function nextRecordId(document, prefix) {
  const base = slugify(prefix) || 'record';
  const taken = new Set(allRecords(document).map((record) => record.id));
  for (let suffix = 1; suffix < 10000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`Could not find a free id starting with ${JSON.stringify(base)}.`);
}

/* ------------------------------------------------------------------ *
 * Reading and writing the canonical file
 * ------------------------------------------------------------------ */

/**
 * Parse a canonical file the owner picked.
 *
 * A document that parses but does not validate is still returned, so the editor
 * can load it and show the owner what to fix rather than refusing it silently.
 * `document` is null only when there is nothing usable to load at all.
 *
 * @returns {{document: object|null, errors: string[]}}
 */
export function parseCanonical(text) {
  let parsed;
  try {
    parsed = JSON.parse(typeof text === 'string' ? text : '');
  } catch (error) {
    return { document: null, errors: [`This file is not valid JSON: ${error.message}`] };
  }
  if (!isPlainObject(parsed)) {
    return { document: null, errors: ['The canonical content file must be a JSON object.'] };
  }
  const document = clone(parsed);
  return { document, errors: validatePortfolio(document) };
}

/** The exact text to write to content/portfolio.json. */
export const serializeCanonical = (document) => `${JSON.stringify(document, null, 2)}\n`;

/* ------------------------------------------------------------------ *
 * Record transforms (pure: they clone, never mutate the input)
 * ------------------------------------------------------------------ */

/** Add a record, or replace the one that already has its id, keeping its position. */
export function upsertRecord(document, type, record) {
  const kind = requireKind(type);
  const next = clone(document);
  if (!Array.isArray(next[kind.collection])) next[kind.collection] = [];
  const value = clone(record);
  const index = next[kind.collection].findIndex((existing) => isPlainObject(existing) && existing.id === value.id);
  if (index === -1) next[kind.collection].push(value);
  else next[kind.collection][index] = value;
  return next;
}

/**
 * Set an art project's members, keeping membership agreeing in both directions.
 *
 * A piece belongs to zero or one project, so a piece joining this project leaves
 * whichever project listed it before, and a piece dropped from this project
 * loses its `projectId`. Ids that name no piece are ignored rather than stored.
 */
export function setMembership(document, projectId, pieceIds) {
  const next = clone(document);
  const project = next.artProjects.find((candidate) => isPlainObject(candidate) && candidate.id === projectId);
  if (project === undefined) {
    throw new Error(`Unknown art project id ${JSON.stringify(projectId)}.`);
  }

  const known = new Map(next.artPieces.filter(isPlainObject).map((piece) => [piece.id, piece]));
  const members = [];
  for (const id of Array.isArray(pieceIds) ? pieceIds : []) {
    if (known.has(id) && !members.includes(id)) members.push(id);
  }

  project.pieceIds = members;

  for (const other of next.artProjects) {
    if (!isPlainObject(other) || other.id === projectId || !Array.isArray(other.pieceIds)) continue;
    other.pieceIds = other.pieceIds.filter((id) => !members.includes(id));
  }

  for (const piece of known.values()) {
    if (members.includes(piece.id)) piece.projectId = projectId;
    else if (piece.projectId === projectId) delete piece.projectId;
  }

  return next;
}

/* ------------------------------------------------------------------ *
 * Curated lists
 * ------------------------------------------------------------------ */

const titleOf = (document, type, id) => {
  const kind = kindOf(type);
  const records = kind === null ? [] : (document?.[kind.collection] ?? []);
  const record = records.find((candidate) => isPlainObject(candidate) && candidate.id === id);
  if (record === undefined) return null;
  return typeof record.title === 'string' && record.title.trim() !== '' ? record.title : null;
};

/**
 * The curated list as it is displayed, and as `moveCurated` addresses it.
 *
 * `moveCurated`'s index is a position in the list sorted ascending by `order` —
 * not a position in the stored array, which a hand edit can leave out of
 * sequence. Rendering from this view and passing back `entry.index` is the only
 * way the two stay in agreement.
 *
 * @returns {{index: number, order: number, type: string, id: string, title: string|null,
 *            missing: boolean, canMoveUp: boolean, canMoveDown: boolean}[]}
 */
export function curatedView(document, collection) {
  if (collection !== 'artFavorites' && collection !== 'techStarred') {
    throw new Error(`Unknown curated collection ${JSON.stringify(collection)}.`);
  }
  const entries = Array.isArray(document?.[collection]) ? document[collection].filter(isPlainObject) : [];
  const sorted = entries
    .slice()
    .sort((a, b) => (Number.isInteger(a.order) ? a.order : Infinity) - (Number.isInteger(b.order) ? b.order : Infinity));

  return sorted.map((entry, index) => {
    const type = collection === 'techStarred' ? 'tech-project' : entry.type;
    const title = titleOf(document, type, entry.id);
    return {
      index,
      order: Number.isInteger(entry.order) ? entry.order : index,
      type,
      id: entry.id,
      title,
      missing: title === null,
      canMoveUp: index > 0,
      canMoveDown: index < sorted.length - 1,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Submission proposals
 * ------------------------------------------------------------------ */

/** Keys only the retired drag-to-place overlay ever wrote. */
const LEGACY_LAYOUT_KEYS = ['x_pct', 'y_px', 'width_pct', 'free_position', 'after_selector', 'container'];

/**
 * Is this a layout from the retired drag-to-place overlay?
 *
 * Those specs carry pixel and percentage offsets measured against a page that no
 * longer exists. They are recognised so they can be refused: reinterpreting an
 * offset as structured content would silently invent a placement nobody chose.
 */
export function isLegacyLayout(layout) {
  if (!isPlainObject(layout)) return false;
  if (layout.mode === 'structured') return false;
  return LEGACY_LAYOUT_KEYS.some((key) => Object.hasOwn(layout, key));
}

/**
 * The `layout` value to store on a submission row.
 *
 * The record is always a draft: a submission row is a proposal, never a
 * publication state. Whatever the column held before is kept under `replaces`
 * rather than thrown away.
 */
export function structuredLayout(record, previousLayout = null) {
  const value = clone(isPlainObject(record) ? record : {});
  value.state = 'draft';
  const previous = isPlainObject(previousLayout) ? previousLayout : null;
  // Only a layout this envelope did not itself write is worth keeping, so
  // re-saving a proposal never nests one structured layout inside the next. What
  // the first save preserved is carried forward all the same: dropping it on the
  // second save would destroy the only remaining copy of the original spec.
  const kept =
    previous === null
      ? null
      : previous.mode === 'structured'
        ? previous.replaces
        : previous;
  return {
    schemaVersion: 1,
    mode: 'structured',
    record: value,
    replaces: isPlainObject(kept) ? clone(kept) : null,
  };
}

/**
 * Read one explicitly supplied proposal, without touching the document.
 *
 * @returns {{value: object|null, errors: string[]}} `value` carries the source
 *   id, the record type, the proposed record and the media the caller may
 *   resolve (`localImage`, `imageUrl`, `imagePath`).
 */
export function readProposal(proposal) {
  const errors = [];
  if (!isPlainObject(proposal)) {
    return { value: null, errors: ['A proposal must be a JSON object.'] };
  }

  const sourceSubmissionId = typeof proposal.id === 'string' ? proposal.id.trim() : '';
  const where = sourceSubmissionId === '' ? 'A proposal' : `Submission ${sourceSubmissionId}`;
  if (sourceSubmissionId === '') {
    errors.push('A proposal needs the submission id it came from, in "id".');
  }

  const { layout } = proposal;
  if (isLegacyLayout(layout)) {
    errors.push(
      `${where} still carries a legacy drag placement layout. Its pixel offsets describe a page that no longer exists; re-save it from the content editor instead.`,
    );
    return { value: null, errors };
  }
  if (!isPlainObject(layout)) {
    errors.push(`${where} has no layout. Save a structured proposal for it in the content editor first.`);
    return { value: null, errors };
  }
  if (layout.schemaVersion !== 1 || layout.mode !== 'structured') {
    errors.push(`${where} has a layout that is not {schemaVersion: 1, mode: "structured"}.`);
    return { value: null, errors };
  }
  if (!isPlainObject(layout.record)) {
    errors.push(`${where} has a structured layout with no record object.`);
    return { value: null, errors };
  }

  const record = clone(layout.record);
  const { type } = record;
  delete record.type;
  if (kindOf(type) === null) {
    errors.push(`${where}: record.type must be "piece", "art-project" or "tech-project" (found ${JSON.stringify(type ?? null)}).`);
  }

  const localImage = typeof proposal.local_image === 'string' && proposal.local_image.trim() !== '' ? proposal.local_image.trim() : null;
  const imageUrl = typeof proposal.image_url === 'string' && proposal.image_url.trim() !== '' ? proposal.image_url.trim() : null;
  const imagePath = typeof proposal.image_path === 'string' && proposal.image_path.trim() !== '' ? proposal.image_path.trim() : null;

  if (errors.length > 0) return { value: null, errors };
  return { value: { sourceSubmissionId, type, record, localImage, imageUrl, imagePath }, errors: [] };
}

/** One proposal object, an array of them, or a `{records: []}` envelope. */
export function normalizeProposals(input) {
  if (Array.isArray(input)) return input;
  if (isPlainObject(input) && Array.isArray(input.records)) return input.records;
  if (isPlainObject(input)) return [input];
  return [];
}

/**
 * Turn explicitly supplied proposals into canonical draft records.
 *
 * Import is idempotent by `sourceSubmissionId`: a submission already represented
 * in the document is skipped, so its id, its local edits and every curated
 * reference to it survive a re-import untouched. New records always enter as
 * drafts, whatever the proposal claims.
 *
 * It is all-or-nothing. One bad proposal — or a result that does not validate —
 * leaves the document exactly as it arrived, so no half-applied batch is ever
 * handed to a caller that is about to write it to disk.
 *
 * @param {object} document canonical document
 * @param {{proposal: object, imageSrc?: string|null}[]} entries
 * @returns {{document: object, imported: object[], skipped: object[], errors: string[]}}
 */
export function importProposals(document, entries) {
  const original = isPlainObject(document) ? clone(document) : createEmptyPortfolio();
  const refuse = (errors) => ({ document: original, imported: [], skipped: [], errors });

  const list = Array.isArray(entries) ? entries : [];
  const read = [];
  const errors = [];
  const seen = new Set();

  for (const entry of list) {
    const result = readProposal(entry?.proposal);
    if (result.value === null) {
      errors.push(...result.errors);
      continue;
    }
    if (seen.has(result.value.sourceSubmissionId)) {
      errors.push(`Submission ${result.value.sourceSubmissionId} appears twice in one import.`);
      continue;
    }
    seen.add(result.value.sourceSubmissionId);
    read.push({ ...result.value, imageSrc: typeof entry?.imageSrc === 'string' ? entry.imageSrc : null });
  }
  if (errors.length > 0) return refuse(errors);

  let next = clone(original);
  const styleIds = new Set((next.styles ?? []).filter(isPlainObject).map((style) => style.id));
  const imported = [];
  const skipped = [];

  for (const entry of read) {
    const kind = kindOf(entry.type);
    const already = allRecords(next).find((record) => record.sourceSubmissionId === entry.sourceSubmissionId);
    if (already !== undefined) {
      skipped.push({ sourceSubmissionId: entry.sourceSubmissionId, id: already.id, reason: 'already imported' });
      continue;
    }

    const record = entry.record;
    const where = `Submission ${entry.sourceSubmissionId}`;

    if (record.projectId !== undefined) {
      errors.push(`${where}: projectId cannot be set at import time. Import the piece, then assign its project in the content editor.`);
      continue;
    }
    if (Array.isArray(record.styleIds)) {
      const undefinedStyle = record.styleIds.find((id) => !styleIds.has(id));
      if (undefinedStyle !== undefined) {
        errors.push(`${where}: styleIds names ${JSON.stringify(undefinedStyle)}, which no style defines. Define the style first; a tag is not a style.`);
        continue;
      }
    }

    const takenId = new Set(allRecords(next).map((existing) => existing.id));
    record.id =
      typeof record.id === 'string' && record.id !== '' && !takenId.has(record.id)
        ? record.id
        : nextRecordId(next, kind.idPrefix);
    record.slug = uniqueSlug(next, entry.type, record.slug || record.title || kind.idPrefix);
    record.state = 'draft';
    record.sourceSubmissionId = entry.sourceSubmissionId;
    if (entry.type === 'art-project') record.pieceIds = [];

    if (entry.imageSrc !== null) {
      const image = isPlainObject(record[kind.imageField]) ? record[kind.imageField] : {};
      record[kind.imageField] = { ...image, src: entry.imageSrc };
    }

    next = upsertRecord(next, entry.type, record);
    imported.push({ sourceSubmissionId: entry.sourceSubmissionId, id: record.id, type: entry.type });
  }

  if (errors.length > 0) return refuse(errors);

  const problems = validatePortfolio(next);
  if (problems.length > 0) {
    return refuse(problems.map((problem) => `The import would leave the document invalid: ${problem}`));
  }

  return { document: next, imported, skipped, errors: [] };
}

/* ------------------------------------------------------------------ *
 * Attributing validation errors to a record and a field
 * ------------------------------------------------------------------ */

/**
 * The field a validation message is about, as a dotted path matching the
 * editor's input names ("title", "image.alt"), or null when it names none.
 *
 * `validatePortfolio` messages start with the record's position, either
 * `artPieces[0]: title is required…` or `artPieces[0].image.alt must be…`.
 * A record that has an id carries it in between — `artPieces[0] (id "piece-1")` —
 * so that segment is optional here; without it every real message, which always
 * names an id, would be attributed to no field at all.
 */
export function fieldOfError(message) {
  if (typeof message !== 'string') return null;
  const match = /^[A-Za-z]+\[\d+\](?: \(id [^)]*\))?(?:\.([A-Za-z0-9_.]+)|:\s+([A-Za-z0-9_]+))/.exec(message);
  if (match === null) return null;
  return match[1] ?? match[2] ?? null;
}

/** The validation messages that belong to one record, so they can be shown beside it. */
export function recordErrors(document, type, id) {
  const kind = requireKind(type);
  const records = Array.isArray(document?.[kind.collection]) ? document[kind.collection] : [];
  const index = records.findIndex((record) => isPlainObject(record) && record.id === id);
  if (index === -1) return [];
  const prefix = `${kind.collection}[${index}]`;
  return validatePortfolio(document).filter(
    (message) => message.startsWith(`${prefix}:`) || message.startsWith(`${prefix}.`) || message.startsWith(`${prefix} (`),
  );
}
