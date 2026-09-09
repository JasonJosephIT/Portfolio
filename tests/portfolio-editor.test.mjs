// Behavioural tests for the owner editor's data transforms (admin/content-model.mjs).
//
// FIXTURE NOTICE: every record, title, image path, alt string and submission id
// in this file is invented test scaffolding. None of it is Jason's real content
// and none of it may be copied into content/portfolio.json or a public page.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validatePortfolio, moveCurated, createEmptyPortfolio } from '../lib/portfolio-content.mjs';
import { buildSite } from '../scripts/build-portfolio.mjs';
import {
  RECORD_KINDS,
  kindOf,
  slugify,
  inboxAssetPath,
  uniqueSlug,
  nextRecordId,
  parseCanonical,
  serializeCanonical,
  upsertRecord,
  setMembership,
  curatedView,
  structuredLayout,
  isLegacyLayout,
  readProposal,
  importProposals,
  fieldOfError,
  recordErrors,
} from '../admin/content-model.mjs';

const repoFile = (relative) => fileURLToPath(new URL(`../${relative}`, import.meta.url));

/* ------------------------------------------------------------------ *
 * FIXTURE builders (test-only content)
 * ------------------------------------------------------------------ */

const fixtureImage = (over = {}) => ({
  src: 'assets/fixture-doorway.jpg',
  alt: 'Fixture: a doorway lit from inside at dusk',
  width: 1600,
  height: 1067,
  ...over,
});

const fixturePiece = (over = {}) => ({
  id: 'piece-fixture-1',
  slug: 'fixture-doorway',
  title: 'Fixture Doorway',
  state: 'published',
  image: fixtureImage(),
  ...over,
});

const fixtureArtProject = (over = {}) => ({
  id: 'art-project-fixture-1',
  slug: 'fixture-series',
  title: 'Fixture Series',
  state: 'published',
  cover: fixtureImage({ src: 'assets/fixture-cover.jpg', alt: 'Fixture: an empty gallery wall' }),
  pieceIds: ['piece-fixture-1'],
  ...over,
});

const fixtureDocument = (over = {}) => ({
  ...createEmptyPortfolio(),
  artPieces: [fixturePiece({ projectId: 'art-project-fixture-1' })],
  artProjects: [fixtureArtProject()],
  ...over,
});

/** A minimal structured proposal, shaped the way admin/content.js writes it. */
const fixtureProposal = (over = {}) => ({
  id: 'fixture-submission-1',
  kind: 'photo',
  title: 'Fixture Harbour',
  image_path: 'photo/1700000000000-fixture.jpg',
  layout: {
    schemaVersion: 1,
    mode: 'structured',
    record: {
      type: 'piece',
      title: 'Fixture Harbour',
      image: fixtureImage({ src: 'assets/fixture-harbour.jpg', alt: 'Fixture: masts against a pale sky' }),
    },
  },
  ...over,
});

const errorText = (errors) => errors.join('\n');
const assertError = (errors, pattern) =>
  assert.ok(
    errors.some((message) => pattern.test(message)),
    `expected an error matching ${pattern}, got: ${errorText(errors) || '(none)'}`,
  );

/* ------------------------------------------------------------------ *
 * Slugs, ids and asset paths
 * ------------------------------------------------------------------ */

describe('slugify', () => {
  it('folds accents and spaces to ASCII words joined by single hyphens', () => {
    assert.equal(slugify('Café Bar'), 'cafe-bar');
    assert.equal(slugify('  Harbour   Lights  '), 'harbour-lights');
    assert.equal(slugify('Étude № 4 — dusk'), 'etude-no-4-dusk');
  });

  it('returns an empty string when nothing survives, rather than inventing one', () => {
    assert.equal(slugify('—'), '');
    assert.equal(slugify(''), '');
    assert.equal(slugify(null), '');
  });
});

