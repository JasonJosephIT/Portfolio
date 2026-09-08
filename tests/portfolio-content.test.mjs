// Behavioural tests for the canonical portfolio content contract.
//
// FIXTURE NOTICE: every record, image path, title, URL and biography string in
// this file is invented test scaffolding. None of it is Jason's real content and
// none of it may be copied into content/portfolio.json or any public page.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  createEmptyPortfolio,
  validatePortfolio,
  publishedPortfolio,
  detailPath,
  safeUrl,
  setPublication,
  toggleCurated,
  moveCurated,
  removeRecord,
} from '../lib/portfolio-content.mjs';

const canonicalFile = fileURLToPath(new URL('../content/portfolio.json', import.meta.url));

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
  pieceIds: [],
  ...over,
});

const fixtureTechProject = (over = {}) => ({
  id: 'tech-project-fixture-1',
  slug: 'fixture-tool',
  title: 'Fixture Tool',
  state: 'published',
  summary: 'Fixture summary for an imaginary internal tool.',
  cover: fixtureImage({ src: 'assets/fixture-tech.png', alt: 'Fixture: a plain settings panel' }),
  ...over,
});

const doc = (parts = {}) => ({ ...createEmptyPortfolio(), ...parts });

/** A published project holding one published piece, wired both ways. */
const linkedArtFixture = (pieceOver = {}, projectOver = {}) => {
  const piece = fixturePiece({ projectId: 'art-project-fixture-1', ...pieceOver });
  const project = fixtureArtProject({ pieceIds: [piece.id], ...projectOver });
  return { piece, project };
};

const errorsFor = (document) => validatePortfolio(document);
const hasError = (errors, pattern) => errors.some((message) => pattern.test(message));
const assertError = (errors, pattern, note = '') =>
  assert.ok(
    hasError(errors, pattern),
    `expected an error matching ${pattern}${note ? ` (${note})` : ''}\ngot: ${JSON.stringify(errors, null, 2)}`,
  );
const assertNoErrors = (errors) => assert.deepStrictEqual(errors, []);

/** Assert a call leaves its input document untouched. */
const assertPure = (document, run) => {
  const before = structuredClone(document);
  run();
  assert.deepStrictEqual(document, before, 'input document was mutated');
};

/* ------------------------------------------------------------------ *
 * Empty canonical document
 * ------------------------------------------------------------------ */

describe('createEmptyPortfolio', () => {
  it('starts every collection empty with no biography or contacts', () => {
    const empty = createEmptyPortfolio();
    assert.equal(empty.schemaVersion, 1);
    assert.equal(empty.about, '');
    for (const key of ['artPieces', 'artProjects', 'artFavorites', 'techProjects', 'techStarred', 'styles', 'contacts']) {
      assert.deepStrictEqual(empty[key], [], `${key} should start empty`);
    }
  });

  it('validates with no errors', () => {
    assertNoErrors(validatePortfolio(createEmptyPortfolio()));
  });

  it('returns independent documents on each call', () => {
    const first = createEmptyPortfolio();
    first.artPieces.push(fixturePiece());
    assert.deepStrictEqual(createEmptyPortfolio().artPieces, []);
  });
});

describe('content/portfolio.json', () => {
  it('is the empty canonical document and validates clean', async () => {
    const onDisk = JSON.parse(await readFile(canonicalFile, 'utf8'));
    assert.deepStrictEqual(onDisk, createEmptyPortfolio());
    assertNoErrors(validatePortfolio(onDisk));
  });
});

/* ------------------------------------------------------------------ *
 * safeUrl
 * ------------------------------------------------------------------ */

describe('safeUrl', () => {
  it('accepts repo-relative local asset paths unchanged', () => {
    assert.equal(safeUrl('assets/fixture-doorway.jpg', { image: true }), 'assets/fixture-doorway.jpg');
    assert.equal(safeUrl('assets/art/fixture_02-detail.webp', { image: true }), 'assets/art/fixture_02-detail.webp');
  });

  it('accepts http and https and returns a normalised absolute URL', () => {
    assert.equal(safeUrl('https://example.com', { image: true }), 'https://example.com/');
    assert.equal(safeUrl('http://example.com/fixture.png', { image: true }), 'http://example.com/fixture.png');
  });

  it('accepts mailto and tel for destinations but not for image sources', () => {
    assert.equal(safeUrl('mailto:fixture@example.com'), 'mailto:fixture@example.com');
    assert.equal(safeUrl('tel:+15550100'), 'tel:+15550100');
    assert.equal(safeUrl('mailto:fixture@example.com', { image: true }), null);
    assert.equal(safeUrl('tel:+15550100', { image: true }), null);
  });

  it('rejects script-bearing and data schemes in both modes', () => {
    for (const value of [
      'javascript:alert(1)',
      '  JaVaScRiPt:alert(1)',
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
    ]) {
      assert.equal(safeUrl(value), null, `${value} should be rejected as a destination`);
      assert.equal(safeUrl(value, { image: true }), null, `${value} should be rejected as an image source`);
    }
  });

  it('rejects control characters used to smuggle a scheme', () => {
    assert.equal(safeUrl('java\x00script:alert(1)'), null);
    assert.equal(safeUrl('java\nscript:alert(1)'), null);
    assert.equal(safeUrl('assets/fixt\ture.jpg', { image: true }), null);
  });

  it('rejects protocol-relative URLs and embedded credentials', () => {
    assert.equal(safeUrl('//example.com/fixture.jpg', { image: true }), null);
    assert.equal(safeUrl('https://user:pass@example.com/fixture.jpg', { image: true }), null);
  });

  it('rejects path traversal, absolute paths, backslashes and dot segments', () => {
    for (const value of [
      '../../etc/passwd',
      'assets/../../etc/passwd',
      '/assets/fixture.jpg',
      'assets\\fixture.jpg',
      './assets/fixture.jpg',
      '.env',
      '.git/config',
    ]) {
      assert.equal(safeUrl(value, { image: true }), null, `${value} should be rejected`);
    }
  });

  it('rejects a local path that could be read as a scheme', () => {
    assert.equal(safeUrl('assets:fixture.jpg', { image: true }), null);
    assert.equal(safeUrl('&#106;avascript:alert(1)'), null);
  });

  it('returns null for blank and non-string input', () => {
    for (const value of ['', '   ', null, undefined, 42, {}, ['assets/fixture.jpg']]) {
      assert.equal(safeUrl(value, { image: true }), null);
    }
  });
});

