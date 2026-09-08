/**
 * Canonical portfolio content contract.
 *
 * This module is the single source of truth for the shape of
 * `content/portfolio.json`, for what may be published, for the canonical
 * detail routes, and for the curation transforms used by the owner tools.
 * It has no dependencies and performs no I/O.
 *
 * See docs/portfolio-content.md for the written schema and workflow.
 */

/* ------------------------------------------------------------------ *
 * Constants
 * ------------------------------------------------------------------ */

const SCHEMA_VERSION = 1;

const ARRAY_FIELDS = [
  'artPieces',
  'artProjects',
  'artFavorites',
  'techProjects',
  'techStarred',
  'styles',
  'contacts',
];

const RECORD_TYPES = {
  piece: { collection: 'artPieces', routeDir: 'art/pieces', label: 'art piece' },
  'art-project': { collection: 'artProjects', routeDir: 'art/projects', label: 'art project' },
  'tech-project': { collection: 'techProjects', routeDir: 'tech/projects', label: 'tech project' },
};

const CURATED_COLLECTIONS = ['artFavorites', 'techStarred'];

/** Keys that must never appear as an object key, an id or a slug. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 128;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const SCHEME_PREFIX = /^[A-Za-z][A-Za-z0-9+.-]*:/;
/** Repo-relative asset path: no leading slash, no dot segments, no traversal. */
const LOCAL_PATH = /^[A-Za-z0-9_~][A-Za-z0-9._~-]*(?:\/[A-Za-z0-9_~][A-Za-z0-9._~-]*)*$/;
const EMAIL_PATTERN = /^[^\s@,;:]+@[^\s@,;:]+\.[A-Za-z]{2,}$/;
const TEL_PATTERN = /^\+?[0-9][0-9\s().-]{2,}$/;

const IMAGE_SCHEMES = new Set(['http:', 'https:']);
const DESTINATION_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/** Alt text that describes nothing useful. */
const PLACEHOLDER_ALT = new Set(['image', 'photo', 'picture', 'img', 'untitled', 'artwork', 'screenshot']);
const FILENAME_ALT = /^[\w .()-]+\.(?:jpe?g|png|gif|webp|avif|svg|tiff?|heic)$/i;

const MAX_PIXELS = 100000;
const MAX_WALK_DEPTH = 20;

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonBlankString = (value) => typeof value === 'string' && value.trim() !== '';
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0 && value <= MAX_PIXELS;
const isUnitNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

const isSafeId = (value) => typeof value === 'string' && !UNSAFE_KEYS.has(value) && ID_PATTERN.test(value);
const isSafeSlug = (value) =>
  typeof value === 'string' && !UNSAFE_KEYS.has(value) && value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value);

/** Own-property lookup that cannot reach the prototype chain. */
const own = (object, key) => (isPlainObject(object) && Object.hasOwn(object, key) ? object[key] : undefined);

const quote = (value) => JSON.stringify(value === undefined ? null : value);

/**
 * Deep clone through JSON, dropping any prototype-pollution keys.
 * The canonical document is JSON, so this is both sufficient and safe.
 */
function safeClone(value) {
  return JSON.parse(JSON.stringify(value), function reviver(key, revived) {
    return UNSAFE_KEYS.has(key) ? undefined : revived;
  });
}

/* ------------------------------------------------------------------ *
 * URL and route safety
 * ------------------------------------------------------------------ */

/**
 * Return a safe URL string, or null when the value must not be rendered.
 *
 * Destinations (default) allow http, https, mailto, tel and repo-relative
 * local paths. Image sources (`{ image: true }`) allow http, https and
 * repo-relative local paths only. Everything else — notably `javascript:`
 * and `data:` — is rejected.
 */
export function safeUrl(value, { image = false } = {}) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '' || CONTROL_CHARS.test(trimmed)) return null;
  if (trimmed.startsWith('//')) return null; // protocol-relative

  if (!SCHEME_PREFIX.test(trimmed)) {
    return LOCAL_PATH.test(trimmed) ? trimmed : null;
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.username !== '' || url.password !== '') return null;

  const allowed = image ? IMAGE_SCHEMES : DESTINATION_SCHEMES;
  if (!allowed.has(url.protocol)) return null;

  if (url.protocol === 'http:' || url.protocol === 'https:') {
    return url.hostname === '' ? null : url.href;
  }

  let target;
  try {
    target = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (url.protocol === 'mailto:') return EMAIL_PATTERN.test(target) ? url.href : null;
  if (url.protocol === 'tel:') return TEL_PATTERN.test(target) ? url.href : null;
  return null;
}

/** A destination that must be an absolute web address (live site, repository). */
const safeWebUrl = (value) => {
  const url = safeUrl(value);
  return url !== null && /^https?:\/\//i.test(url) ? url : null;
};

const recordTypeSpec = (type) => (Object.hasOwn(RECORD_TYPES, type) ? RECORD_TYPES[type] : null);

