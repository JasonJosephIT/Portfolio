// Behavioural tests for the inbox → canonical importer (scripts/import-portfolio.mjs).
//
// FIXTURE NOTICE: every submission id, title, image path, alt string and byte
// sequence in this file is invented test scaffolding. None of it is Jason's real
// content and none of it may be copied into content/portfolio.json.
//
// Nothing here touches Supabase. The importer reads only the proposal file it is
// given, and its one optional network call is injected so the suite stays offline.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createEmptyPortfolio, validatePortfolio } from '../lib/portfolio-content.mjs';
import { runImport } from '../scripts/import-portfolio.mjs';

/* ------------------------------------------------------------------ *
 * FIXTURE scaffolding
 * ------------------------------------------------------------------ */

/** Bytes that stand in for an uploaded original; the import must not touch them. */
const FIXTURE_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x46, 0x49, 0x58, 0x54]);

const fixtureProposal = (over = {}) => ({
  id: 'fixture-submission-1',
  kind: 'photo',
  title: 'Fixture Harbour',
  image_path: 'photo/Café Bar.JPG',
  layout: {
    schemaVersion: 1,
    mode: 'structured',
    record: {
      type: 'piece',
      title: 'Fixture Harbour',
      image: {
        src: 'assets/fixture-harbour.jpg',
        alt: 'Fixture: masts against a pale sky',
        width: 1600,
        height: 1067,
      },
    },
  },
  ...over,
});

/** A throwaway repository root with a canonical document and an assets folder. */
async function makeRoot(document = createEmptyPortfolio()) {
  const root = await mkdtemp(join(tmpdir(), 'portfolio-import-'));
  await mkdir(join(root, 'content'), { recursive: true });
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(join(root, 'content', 'portfolio.json'), `${JSON.stringify(document, null, 2)}\n`);
  return root;
}

const cleanup = (dir) => rm(dir, { recursive: true, force: true });