/* ------------------------------------------------------------------ *
 * detailPath
 * ------------------------------------------------------------------ */

describe('detailPath', () => {
  it('returns the canonical route for each record type', () => {
    assert.equal(detailPath('piece', 'fixture-doorway'), 'art/pieces/fixture-doorway/index.html');
    assert.equal(detailPath('art-project', 'fixture-series'), 'art/projects/fixture-series/index.html');
    assert.equal(detailPath('tech-project', 'fixture-tool'), 'tech/projects/fixture-tool/index.html');
  });

  it('throws on an unknown record type', () => {
    assert.throws(() => detailPath('photo', 'fixture-doorway'), /type/i);
  });

  it('throws on unsafe or malformed slugs', () => {
    for (const slug of ['../../etc/passwd', '__proto__', 'constructor', 'Fixture Doorway', 'fixture/doorway', '', '.env']) {
      assert.throws(() => detailPath('piece', slug), /slug/i, `slug ${JSON.stringify(slug)} should be rejected`);
    }
  });
});

/* ------------------------------------------------------------------ *
 * validatePortfolio — document structure
 * ------------------------------------------------------------------ */

describe('validatePortfolio: document structure', () => {
  it('rejects non-object documents', () => {
    assertError(errorsFor(null), /document/i);
    assertError(errorsFor('portfolio'), /document/i);
  });

  it('rejects an unsupported schema version', () => {
    assertError(errorsFor(doc({ schemaVersion: 2 })), /schemaVersion/);
  });

  it('rejects collections that are not arrays and a non-string biography', () => {
    assertError(errorsFor(doc({ artPieces: {} })), /artPieces.*array/i);
    assertError(errorsFor(doc({ about: 42 })), /about.*string/i);
  });

  it('accepts one image object shared by two records but rejects a real cycle', () => {
    const shared = fixtureImage();
    assertNoErrors(errorsFor(doc({
      artPieces: [fixturePiece({ image: shared }), fixturePiece({ id: 'piece-fixture-2', slug: 'fixture-two', image: shared })],
    })));

    const cyclic = doc({ styles: [{ id: 'style-a', name: 'Fixture Style' }] });
    cyclic.styles[0].self = cyclic.styles[0];
    assertError(errorsFor(cyclic), /circular/i);
  });

  it('rejects prototype-pollution keys anywhere in the document', () => {
    const polluted = JSON.parse(
      JSON.stringify(doc({ artPieces: [fixturePiece()] })).replace('"title"', '"__proto__"'),
    );
    assertError(errorsFor(polluted), /unsafe property key|__proto__/i);
  });
});

/* ------------------------------------------------------------------ *
 * validatePortfolio — identity
 * ------------------------------------------------------------------ */

describe('validatePortfolio: identity', () => {
  it('rejects an id reused by another record', () => {
    const errors = errorsFor(doc({
      artPieces: [fixturePiece()],
      techProjects: [fixtureTechProject({ id: 'piece-fixture-1' })],
    }));
    assertError(errors, /already used|duplicate/i);
    assertError(errors, /piece-fixture-1/);
  });

  it('rejects a slug reused within the same record type', () => {
    const errors = errorsFor(doc({
      artPieces: [fixturePiece(), fixturePiece({ id: 'piece-fixture-2' })],
    }));
    assertError(errors, /slug/i);
  });

  it('allows the same slug in different route namespaces', () => {
    assertNoErrors(errorsFor(doc({
      artPieces: [fixturePiece({ slug: 'shared-slug' })],
      techProjects: [fixtureTechProject({ slug: 'shared-slug' })],
    })));
  });

  it('rejects unsafe ids and slugs', () => {
    assertError(errorsFor(doc({ artPieces: [fixturePiece({ id: 'constructor' })] })), /id/i);
    assertError(errorsFor(doc({ artPieces: [fixturePiece({ slug: 'Fixture Doorway' })] })), /slug/i);
    assertError(errorsFor(doc({ artPieces: [fixturePiece({ slug: '../escape' })] })), /slug/i);
  });

  it('rejects a duplicate sourceSubmissionId', () => {
    const errors = errorsFor(doc({
      artPieces: [
        fixturePiece({ sourceSubmissionId: '9f0a2c3e-0000-4000-8000-000000000001' }),
        fixturePiece({ id: 'piece-fixture-2', slug: 'fixture-two', sourceSubmissionId: '9f0a2c3e-0000-4000-8000-000000000001' }),
      ],
    }));
    assertError(errors, /sourceSubmissionId/);
  });
});

