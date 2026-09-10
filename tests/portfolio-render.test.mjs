// Behavioural tests for the public gallery renderer and the build CLI.
//
// FIXTURE NOTICE: every record, title, image path, alt string, style, section
// body, URL and biography in this file is invented test scaffolding. None of it
// is Jason's real content, and none of it may be copied into
// content/portfolio.json, into a page, or into any public output. Fixtures are
// written only under temporary directories, never into the published root.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderPortfolio, escapeHtml, GENERATED_MARKER } from '../lib/portfolio-render.mjs';
import { buildSite } from '../scripts/build-portfolio.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

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

const fixtureTechProject = (over = {}) => ({
  id: 'tech-project-fixture-1',
  slug: 'fixture-tool',
  title: 'Fixture Tool',
  state: 'published',
  summary: 'Fixture summary describing an invented tool used only by these tests.',
  cover: fixtureImage({ src: 'assets/fixture-tool.png', alt: 'Fixture: a terminal window on a dark desk' }),
  ...over,
});

const emptyDocument = () => ({
  schemaVersion: 1,
  about: '',
  contacts: [],
  styles: [],
  artPieces: [],
  artProjects: [],
  artFavorites: [],
  techProjects: [],
  techStarred: [],
});

/** An empty document plus whatever the test needs. */
const documentWith = (over = {}) => ({ ...emptyDocument(), ...over });

/** A document with one published art project, its piece, and both favorited. */
const populatedArt = () =>
  documentWith({
    styles: [
      { id: 'style-fixture-a', name: 'Fixture Style A', description: 'Fixture description A.' },
      { id: 'style-fixture-b', name: 'Fixture Style B' },
    ],
    artPieces: [
      fixturePiece({ projectId: 'art-project-fixture-1', styleIds: ['style-fixture-a'], year: '2024', medium: 'Fixture medium' }),
      fixturePiece({
        id: 'piece-fixture-2',
        slug: 'fixture-window',
        title: 'Fixture Window',
        styleIds: ['style-fixture-b'],
        image: fixtureImage({ src: 'assets/fixture-window.jpg', alt: 'Fixture: rain on a window at night' }),
      }),
      fixturePiece({
        id: 'piece-fixture-draft',
        slug: 'fixture-draft-only',
        title: 'Fixture Draft Only',
        state: 'draft',
        sourceSubmissionId: 'submission-fixture-9',
        image: fixtureImage({ src: 'assets/fixture-draft.jpg', alt: 'Fixture: a draft that must never publish' }),
      }),
    ],
    artProjects: [fixtureArtProject()],
    artFavorites: [
      { type: 'art-project', id: 'art-project-fixture-1', order: 0 },
      { type: 'piece', id: 'piece-fixture-1', order: 1 },
    ],
  });

/** The first opening tag matching `pattern`, so an assertion names one element. */
const openingTag = (html, pattern) => {
  const match = html.match(pattern);
  assert.ok(match !== null, `no element matching ${pattern}`);
  return match[0];
};

/**
 * Does this opening tag carry a real `hidden` attribute?
 *
 * Quoted values are blanked first, so a class such as "hidden-thing" can never
 * satisfy the check. Asserting on the element rather than on the whole page is
 * the point: a page-wide alternation would pass on markup that hides nothing.
 */
const hasHiddenAttribute = (tag) => /\shidden(?=[\s>])/.test(tag.replace(/="[^"]*"/g, '=""'));

const listFiles = async (dir, prefix = '') => {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await listFiles(join(dir, entry.name), relative)));
    else found.push(relative);
  }
  return found.sort();
};