/**
 * The canonical, shareable detail route for a record. A piece always resolves
 * to the same path wherever it is linked from, and a project resolves to its
 * own collection page rather than to one of its pieces.
 */
export function detailPath(type, slug) {
  const spec = recordTypeSpec(type);
  if (!spec) {
    throw new Error(`Unknown record type ${quote(type)}. Expected "piece", "art-project" or "tech-project".`);
  }
  if (!isSafeSlug(slug)) {
    throw new Error(
      `Unsafe slug ${quote(slug)}. A slug must be lowercase words joined by single hyphens, for example "harbour-lights".`,
    );
  }
  return `${spec.routeDir}/${slug}/index.html`;
}

/* ------------------------------------------------------------------ *
 * The empty canonical document
 * ------------------------------------------------------------------ */

/** A valid, completely empty portfolio: no work, no biography, no contacts. */
export function createEmptyPortfolio() {
  return {
    schemaVersion: SCHEMA_VERSION,
    about: '',
    contacts: [],
    styles: [],
    artPieces: [],
    artProjects: [],
    artFavorites: [],
    techProjects: [],
    techStarred: [],
  };
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

function walkForUnsafeKeys(value, path, errors, depth = 0, seen = new WeakSet()) {
  if (typeof value !== 'object' || value === null) return;
  if (seen.has(value)) {
    errors.push(`${path} contains a circular reference; the document must be plain JSON.`);
    return;
  }
  if (depth > MAX_WALK_DEPTH) {
    errors.push(`${path} is nested more than ${MAX_WALK_DEPTH} levels deep.`);
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkForUnsafeKeys(item, `${path}[${index}]`, errors, depth + 1, seen));
  } else {
    for (const key of Object.keys(value)) {
      if (UNSAFE_KEYS.has(key)) {
        errors.push(`${path} contains the unsafe property key ${quote(key)}.`);
        continue;
      }
      walkForUnsafeKeys(value[key], `${path}.${key}`, errors, depth + 1, seen);
    }
  }
  seen.delete(value); // only the current path is a cycle; sharing an object is not
}

const isMeaningfulAlt = (alt) => {
  if (typeof alt !== 'string') return false;
  const text = alt.trim();
  if (text.length < 3) return false;
  if (PLACEHOLDER_ALT.has(text.toLowerCase())) return false;
  return !FILENAME_ALT.test(text);
};

function validateDimension(value, where, errors) {
  if (value === undefined) return;
  if (!isPositiveInteger(value)) {
    errors.push(`${where} must be a whole number of pixels greater than 0 (found ${quote(value)}).`);
  }
}

function validateImage(image, where, published, errors) {
  if (!isPlainObject(image)) {
    errors.push(`${where} must be an object with src, alt, width and height.`);
    return;
  }
  if (safeUrl(image.src, { image: true }) === null) {
    errors.push(`${where}.src ${quote(image.src)} is not a safe local asset path or http(s) URL.`);
  }
  if (image.alt !== undefined && typeof image.alt !== 'string') {
    errors.push(`${where}.alt must be a string.`);
  }
  if (published && !isMeaningfulAlt(image.alt)) {
    errors.push(
      `${where}.alt must be meaningful, non-blank text describing this image before it is published; a filename or a bare word like "image" is not enough.`,
    );
  }
  validateDimension(image.width, `${where}.width`, errors);
  validateDimension(image.height, `${where}.height`, errors);
  if (published && !(isPositiveInteger(image.width) && isPositiveInteger(image.height))) {
    errors.push(`${where} needs width and height in pixels so published layouts can reserve space.`);
  }

  if (image.sources !== undefined) {
    if (!Array.isArray(image.sources)) {
      errors.push(`${where}.sources must be an array of {src, width} entries.`);
    } else {
      image.sources.forEach((source, index) => {
        const at = `${where}.sources[${index}]`;
        if (!isPlainObject(source)) {
          errors.push(`${at} must be an object with src and width.`);
          return;
        }
        if (safeUrl(source.src, { image: true }) === null) {
          errors.push(`${at}.src ${quote(source.src)} is not a safe local asset path or http(s) URL.`);
        }
        if (!isPositiveInteger(source.width)) {
          errors.push(`${at}.width must be a whole number of pixels greater than 0.`);
        }
      });
    }
  }

  if (image.focalPoint !== undefined) {
    const point = image.focalPoint;
    if (!isPlainObject(point) || !isUnitNumber(point.x) || !isUnitNumber(point.y)) {
      errors.push(`${where}.focalPoint must be {x, y} numbers between 0 and 1.`);
    }
  }
}

function validateOptionalText(record, field, where, errors) {
  const value = own(record, field);
  if (value === undefined) return;
  if (!isNonBlankString(value)) {
    errors.push(`${where}: ${field} must be a non-blank string when supplied (found ${quote(value)}).`);
  }
}