/* ------------------------------------------------------------------ *
 * validatePortfolio — drafts
 * ------------------------------------------------------------------ */

describe('validatePortfolio: drafts', () => {
  it('allows an incomplete draft piece', () => {
    assertNoErrors(errorsFor(doc({
      artPieces: [{ id: 'piece-draft', slug: 'fixture-draft', state: 'draft' }],
    })));
  });

  it('still requires structural fields and safe types on drafts', () => {
    assertError(errorsFor(doc({ artPieces: [{ slug: 'fixture-draft', state: 'draft' }] })), /id/i);
    assertError(errorsFor(doc({ artPieces: [{ id: 'piece-draft', state: 'draft' }] })), /slug/i);
    assertError(errorsFor(doc({ artPieces: [{ id: 'piece-draft', slug: 'fixture-draft' }] })), /state/i);
    assertError(
      errorsFor(doc({ artPieces: [{ id: 'piece-draft', slug: 'fixture-draft', state: 'draft', title: 7 }] })),
      /title/i,
    );
  });

  it('rejects an unsafe image source even on a draft', () => {
    const errors = errorsFor(doc({
      artPieces: [fixturePiece({ state: 'draft', image: fixtureImage({ src: 'javascript:alert(1)' }) })],
    }));
    assertError(errors, /src/i);
  });
});

/* ------------------------------------------------------------------ *
 * validatePortfolio — publication requirements
 * ------------------------------------------------------------------ */

describe('validatePortfolio: publication requirements', () => {
  it('passes markup in title and alt through unchanged: validation is not an escaper', () => {
    // FIXTURE — deliberately hostile-looking strings, never rendered by this test.
    const markupTitle = '<script>alert(1)</script>';
    const markupAlt = 'Fixture: </p><img onerror=x> a doorway with markup baked into the alt text';
    const document = doc({
      artPieces: [fixturePiece({ title: markupTitle, image: fixtureImage({ alt: markupAlt }) })],
    });

    assertNoErrors(errorsFor(document));

    const view = publishedPortfolio(document);
    assert.equal(view.artPieces[0].title, markupTitle);
    assert.equal(view.artPieces[0].image.alt, markupAlt);
  });

  it('requires width and height on published images so layouts reserve space', () => {
    const errors = errorsFor(doc({
      artPieces: [fixturePiece({ image: { src: 'assets/fixture-doorway.jpg', alt: 'Fixture: a lit doorway' } })],
    }));
    assertError(errors, /width|height|dimension/i);
  });

  it('rejects zero, negative and non-integer image dimensions wherever supplied', () => {
    assertError(errorsFor(doc({ artPieces: [fixturePiece({ image: fixtureImage({ width: 0 }) })] })), /width/i);
    assertError(errorsFor(doc({ artPieces: [fixturePiece({ image: fixtureImage({ height: -10 }) })] })), /height/i);
    assertError(errorsFor(doc({ artPieces: [fixturePiece({ image: fixtureImage({ width: 12.5 }) })] })), /width/i);
  });

  it('rejects a focal point outside the image', () => {
    assertError(
      errorsFor(doc({ artPieces: [fixturePiece({ image: fixtureImage({ focalPoint: { x: 1.4, y: 0.5 } }) })] })),
      /focalPoint/i,
    );
  });

  it('requires meaningful non-blank alt text on published images', () => {
    for (const alt of ['', '   ', 'image', 'Photo', 'IMG_1234.jpg', 'fixture-doorway.jpg']) {
      assertError(
        errorsFor(doc({ artPieces: [fixturePiece({ image: fixtureImage({ alt }) })] })),
        /alt/i,
        `alt ${JSON.stringify(alt)} should be rejected`,
      );
    }
  });

  it('requires a title on a published record', () => {
    assertError(errorsFor(doc({ artPieces: [fixturePiece({ title: '  ' })] })), /title/i);
  });

  it('requires a summary on a published tech project', () => {
    assertError(errorsFor(doc({ techProjects: [fixtureTechProject({ summary: '' })] })), /summary/i);
  });

  it('requires published tech screenshots to be complete images', () => {
    const errors = errorsFor(doc({
      techProjects: [fixtureTechProject({ screenshots: [{ src: 'assets/fixture-shot.png', alt: 'Fixture: a list view' }] })],
    }));
    assertError(errors, /screenshots/i);
  });

  it('rejects live and repository links that are not web addresses', () => {
    assertError(errorsFor(doc({ techProjects: [fixtureTechProject({ liveUrl: 'javascript:alert(1)' })] })), /liveUrl/i);
    assertError(errorsFor(doc({ techProjects: [fixtureTechProject({ repositoryUrl: 'mailto:fixture@example.com' })] })), /repositoryUrl/i);
    assertNoErrors(errorsFor(doc({ techProjects: [fixtureTechProject({ liveUrl: 'https://example.com/fixture' })] })));
  });

  it('rejects empty case-study sections and blank technologies', () => {
    assertError(errorsFor(doc({ techProjects: [fixtureTechProject({ sections: [{ title: 'Overview', body: '  ' }] })] })), /sections/i);
    assertError(errorsFor(doc({ techProjects: [fixtureTechProject({ technologies: ['Node', ''] })] })), /technologies/i);
  });

  it('keeps an empty art project out of publication until it holds a published piece', () => {
    assertError(errorsFor(doc({ artProjects: [fixtureArtProject()] })), /published piece/i);

    const draftMember = fixturePiece({ state: 'draft', projectId: 'art-project-fixture-1' });
    assertError(
      errorsFor(doc({ artPieces: [draftMember], artProjects: [fixtureArtProject({ pieceIds: [draftMember.id] })] })),
      /published piece/i,
    );

    const { piece, project } = linkedArtFixture();
    assertNoErrors(errorsFor(doc({ artPieces: [piece], artProjects: [project] })));
  });

  it('rejects a published art project with no pieceIds field at all', () => {
    const { pieceIds, ...withoutMembers } = fixtureArtProject();
    assertError(errorsFor(doc({ artProjects: [withoutMembers] })), /published piece/i);
  });

  it('accepts a draft art project with no pieces', () => {
    assertNoErrors(errorsFor(doc({ artProjects: [fixtureArtProject({ state: 'draft' })] })));
  });

  it('rejects a year that is not a string', () => {
    assertError(errorsFor(doc({ artPieces: [fixturePiece({ year: 2024 })] })), /year/i);
    assertNoErrors(errorsFor(doc({ artPieces: [fixturePiece({ year: '2019–2021' })] })));
  });
});