describe('inboxAssetPath', () => {
  it('ASCII-slugifies the inbox filename and keeps an immutable id suffix', () => {
    const path = inboxAssetPath('photo/Café Bar.JPG', 'fixture-submission-1');
    assert.equal(path, 'assets/cafe-bar-fixture-submission-1.jpg');
  });

  it('produces a path the canonical safety rules accept', () => {
    for (const name of ['photo/Café Bar.jpg', 'photo/x.png?v=2', 'photo/tête à tête.JPEG']) {
      const path = inboxAssetPath(name, 'fixture-submission-1');
      const document = {
        ...createEmptyPortfolio(),
        artPieces: [fixturePiece({ image: fixtureImage({ src: path }) })],
      };
      assert.deepEqual(validatePortfolio(document), [], `${name} -> ${path}`);
    }
  });

  it('refuses an extension that is not a known image type instead of guessing one', () => {
    assert.equal(inboxAssetPath('photo/notes.txt', 'fixture-submission-1'), null);
    assert.equal(inboxAssetPath('photo/noextension', 'fixture-submission-1'), null);
  });
});

describe('uniqueSlug and nextRecordId', () => {
  it('keeps slugs unique per record type and leaves other types alone', () => {
    const document = fixtureDocument();
    assert.equal(uniqueSlug(document, 'piece', 'fixture-doorway'), 'fixture-doorway-2');
    assert.equal(uniqueSlug(document, 'art-project', 'fixture-doorway'), 'fixture-doorway');
  });

  it('lets a record keep its own slug while editing it', () => {
    const document = fixtureDocument();
    assert.equal(uniqueSlug(document, 'piece', 'fixture-doorway', 'piece-fixture-1'), 'fixture-doorway');
  });

  it('mints ids that collide with no record of any type', () => {
    const document = fixtureDocument();
    const id = nextRecordId(document, 'piece');
    assert.equal(id, 'piece-1');
    assert.equal(
      [...document.artPieces, ...document.artProjects, ...document.techProjects].some((r) => r.id === id),
      false,
    );
  });
});

/* ------------------------------------------------------------------ *
 * Parsing and exporting the canonical file
 * ------------------------------------------------------------------ */

describe('parseCanonical', () => {
  it('reports malformed JSON instead of throwing', () => {
    const result = parseCanonical('{ not json');
    assert.equal(result.document, null);
    assertError(result.errors, /not valid JSON/i);
  });

  it('refuses a JSON value that is not an object', () => {
    for (const text of ['[]', '"text"', 'null', '42']) {
      const result = parseCanonical(text);
      assert.equal(result.document, null, text);
      assertError(result.errors, /must be a JSON object/i);
    }
  });

  it('loads an invalid document so the owner can see and fix its errors', () => {
    const result = parseCanonical(JSON.stringify({ ...createEmptyPortfolio(), artPieces: [{ id: 'x' }] }));
    assert.notEqual(result.document, null);
    assert.ok(result.errors.length > 0, 'validation errors are surfaced, not swallowed');
  });

  it('round-trips a valid document through serializeCanonical', () => {
    const document = fixtureDocument();
    const result = parseCanonical(serializeCanonical(document));
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.document, document);
  });
});

/* ------------------------------------------------------------------ *
 * Record transforms
 * ------------------------------------------------------------------ */

describe('upsertRecord', () => {
  it('adds a record without mutating the document it was given', () => {
    const document = fixtureDocument();
    const before = JSON.stringify(document);
    const next = upsertRecord(document, 'piece', fixturePiece({ id: 'piece-fixture-2', slug: 'fixture-two' }));
    assert.equal(JSON.stringify(document), before, 'input document is untouched');
    assert.equal(next.artPieces.length, 2);
  });

  it('replaces an existing record in place, keeping its position and curation', () => {
    const document = { ...fixtureDocument(), artFavorites: [{ type: 'piece', id: 'piece-fixture-1', order: 0 }] };
    const next = upsertRecord(document, 'piece', { ...document.artPieces[0], title: 'Fixture Renamed' });
    assert.equal(next.artPieces.length, 1);
    assert.equal(next.artPieces[0].title, 'Fixture Renamed');
    assert.deepEqual(next.artFavorites, document.artFavorites);
  });

  it('rejects an unknown record type rather than writing into nothing', () => {
    assert.throws(() => upsertRecord(fixtureDocument(), 'sculpture', fixturePiece()), /Unknown record type/);
  });
});