function validateIdentity(record, where, spec, context, errors) {
  if (!isSafeId(record.id)) {
    errors.push(
      `${where}: id must be a short token of letters, digits, "-" or "_" (found ${quote(record.id)}). Ids are permanent once assigned.`,
    );
  } else if (context.idOwner.has(record.id)) {
    errors.push(`${where}: id ${quote(record.id)} is already used by ${context.idOwner.get(record.id)}.`);
  } else {
    context.idOwner.set(record.id, where);
  }

  if (!isSafeSlug(record.slug)) {
    errors.push(
      `${where}: slug must be lowercase words joined by single hyphens (found ${quote(record.slug)}). Slugs become public detail URLs.`,
    );
  } else {
    const slugs = context.slugsByCollection[spec.collection];
    if (slugs.has(record.slug)) {
      errors.push(`${where}: slug ${quote(record.slug)} is already used by another ${spec.label}.`);
    } else {
      slugs.add(record.slug);
    }
  }

  if (record.state !== 'draft' && record.state !== 'published') {
    errors.push(`${where}: state must be "draft" or "published" (found ${quote(record.state)}).`);
  }

  if (record.title !== undefined && typeof record.title !== 'string') {
    errors.push(`${where}: title must be a string.`);
  }
  if (record.state === 'published' && !isNonBlankString(record.title)) {
    errors.push(`${where}: title is required before this ${spec.label} can be published.`);
  }

  const source = own(record, 'sourceSubmissionId');
  if (source !== undefined) {
    if (!isSafeId(source)) {
      errors.push(`${where}: sourceSubmissionId must be a plain identifier when supplied (found ${quote(source)}).`);
    } else if (context.sourceOwner.has(source)) {
      errors.push(
        `${where}: sourceSubmissionId ${quote(source)} is already used by ${context.sourceOwner.get(source)}; imports must stay idempotent.`,
      );
    } else {
      context.sourceOwner.set(source, where);
    }
  }
}

function validateArtPiece(piece, where, published, styleIds, errors) {
  if (piece.image === undefined) {
    if (published) errors.push(`${where}: image is required before this art piece can be published.`);
  } else {
    validateImage(piece.image, `${where}.image`, published, errors);
  }

  for (const field of ['year', 'medium', 'dimensions', 'caption']) {
    validateOptionalText(piece, field, where, errors);
  }

  const styles = own(piece, 'styleIds');
  if (styles !== undefined) {
    if (!Array.isArray(styles)) {
      errors.push(`${where}: styleIds must be an array of style ids.`);
    } else {
      const seen = new Set();
      styles.forEach((styleId, index) => {
        const at = `${where}.styleIds[${index}]`;
        if (typeof styleId !== 'string') {
          errors.push(`${at} must be a string.`);
          return;
        }
        if (seen.has(styleId)) {
          errors.push(`${at}: style ${quote(styleId)} is a duplicate on this piece.`);
          return;
        }
        seen.add(styleId);
        if (!styleIds.has(styleId)) {
          errors.push(`${at}: unknown style ${quote(styleId)}; styles must be defined in the styles list.`);
        }
      });
    }
  }

  const projectId = own(piece, 'projectId');
  if (projectId !== undefined && typeof projectId !== 'string') {
    errors.push(`${where}: projectId must be a string; an art piece belongs to zero or one project.`);
  }
}

function validateArtProject(project, where, published, errors) {
  if (project.cover === undefined) {
    if (published) errors.push(`${where}: cover is required before this art project can be published.`);
  } else {
    validateImage(project.cover, `${where}.cover`, published, errors);
  }

  const pieceIds = own(project, 'pieceIds');
  if (pieceIds !== undefined && !Array.isArray(pieceIds)) {
    errors.push(`${where}: pieceIds must be an array of art piece ids in curated order.`);
  }

  for (const field of ['summary', 'year']) {
    validateOptionalText(project, field, where, errors);
  }
}