/* ------------------------------------------------------------------ *
 * validatePortfolio — membership and styles
 * ------------------------------------------------------------------ */

describe('validatePortfolio: membership and styles', () => {
  it('rejects a piece pointing at an unknown project', () => {
    assertError(errorsFor(doc({ artPieces: [fixturePiece({ projectId: 'art-project-missing' })] })), /projectId/i);
  });

  it('rejects a project listing an unknown piece', () => {
    assertError(errorsFor(doc({ artProjects: [fixtureArtProject({ pieceIds: ['piece-missing'] })] })), /pieceIds/i);
  });

  it('requires membership to agree in both directions', () => {
    const orphanMember = errorsFor(doc({
      artPieces: [fixturePiece()],
      artProjects: [fixtureArtProject({ pieceIds: ['piece-fixture-1'] })],
    }));
    assertError(orphanMember, /projectId|member/i);

    const unlistedMember = errorsFor(doc({
      artPieces: [fixturePiece({ projectId: 'art-project-fixture-1' })],
      artProjects: [fixtureArtProject({ pieceIds: [] })],
    }));
    assertError(unlistedMember, /pieceIds|member/i);
  });

  it('rejects duplicate members and a piece claimed by two projects', () => {
    const piece = fixturePiece({ projectId: 'art-project-fixture-1' });
    assertError(
      errorsFor(doc({ artPieces: [piece], artProjects: [fixtureArtProject({ pieceIds: [piece.id, piece.id] })] })),
      /duplicate|twice/i,
    );

    assertError(
      errorsFor(doc({
        artPieces: [piece],
        artProjects: [
          fixtureArtProject({ pieceIds: [piece.id] }),
          fixtureArtProject({ id: 'art-project-fixture-2', slug: 'fixture-series-two', pieceIds: [piece.id] }),
        ],
      })),
      /project/i,
    );
  });

  it('rejects unknown, duplicated and malformed style references', () => {
    assertError(errorsFor(doc({ artPieces: [fixturePiece({ styleIds: ['style-missing'] })] })), /styleIds|style/i);
    assertError(
      errorsFor(doc({ styles: [{ id: 'style-a', name: 'Fixture Style' }, { id: 'style-a', name: 'Fixture Style Again' }] })),
      /style/i,
    );
    assertError(
      errorsFor(doc({
        styles: [{ id: 'style-a', name: 'Fixture Style' }],
        artPieces: [fixturePiece({ styleIds: ['style-a', 'style-a'] })],
      })),
      /duplicate|twice/i,
    );
    assertError(errorsFor(doc({ styles: [{ id: 'style-a', name: '  ' }] })), /name/i);
  });

  it('accepts a piece carrying valid styles and no project', () => {
    assertNoErrors(errorsFor(doc({
      styles: [{ id: 'style-a', name: 'Fixture Style', description: 'Fixture description.' }],
      artPieces: [fixturePiece({ styleIds: ['style-a'], medium: 'Fixture medium', dimensions: '24 × 36 in', caption: 'Fixture caption.' })],
    })));
  });
});

/* ------------------------------------------------------------------ *
 * validatePortfolio — curation and contacts
 * ------------------------------------------------------------------ */