describe('setMembership', () => {
  it('keeps membership agreeing in both directions', () => {
    const document = {
      ...createEmptyPortfolio(),
      artPieces: [fixturePiece(), fixturePiece({ id: 'piece-fixture-2', slug: 'fixture-two' })],
      artProjects: [fixtureArtProject({ pieceIds: [] })],
    };
    const next = setMembership(document, 'art-project-fixture-1', ['piece-fixture-2', 'piece-fixture-1']);
    assert.deepEqual(next.artProjects[0].pieceIds, ['piece-fixture-2', 'piece-fixture-1']);
    assert.equal(next.artPieces[0].projectId, 'art-project-fixture-1');
    assert.equal(next.artPieces[1].projectId, 'art-project-fixture-1');
    assert.deepEqual(validatePortfolio(next), []);
  });

  it('clears projectId on a piece dropped from the project', () => {
    const next = setMembership(fixtureDocument(), 'art-project-fixture-1', []);
    assert.equal('projectId' in next.artPieces[0], false);
  });

  it('moves a piece out of its previous project so it is never listed twice', () => {
    const document = {
      ...fixtureDocument(),
      artProjects: [
        fixtureArtProject(),
        fixtureArtProject({ id: 'art-project-fixture-2', slug: 'fixture-other', pieceIds: [] }),
      ],
    };
    const next = setMembership(document, 'art-project-fixture-2', ['piece-fixture-1']);
    assert.deepEqual(next.artProjects[0].pieceIds, []);
    assert.deepEqual(next.artProjects[1].pieceIds, ['piece-fixture-1']);
    assert.equal(next.artPieces[0].projectId, 'art-project-fixture-2');
  });

  it('ignores ids that name no piece rather than storing a dangling member', () => {
    const next = setMembership(fixtureDocument(), 'art-project-fixture-1', ['piece-fixture-1', 'piece-missing']);
    assert.deepEqual(next.artProjects[0].pieceIds, ['piece-fixture-1']);
  });
});

/* ------------------------------------------------------------------ *
 * Curated ordering: the index moveCurated actually addresses
 * ------------------------------------------------------------------ */

describe('curatedView', () => {
  it('sorts by stored order and hands moveCurated the index it addresses', () => {
    // The stored array has drifted out of `order` sequence, as a hand edit leaves it.
    const document = {
      ...fixtureDocument(),
      artFavorites: [
        { type: 'art-project', id: 'art-project-fixture-1', order: 1 },
        { type: 'piece', id: 'piece-fixture-1', order: 0 },
      ],
    };
    const view = curatedView(document, 'artFavorites');
    assert.deepEqual(
      view.map((entry) => entry.id),
      ['piece-fixture-1', 'art-project-fixture-1'],
    );
    assert.deepEqual(
      view.map((entry) => entry.index),
      [0, 1],
    );

    const project = view.find((entry) => entry.id === 'art-project-fixture-1');
    const moved = moveCurated(document, 'artFavorites', project.index, 'up');
    assert.deepEqual(
      curatedView(moved, 'artFavorites').map((entry) => entry.id),
      ['art-project-fixture-1', 'piece-fixture-1'],
    );

    // The raw stored position would have addressed the wrong row.
    assert.equal(document.artFavorites.indexOf(document.artFavorites[0]), 0);
    assert.throws(() => moveCurated(document, 'artFavorites', 0, 'up'), /Cannot move the first/);
  });

  it('carries the title and the move affordances each row needs', () => {
    const document = { ...fixtureDocument(), artFavorites: [{ type: 'piece', id: 'piece-fixture-1', order: 0 }] };
    const [row] = curatedView(document, 'artFavorites');
    assert.equal(row.title, 'Fixture Doorway');
    assert.equal(row.canMoveUp, false);
    assert.equal(row.canMoveDown, false);
  });
});