function validateTechProject(project, where, published, errors) {
  if (project.cover === undefined) {
    if (published) errors.push(`${where}: cover is required before this tech project can be published.`);
  } else {
    validateImage(project.cover, `${where}.cover`, published, errors);
  }

  if (project.summary !== undefined && typeof project.summary !== 'string') {
    errors.push(`${where}: summary must be a string.`);
  }
  if (published && !isNonBlankString(project.summary)) {
    errors.push(`${where}: summary is required before this tech project can be published.`);
  }

  for (const field of ['role', 'year']) {
    validateOptionalText(project, field, where, errors);
  }

  const screenshots = own(project, 'screenshots');
  if (screenshots !== undefined) {
    if (!Array.isArray(screenshots)) {
      errors.push(`${where}: screenshots must be an array of images.`);
    } else {
      screenshots.forEach((shot, index) => validateImage(shot, `${where}.screenshots[${index}]`, published, errors));
    }
  }

  const sections = own(project, 'sections');
  if (sections !== undefined) {
    if (!Array.isArray(sections)) {
      errors.push(`${where}: sections must be an array of {title, body} entries.`);
    } else {
      sections.forEach((section, index) => {
        const at = `${where}.sections[${index}]`;
        if (!isPlainObject(section)) {
          errors.push(`${at} must be an object with a title and a body.`);
          return;
        }
        if (!isNonBlankString(section.title)) errors.push(`${at}.title must be non-blank text.`);
        if (!isNonBlankString(section.body)) {
          errors.push(`${at}.body must be non-blank text; remove the section instead of publishing it empty.`);
        }
      });
    }
  }

  const technologies = own(project, 'technologies');
  if (technologies !== undefined) {
    if (!Array.isArray(technologies)) {
      errors.push(`${where}: technologies must be an array of non-blank strings.`);
    } else {
      const seen = new Set();
      technologies.forEach((technology, index) => {
        const at = `${where}.technologies[${index}]`;
        if (!isNonBlankString(technology)) {
          errors.push(`${at} must be a non-blank string.`);
          return;
        }
        if (seen.has(technology)) errors.push(`${at}: ${quote(technology)} is listed twice in technologies.`);
        seen.add(technology);
      });
    }
  }

  for (const field of ['liveUrl', 'repositoryUrl']) {
    const value = own(project, field);
    if (value === undefined) continue;
    if (safeWebUrl(value) === null) {
      errors.push(`${where}: ${field} ${quote(value)} must be an http(s) web address, or be omitted.`);
    }
  }
}

function validateCuratedEntry(entry, where, allowedTypes, lookup, seenRefs, seenOrders, errors) {
  if (!isPlainObject(entry)) {
    errors.push(`${where} must be an object.`);
    return;
  }

  const type = allowedTypes.length === 1 ? allowedTypes[0] : entry.type;
  if (allowedTypes.length > 1 && !allowedTypes.includes(entry.type)) {
    errors.push(`${where}: type must be one of ${allowedTypes.map(quote).join(' or ')} (found ${quote(entry.type)}).`);
  } else {
    const spec = recordTypeSpec(type);
    const target = typeof entry.id === 'string' ? lookup.get(`${type}:${entry.id}`) : undefined;
    if (!target) {
      errors.push(`${where} references ${quote(entry.id)}, which is not an existing ${spec.label}.`);
    } else if (target.state !== 'published') {
      errors.push(
        `${where}: ${spec.label} ${quote(entry.id)} is a draft; only published records can appear in a curated list.`,
      );
    }

    const reference = `${type}:${entry.id}`;
    if (seenRefs.has(reference)) {
      errors.push(`${where}: ${quote(entry.id)} is a duplicate curated reference.`);
    } else {
      seenRefs.add(reference);
    }
  }

  if (!Number.isInteger(entry.order) || entry.order < 0) {
    errors.push(`${where}: order must be a whole number of 0 or greater (found ${quote(entry.order)}).`);
  } else if (seenOrders.has(entry.order)) {
    errors.push(`${where}: order ${entry.order} is already used; curated order must be unique.`);
  } else {
    seenOrders.add(entry.order);
  }
}

/**
 * Validate a canonical document and return human-readable errors.
 * An empty array means the document is safe to render and to publish from.
 * Drafts may be incomplete, but every record still needs safe structural
 * fields, and everything that is published must be complete.
 */