describe('validatePortfolio: curation', () => {
  const published = () => {
    const { piece, project } = linkedArtFixture();
    return { piece, project, tech: fixtureTechProject() };
  };

  it('accepts a project and one of its own pieces as separate favorites', () => {
    const { piece, project, tech } = published();
    assertNoErrors(errorsFor(doc({
      artPieces: [piece],
      artProjects: [project],
      techProjects: [tech],
      artFavorites: [
        { type: 'art-project', id: project.id, order: 0 },
        { type: 'piece', id: piece.id, order: 1 },
      ],
      techStarred: [{ id: tech.id, order: 0 }],
    })));
  });

  it('rejects a favorite whose target is missing, drafted or of the wrong type', () => {
    const { piece, project } = published();
    const base = { artPieces: [piece], artProjects: [project] };

    assertError(errorsFor(doc({ ...base, artFavorites: [{ type: 'piece', id: 'piece-missing', order: 0 }] })), /artFavorites/);
    assertError(
      errorsFor(doc({
        artPieces: [{ ...piece, state: 'draft' }],
        artProjects: [{ ...project, state: 'draft' }],
        artFavorites: [{ type: 'piece', id: piece.id, order: 0 }],
      })),
      /draft|published/i,
    );
    assertError(errorsFor(doc({ ...base, artFavorites: [{ type: 'piece', id: project.id, order: 0 }] })), /artFavorites/);
    assertError(errorsFor(doc({ ...base, artFavorites: [{ type: 'tech-project', id: project.id, order: 0 }] })), /type/i);
  });

  it('rejects duplicate favorite references and duplicate or non-integer orders', () => {
    const { piece, project } = published();
    const base = { artPieces: [piece], artProjects: [project] };

    assertError(
      errorsFor(doc({ ...base, artFavorites: [{ type: 'piece', id: piece.id, order: 0 }, { type: 'piece', id: piece.id, order: 1 }] })),
      /duplicate|twice/i,
    );
    assertError(
      errorsFor(doc({
        ...base,
        artFavorites: [{ type: 'piece', id: piece.id, order: 0 }, { type: 'art-project', id: project.id, order: 0 }],
      })),
      /order/i,
    );
    assertError(errorsFor(doc({ ...base, artFavorites: [{ type: 'piece', id: piece.id, order: '0' }] })), /order/i);
  });

  it('applies the same rules to tech starred entries', () => {
    const tech = fixtureTechProject();
    assertError(errorsFor(doc({ techProjects: [tech], techStarred: [{ id: 'tech-missing', order: 0 }] })), /techStarred/);
    assertError(
      errorsFor(doc({ techProjects: [{ ...tech, state: 'draft' }], techStarred: [{ id: tech.id, order: 0 }] })),
      /draft|published/i,
    );
    assertError(
      errorsFor(doc({ techProjects: [tech], techStarred: [{ id: tech.id, order: 0 }, { id: tech.id, order: 1 }] })),
      /duplicate|twice/i,
    );
  });

  it('rejects a techStarred entry carrying a type that disagrees with the collection', () => {
    const tech = fixtureTechProject();
    assertError(
      errorsFor(doc({ techProjects: [tech], techStarred: [{ type: 'piece', id: tech.id, order: 0 }] })),
      /type/i,
    );
    assertNoErrors(
      errorsFor(doc({ techProjects: [tech], techStarred: [{ type: 'tech-project', id: tech.id, order: 0 }] })),
    );
  });

  it('validates contacts and rejects unsafe destinations', () => {
    assertNoErrors(errorsFor(doc({
      contacts: [
        { label: 'Email', url: 'mailto:fixture@example.com' },
        { label: 'Phone', url: 'tel:+15550100' },
        { label: 'Site', url: 'https://example.com/fixture' },
      ],
    })));
    assertError(errorsFor(doc({ contacts: [{ label: 'Bad', url: 'javascript:alert(1)' }] })), /contacts/);
    assertError(errorsFor(doc({ contacts: [{ label: '  ', url: 'https://example.com' }] })), /label/i);
  });
});

/* ------------------------------------------------------------------ *
 * publishedPortfolio
 * ------------------------------------------------------------------ */