/* ------------------------------------------------------------------ *
 * Submission proposals
 * ------------------------------------------------------------------ */

describe('structuredLayout', () => {
  it('writes the structured envelope and never a public publication state', () => {
    const layout = structuredLayout({ type: 'piece', title: 'Fixture Harbour', state: 'published' });
    assert.equal(layout.schemaVersion, 1);
    assert.equal(layout.mode, 'structured');
    assert.equal(layout.record.state, 'draft');
    assert.equal(JSON.stringify(layout).includes('"published"'), false);
  });

  it('keeps the layout it replaced instead of discarding it', () => {
    const legacy = { page: 'art.html', x_pct: 12.5, y_px: 40, width_pct: 40 };
    const layout = structuredLayout({ type: 'piece', title: 'Fixture Harbour' }, legacy);
    assert.deepEqual(layout.replaces, legacy);
    assert.equal(layout.mode, 'structured');
  });
});

describe('isLegacyLayout', () => {
  it('recognises the drag-placement spec the old overlay wrote', () => {
    assert.equal(isLegacyLayout({ page: 'art.html', container: '.gallery', x_pct: 12.5, y_px: 40 }), true);
    assert.equal(isLegacyLayout({ page: 'art.html', width_pct: 40, free_position: true }), true);
  });

  it('does not mistake a structured layout, or nothing at all, for a legacy one', () => {
    assert.equal(isLegacyLayout(structuredLayout({ type: 'piece', title: 'Fixture Harbour' })), false);
    assert.equal(isLegacyLayout(null), false);
    assert.equal(isLegacyLayout({}), false);
  });
});

describe('readProposal', () => {
  it('accepts a structured proposal and reports its parts', () => {
    const result = readProposal(fixtureProposal());
    assert.deepEqual(result.errors, []);
    assert.equal(result.value.sourceSubmissionId, 'fixture-submission-1');
    assert.equal(result.value.type, 'piece');
    assert.equal(result.value.imagePath, 'photo/1700000000000-fixture.jpg');
  });

  it('refuses a legacy drag layout rather than reinterpreting its offsets', () => {
    const proposal = fixtureProposal({
      layout: { page: 'art.html', container: '.gallery', x_pct: 12.5, y_px: 40, width_pct: 40 },
    });
    const result = readProposal(proposal);
    assertError(result.errors, /legacy drag placement/i);
    assert.equal(result.value, null);
  });

  it('refuses a proposal with no structured record, and names what is missing', () => {
    assertError(readProposal({ id: 'fixture-submission-1' }).errors, /layout/i);
    assertError(readProposal(fixtureProposal({ id: '' })).errors, /submission id/i);
    assertError(
      readProposal(fixtureProposal({ layout: { schemaVersion: 1, mode: 'structured', record: { title: 'x' } } })).errors,
      /record\.type/i,
    );
  });

  it('never turns tags into styles', () => {
    const proposal = fixtureProposal({ tags: ['monochrome', 'harbour'] });
    const result = readProposal(proposal);
    assert.deepEqual(result.errors, []);
    assert.equal('styleIds' in result.value.record, false);
  });

  it('never invents alt text from a filename', () => {
    const proposal = fixtureProposal({
      layout: {
        schemaVersion: 1,
        mode: 'structured',
        record: { type: 'piece', title: 'Fixture Harbour', image: { src: 'assets/fixture-harbour.jpg' } },
      },
    });
    const result = readProposal(proposal);
    assert.deepEqual(result.errors, []);
    assert.equal('alt' in result.value.record.image, false);
  });
});