export function validatePortfolio(document) {
  if (!isPlainObject(document)) {
    return ['The portfolio document must be a JSON object.'];
  }

  const errors = [];
  walkForUnsafeKeys(document, 'document', errors);

  if (document.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${SCHEMA_VERSION} (found ${quote(document.schemaVersion)}).`);
  }
  if (typeof document.about !== 'string') {
    errors.push('about must be a string; use an empty string until a biography is supplied.');
  }

  const lists = {};
  for (const field of ARRAY_FIELDS) {
    const value = own(document, field);
    if (value === undefined) {
      errors.push(`${field} is required and must be an array (use an empty array).`);
      lists[field] = [];
    } else if (!Array.isArray(value)) {
      errors.push(`${field} must be an array.`);
      lists[field] = [];
    } else {
      lists[field] = value;
    }
  }

  // Styles first: pieces reference them.
  const styleIds = new Set();
  lists.styles.forEach((style, index) => {
    const where = `styles[${index}]`;
    if (!isPlainObject(style)) {
      errors.push(`${where} must be an object with an id and a name.`);
      return;
    }
    if (!isSafeId(style.id)) {
      errors.push(`${where}: id must be a short token of letters, digits, "-" or "_" (found ${quote(style.id)}).`);
    } else if (styleIds.has(style.id)) {
      errors.push(`${where}: style id ${quote(style.id)} is a duplicate.`);
    } else {
      styleIds.add(style.id);
    }
    if (!isNonBlankString(style.name)) {
      errors.push(`${where}: name must be non-blank text supplied by Jason.`);
    }
    if (style.description !== undefined && typeof style.description !== 'string') {
      errors.push(`${where}: description must be a string when supplied.`);
    }
  });

  lists.contacts.forEach((contact, index) => {
    const where = `contacts[${index}]`;
    if (!isPlainObject(contact)) {
      errors.push(`${where} must be an object with a label and a url.`);
      return;
    }
    if (!isNonBlankString(contact.label)) {
      errors.push(`${where}: label must be non-blank text.`);
    }
    if (safeUrl(contact.url) === null) {
      errors.push(
        `${where}: url ${quote(contact.url)} is not a safe destination; use https, http, mailto, tel or a local path.`,
      );
    }
  });

  const context = {
    idOwner: new Map(),
    sourceOwner: new Map(),
    slugsByCollection: { artPieces: new Set(), artProjects: new Set(), techProjects: new Set() },
  };
  /** `${type}:${id}` -> record, for curated lookups. */
  const byTypeAndId = new Map();
  const pieceById = new Map();
  const artProjectById = new Map();

  for (const [type, spec] of Object.entries(RECORD_TYPES)) {
    lists[spec.collection].forEach((record, index) => {
      const base = `${spec.collection}[${index}]`;
      if (!isPlainObject(record)) {
        errors.push(`${base} must be an object.`);
        return;
      }
      const where = typeof record.id === 'string' ? `${base} (id ${quote(record.id)})` : base;
      validateIdentity(record, where, spec, context, errors);

      const published = record.state === 'published';
      if (type === 'piece') validateArtPiece(record, where, published, styleIds, errors);
      if (type === 'art-project') validateArtProject(record, where, published, errors);
      if (type === 'tech-project') validateTechProject(record, where, published, errors);

      if (typeof record.id === 'string' && !byTypeAndId.has(`${type}:${record.id}`)) {
        byTypeAndId.set(`${type}:${record.id}`, record);
        if (type === 'piece') pieceById.set(record.id, record);
        if (type === 'art-project') artProjectById.set(record.id, record);
      }
    });
  }

  // Membership must agree in both directions, and a piece belongs to at most one project.
  lists.artProjects.forEach((project, index) => {
    if (!isPlainObject(project)) return;
    const where = typeof project.id === 'string' ? `artProjects[${index}] (id ${quote(project.id)})` : `artProjects[${index}]`;
    const members = Array.isArray(project.pieceIds) ? project.pieceIds : [];
    const seen = new Set();
    let publishedMembers = 0;

    members.forEach((pieceId, position) => {
      const at = `${where}: pieceIds[${position}]`;
      if (typeof pieceId !== 'string') {
        errors.push(`${at} must be a string id.`);
        return;
      }
      if (seen.has(pieceId)) {
        errors.push(`${at} lists ${quote(pieceId)} twice; each piece appears once in a project.`);
        return;
      }
      seen.add(pieceId);
      const piece = pieceById.get(pieceId);
      if (!piece) {
        errors.push(`${at} references unknown art piece ${quote(pieceId)}.`);
        return;
      }
      if (own(piece, 'projectId') !== project.id) {
        errors.push(
          `${at} lists ${quote(pieceId)}, but that piece's projectId is ${quote(own(piece, 'projectId'))}; membership must agree in both directions and a piece belongs to zero or one project.`,
        );
        return;
      }
      if (piece.state === 'published') publishedMembers += 1;
    });

    if (project.state === 'published' && publishedMembers === 0) {
      errors.push(`${where}: an art project stays a draft until it contains at least one published piece.`);
    }
  });

  lists.artPieces.forEach((piece, index) => {
    if (!isPlainObject(piece)) return;
    const projectId = own(piece, 'projectId');
    if (typeof projectId !== 'string') return;
    const where = typeof piece.id === 'string' ? `artPieces[${index}] (id ${quote(piece.id)})` : `artPieces[${index}]`;
    const project = artProjectById.get(projectId);
    if (!project) {
      errors.push(`${where}: projectId references unknown art project ${quote(projectId)}.`);
      return;
    }
    const members = Array.isArray(project.pieceIds) ? project.pieceIds : [];
    if (!members.includes(piece.id)) {
      errors.push(`${where}: projectId points at ${quote(projectId)}, but that project does not list this piece in pieceIds.`);
    }
  });

  const favoriteRefs = new Set();
  const favoriteOrders = new Set();
  lists.artFavorites.forEach((favorite, index) => {
    validateCuratedEntry(
      favorite,
      `artFavorites[${index}]`,
      ['piece', 'art-project'],
      byTypeAndId,
      favoriteRefs,
      favoriteOrders,
      errors,
    );
  });

  const starredRefs = new Set();
  const starredOrders = new Set();
  lists.techStarred.forEach((entry, index) => {
    validateCuratedEntry(
      entry,
      `techStarred[${index}]`,
      ['tech-project'],
      byTypeAndId,
      starredRefs,
      starredOrders,
      errors,
    );
  });

  return errors;
}