describe('publishedPortfolio', () => {
  it('omits draft records from every collection', () => {
    const source = doc({
      artPieces: [fixturePiece(), fixturePiece({ id: 'piece-fixture-2', slug: 'fixture-two', state: 'draft' })],
      techProjects: [fixtureTechProject(), fixtureTechProject({ id: 'tech-2', slug: 'fixture-two', state: 'draft' })],
    });
    const view = publishedPortfolio(source);
    assert.deepStrictEqual(view.artPieces.map((p) => p.id), ['piece-fixture-1']);
    assert.deepStrictEqual(view.techProjects.map((p) => p.id), ['tech-project-fixture-1']);
  });

  it('drops an art project with no published pieces and filters membership to published pieces', () => {
    const kept = fixturePiece({ projectId: 'art-project-fixture-1' });
    const hidden = fixturePiece({ id: 'piece-fixture-2', slug: 'fixture-two', state: 'draft', projectId: 'art-project-fixture-1' });
    const emptyProject = fixtureArtProject({ id: 'art-project-fixture-2', slug: 'fixture-empty', pieceIds: [] });

    const view = publishedPortfolio(doc({
      artPieces: [kept, hidden],
      artProjects: [fixtureArtProject({ pieceIds: [hidden.id, kept.id] }), emptyProject],
    }));

    assert.deepStrictEqual(view.artProjects.map((p) => p.id), ['art-project-fixture-1']);
    assert.deepStrictEqual(view.artProjects[0].pieceIds, [kept.id]);
  });

  it('keeps a published piece but drops its link to an unpublished project', () => {
    const piece = fixturePiece({ projectId: 'art-project-fixture-1' });
    const view = publishedPortfolio(doc({
      artPieces: [piece],
      artProjects: [fixtureArtProject({ state: 'draft', pieceIds: [piece.id] })],
    }));
    assert.equal(view.artPieces.length, 1);
    assert.equal(view.artPieces[0].projectId, undefined);
    assert.deepStrictEqual(view.artProjects, []);
  });

  it('sorts curated entries and removes references to records it dropped', () => {
    const { piece, project } = linkedArtFixture();
    const draftPiece = fixturePiece({ id: 'piece-fixture-2', slug: 'fixture-two', state: 'draft' });
    const tech = fixtureTechProject();
    const view = publishedPortfolio(doc({
      artPieces: [piece, draftPiece],
      artProjects: [project],
      techProjects: [tech, fixtureTechProject({ id: 'tech-2', slug: 'fixture-two', state: 'draft' })],
      artFavorites: [
        { type: 'piece', id: draftPiece.id, order: 0 },
        { type: 'piece', id: piece.id, order: 9 },
        { type: 'art-project', id: project.id, order: 2 },
      ],
      techStarred: [{ id: 'tech-2', order: 0 }, { id: tech.id, order: 5 }],
    }));

    assert.deepStrictEqual(view.artFavorites.map((f) => [f.type, f.id]), [
      ['art-project', project.id],
      ['piece', piece.id],
    ]);
    assert.deepStrictEqual(view.techStarred.map((s) => s.id), [tech.id]);
  });

  it('strips authoring provenance and normalises optional arrays', () => {
    const view = publishedPortfolio(doc({
      artPieces: [fixturePiece({ sourceSubmissionId: '9f0a2c3e-0000-4000-8000-000000000001' })],
      techProjects: [fixtureTechProject({ sourceSubmissionId: '9f0a2c3e-0000-4000-8000-000000000002' })],
    }));
    assert.equal('sourceSubmissionId' in view.artPieces[0], false);
    assert.equal('sourceSubmissionId' in view.techProjects[0], false);
    assert.deepStrictEqual(view.artPieces[0].styleIds, []);
    assert.deepStrictEqual(view.techProjects[0].screenshots, []);
    assert.deepStrictEqual(view.techProjects[0].sections, []);
    assert.deepStrictEqual(view.techProjects[0].technologies, []);
  });

  it('defensively drops records and fields that could not be rendered safely', () => {
    const view = publishedPortfolio(doc({
      artPieces: [
        fixturePiece({ id: 'piece-unsafe', slug: 'fixture-unsafe', image: fixtureImage({ src: 'javascript:alert(1)' }) }),
        fixturePiece({ id: 'piece-nodims', slug: 'fixture-nodims', image: { src: 'assets/fixture.jpg', alt: 'Fixture: a wall' } }),
        fixturePiece({ styleIds: ['style-missing'] }),
      ],
      techProjects: [
        fixtureTechProject({
          liveUrl: 'javascript:alert(1)',
          repositoryUrl: 'https://example.com/repo',
          sections: [{ title: 'Overview', body: 'Fixture body.' }, { title: 'Empty', body: '   ' }],
          technologies: ['Node', ''],
          screenshots: [fixtureImage(), { src: 'javascript:alert(1)', alt: 'x', width: 10, height: 10 }],
        }),
      ],
      contacts: [{ label: 'Bad', url: 'javascript:alert(1)' }, { label: 'Email', url: 'mailto:fixture@example.com' }],
    }));

    assert.deepStrictEqual(view.artPieces.map((p) => p.id), ['piece-fixture-1']);
    assert.deepStrictEqual(view.artPieces[0].styleIds, []);
    const tech = view.techProjects[0];
    assert.equal(tech.liveUrl, undefined);
    assert.equal(tech.repositoryUrl, 'https://example.com/repo');
    assert.deepStrictEqual(tech.sections.map((s) => s.title), ['Overview']);
    assert.deepStrictEqual(tech.technologies, ['Node']);
    assert.equal(tech.screenshots.length, 1);
    assert.deepStrictEqual(view.contacts.map((c) => c.label), ['Email']);
  });

  it('never mutates the source document and tolerates malformed input', () => {
    const source = doc({ artPieces: [fixturePiece()], artFavorites: [{ type: 'piece', id: 'piece-fixture-1', order: 0 }] });
    assertPure(source, () => publishedPortfolio(source));
    assert.deepStrictEqual(publishedPortfolio(null), createEmptyPortfolio());
    assert.deepStrictEqual(publishedPortfolio({ artPieces: 'nope' }), createEmptyPortfolio());
  });
});

/* ------------------------------------------------------------------ *
 * setPublication
 * ------------------------------------------------------------------ */