async function writeInput(root, payload) {
  const path = join(root, 'proposals.json');
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`);
  return path;
}

const readCanonical = async (root) => JSON.parse(await readFile(join(root, 'content', 'portfolio.json'), 'utf8'));

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

/** A fetch that must never be called; proves the importer stays offline. */
const forbiddenFetch = () => {
  throw new Error('the importer must not reach the network here');
};

/* ------------------------------------------------------------------ *
 * Importing
 * ------------------------------------------------------------------ */

describe('runImport — a supplied proposal becomes a canonical draft', () => {
  it('writes one draft record carrying its source submission id', async () => {
    const root = await makeRoot();
    try {
      const input = await writeInput(root, fixtureProposal());
      const result = await runImport({ root, input, fetchImpl: forbiddenFetch });
      assert.deepEqual(result.errors, [], result.errors.join('\n'));
      assert.equal(result.ok, true);
      assert.equal(result.imported.length, 1);

      const document = await readCanonical(root);
      assert.equal(document.artPieces.length, 1);
      assert.equal(document.artPieces[0].state, 'draft');
      assert.equal(document.artPieces[0].sourceSubmissionId, 'fixture-submission-1');
      assert.deepEqual(validatePortfolio(document), []);
    } finally {
      await cleanup(root);
    }
  });

  it('enters a record as a draft even when the proposal claims publication', async () => {
    const root = await makeRoot();
    try {
      const proposal = fixtureProposal();
      proposal.layout.record.state = 'published';
      const input = await writeInput(root, proposal);
      await runImport({ root, input, fetchImpl: forbiddenFetch });
      assert.equal((await readCanonical(root)).artPieces[0].state, 'draft');
    } finally {
      await cleanup(root);
    }
  });

  it('accepts one object, an array, or a {records: []} envelope', async () => {
    for (const payload of [
      fixtureProposal(),
      [fixtureProposal()],
      { records: [fixtureProposal()] },
    ]) {
      const root = await makeRoot();
      try {
        const input = await writeInput(root, payload);
        const result = await runImport({ root, input, fetchImpl: forbiddenFetch });
        assert.deepEqual(result.errors, [], JSON.stringify(payload).slice(0, 60));
        assert.equal((await readCanonical(root)).artPieces.length, 1);
      } finally {
        await cleanup(root);
      }
    }
  });

  it('writes into --content so a temporary document can be imported into', async () => {
    const root = await makeRoot();
    try {
      const content = join(root, 'scratch.json');
      await writeFile(content, `${JSON.stringify(createEmptyPortfolio(), null, 2)}\n`);
      const input = await writeInput(root, fixtureProposal());
      const result = await runImport({ root, content, input, fetchImpl: forbiddenFetch });
      assert.deepEqual(result.errors, []);
      assert.equal(JSON.parse(await readFile(content, 'utf8')).artPieces.length, 1);
      assert.equal((await readCanonical(root)).artPieces.length, 0, 'the default document is untouched');
    } finally {
      await cleanup(root);
    }
  });
});

describe('runImport — idempotency', () => {
  it('adds nothing on a second import of the same submission', async () => {
    const root = await makeRoot();
    try {
      const input = await writeInput(root, fixtureProposal());
      await runImport({ root, input, fetchImpl: forbiddenFetch });
      const first = await readCanonical(root);

      const again = await runImport({ root, input, fetchImpl: forbiddenFetch });
      assert.deepEqual(again.errors, []);
      assert.equal(again.imported.length, 0);
      assert.equal(again.skipped.length, 1);
      assert.deepEqual(await readCanonical(root), first, 'the document is byte-for-byte the same shape');
    } finally {
      await cleanup(root);
    }
  });

  it('preserves record ids and curated references a local edit added', async () => {
    const root = await makeRoot();
    try {
      const input = await writeInput(root, fixtureProposal());
      await runImport({ root, input, fetchImpl: forbiddenFetch });

      // Jason publishes and favorites the imported draft locally.
      const edited = await readCanonical(root);
      const id = edited.artPieces[0].id;
      edited.artPieces[0].state = 'published';
      edited.artFavorites = [{ type: 'piece', id, order: 0 }];
      await writeFile(join(root, 'content', 'portfolio.json'), `${JSON.stringify(edited, null, 2)}\n`);

      await runImport({ root, input, fetchImpl: forbiddenFetch });
      const after = await readCanonical(root);
      assert.equal(after.artPieces.length, 1);
      assert.equal(after.artPieces[0].id, id);
      assert.equal(after.artPieces[0].state, 'published');
      assert.deepEqual(after.artFavorites, [{ type: 'piece', id, order: 0 }]);
    } finally {
      await cleanup(root);
    }
  });
});

describe('runImport — malformed input', () => {
  it('reports unreadable JSON and writes nothing', async () => {
    const root = await makeRoot();
    try {
      const input = join(root, 'proposals.json');
      await writeFile(input, '{ not json');
      const before = await readFile(join(root, 'content', 'portfolio.json'), 'utf8');
      const result = await runImport({ root, input, fetchImpl: forbiddenFetch });
      assert.equal(result.ok, false);
      assert.ok(result.errors.some((error) => /not valid JSON/i.test(error)), result.errors.join('\n'));
      assert.equal(await readFile(join(root, 'content', 'portfolio.json'), 'utf8'), before);
    } finally {
      await cleanup(root);
    }
  });

  it('refuses a missing input file with a usable message', async () => {
    const root = await makeRoot();
    try {
      const result = await runImport({ root, input: join(root, 'absent.json'), fetchImpl: forbiddenFetch });
      assert.equal(result.ok, false);
      assert.ok(result.errors.some((error) => error.includes('absent.json')), result.errors.join('\n'));
    } finally {
      await cleanup(root);
    }
  });

  it('never reinterprets a legacy drag-placement layout as a structured record', async () => {
    const root = await makeRoot();
    try {
      const input = await writeInput(root, {
        id: 'fixture-submission-1',
        kind: 'photo',
        title: 'Fixture Harbour',
        image_path: 'photo/fixture.jpg',
        layout: {
          page: 'art.html',
          container: '.gallery',
          after_selector: '.gallery > :nth-child(2)',
          x_pct: 12.5,
          y_px: 40,
          width_pct: 40,
          free_position: true,
        },
      });
      const result = await runImport({ root, input, fetchImpl: forbiddenFetch });
      assert.equal(result.ok, false);
      assert.ok(result.errors.some((error) => /legacy drag placement/i.test(error)), result.errors.join('\n'));
      assert.equal((await readCanonical(root)).artPieces.length, 0);
    } finally {
      await cleanup(root);
    }
  });
});

describe('runImport — atomicity', () => {
  it('applies nothing when one proposal in the file is bad', async () => {
    const root = await makeRoot();
    try {
      const before = await readFile(join(root, 'content', 'portfolio.json'), 'utf8');
      const input = await writeInput(root, [
        fixtureProposal(),
        fixtureProposal({ id: 'fixture-submission-2', layout: { schemaVersion: 1, mode: 'structured' } }),
      ]);
      const result = await runImport({ root, input, fetchImpl: forbiddenFetch });
      assert.equal(result.ok, false);
      assert.equal(result.imported.length, 0);
      assert.equal(await readFile(join(root, 'content', 'portfolio.json'), 'utf8'), before, 'the good half is not written');
    } finally {
      await cleanup(root);
    }
  });

  it('leaves no temporary file behind when the last write fails', async () => {
    const root = await makeRoot();
    const canonical = join(root, 'content', 'portfolio.json');
    try {
      const input = await writeInput(root, fixtureProposal({ image_url: 'https://example.invalid/fixture.jpg' }));
      // Every refusal a proposal can cause happens before the temporary file
      // exists, so a bad proposal never exercises this cleanup at all. The
      // fetch — the last thing that runs before the document is written — puts
      // a directory where the canonical file was, so the temporary file really
      // is written and the rename that would publish it fails.
      const fetchImpl = async () => {
        await rm(canonical);
        await mkdir(canonical);
        return new Response(FIXTURE_BYTES, { status: 200 });
      };
      const result = await runImport({ root, input, download: true, fetchImpl });

      assert.equal(result.ok, false);
      // Only a throw from the write or the rename produces this message, so it
      // is the proof that the run got past writing the temporary file.
      assert.ok(
        result.errors.some((error) => error.includes('rolled back')),
        result.errors.join('\n'),
      );
      assert.equal(await exists(`${canonical}.tmp`), false, 'the temporary file is cleaned up');
      assert.equal(
        await exists(join(root, 'assets', 'cafe-bar-fixture-submission-1.jpg')),
        false,
        'and so is the asset the failed run downloaded',
      );
    } finally {
      await cleanup(root);
    }
  });
});

describe('runImport — image handling', () => {
  it('uses the explicitly supplied local image and leaves its bytes alone', async () => {
    const root = await makeRoot();
    try {
      await writeFile(join(root, 'assets', 'fixture-harbour.jpg'), FIXTURE_BYTES);
      const input = await writeInput(root, fixtureProposal({ local_image: 'assets/fixture-harbour.jpg' }));
      const result = await runImport({ root, input, fetchImpl: forbiddenFetch });
      assert.deepEqual(result.errors, []);

      const { image } = (await readCanonical(root)).artPieces[0];
      assert.equal(image.src, 'assets/fixture-harbour.jpg');
      assert.equal(image.alt, 'Fixture: masts against a pale sky');
      assert.equal(image.width, 1600);
      assert.deepEqual(await readFile(join(root, 'assets', 'fixture-harbour.jpg')), FIXTURE_BYTES);
    } finally {
      await cleanup(root);
    }
  });

  it('refuses a local image that is not on disk rather than referencing a hole', async () => {
    const root = await makeRoot();
    try {
      const input = await writeInput(root, fixtureProposal({ local_image: 'assets/absent.jpg' }));
      const result = await runImport({ root, input, fetchImpl: forbiddenFetch });
      assert.equal(result.ok, false);
      assert.ok(result.errors.some((error) => error.includes('assets/absent.jpg')), result.errors.join('\n'));
    } finally {
      await cleanup(root);
    }
  });

  it('warns when it imports a record whose image is nowhere in the working tree', async () => {
    const root = await makeRoot();
    try {
      // No local_image and no --download: the record still imports, carrying a
      // src nobody has put a file at. Silence here means the first sign of it
      // is the "Image unavailable" frame on a page.
      const input = await writeInput(root, fixtureProposal());
      const result = await runImport({ root, input, fetchImpl: forbiddenFetch });
      assert.equal(result.ok, true, result.errors.join('\n'));
      assert.ok(
        result.warnings.some((warning) => warning.includes('fixture-submission-1') && warning.includes('local_image')),
        result.warnings.join('\n'),
      );
    } finally {
      await cleanup(root);
    }
  });

  it('refuses to fetch an image_url that is not a safe http address', async () => {
    const root = await makeRoot();
    try {
      for (const url of ['javascript:alert(1)', 'data:image/svg+xml,<svg onload=alert(1)>', 'file:///etc/passwd']) {
        const input = await writeInput(root, fixtureProposal({ image_url: url }));
        const result = await runImport({ root, input, download: true, fetchImpl: forbiddenFetch });
        assert.equal(result.ok, false, url);
        assert.ok(result.errors.some((error) => error.includes('not a safe http or https address')), url);
      }
    } finally {
      await cleanup(root);
    }
  });

  it('refuses to download an SVG, which would be a scriptable same-origin document', async () => {
    const root = await makeRoot();
    try {
      const input = await writeInput(
        root,
        fixtureProposal({ image_path: 'photo/badge.svg', image_url: 'https://example.invalid/badge.svg' }),
      );
      const result = await runImport({ root, input, download: true, fetchImpl: forbiddenFetch });
      assert.equal(result.ok, false);
      assert.ok(result.errors.some((error) => /SVG/.test(error)), result.errors.join('\n'));
      assert.equal(await exists(join(root, 'assets', 'badge-fixture-submission-1.svg')), false);
    } finally {
      await cleanup(root);
    }
  });

  it('downloads only when asked, to an ASCII-slugified immutable id filename', async () => {
    const root = await makeRoot();
    try {
      const input = await writeInput(root, fixtureProposal({ image_url: 'https://example.invalid/fixture.jpg' }));
      const fetchImpl = async () => new Response(FIXTURE_BYTES, { status: 200 });
      const result = await runImport({ root, input, download: true, fetchImpl });
      assert.deepEqual(result.errors, [], result.errors.join('\n'));

      const local = 'assets/cafe-bar-fixture-submission-1.jpg';
      assert.equal((await readCanonical(root)).artPieces[0].image.src, local);
      assert.deepEqual(await readFile(join(root, local)), FIXTURE_BYTES, 'the fetched bytes are stored verbatim');
    } finally {
      await cleanup(root);
    }
  });

  it('aborts on a failed download, writing neither the asset nor the document', async () => {
    const root = await makeRoot();
    try {
      const before = await readFile(join(root, 'content', 'portfolio.json'), 'utf8');
      const input = await writeInput(root, fixtureProposal({ image_url: 'https://example.invalid/fixture.jpg' }));
      const fetchImpl = async () => new Response('nope', { status: 404 });
      const result = await runImport({ root, input, download: true, fetchImpl });
      assert.equal(result.ok, false);
      assert.ok(result.errors.some((error) => /404/.test(error)), result.errors.join('\n'));
      assert.equal(await readFile(join(root, 'content', 'portfolio.json'), 'utf8'), before);
      assert.equal(await exists(join(root, 'assets', 'cafe-bar-fixture-submission-1.jpg')), false);
    } finally {
      await cleanup(root);
    }
  });

  it('removes an asset it downloaded when a later proposal fails validation', async () => {
    const root = await makeRoot();
    try {
      // The second proposal is well formed enough to get past reading, so both
      // downloads really happen before it is refused. That is the only path on
      // which the rollback has an asset to delete.
      const second = fixtureProposal({ id: 'fixture-submission-2', image_url: 'https://example.invalid/second.jpg' });
      second.layout.record.projectId = 'art-project-fixture-1';
      const input = await writeInput(root, [fixtureProposal({ image_url: 'https://example.invalid/fixture.jpg' }), second]);

      const downloaded = [];
      const fetchImpl = async (url) => {
        downloaded.push(url);
        return new Response(FIXTURE_BYTES, { status: 200 });
      };
      const result = await runImport({ root, input, download: true, fetchImpl });

      assert.equal(downloaded.length, 2, 'both assets were written before the refusal');
      assert.equal(result.ok, false);
      assert.ok(result.errors.some((error) => error.includes('projectId')), result.errors.join('\n'));
      assert.equal(await exists(join(root, 'assets', 'cafe-bar-fixture-submission-1.jpg')), false);
      assert.equal(await exists(join(root, 'assets', 'cafe-bar-fixture-submission-2.jpg')), false);
      assert.equal((await readCanonical(root)).artPieces.length, 0);
    } finally {
      await cleanup(root);
    }
  });

  it('leaves an earlier import’s asset alone when a later run is refused', async () => {
    const root = await makeRoot();
    try {
      // The editor exports every ready_to_place row every time, so a second
      // import re-lists the submission the first one already placed. That asset
      // belongs to the earlier import and is still referenced by the canonical
      // document: refusing this run must neither re-download it nor delete it.
      const placed = fixtureProposal({ image_url: 'https://example.invalid/fixture.jpg' });
      const asset = join(root, 'assets', 'cafe-bar-fixture-submission-1.jpg');
      const downloaded = [];
      const fetchImpl = async (url) => {
        downloaded.push(url);
        return new Response(FIXTURE_BYTES, { status: 200 });
      };

      const first = await runImport({ root, input: await writeInput(root, placed), download: true, fetchImpl });
      assert.equal(first.ok, true, first.errors.join('\n'));
      assert.equal(await exists(asset), true, 'the first import saved its asset');

      const broken = fixtureProposal({ id: 'fixture-submission-2', image_url: 'https://example.invalid/second.jpg' });
      broken.layout.record.projectId = 'art-project-fixture-1';
      downloaded.length = 0;
      const second = await runImport({
        root,
        input: await writeInput(root, [placed, broken]),
        download: true,
        fetchImpl,
      });

      assert.equal(second.ok, false);
      assert.ok(second.errors.some((error) => error.includes('projectId')), second.errors.join('\n'));
      assert.equal(await exists(asset), true, 'the rollback deleted an asset this run did not create');
      assert.deepEqual(await readFile(asset), FIXTURE_BYTES, 'the earlier bytes are untouched');
      assert.deepEqual(downloaded, ['https://example.invalid/second.jpg'], 'an asset already on disk is not fetched again');
      assert.equal(await exists(join(root, 'assets', 'cafe-bar-fixture-submission-2.jpg')), false);

      const canonical = await readCanonical(root);
      assert.equal(canonical.artPieces.length, 1, 'the refused proposal added nothing');
      assert.equal(canonical.artPieces[0].image.src, 'assets/cafe-bar-fixture-submission-1.jpg');
    } finally {
      await cleanup(root);
    }
  });

  it('never downloads without the explicit flag, even when a url is supplied', async () => {
    const root = await makeRoot();
    try {
      const input = await writeInput(root, fixtureProposal({ image_url: 'https://example.invalid/fixture.jpg' }));
      const result = await runImport({ root, input, fetchImpl: forbiddenFetch });
      assert.deepEqual(result.errors, [], 'the supplied record src is used as-is');
      assert.equal((await readCanonical(root)).artPieces[0].image.src, 'assets/fixture-harbour.jpg');
    } finally {
      await cleanup(root);
    }
  });
});

describe('runImport — the inbox stays where it is', () => {
  it('reports what it imported and leaves the proposal file untouched', async () => {
    const root = await makeRoot();
    try {
      const input = await writeInput(root, fixtureProposal());
      const before = await readFile(input, 'utf8');
      const result = await runImport({ root, input, fetchImpl: forbiddenFetch });
      assert.deepEqual(
        result.imported.map((entry) => entry.sourceSubmissionId),
        ['fixture-submission-1'],
      );
      assert.equal(result.imported[0].type, 'piece');
      assert.ok(typeof result.imported[0].id === 'string' && result.imported[0].id.length > 0);
      assert.equal(await readFile(input, 'utf8'), before, 'the importer never rewrites the inbox proposal');
    } finally {
      await cleanup(root);
    }
  });
});