/* ------------------------------------------------------------------ *
 * Published projection
 * ------------------------------------------------------------------ */

function projectImage(image) {
  if (!isPlainObject(image)) return null;
  const src = safeUrl(image.src, { image: true });
  if (src === null) return null;
  if (!isMeaningfulAlt(image.alt)) return null;
  if (!isPositiveInteger(image.width) || !isPositiveInteger(image.height)) return null;

  const projected = { src, alt: image.alt.trim(), width: image.width, height: image.height };

  if (Array.isArray(image.sources)) {
    const sources = image.sources.flatMap((source) => {
      if (!isPlainObject(source) || !isPositiveInteger(source.width)) return [];
      const candidate = safeUrl(source.src, { image: true });
      return candidate === null ? [] : [{ src: candidate, width: source.width }];
    });
    if (sources.length > 0) projected.sources = sources;
  }

  const point = image.focalPoint;
  if (isPlainObject(point) && isUnitNumber(point.x) && isUnitNumber(point.y)) {
    projected.focalPoint = { x: point.x, y: point.y };
  }
  return projected;
}

const projectText = (target, source, field) => {
  const value = own(source, field);
  if (isNonBlankString(value)) target[field] = value.trim();
};

const isPublishable = (record) =>
  isPlainObject(record) &&
  record.state === 'published' &&
  isSafeId(record.id) &&
  isSafeSlug(record.slug) &&
  isNonBlankString(record.title);

const projectIdentity = (record) => ({
  id: record.id,
  slug: record.slug,
  title: record.title.trim(),
  state: 'published',
});

function projectCurated(entries, isKept, withType) {
  const seen = new Set();
  return entries
    .filter((entry) => isPlainObject(entry) && Number.isInteger(entry.order) && typeof entry.id === 'string')
    .filter((entry) => (withType ? entry.type === 'piece' || entry.type === 'art-project' : true))
    .filter((entry) => {
      const reference = withType ? `${entry.type}:${entry.id}` : entry.id;
      if (seen.has(reference)) return false;
      seen.add(reference);
      return isKept(entry);
    })
    .sort((a, b) => a.order - b.order)
    .map((entry) => (withType ? { type: entry.type, id: entry.id, order: entry.order } : { id: entry.id, order: entry.order }));
}

/**
 * A defensive, published-only projection of the document.
 *
 * Drafts, unusable images, unsafe destinations and authoring-only fields such
 * as sourceSubmissionId never appear in the result, so a renderer can treat
 * everything it receives as safe to output. Never throws and never mutates.
 */