describe('setPublication', () => {
  it('publishes a complete draft without touching the input document', () => {
    const source = doc({ artPieces: [fixturePiece({ state: 'draft' })] });
    let next;
    assertPure(source, () => { next = setPublication(source, 'piece', 'piece-fixture-1', 'published'); });
    assert.equal(next.artPieces[0].state, 'published');
    assertNoErrors(validatePortfolio(next));
  });

  it('refuses to publish an incomplete record and explains why', () => {
    const source = doc({ artPieces: [{ id: 'piece-draft', slug: 'fixture-draft', state: 'draft' }] });
    assert.throws(() => setPublication(source, 'piece', 'piece-draft', 'published'), /publish/i);

    const emptyProject = doc({ artProjects: [fixtureArtProject({ state: 'draft' })] });
    assert.throws(() => setPublication(emptyProject, 'art-project', 'art-project-fixture-1', 'published'), /published piece/i);
  });

  it('removes curated references when a record is unpublished but keeps the record', () => {
    const source = doc({
      artPieces: [fixturePiece()],
      artFavorites: [{ type: 'piece', id: 'piece-fixture-1', order: 0 }],
    });
    const next = setPublication(source, 'piece', 'piece-fixture-1', 'draft');
    assert.deepStrictEqual(next.artFavorites, []);
    assert.equal(next.artPieces.length, 1);
    assert.equal(next.artPieces[0].state, 'draft');
    assertNoErrors(validatePortfolio(next));
  });

  it('returns an art project to draft and drops its favorite when its last published piece is unpublished', () => {
    const { piece, project } = linkedArtFixture();
    const source = doc({
      artPieces: [piece],
      artProjects: [project],
      artFavorites: [{ type: 'art-project', id: project.id, order: 0 }, { type: 'piece', id: piece.id, order: 1 }],
    });
    const next = setPublication(source, 'piece', piece.id, 'draft');
    assert.equal(next.artProjects[0].state, 'draft');
    assert.deepStrictEqual(next.artProjects[0].pieceIds, [piece.id]);
    assert.deepStrictEqual(next.artFavorites, []);
    assertNoErrors(validatePortfolio(next));
  });

  it('rejects unknown records, types and states', () => {
    const source = doc({ artPieces: [fixturePiece()] });
    assert.throws(() => setPublication(source, 'piece', 'piece-missing', 'draft'), /not found|unknown/i);
    assert.throws(() => setPublication(source, 'photo', 'piece-fixture-1', 'draft'), /type/i);
    assert.throws(() => setPublication(source, 'piece', 'piece-fixture-1', 'archived'), /state/i);
  });

  it('wraps a cyclic document clone failure in an explanatory Error, not a raw TypeError', () => {
    const cyclic = doc({ artPieces: [fixturePiece()] });
    cyclic.self = cyclic;
    assert.throws(
      () => setPublication(cyclic, 'piece', 'piece-fixture-1', 'draft'),
      (err) => {
        assert.ok(err instanceof Error);
        assert.equal(err instanceof TypeError, false, 'must not leak the raw JSON.stringify TypeError');
        assert.match(err.message, /circular|clone/i);
        return true;
      },
    );
  });
});

/* ------------------------------------------------------------------ *
 * toggleCurated
 * ------------------------------------------------------------------ */

describe('toggleCurated', () => {
  it('adds a favorite at the end of the curated order and removes it on the second call', () => {
    const { piece, project } = linkedArtFixture();
    const source = doc({
      artPieces: [piece],
      artProjects: [project],
      artFavorites: [{ type: 'art-project', id: project.id, order: 0 }],
    });

    let added;
    assertPure(source, () => { added = toggleCurated(source, 'piece', piece.id); });
    assert.deepStrictEqual(added.artFavorites, [
      { type: 'art-project', id: project.id, order: 0 },
      { type: 'piece', id: piece.id, order: 1 },
    ]);
    assertNoErrors(validatePortfolio(added));

    const removed = toggleCurated(added, 'piece', piece.id);
    assert.deepStrictEqual(removed.artFavorites, [{ type: 'art-project', id: project.id, order: 0 }]);
    assert.equal(removed.artPieces.length, 1, 'the source record survives unfavoriting');
    assert.equal(removed.artPieces[0].state, 'published');
  });

  it('keeps piece and project favorites independent', () => {
    const { piece, project } = linkedArtFixture();
    const source = doc({ artPieces: [piece], artProjects: [project] });
    const next = toggleCurated(source, 'art-project', project.id);
    assert.deepStrictEqual(next.artFavorites.map((f) => f.type), ['art-project']);
  });

  it('curates tech projects into techStarred only', () => {
    const tech = fixtureTechProject();
    const next = toggleCurated(doc({ techProjects: [tech] }), 'tech-project', tech.id);
    assert.deepStrictEqual(next.techStarred, [{ id: tech.id, order: 0 }]);
    assert.deepStrictEqual(next.artFavorites, []);
  });

  it('renumbers the remaining curated order after a removal', () => {
    const { piece, project } = linkedArtFixture();
    const second = fixturePiece({ id: 'piece-fixture-2', slug: 'fixture-two' });
    const source = doc({
      artPieces: [piece, second],
      artProjects: [project],
      artFavorites: [
        { type: 'art-project', id: project.id, order: 0 },
        { type: 'piece', id: piece.id, order: 1 },
        { type: 'piece', id: second.id, order: 2 },
      ],
    });
    const next = toggleCurated(source, 'piece', piece.id);
    assert.deepStrictEqual(next.artFavorites, [
      { type: 'art-project', id: project.id, order: 0 },
      { type: 'piece', id: second.id, order: 1 },
    ]);
  });

  it('refuses to curate drafts and unknown records', () => {
    const source = doc({ artPieces: [fixturePiece({ state: 'draft' })] });
    assert.throws(() => toggleCurated(source, 'piece', 'piece-fixture-1'), /draft|publish/i);
    assert.throws(() => toggleCurated(source, 'piece', 'piece-missing'), /not found|unknown/i);
    assert.throws(() => toggleCurated(source, 'photo', 'piece-fixture-1'), /type/i);
  });
});

/* ------------------------------------------------------------------ *
 * moveCurated
 * ------------------------------------------------------------------ */