/** A throwaway site root carrying fixture stand-ins for every copied file. */
async function makeRoot(document) {
  const root = await mkdtemp(join(tmpdir(), 'portfolio-render-'));
  await mkdir(join(root, 'content'), { recursive: true });
  await writeFile(join(root, 'content', 'portfolio.json'), `${JSON.stringify(document, null, 2)}\n`);
  await writeFile(join(root, 'index.html'), '<!doctype html><title>FIXTURE home</title>');
  await writeFile(join(root, 'styles.css'), '/* FIXTURE styles */');
  await writeFile(join(root, 'gallery.css'), '/* FIXTURE gallery css */');
  await writeFile(join(root, 'gallery.js'), '// FIXTURE gallery js');
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(join(root, 'assets', 'bard.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await mkdir(join(root, 'admin'), { recursive: true });
  await writeFile(join(root, 'admin', 'edit.js'), '// FIXTURE admin runtime');
  await mkdir(join(root, 'lib'), { recursive: true });
  await writeFile(join(root, 'lib', 'portfolio-content.mjs'), '// FIXTURE shared lib');
  await mkdir(join(root, 'docs'), { recursive: true });
  await writeFile(join(root, 'docs', 'fixture.md'), 'FIXTURE docs');
  await mkdir(join(root, 'tests'), { recursive: true });
  await writeFile(join(root, 'tests', 'fixture.test.mjs'), '// FIXTURE tests');
  await mkdir(join(root, 'scripts'), { recursive: true });
  await writeFile(join(root, 'scripts', 'fixture.mjs'), '// FIXTURE scripts');
  await writeFile(join(root, '.env'), 'FIXTURE_SECRET=never-publish-me');
  return root;
}

const cleanup = (dir) => rm(dir, { recursive: true, force: true });

/* ------------------------------------------------------------------ *
 * Escaping
 * ------------------------------------------------------------------ */

describe('escapeHtml', () => {
  it('is attribute-safe: it encodes quotes as well as angle brackets', () => {
    assert.equal(escapeHtml('<b>&"\'</b>'), '&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
  });

  it('encodes the ampersand once, not twice', () => {
    assert.equal(escapeHtml('a & b'), 'a &amp; b');
    assert.equal(escapeHtml('&lt;'), '&amp;lt;');
  });

  it('renders non-string values without throwing', () => {
    assert.equal(escapeHtml(2024), '2024');
    assert.equal(escapeHtml(''), '');
  });
});

/* ------------------------------------------------------------------ *
 * Empty document
 * ------------------------------------------------------------------ */

describe('renderPortfolio — the empty canonical document', () => {
  const pages = renderPortfolio(emptyDocument());

  it('renders only the two gallery pages and the not-found page', () => {
    assert.deepEqual([...pages.keys()].sort(), ['404.html', 'art.html', 'tech.html']);
  });

  it('keeps Art on one H1, the Selected Works opening title', () => {
    const art = pages.get('art.html');
    assert.equal(art.match(/<h1\b/g).length, 1);
    assert.match(art, /<h1[^>]*>Selected Works<\/h1>/);
  });

  it('shows an honest empty state instead of fake cards', () => {
    const art = pages.get('art.html');
    assert.match(art, /Work will appear here soon\./);
    assert.equal(art.includes('card__image'), false);
    assert.equal(art.includes('<article'), false);
  });

  it('omits the Projects and Explore sections and their rail links', () => {
    const art = pages.get('art.html');
    assert.equal(art.includes('id="projects"'), false);
    assert.equal(art.includes('id="explore"'), false);
    assert.equal(art.includes('href="#projects"'), false);
    assert.equal(art.includes('href="#explore"'), false);
  });

  it('keeps About Me and Contact reachable with restrained empty states', () => {
    const art = pages.get('art.html');
    assert.match(art, /href="#about"/);
    assert.match(art, /href="#contact"/);
    assert.match(art, /id="about"/);
    assert.match(art, /id="contact"/);
    assert.match(art, /biography will appear here soon\./);
    assert.match(art, /Contact details will appear here soon\./);
  });

  it('never renders a contact form or an invented address', () => {
    const art = pages.get('art.html');
    assert.equal(art.includes('<form'), false);
    assert.equal(art.includes('mailto:'), false);
  });

  it('keeps the Art rail order Projects / Styles / Home / About Me / Contact', () => {
    // With no work only Home, About Me and Contact survive, but their relative
    // order must still follow the requested rail sequence.
    const art = pages.get('art.html');
    const rail = art.slice(art.indexOf('art-rail__nav'), art.indexOf('</nav>', art.indexOf('art-rail__nav')));
    assert.ok(rail.indexOf('Home') < rail.indexOf('About Me'));
    assert.ok(rail.indexOf('About Me') < rail.indexOf('Contact'));
  });

  it('gives Tech a title, one short introduction and an honest empty state', () => {
    const tech = pages.get('tech.html');
    assert.equal(tech.match(/<h1\b/g).length, 1);
    assert.match(tech, /<h1[^>]*>Tech<\/h1>/);
    assert.match(tech, /Work will appear here soon\./);
    assert.equal(tech.includes('id="starred"'), false);
    assert.equal(tech.includes('id="projects"'), false);
    assert.equal(tech.includes('card__image'), false);
  });

  it('gives every page a skip link, a main landmark and the shared stylesheets', () => {
    for (const [path, html] of pages) {
      assert.match(html, /class="skip-link" href="#main"/, path);
      assert.match(html, /<main id="main"/, path);
      // The not-found page links the same two stylesheets from the site root;
      // every other page links them relative to its own depth.
      assert.match(html, /href="\/?styles\.css"/, path);
      assert.match(html, /href="\/?gallery\.css"/, path);
    }
  });

  it('keeps the explicit ?edit=1 owner hook on the gallery pages only', () => {
    assert.match(pages.get('art.html'), /get\("edit"\) === "1"/);
    assert.match(pages.get('tech.html'), /get\("edit"\) === "1"/);
    assert.equal(pages.get('404.html').includes('admin/edit.js'), false);
  });

  it('never imports admin authentication on the public path', () => {
    for (const [path, html] of pages) {
      assert.equal(html.includes('admin/auth.js'), false, path);
      assert.equal(html.includes('admin/config.js'), false, path);
    }
  });

  it('offers a useful not-found page with Art and Tech return links', () => {
    const notFound = pages.get('404.html');
    assert.match(notFound, /href="\/art\.html"/);
    assert.match(notFound, /href="\/tech\.html"/);
    assert.match(notFound, /href="\/index\.html"/);
  });

  it('addresses every not-found reference absolutely, so it works at any depth', () => {
    const notFound = pages.get('404.html');
    // A static host serves these bytes at the address that was requested, and
    // the deep addresses this site has are the detail routes. Resolving each
    // reference against one of them is the test that matters: a relative URL
    // would land inside art/pieces/gone/ and 404 in turn.
    const served = 'https://example.invalid/art/pieces/gone/';
    for (const reference of [...notFound.matchAll(/(?:href|src)="([^"#]+)"/g)].map((match) => match[1])) {
      assert.equal(
        new URL(reference, served).href.startsWith('https://example.invalid/art/'),
        false,
        `${reference} resolves under the missing route`,
      );
    }
    assert.equal(new URL('/styles.css', served).href, 'https://example.invalid/styles.css');
    assert.match(notFound, /src="\/gallery\.js"/);
    assert.match(notFound, /src="\/assets\/bard\.svg"/);
  });

  it('writes the not-found page against a project-site base when one is given', () => {
    const projectSite = renderPortfolio(emptyDocument(), { siteBase: 'Portfolio' }).get('404.html');
    assert.match(projectSite, /href="\/Portfolio\/styles\.css"/);
    assert.match(projectSite, /href="\/Portfolio\/art\.html"/);
    assert.match(projectSite, /src="\/Portfolio\/gallery\.js"/);
    // Only the not-found page moves; the gallery pages stay relative so the
    // site keeps working from any subdirectory.
    assert.match(renderPortfolio(emptyDocument(), { siteBase: 'Portfolio' }).get('art.html'), /href="styles\.css"/);
  });

  it('rejects a protocol-relative site base instead of linking the 404 page off-site', () => {
    // A leading `//` is parsed by browsers as "same scheme, different host" —
    // `href="//evil.com/styles.css"` would send every visitor who lands on the
    // not-found page at another origin. --site-base is owner-supplied, but a
    // typo like `--site-base //Portfolio/` should fail the build loudly rather
    // than ship a page that quietly links off-site.
    assert.throws(
      () => renderPortfolio(emptyDocument(), { siteBase: '//evil.com/' }),
      /single-slash-rooted|protocol-relative/i,
    );
  });

  it('ends every page with exactly one trailing newline', () => {
    for (const [path, html] of pages) {
      assert.match(html, /<\/html>\n$/, path);
      assert.equal(html.endsWith('\n\n'), false, path);
    }
  });

  it('gives the listing pages a self-referencing canonical link with no query', () => {
    assert.match(pages.get('art.html'), /<link rel="canonical" href="art\.html">/);
    assert.match(pages.get('tech.html'), /<link rel="canonical" href="tech\.html">/);
    for (const [path, html] of pages) {
      const canonical = html.match(/<link rel="canonical"[^>]*>/);
      if (canonical !== null) assert.equal(canonical[0].includes('?'), false, path);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Published art
 * ------------------------------------------------------------------ */

describe('renderPortfolio — published Art', () => {
  const pages = renderPortfolio(populatedArt());
  const art = pages.get('art.html');

  it('generates a canonical detail route for every published record only', () => {
    assert.ok(pages.has('art/pieces/fixture-doorway/index.html'));
    assert.ok(pages.has('art/pieces/fixture-window/index.html'));
    assert.ok(pages.has('art/projects/fixture-series/index.html'));
    assert.equal(pages.has('art/pieces/fixture-draft-only/index.html'), false);
  });

  it('keeps drafts out of every public list', () => {
    for (const [path, html] of pages) {
      assert.equal(html.includes('Fixture Draft Only'), false, path);
      assert.equal(html.includes('fixture-draft-only'), false, path);
      assert.equal(html.includes('sourceSubmissionId'), false, path);
      assert.equal(html.includes('submission-fixture-9'), false, path);
    }
  });

  it('renders mixed favorites in curated order with a quiet type label', () => {
    const selected = art.slice(art.indexOf('id="selected-works"'), art.indexOf('id="projects"'));
    const projectAt = selected.indexOf('art/projects/fixture-series/index.html');
    const pieceAt = selected.indexOf('art/pieces/fixture-doorway/index.html');
    assert.ok(projectAt > -1 && pieceAt > -1);
    assert.ok(projectAt < pieceAt, 'the favorited project is ordered before the favorited piece');
    assert.match(selected, /card__kind">Project</);
    assert.match(selected, /card__kind">Piece</);
  });

  it('resolves a favorited project to its collection, never to one of its pieces', () => {
    const selected = art.slice(art.indexOf('id="selected-works"'), art.indexOf('id="projects"'));
    const projectCard = selected.slice(selected.indexOf('art/projects/fixture-series'));
    assert.equal(projectCard.slice(0, projectCard.indexOf('</article>')).includes('art/pieces/'), false);
  });

  it('counts only published pieces on a project card', () => {
    const projects = art.slice(art.indexOf('id="projects"'), art.indexOf('id="explore"'));
    assert.match(projects, /1 piece\b/);
    assert.equal(projects.includes('2 pieces'), false);
  });

  it('lists every published piece under Explore by Style, standalone and project members alike', () => {
    const explore = art.slice(art.indexOf('id="explore"'), art.indexOf('id="about"'));
    assert.match(explore, /art\/pieces\/fixture-doorway\/index\.html/);
    assert.match(explore, /art\/pieces\/fixture-window\/index\.html/);
    assert.match(explore, /Explore by Style/);
  });

  it('ships the style filter bar hidden, for JavaScript to reveal', () => {
    const bar = openingTag(art, /<div[^>]*class="filters"[^>]*>/);
    assert.ok(hasHiddenAttribute(bar), bar);
    assert.match(bar, /data-filters="explore-grid"/);
  });

  it('exposes style filters with state, a status region and no duplicate cards', () => {
    const explore = art.slice(art.indexOf('id="explore"'), art.indexOf('id="about"'));
    assert.match(explore, /aria-pressed="true"[^>]*data-style="all"|data-style="all"[^>]*aria-pressed="true"/);
    assert.match(explore, /Fixture Style A/);
    assert.match(explore, /role="status"/);
    assert.equal((explore.match(/art\/pieces\/fixture-doorway\/index\.html/g) ?? []).length, 1);
  });

  it('carries each piece style on the card so filtering needs no second data source', () => {
    const explore = art.slice(art.indexOf('id="explore"'), art.indexOf('id="about"'));
    assert.match(explore, /data-style-ids="[^"]*style-fixture-a/);
  });

  it('links each card to its canonical detail with no return query string', () => {
    for (const href of art.match(/href="[^"]*"/g)) {
      if (href.includes('art/pieces/') || href.includes('art/projects/')) {
        assert.equal(href.includes('?'), false, href);
      }
    }
  });

  it('keeps the Projects and Styles rail links once their sections exist', () => {
    assert.match(art, /href="#projects"/);
    assert.match(art, /href="#explore"/);
  });

  it('names the Art rail Home link for its own destination', () => {
    assert.match(art, /href="#selected-works"[^>]*aria-label="Home — Art selected works"/);
  });

  it('names the brand link for the overall portfolio home', () => {
    assert.match(art, /href="index\.html"[^>]*aria-label="Jason — portfolio home"/);
  });

  it('reserves image dimensions and offers a quiet failure fallback', () => {
    assert.match(art, /width="1600" height="1067"/);
    assert.match(art, /Image unavailable/);
  });

  it('loads the first gallery image eagerly and the rest lazily', () => {
    const eager = art.match(/loading="eager"/g) ?? [];
    assert.equal(eager.length, 1);
    assert.ok((art.match(/loading="lazy"/g) ?? []).length >= 1);
    assert.ok(art.indexOf('loading="eager"') < art.indexOf('loading="lazy"'));
  });

  it('offers the Show original colors toggle, default off and hidden for JavaScript to reveal', () => {
    const toggle = openingTag(art, /<button[^>]*data-color-toggle[^>]*>/);
    assert.match(toggle, /aria-pressed="false"/);
    assert.ok(hasHiddenAttribute(toggle), toggle);
    assert.match(art, />Show original colors</);
  });
});

/* ------------------------------------------------------------------ *
 * Curated expansion
 * ------------------------------------------------------------------ */

describe('renderPortfolio — curated expansion', () => {
  const manyFavorites = () => {
    const pieces = [];
    const favorites = [];
    for (let index = 0; index < 6; index += 1) {
      pieces.push(
        fixturePiece({
          id: `piece-fixture-${index}`,
          slug: `fixture-piece-${index}`,
          title: `Fixture Piece ${index}`,
          image: fixtureImage({ src: `assets/fixture-${index}.jpg`, alt: `Fixture: study number ${index}` }),
        }),
      );
      favorites.push({ type: 'piece', id: `piece-fixture-${index}`, order: index });
    }
    return documentWith({ artPieces: pieces, artFavorites: favorites });
  };

  const art = renderPortfolio(manyFavorites()).get('art.html');

  it('keeps every curated entry in the DOM so it reads without JavaScript', () => {
    for (let index = 0; index < 6; index += 1) {
      assert.match(art, new RegExp(`art/pieces/fixture-piece-${index}/index\\.html`));
    }
  });

  it('marks only the entries beyond the first four as expandable overflow', () => {
    assert.equal((art.match(/data-overflow="true"/g) ?? []).length, 2);
  });

  it('ships the expansion control hidden, for JavaScript to reveal', () => {
    const button = openingTag(art, /<button[^>]*data-expand="selected-works-grid"[^>]*>/);
    assert.ok(hasHiddenAttribute(button), button);
    assert.match(button, /aria-expanded="false"/);
    assert.match(button, /aria-controls="selected-works-grid"/);
    assert.match(art, />Show all selected works</);
  });

  it('omits the control entirely when four or fewer entries are curated', () => {
    const four = renderPortfolio(populatedArt()).get('art.html');
    assert.equal(four.includes('Show all selected works'), false);
    assert.equal(four.includes('data-overflow="true"'), false);
  });

  it('hides nothing in the static markup, so a JavaScript failure hides no work', () => {
    // Only the enhancement controls ship hidden; never a card and never a grid.
    for (const fragment of art.match(/<article[^>]*>/g)) assert.equal(fragment.includes('hidden'), false, fragment);
    for (const fragment of art.match(/<div class="grid[^>]*>/g)) {
      assert.equal(fragment.includes('is-collapsed'), false, fragment);
      assert.equal(fragment.includes('hidden'), false, fragment);
    }
    assert.equal(art.includes('display:none'), false);
  });
});

/* ------------------------------------------------------------------ *
 * Responsive sources and focal points
 * ------------------------------------------------------------------ */

describe('renderPortfolio — image sources', () => {
  it('renders srcset candidates and a sizes hint when the record supplies them', () => {
    const document = documentWith({
      artPieces: [
        fixturePiece({
          image: fixtureImage({
            sources: [
              { src: 'assets/fixture-doorway-800.jpg', width: 800 },
              { src: 'assets/fixture-doorway-1200.jpg', width: 1200 },
            ],
          }),
        }),
      ],
      artFavorites: [{ type: 'piece', id: 'piece-fixture-1', order: 0 }],
    });
    const art = renderPortfolio(document).get('art.html');
    assert.match(art, /srcset="assets\/fixture-doorway-800\.jpg 800w, assets\/fixture-doorway-1200\.jpg 1200w, assets\/fixture-doorway\.jpg 1600w"/);
    assert.match(art, /sizes="\(min-width: 1100px\) 640px/);
  });

  it('rebases every responsive candidate for a detail route', () => {
    const document = documentWith({
      artPieces: [fixturePiece({ image: fixtureImage({ sources: [{ src: 'assets/fixture-doorway-800.jpg', width: 800 }] }) })],
    });
    const piece = renderPortfolio(document).get('art/pieces/fixture-doorway/index.html');
    assert.match(piece, /srcset="\.\.\/\.\.\/\.\.\/assets\/fixture-doorway-800\.jpg 800w/);
  });

  it('omits srcset entirely when no candidates are supplied', () => {
    assert.equal(renderPortfolio(populatedArt()).get('art.html').includes('srcset'), false);
  });

  it('carries a tech cover focal point into the cropped preview frame', () => {
    const document = documentWith({
      techProjects: [fixtureTechProject({ cover: fixtureImage({ focalPoint: { x: 0.25, y: 0.75 } }) })],
    });
    const tech = renderPortfolio(document).get('tech.html');
    assert.match(tech, /--focal-x: 25%; --focal-y: 75%/);
    assert.match(tech, /card__frame--focal/);
  });

  it('leaves Art covers contained rather than cropped to a focal point', () => {
    const art = renderPortfolio(populatedArt()).get('art.html');
    assert.equal(art.includes('card__frame--focal'), false);
    assert.match(art, /card__frame--cover/);
  });

  it('emits no frame modifier that gallery.css does not define', () => {
    // A piece frame takes its aspect ratio from the inline style, so it carries
    // the base class alone rather than a modifier that styles nothing.
    const art = renderPortfolio(populatedArt()).get('art.html');
    assert.equal(art.includes('card__frame--natural'), false);
    const stylesheet = readFileSync(join(repoRoot, 'gallery.css'), 'utf8');
    for (const modifier of art.match(/card__frame--[a-z-]+/g) ?? []) {
      assert.ok(stylesheet.includes(`.${modifier}`), `${modifier} is emitted but never styled`);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Escaping in rendered output
 * ------------------------------------------------------------------ */

describe('renderPortfolio — hostile content is escaped', () => {
  const hostile = () =>
    documentWith({
      about: 'Fixture bio </p><script>alert(1)</script>',
      contacts: [
        // The query carries `&` followed by a named-entity-like sequence and a
        // quote: unescaped, `&copy;` would render as © and change the link.
        { label: 'Fixture "label" & <em>', url: 'https://example.com/fixture?a=1&copy;b=2&x="><em>' },
      ],
      styles: [{ id: 'style-fixture-x', name: 'Fixture <img src=x onerror=alert(1)>' }],
      artPieces: [
        fixturePiece({
          title: 'Fixture <script>alert(1)</script>',
          caption: 'Fixture caption with & and <tags>',
          medium: 'Fixture " onmouseover="alert(1)',
          styleIds: ['style-fixture-x'],
          image: fixtureImage({ alt: 'Fixture alt with a " quote, an \' apostrophe and <angle> brackets' }),
        }),
      ],
      artFavorites: [{ type: 'piece', id: 'piece-fixture-1', order: 0 }],
    });

  const pages = renderPortfolio(hostile());

  it('never emits an unescaped tag from author text anywhere', () => {
    for (const [path, html] of pages) {
      assert.equal(/<script>alert\(1\)<\/script>/.test(html), false, path);
      assert.equal(html.includes('<img src=x'), false, path);
      assert.equal(html.includes('</p><script>'), false, path);
    }
  });

  it('escapes free text into element content', () => {
    const art = pages.get('art.html');
    assert.match(art, /Fixture &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    const piece = pages.get('art/pieces/fixture-doorway/index.html');
    assert.match(piece, /Fixture caption with &amp; and &lt;tags&gt;/);
  });

  it('escapes image alt with an attribute-safe escaper', () => {
    const art = pages.get('art.html');
    assert.match(art, /alt="Fixture alt with a &quot; quote, an &#39; apostrophe and &lt;angle&gt; brackets"/);
  });

  it('escapes free text that lands inside other attributes', () => {
    const art = pages.get('art.html');
    assert.equal(art.includes('onmouseover="alert(1)'), false);
    assert.match(art, /Fixture &quot; onmouseover=&quot;alert\(1\)/);
  });

  it('escapes a contact url into its href, so an ampersand cannot become an entity', () => {
    const art = pages.get('art.html');
    assert.match(art, /<a href="https:\/\/example\.com\/fixture\?a=1&amp;copy;b=2&amp;x=%22%3E%3Cem%3E">/);
    // The bare `&copy;` would render as © and send the visitor to a different
    // address; the raw sequence must not survive into the attribute.
    assert.equal(art.includes('&copy;b=2'), false);
  });

  it('escapes the biography, the contact label and the style name', () => {
    const art = pages.get('art.html');
    assert.match(art, /Fixture bio &lt;\/p&gt;&lt;script&gt;/);
    assert.match(art, /Fixture &quot;label&quot; &amp; &lt;em&gt;/);
    assert.match(art, /Fixture &lt;img src=x onerror=alert\(1\)&gt;/);
  });

  it('escapes every remaining url, so no destination is silently rewritten', () => {
    // `safeUrl` percent-encodes the characters that would break out of an
    // attribute, so none of these is an injection. `&copy;` is the whole point:
    // left raw in an href it parses as © and the visitor lands somewhere else.
    const detail = renderPortfolio(
      documentWith({
        techProjects: [
          fixtureTechProject({
            liveUrl: 'https://example.com/live?a=1&copy;b=2',
            repositoryUrl: 'https://example.com/repo?a=1&copy;b=2',
            cover: fixtureImage({
              src: 'https://example.com/cover.jpg?a=1&copy;b=2',
              alt: 'Fixture: a cover served with a query string',
              sources: [{ src: 'https://example.com/cover-800.jpg?a=1&copy;b=2', width: 800 }],
            }),
          }),
        ],
      }),
    ).get('tech/projects/fixture-tool/index.html');

    assert.match(detail, /href="https:\/\/example\.com\/live\?a=1&amp;copy;b=2"/);
    assert.match(detail, /href="https:\/\/example\.com\/repo\?a=1&amp;copy;b=2"/);
    assert.match(detail, /src="https:\/\/example\.com\/cover\.jpg\?a=1&amp;copy;b=2"/);
    assert.match(detail, /srcset="[^"]*cover-800\.jpg\?a=1&amp;copy;b=2 800w/);
    assert.equal(detail.includes('&copy;b=2'), false, 'no raw entity survives into any attribute');
  });
});

/* ------------------------------------------------------------------ *
 * The stylesheet the generated pages depend on
 * ------------------------------------------------------------------ */

describe('gallery.css — the no-JavaScript contract', () => {
  it('keeps the [hidden] override that hides the progressive-enhancement controls', () => {
    // Every control the renderer ships hidden — the colour toggle, Show all and
    // the filter bar — is revealed by gallery.js. `.control` and `.filters`
    // carry an author-origin `display`, which beats the UA stylesheet's
    // `[hidden] { display: none }` at any specificity, so this one rule is the
    // whole of the degradation story: without it a visitor with JavaScript off
    // sees inert buttons. It is easy to delete and nothing else would notice.
    const stylesheet = readFileSync(join(repoRoot, 'gallery.css'), 'utf8');
    assert.match(stylesheet, /\.gallery-page\s*\[hidden\]\s*\{[^}]*display:\s*none\s*!important/);
  });

  it('ships every control the renderer hides in that state', () => {
    const art = renderPortfolio(populatedArt()).get('art.html');
    for (const pattern of [/<button[^>]*data-color-toggle[^>]*>/, /<div[^>]*class="filters"[^>]*>/]) {
      assert.ok(hasHiddenAttribute(openingTag(art, pattern)), `${pattern} must ship hidden`);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Detail pages
 * ------------------------------------------------------------------ */

describe('renderPortfolio — Art detail pages', () => {
  const pages = renderPortfolio(populatedArt());
  const piece = pages.get('art/pieces/fixture-doorway/index.html');
  const project = pages.get('art/projects/fixture-series/index.html');

  it('rebases every relative reference for a route three levels deep', () => {
    assert.match(piece, /href="\.\.\/\.\.\/\.\.\/styles\.css"/);
    assert.match(piece, /href="\.\.\/\.\.\/\.\.\/gallery\.css"/);
    assert.match(piece, /src="\.\.\/\.\.\/\.\.\/assets\/fixture-doorway\.jpg"/);
    assert.match(piece, /src="\.\.\/\.\.\/\.\.\/gallery\.js"/);
    assert.equal(piece.includes('href="styles.css"'), false);
  });

  it('declares a query-free canonical link', () => {
    assert.match(piece, /<link rel="canonical" href="index\.html">/);
    assert.match(project, /<link rel="canonical" href="index\.html">/);
  });

  it('shows the piece uncropped with its supplied metadata and caption', () => {
    assert.match(piece, /detail__image/);
    assert.match(piece, /2024/);
    assert.match(piece, /Fixture medium/);
    assert.equal(piece.includes('card__image'), false, 'detail images are never the monochrome preview');
  });

  it('omits metadata labels that have no value', () => {
    const window = pages.get('art/pieces/fixture-window/index.html');
    assert.equal(window.includes('Medium'), false);
    assert.equal(window.includes('Dimensions'), false);
  });

  it('links a piece to its project and offers a direct-arrival return link', () => {
    assert.match(piece, /\.\.\/\.\.\/\.\.\/art\/projects\/fixture-series\/index\.html/);
    assert.match(piece, /Back to Art/);
  });

  it('shows a project as an ordered vertical gallery with Back to Projects', () => {
    assert.match(project, /Back to Projects/);
    assert.match(project, /\.\.\/\.\.\/\.\.\/art\/pieces\/fixture-doorway\/index\.html/);
    assert.match(project, /\.\.\/\.\.\/\.\.\/art\.html#projects/);
  });

  it('loads the primary detail image eagerly', () => {
    assert.equal((piece.match(/loading="eager"/g) ?? []).length, 1);
  });
});

describe('renderPortfolio — Tech detail pages', () => {
  const rich = () =>
    documentWith({
      techProjects: [
        fixtureTechProject({
          role: 'Fixture role',
          year: '2023',
          technologies: ['FixtureScript', 'Fixture DB'],
          sections: [{ title: 'Fixture Overview', body: 'Fixture body paragraph.' }],
          screenshots: [fixtureImage({ src: 'assets/fixture-shot.png', alt: 'Fixture: a settings screen' })],
          liveUrl: 'https://example.com/fixture-live',
          repositoryUrl: 'https://example.com/fixture-repo',
        }),
        fixtureTechProject({ id: 'tech-fixture-2', slug: 'fixture-bare', title: 'Fixture Bare' }),
      ],
      techStarred: [{ id: 'tech-project-fixture-1', order: 0 }],
    });

  const pages = renderPortfolio(rich());
  const rich1 = pages.get('tech/projects/fixture-tool/index.html');
  const bare = pages.get('tech/projects/fixture-bare/index.html');

  it('renders only sections backed by real content', () => {
    assert.match(rich1, /Fixture Overview/);
    assert.match(rich1, /Fixture body paragraph\./);
    assert.match(rich1, /FixtureScript/);
    assert.match(rich1, /Fixture role/);
    assert.match(rich1, /example\.com\/fixture-live/);
    assert.match(rich1, /example\.com\/fixture-repo/);
    assert.match(rich1, /assets\/fixture-shot\.png/);
  });

  it('omits every section a bare project cannot fill', () => {
    for (const label of ['Overview', 'Technologies', 'Screenshots', 'Role', 'Live site', 'Repository']) {
      assert.equal(bare.includes(label), false, label);
    }
    assert.match(bare, /Back to Tech/);
  });

  it('keeps the technology inventory off the listing cards', () => {
    const tech = pages.get('tech.html');
    assert.equal(tech.includes('FixtureScript'), false);
    assert.match(tech, /Fixture summary describing an invented tool/);
  });

  it('renders Starred Projects before Projects, listing starred work in both', () => {
    const tech = pages.get('tech.html');
    assert.ok(tech.indexOf('id="starred"') < tech.indexOf('id="projects"'));
    const projects = tech.slice(tech.indexOf('id="projects"'));
    assert.match(projects, /tech\/projects\/fixture-tool\/index\.html/);
    assert.match(projects, /tech\/projects\/fixture-bare\/index\.html/);
  });

  it('omits an empty Starred section and its anchor', () => {
    const noStars = renderPortfolio(documentWith({ techProjects: [fixtureTechProject()] })).get('tech.html');
    assert.equal(noStars.includes('id="starred"'), false);
    assert.equal(noStars.includes('href="#starred"'), false);
    assert.match(noStars, /id="projects"/);
  });
});

/* ------------------------------------------------------------------ *
 * Build CLI
 * ------------------------------------------------------------------ */

describe('buildSite — writing the checked-in pages', () => {
  it('refuses to write anything when the document fails validation', async () => {
    const root = await makeRoot(documentWith({ artPieces: [fixturePiece({ slug: 'Not A Slug' })] }));
    try {
      const result = await buildSite({ root });
      assert.equal(result.ok, false);
      assert.ok(result.errors.length > 0);
      assert.equal((await listFiles(root)).includes('art.html'), false);
    } finally {
      await cleanup(root);
    }
  });

  it('writes the gallery pages and every published detail route', async () => {
    const root = await makeRoot(populatedArt());
    try {
      const result = await buildSite({ root });
      assert.equal(result.ok, true, result.errors.join('\n'));
      const files = await listFiles(root);
      assert.ok(files.includes('art.html'));
      assert.ok(files.includes('tech.html'));
      assert.ok(files.includes('404.html'));
      assert.ok(files.includes('art/pieces/fixture-doorway/index.html'));
      assert.ok(files.includes('art/projects/fixture-series/index.html'));
      assert.ok(files.includes('content/generated-pages.json'));
    } finally {
      await cleanup(root);
    }
  });

  it('removes a stale detail page and prunes its empty directory', async () => {
    const root = await makeRoot(populatedArt());
    try {
      await buildSite({ root });
      const shrunk = documentWith({ artPieces: [fixturePiece({ id: 'piece-fixture-2', slug: 'fixture-window' })] });
      await writeFile(join(root, 'content', 'portfolio.json'), `${JSON.stringify(shrunk, null, 2)}\n`);
      const result = await buildSite({ root });
      assert.equal(result.ok, true, result.errors.join('\n'));
      const files = await listFiles(root);
      assert.equal(files.includes('art/pieces/fixture-doorway/index.html'), false);
      assert.equal(files.includes('art/projects/fixture-series/index.html'), false);
      assert.ok(files.includes('art/pieces/fixture-window/index.html'));
      assert.ok(result.removed.includes('art/pieces/fixture-doorway/index.html'));
    } finally {
      await cleanup(root);
    }
  });

  it('never follows a manifest entry that traverses out of the route directories', async () => {
    const root = await makeRoot(populatedArt());
    // A sibling of the root, reachable only by climbing out of art/pieces.
    const escapee = join(dirname(root), `portfolio-escape-${basename(root)}`);
    const victim = join(escapee, 'index.html');
    try {
      await mkdir(escapee, { recursive: true });
      // The marker is the only guard that would otherwise stand between a
      // traversing manifest entry and an unlink outside the root.
      await writeFile(victim, `<!doctype html>\n${GENERATED_MARKER}\nFIXTURE outside the root`);
      const traversal = `art/pieces/../../../${basename(escapee)}/index.html`;
      await writeFile(
        join(root, 'content', 'generated-pages.json'),
        `${JSON.stringify({ pages: [traversal] }, null, 2)}\n`,
      );

      const result = await buildSite({ root });
      assert.equal(result.ok, true, result.errors.join('\n'));
      assert.equal(result.removed.includes(traversal), false);
      // Read the bytes back and compare them: the file is still there, still
      // whole, and was not truncated or rewritten on its way past the guard.
      assert.equal(
        await readFile(victim, 'utf8'),
        `<!doctype html>\n${GENERATED_MARKER}\nFIXTURE outside the root`,
        'the outside file survives untouched',
      );
    } finally {
      await cleanup(root);
      await cleanup(escapee);
    }
  });

  it('never deletes a file it did not generate', async () => {
    const root = await makeRoot(populatedArt());
    try {
      await buildSite({ root });
      await writeFile(join(root, 'art', 'pieces', 'fixture-doorway', 'index.html'), '<!doctype html>FIXTURE hand written');
      await writeFile(join(root, 'content', 'portfolio.json'), `${JSON.stringify(emptyDocument(), null, 2)}\n`);
      await buildSite({ root });
      const files = await listFiles(root);
      assert.ok(files.includes('art/pieces/fixture-doorway/index.html'), 'a hand-edited page is left alone');
    } finally {
      await cleanup(root);
    }
  });
});

describe('buildSite — --check', () => {
  it('passes on a freshly built root and mutates nothing', async () => {
    const root = await makeRoot(populatedArt());
    try {
      await buildSite({ root });
      const before = await listFiles(root);
      const result = await buildSite({ root, check: true });
      assert.equal(result.ok, true, result.drift.join('\n'));
      assert.deepEqual(await listFiles(root), before);
    } finally {
      await cleanup(root);
    }
  });

  it('reports drift without repairing it', async () => {
    const root = await makeRoot(populatedArt());
    try {
      await buildSite({ root });
      await writeFile(join(root, 'art.html'), '<!doctype html>FIXTURE drifted');
      const result = await buildSite({ root, check: true });
      assert.equal(result.ok, false);
      assert.ok(result.drift.some((entry) => entry.includes('art.html')));
      assert.equal(await readFile(join(root, 'art.html'), 'utf8'), '<!doctype html>FIXTURE drifted');
    } finally {
      await cleanup(root);
    }
  });
});

describe('buildSite — the public --out directory', () => {
  it('contains the site and nothing that authors it', async () => {
    const root = await makeRoot(populatedArt());
    const out = await mkdtemp(join(tmpdir(), 'portfolio-out-'));
    try {
      const result = await buildSite({ root, out });
      assert.equal(result.ok, true, result.errors.join('\n'));
      const files = await listFiles(out);

      for (const expected of [
        'index.html',
        'art.html',
        'tech.html',
        '404.html',
        'styles.css',
        'gallery.css',
        'gallery.js',
        'assets/bard.svg',
        'admin/edit.js',
        'lib/portfolio-content.mjs',
        'art/pieces/fixture-doorway/index.html',
        'art/projects/fixture-series/index.html',
      ]) {
        assert.ok(files.includes(expected), `missing ${expected}`);
      }

      for (const forbidden of ['content/portfolio.json', 'docs/fixture.md', 'tests/fixture.test.mjs', '.env', 'scripts/fixture.mjs']) {
        assert.equal(files.includes(forbidden), false, `leaked ${forbidden}`);
      }
      assert.equal(
        files.some((file) => file.startsWith('content/')),
        false,
        'no authoring content directory',
      );
    } finally {
      await cleanup(root);
      await cleanup(out);
    }
  });

  it('refuses an output directory inside the repository', async () => {
    const root = await makeRoot(populatedArt());
    try {
      for (const out of [root, join(root, 'public'), join(root, 'assets', 'nested')]) {
        const result = await buildSite({ root, out });
        assert.equal(result.ok, false, out);
        assert.equal(result.written.length, 0, out);
        assert.ok(
          result.errors.some((error) => error.includes('--out') && error.includes('inside the repository')),
          result.errors.join('\n'),
        );
      }
      // Nothing was created by the refusal.
      assert.equal((await listFiles(root)).some((file) => file.startsWith('public/')), false);
    } finally {
      await cleanup(root);
    }
  });

  it('exposes no draft record and no authoring provenance', async () => {
    const root = await makeRoot(populatedArt());
    const out = await mkdtemp(join(tmpdir(), 'portfolio-out-'));
    try {
      await buildSite({ root, out });
      for (const file of await listFiles(out)) {
        const body = await readFile(join(out, file), 'utf8');
        assert.equal(body.includes('Fixture Draft Only'), false, file);
        assert.equal(body.includes('submission-fixture-9'), false, file);
        assert.equal(body.includes('never-publish-me'), false, file);
      }
    } finally {
      await cleanup(root);
      await cleanup(out);
    }
  });

  it('leaves the source root untouched', async () => {
    const root = await makeRoot(populatedArt());
    const out = await mkdtemp(join(tmpdir(), 'portfolio-out-'));
    try {
      const before = await listFiles(root);
      await buildSite({ root, out });
      assert.deepEqual(await listFiles(root), before);
    } finally {
      await cleanup(root);
      await cleanup(out);
    }
  });

  it('builds the real repository into a temporary directory without leaking authoring files', async () => {
    const out = await mkdtemp(join(tmpdir(), 'portfolio-real-'));
    try {
      const result = await buildSite({ root: repoRoot, out });
      assert.equal(result.ok, true, result.errors.join('\n'));
      const files = await listFiles(out);
      assert.ok(files.includes('art.html'));
      assert.ok(files.includes('assets/bard.svg'));
      assert.ok(files.includes('assets/wave-pattern.svg'));
      assert.equal(
        files.some((file) => file.startsWith('content/') || file.startsWith('docs/') || file.startsWith('tests/')),
        false,
      );
      assert.equal(files.includes('.env'), false);
      assert.equal(files.includes('.env.example'), false);
    } finally {
      await cleanup(out);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Build-time warnings and the site base
 * ------------------------------------------------------------------ */

describe('buildSite — warnings that no other stage can raise', () => {
  it('names a published image whose file is not in the working tree', async () => {
    const root = await makeRoot(populatedArt());
    try {
      // `validatePortfolio` is pure and cannot look at the filesystem, and the
      // importer only ever sees the one image it is handed. This is the only
      // stage that knows both the published set and the working tree.
      const result = await buildSite({ root });
      assert.equal(result.ok, true, result.errors.join('\n'));
      assert.ok(
        result.warnings.some((warning) => warning.includes('assets/fixture-doorway.jpg')),
        result.warnings.join('\n'),
      );
      assert.equal(
        result.warnings.some((warning) => warning.includes('fixture-draft.jpg')),
        false,
        'a draft is not published and is not warned about',
      );
    } finally {
      await cleanup(root);
    }
  });

  it('says nothing once the file is there, and never blocks the build', async () => {
    const root = await makeRoot(documentWith({ artPieces: [fixturePiece()] }));
    try {
      await writeFile(join(root, 'assets', 'fixture-doorway.jpg'), 'FIXTURE bytes');
      const result = await buildSite({ root });
      assert.equal(result.ok, true, result.errors.join('\n'));
      assert.deepEqual(result.warnings, []);
    } finally {
      await cleanup(root);
    }
  });
});

describe('buildSite — the not-found page and the site base', () => {
  it('writes an absolute-rooted 404 by default, resolvable from a deep route', async () => {
    const root = await makeRoot(populatedArt());
    try {
      await buildSite({ root });
      const notFound = await readFile(join(root, '404.html'), 'utf8');
      // The address a stale detail link leaves the visitor at.
      const served = 'https://example.invalid/art/pieces/gone/';
      for (const reference of [...notFound.matchAll(/(?:href|src)="([^"#]+)"/g)].map((match) => match[1])) {
        assert.equal(new URL(reference, served).href, `https://example.invalid${reference}`, reference);
      }
    } finally {
      await cleanup(root);
    }
  });

  it('carries --site-base through to that page and to no other', async () => {
    const root = await makeRoot(populatedArt());
    try {
      await buildSite({ root, siteBase: '/Portfolio/' });
      assert.match(await readFile(join(root, '404.html'), 'utf8'), /href="\/Portfolio\/styles\.css"/);
      assert.match(await readFile(join(root, 'art.html'), 'utf8'), /href="styles\.css"/);
      assert.match(
        await readFile(join(root, 'art', 'pieces', 'fixture-doorway', 'index.html'), 'utf8'),
        /href="\.\.\/\.\.\/\.\.\/styles\.css"/,
      );
    } finally {
      await cleanup(root);
    }
  });
});