export function publishedPortfolio(document) {
  const view = createEmptyPortfolio();
  if (!isPlainObject(document)) return view;

  let source;
  try {
    source = safeClone(document);
  } catch {
    return view;
  }

  const list = (field) => (Array.isArray(source[field]) ? source[field] : []);
  if (typeof source.about === 'string') view.about = source.about;

  view.contacts = list('contacts')
    .filter((contact) => isPlainObject(contact) && isNonBlankString(contact.label) && safeUrl(contact.url) !== null)
    .map((contact) => ({ label: contact.label.trim(), url: safeUrl(contact.url) }));

  const styleIds = new Set();
  view.styles = list('styles')
    .filter((style) => {
      if (!isPlainObject(style) || !isSafeId(style.id) || !isNonBlankString(style.name)) return false;
      if (styleIds.has(style.id)) return false;
      styleIds.add(style.id);
      return true;
    })
    .map((style) => {
      const projected = { id: style.id, name: style.name.trim() };
      projectText(projected, style, 'description');
      return projected;
    });

  // Pieces: published, identifiable and renderable.
  const pieceSlugs = new Set();
  const pieces = new Map();
  for (const piece of list('artPieces')) {
    if (!isPublishable(piece) || pieceSlugs.has(piece.slug) || pieces.has(piece.id)) continue;
    const image = projectImage(piece.image);
    if (image === null) continue;
    pieceSlugs.add(piece.slug);

    const projected = { ...projectIdentity(piece), image };
    for (const field of ['year', 'medium', 'dimensions', 'caption']) projectText(projected, piece, field);
    projected.styleIds = Array.isArray(piece.styleIds)
      ? [...new Set(piece.styleIds.filter((id) => styleIds.has(id)))]
      : [];
    pieces.set(piece.id, { projected, projectId: own(piece, 'projectId') });
  }

  // Art projects: published, with at least one published member piece.
  const projectSlugs = new Set();
  const keptProjects = new Map();
  for (const project of list('artProjects')) {
    if (!isPublishable(project) || projectSlugs.has(project.slug) || keptProjects.has(project.id)) continue;
    const cover = projectImage(project.cover);
    if (cover === null) continue;

    const members = Array.isArray(project.pieceIds) ? project.pieceIds : [];
    const seen = new Set();
    const pieceIds = members.filter((pieceId) => {
      if (typeof pieceId !== 'string' || seen.has(pieceId)) return false;
      const entry = pieces.get(pieceId);
      if (!entry || entry.projectId !== project.id) return false;
      seen.add(pieceId);
      return true;
    });
    if (pieceIds.length === 0) continue;
    projectSlugs.add(project.slug);

    const projected = { ...projectIdentity(project), cover, pieceIds };
    for (const field of ['summary', 'year']) projectText(projected, project, field);
    keptProjects.set(project.id, projected);
  }

  // A piece only links to a project that survived the projection.
  for (const entry of pieces.values()) {
    const project = keptProjects.get(entry.projectId);
    if (project && project.pieceIds.includes(entry.projected.id)) {
      entry.projected.projectId = entry.projectId;
    }
  }

  view.artPieces = [...pieces.values()].map((entry) => entry.projected);
  view.artProjects = [...keptProjects.values()];

  const techSlugs = new Set();
  const techIds = new Set();
  for (const project of list('techProjects')) {
    if (!isPublishable(project) || !isNonBlankString(project.summary)) continue;
    if (techSlugs.has(project.slug) || techIds.has(project.id)) continue;
    const cover = projectImage(project.cover);
    if (cover === null) continue;
    techSlugs.add(project.slug);
    techIds.add(project.id);

    const projected = { ...projectIdentity(project), summary: project.summary.trim(), cover };
    for (const field of ['role', 'year']) projectText(projected, project, field);

    projected.screenshots = Array.isArray(project.screenshots)
      ? project.screenshots.map(projectImage).filter((image) => image !== null)
      : [];
    projected.sections = Array.isArray(project.sections)
      ? project.sections
          .filter((section) => isPlainObject(section) && isNonBlankString(section.title) && isNonBlankString(section.body))
          .map((section) => ({ title: section.title.trim(), body: section.body.trim() }))
      : [];
    projected.technologies = Array.isArray(project.technologies)
      ? [...new Set(project.technologies.filter(isNonBlankString).map((technology) => technology.trim()))]
      : [];

    const liveUrl = safeWebUrl(own(project, 'liveUrl'));
    if (liveUrl !== null) projected.liveUrl = liveUrl;
    const repositoryUrl = safeWebUrl(own(project, 'repositoryUrl'));
    if (repositoryUrl !== null) projected.repositoryUrl = repositoryUrl;
    view.techProjects.push(projected);
  }

  view.artFavorites = projectCurated(
    list('artFavorites'),
    (entry) => (entry.type === 'piece' ? pieces.has(entry.id) : keptProjects.has(entry.id)),
    true,
  );
  view.techStarred = projectCurated(list('techStarred'), (entry) => techIds.has(entry.id), false);

  return view;
}

/* ------------------------------------------------------------------ *
 * Transforms (pure: they clone, never mutate the input)
 * ------------------------------------------------------------------ */

function requireRecordType(type) {
  const spec = recordTypeSpec(type);
  if (!spec) {
    throw new Error(`Unknown record type ${quote(type)}. Expected "piece", "art-project" or "tech-project".`);
  }
  return spec;
}