describe('moveCurated', () => {
  const curated = () => {
    const { piece, project } = linkedArtFixture();
    const second = fixturePiece({ id: 'piece-fixture-2', slug: 'fixture-two' });
    const tech = fixtureTechProject();
    return doc({
      artPieces: [piece, second],
      artProjects: [project],
      techProjects: [tech, fixtureTechProject({ id: 'tech-2', slug: 'fixture-two' })],
      artFavorites: [
        { type: 'art-project', id: project.id, order: 0 },
        { type: 'piece', id: piece.id, order: 1 },
        { type: 'piece', id: second.id, order: 2 },
      ],
      techStarred: [{ id: tech.id, order: 0 }, { id: 'tech-2', order: 1 }],
    });
  };

  it('moves an entry up and down within its own collection', () => {
    const source = curated();
    let next;
    assertPure(source, () => { next = moveCurated(source, 'artFavorites', 2, 'up'); });
    assert.deepStrictEqual(next.artFavorites.map((f) => f.id), ['art-project-fixture-1', 'piece-fixture-2', 'piece-fixture-1']);
    assert.deepStrictEqual(next.artFavorites.map((f) => f.order), [0, 1, 2]);
    assertNoErrors(validatePortfolio(next));

    const down = moveCurated(source, 'artFavorites', 0, 'down');
    assert.deepStrictEqual(down.artFavorites.map((f) => f.id), ['piece-fixture-1', 'art-project-fixture-1', 'piece-fixture-2']);
  });

  it('leaves the other curated collection untouched', () => {
    const source = curated();
    const next = moveCurated(source, 'techStarred', 1, 'up');
    assert.deepStrictEqual(next.techStarred.map((s) => s.id), ['tech-2', 'tech-project-fixture-1']);
    assert.deepStrictEqual(next.artFavorites, source.artFavorites);
  });

  it('rejects out-of-range moves, unknown collections and unknown directions', () => {
    const source = curated();
    assert.throws(() => moveCurated(source, 'artFavorites', 0, 'up'), /first|range|move/i);
    assert.throws(() => moveCurated(source, 'artFavorites', 2, 'down'), /last|range|move/i);
    assert.throws(() => moveCurated(source, 'artFavorites', 7, 'up'), /range|index/i);
    assert.throws(() => moveCurated(source, 'artFavorites', 1.5, 'up'), /index/i);
    assert.throws(() => moveCurated(source, 'artPieces', 1, 'up'), /collection/i);
    assert.throws(() => moveCurated(source, 'artFavorites', 1, 'sideways'), /direction/i);
    assert.throws(() => moveCurated(doc(), 'techStarred', 0, 'up'), /empty|range/i);
  });
});

/* ------------------------------------------------------------------ *
 * removeRecord
 * ------------------------------------------------------------------ */

describe('removeRecord', () => {
  it('removes a piece, its favorite and its project membership', () => {
    const { piece, project } = linkedArtFixture();
    const second = fixturePiece({ id: 'piece-fixture-2', slug: 'fixture-two', projectId: project.id });
    const source = doc({
      artPieces: [piece, second],
      artProjects: [fixtureArtProject({ pieceIds: [piece.id, second.id] })],
      artFavorites: [{ type: 'piece', id: piece.id, order: 0 }, { type: 'art-project', id: project.id, order: 1 }],
    });

    let next;
    assertPure(source, () => { next = removeRecord(source, 'piece', piece.id); });
    assert.deepStrictEqual(next.artPieces.map((p) => p.id), [second.id]);
    assert.deepStrictEqual(next.artProjects[0].pieceIds, [second.id]);
    assert.deepStrictEqual(next.artFavorites, [{ type: 'art-project', id: project.id, order: 0 }]);
    assertNoErrors(validatePortfolio(next));
  });

  it('returns a project to draft and drops its favorite when its last published piece is deleted', () => {
    const { piece, project } = linkedArtFixture();
    const source = doc({
      artPieces: [piece],
      artProjects: [project],
      artFavorites: [{ type: 'art-project', id: project.id, order: 0 }],
    });
    const next = removeRecord(source, 'piece', piece.id);
    assert.deepStrictEqual(next.artProjects[0].pieceIds, []);
    assert.equal(next.artProjects[0].state, 'draft');
    assert.deepStrictEqual(next.artFavorites, []);
    assertNoErrors(validatePortfolio(next));
  });

  it('keeps member pieces when a project is deleted and clears their membership', () => {
    const { piece, project } = linkedArtFixture();
    const source = doc({
      artPieces: [piece],
      artProjects: [project],
      artFavorites: [{ type: 'art-project', id: project.id, order: 0 }, { type: 'piece', id: piece.id, order: 1 }],
    });
    const next = removeRecord(source, 'art-project', project.id);
    assert.deepStrictEqual(next.artProjects, []);
    assert.equal(next.artPieces.length, 1);
    assert.equal(next.artPieces[0].projectId, undefined);
    assert.equal(next.artPieces[0].state, 'published');
    assert.deepStrictEqual(next.artFavorites, [{ type: 'piece', id: piece.id, order: 0 }]);
    assertNoErrors(validatePortfolio(next));
  });

  it('removes a tech project together with its starred entry', () => {
    const tech = fixtureTechProject();
    const other = fixtureTechProject({ id: 'tech-2', slug: 'fixture-two' });
    const source = doc({
      techProjects: [tech, other],
      techStarred: [{ id: tech.id, order: 0 }, { id: other.id, order: 1 }],
    });
    const next = removeRecord(source, 'tech-project', tech.id);
    assert.deepStrictEqual(next.techProjects.map((p) => p.id), [other.id]);
    assert.deepStrictEqual(next.techStarred, [{ id: other.id, order: 0 }]);
    assertNoErrors(validatePortfolio(next));
  });

  it('rejects unknown records and types', () => {
    const source = doc({ artPieces: [fixturePiece()] });
    assert.throws(() => removeRecord(source, 'piece', 'piece-missing'), /not found|unknown/i);
    assert.throws(() => removeRecord(source, 'photo', 'piece-fixture-1'), /type/i);
  });
});