describe('importProposals', () => {
  it('enters a new record as a draft carrying its source submission id', () => {
    const document = createEmptyPortfolio();
    const result = importProposals(document, [{ proposal: fixtureProposal() }]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.document.artPieces.length, 1);
    const [piece] = result.document.artPieces;
    assert.equal(piece.state, 'draft');
    assert.equal(piece.sourceSubmissionId, 'fixture-submission-1');
    assert.equal(piece.slug, 'fixture-harbour');
    assert.deepEqual(validatePortfolio(result.document), []);
  });

  it('forces a draft even when the proposal claims it is published', () => {
    const proposal = fixtureProposal();
    proposal.layout.record.state = 'published';
    const result = importProposals(createEmptyPortfolio(), [{ proposal }]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.document.artPieces[0].state, 'draft');
  });

  it('is idempotent: a second import of the same submission adds nothing', () => {
    const first = importProposals(createEmptyPortfolio(), [{ proposal: fixtureProposal() }]);
    const second = importProposals(first.document, [{ proposal: fixtureProposal() }]);
    assert.deepEqual(second.errors, []);
    assert.equal(second.document.artPieces.length, 1);
    assert.equal(second.document.artPieces[0].id, first.document.artPieces[0].id);
    assert.equal(second.imported.length, 0);
    assert.equal(second.skipped.length, 1);
  });

  it('preserves ids and curated references across a re-import', () => {
    const first = importProposals(createEmptyPortfolio(), [{ proposal: fixtureProposal() }]);
    const curated = {
      ...first.document,
      artPieces: [{ ...first.document.artPieces[0], state: 'published' }],
      artFavorites: [{ type: 'piece', id: first.document.artPieces[0].id, order: 0 }],
    };
    const second = importProposals(curated, [{ proposal: fixtureProposal() }]);
    assert.deepEqual(second.document.artFavorites, curated.artFavorites);
    assert.equal(second.document.artPieces[0].state, 'published', 'a local edit is never rolled back');
  });

  it('applies nothing at all when one proposal in the batch is bad', () => {
    const bad = fixtureProposal({ id: 'fixture-submission-2', layout: { page: 'art.html', x_pct: 1, y_px: 2 } });
    const result = importProposals(createEmptyPortfolio(), [{ proposal: fixtureProposal() }, { proposal: bad }]);
    assert.ok(result.errors.length > 0);
    assert.equal(result.document.artPieces.length, 0, 'the good proposal is not half-applied');
    assert.equal(result.imported.length, 0);
  });

  it('uses the resolved local image source and keeps the supplied alt and pixels', () => {
    const result = importProposals(createEmptyPortfolio(), [
      { proposal: fixtureProposal(), imageSrc: 'assets/fixture-harbour-fixture-submission-1.jpg' },
    ]);
    const { image } = result.document.artPieces[0];
    assert.equal(image.src, 'assets/fixture-harbour-fixture-submission-1.jpg');
    assert.equal(image.alt, 'Fixture: masts against a pale sky');
    assert.equal(image.width, 1600);
    assert.equal(image.height, 1067);
  });

  it('refuses a styleId that no style defines, rather than inventing the style', () => {
    const proposal = fixtureProposal();
    proposal.layout.record.styleIds = ['style-missing'];
    const result = importProposals(createEmptyPortfolio(), [{ proposal }]);
    assertError(result.errors, /style-missing/);
    assert.equal(result.document.artPieces.length, 0);
  });

  it('refuses project membership at import time, leaving it to the editor', () => {
    const proposal = fixtureProposal();
    proposal.layout.record.projectId = 'art-project-fixture-1';
    const result = importProposals(fixtureDocument(), [{ proposal }]);
    assertError(result.errors, /projectId/);
  });

  it('gives two proposals distinct ids and slugs in one batch', () => {
    const a = fixtureProposal();
    const b = fixtureProposal({ id: 'fixture-submission-2' });
    const result = importProposals(createEmptyPortfolio(), [{ proposal: a }, { proposal: b }]);
    assert.deepEqual(result.errors, []);
    const [first, second] = result.document.artPieces;
    assert.notEqual(first.id, second.id);
    assert.notEqual(first.slug, second.slug);
    assert.deepEqual(validatePortfolio(result.document), []);
  });
});