function loadDocument(document) {
  if (!isPlainObject(document)) {
    throw new Error('The portfolio document must be a JSON object.');
  }
  if (document.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion ${quote(document.schemaVersion)}; expected ${SCHEMA_VERSION}.`);
  }
  const next = safeClone(document);
  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(next[field])) next[field] = [];
  }
  if (typeof next.about !== 'string') next.about = '';
  return next;
}

function findRecordIndex(document, spec, id) {
  const index = document[spec.collection].findIndex((record) => isPlainObject(record) && record.id === id);
  if (index === -1) {
    throw new Error(`Unknown ${spec.label} id ${quote(id)}.`);
  }
  return index;
}

const orderOf = (entry) => (Number.isInteger(entry?.order) ? entry.order : Number.MAX_SAFE_INTEGER);

/** Sort a curated list by its stored order and renumber it 0..n-1. */
const renumber = (entries) =>
  entries
    .filter(isPlainObject)
    .slice()
    .sort((a, b) => orderOf(a) - orderOf(b))
    .map((entry, index) => ({ ...entry, order: index }));

function dropCuratedRef(document, type, id) {
  if (type === 'tech-project') {
    document.techStarred = renumber(document.techStarred.filter((entry) => !(isPlainObject(entry) && entry.id === id)));
    return;
  }
  document.artFavorites = renumber(
    document.artFavorites.filter((entry) => !(isPlainObject(entry) && entry.type === type && entry.id === id)),
  );
}

/** An art project with no published pieces returns to draft and loses its favorite. */
function demoteEmptyArtProjects(document) {
  for (const project of document.artProjects) {
    if (!isPlainObject(project) || project.state !== 'published') continue;
    const members = Array.isArray(project.pieceIds) ? project.pieceIds : [];
    const hasPublishedPiece = members.some((pieceId) =>
      document.artPieces.some((piece) => isPlainObject(piece) && piece.id === pieceId && piece.state === 'published'),
    );
    if (hasPublishedPiece) continue;
    project.state = 'draft';
    dropCuratedRef(document, 'art-project', project.id);
  }
}

/** Validation errors that belong to one record, used to explain a refused publish. */
function recordProblems(document, spec, index) {
  const prefix = `${spec.collection}[${index}]`;
  return validatePortfolio(document).filter(
    (message) => message.startsWith(`${prefix}:`) || message.startsWith(`${prefix} (`) || message.startsWith(`${prefix}.`),
  );
}

/** Publish or unpublish one record, cleaning up anything the change breaks. */
export function setPublication(document, type, id, state) {
  const spec = requireRecordType(type);
  if (state !== 'draft' && state !== 'published') {
    throw new Error(`Unknown publication state ${quote(state)}. Expected "draft" or "published".`);
  }

  const next = loadDocument(document);
  const index = findRecordIndex(next, spec, id);
  next[spec.collection][index].state = state;

  if (state === 'published') {
    const problems = recordProblems(next, spec, index);
    if (problems.length > 0) {
      throw new Error(`Cannot publish ${spec.label} ${quote(id)}: ${problems.join(' ')}`);
    }
    return next;
  }

  dropCuratedRef(next, type, id);
  demoteEmptyArtProjects(next);
  return next;
}

/**
 * Add or remove one curated reference. Art favorites and tech starred entries
 * are independent lists: favoriting a project never favorites its pieces, and
 * unfavoriting never touches the source record.
 */
export function toggleCurated(document, type, id) {
  const spec = requireRecordType(type);
  const next = loadDocument(document);
  const index = findRecordIndex(next, spec, id);
  const record = next[spec.collection][index];

  const starred = type === 'tech-project';
  const collection = starred ? 'techStarred' : 'artFavorites';
  const isCurated = next[collection].some(
    (entry) => isPlainObject(entry) && entry.id === id && (starred || entry.type === type),
  );

  if (isCurated) {
    dropCuratedRef(next, type, id);
    return next;
  }

  if (record.state !== 'published') {
    throw new Error(`Cannot curate ${spec.label} ${quote(id)} while it is a draft; publish it first.`);
  }

  const highest = next[collection].reduce(
    (max, candidate) => (Number.isInteger(candidate?.order) ? Math.max(max, candidate.order) : max),
    -1,
  );
  const entry = starred ? { id, order: highest + 1 } : { type, id, order: highest + 1 };
  next[collection] = renumber([...next[collection], entry]);
  return next;
}

/** Move one curated entry up or down, keeping the two curated orders independent. */
export function moveCurated(document, collection, index, direction) {
  if (!CURATED_COLLECTIONS.includes(collection)) {
    throw new Error(`Unknown curated collection ${quote(collection)}. Expected "artFavorites" or "techStarred".`);
  }
  if (direction !== 'up' && direction !== 'down') {
    throw new Error(`Unknown direction ${quote(direction)}. Expected "up" or "down".`);
  }

  const next = loadDocument(document);
  const entries = renumber(next[collection]);
  if (!Number.isInteger(index) || index < 0 || index >= entries.length) {
    throw new Error(
      `Curated index ${quote(index)} is out of range for ${collection}${entries.length === 0 ? ' (the list is empty)' : ` (0 to ${entries.length - 1})`}.`,
    );
  }

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0) throw new Error(`Cannot move the first ${collection} entry up.`);
  if (target >= entries.length) throw new Error(`Cannot move the last ${collection} entry down.`);

  [entries[index], entries[target]] = [entries[target], entries[index]];
  next[collection] = entries.map((entry, position) => ({ ...entry, order: position }));
  return next;
}

/** Delete one record and every reference that would otherwise dangle. */
export function removeRecord(document, type, id) {
  const spec = requireRecordType(type);
  const next = loadDocument(document);
  const index = findRecordIndex(next, spec, id);

  next[spec.collection].splice(index, 1);
  dropCuratedRef(next, type, id);

  if (type === 'piece') {
    for (const project of next.artProjects) {
      if (isPlainObject(project) && Array.isArray(project.pieceIds)) {
        project.pieceIds = project.pieceIds.filter((pieceId) => pieceId !== id);
      }
    }
    demoteEmptyArtProjects(next);
  }

  if (type === 'art-project') {
    for (const piece of next.artPieces) {
      if (isPlainObject(piece) && own(piece, 'projectId') === id) delete piece.projectId;
    }
  }

  return next;
}