describe('recordErrors and fieldOfError', () => {
  it('attributes each message to the record it names', () => {
    const document = {
      ...createEmptyPortfolio(),
      artPieces: [fixturePiece(), fixturePiece({ id: 'piece-fixture-2', slug: 'fixture-two', title: '  ' })],
    };
    assert.deepEqual(recordErrors(document, 'piece', 'piece-fixture-1'), []);
    const problems = recordErrors(document, 'piece', 'piece-fixture-2');
    assert.ok(problems.length > 0);
    assert.ok(problems.every((message) => message.startsWith('artPieces[1]')), problems.join('\n'));
  });

  it('returns nothing for a record the document does not hold', () => {
    assert.deepEqual(recordErrors(fixtureDocument(), 'piece', 'piece-absent'), []);
  });

  it('names the form field a message is about', () => {
    assert.equal(fieldOfError('artPieces[0]: title is required before this art piece can be published.'), 'title');
    assert.equal(fieldOfError('artPieces[0].image.alt must be meaningful, non-blank text.'), 'image.alt');
    assert.equal(fieldOfError('artFavorites[0] references a missing record.'), null);
    assert.equal(fieldOfError(null), null);
  });
});

/* ------------------------------------------------------------------ *
 * The owner surface the public build has to carry
 * ------------------------------------------------------------------ */

describe('the owner editor surface', () => {
  it('describes every record kind the editor groups by', () => {
    assert.deepEqual(
      RECORD_KINDS.map((kind) => kind.type),
      ['piece', 'art-project', 'tech-project'],
    );
    assert.equal(kindOf('piece').collection, 'artPieces');
    assert.equal(kindOf('tech-project').curated, 'techStarred');
    assert.equal(kindOf('nope'), null);
  });

  it('carries no drag-placement dependency any more', async () => {
    const edit = await readFile(repoFile('admin/edit.js'), 'utf8');
    assert.equal(/interact/i.test(edit), false, 'interactjs is gone');
    assert.equal(edit.includes('admin/content/'), true, '?edit=1 leads to the structured editor');
  });

  it('is carried into the public --out build, canonical source still excluded', async () => {
    const out = await mkdtemp(join(tmpdir(), 'portfolio-editor-out-'));
    try {
      const result = await buildSite({ root: fileURLToPath(new URL('..', import.meta.url)), out });
      assert.equal(result.ok, true, result.errors.join('\n'));
      for (const file of ['admin/content/index.html', 'admin/content.js', 'admin/content-model.mjs', 'admin/edit.js', 'lib/portfolio-content.mjs']) {
        assert.ok(await readFile(join(out, file), 'utf8'), `${file} reached the public build`);
      }
      await assert.rejects(readFile(join(out, 'content', 'portfolio.json'), 'utf8'), 'the canonical document stays out of the build');
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  });

  it('loads only modules the public build already copies', async () => {
    for (const file of ['admin/content.js', 'admin/content-model.mjs', 'admin/edit.js']) {
      const body = await readFile(repoFile(file), 'utf8');
      for (const [, specifier] of body.matchAll(/^import\s[^'"]*['"]([^'"]+)['"]/gm)) {
        assert.ok(
          specifier.startsWith('./') || specifier.startsWith('../lib/') || specifier.startsWith('https://cdn.'),
          `${file} imports ${specifier}, which the public build's allowlist may not copy`,
        );
      }
    }
  });
});
