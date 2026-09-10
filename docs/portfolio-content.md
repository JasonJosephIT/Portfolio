# Canonical portfolio content

`content/portfolio.json` is the single authoring source for the Art and Tech
galleries. `lib/portfolio-content.mjs` owns its schema, its safety rules, its
canonical routes and every curation transform. Nothing else may define a
competing content store.

The design authority for the behaviour described here is
`docs/portfolio-design-brief.md` (which supersedes `docs/prd.md`).

## Files and ownership

| Path | Owner | Notes |
| --- | --- | --- |
| `content/portfolio.json` | Jason, via the owner editor or a deliberate local edit | Canonical source. Contains drafts. **Never deployed.** |
| `lib/portfolio-content.mjs` | Task 1 | Schema, validation, published projection, routes, transforms. Dependency-free. |
| `tests/portfolio-content.test.mjs` | Task 1 | Behavioural tests. All content in it is fixture data. |
| `admin/content/`, `admin/content.js` | Task 3 | The owner editor. Auth-gated, browser-only. Edits a copy; cannot write the repository. |
| `admin/content-model.mjs` | Task 3 | Editor and importer data transforms on top of the library. Dependency-free, runs in both the browser and Node. |
| `scripts/import-portfolio.mjs` | Task 3 | The only thing in the workflow that writes `content/portfolio.json` from the inbox. Reads nothing but its `--input` file. |
| `docs/portfolio-content.md` | Task 1, plus Task 3's owner workflow below | This document. |
| Generated public pages (`art.html`, `tech.html`, `art/…`, `tech/…`) | Task 2's build | Generated output. Do not hand-edit; re-run the build. |

The repository currently ships an **empty** canonical document: no pieces, no
projects, no styles, no favorites, an empty `about` string and no contacts.
That is deliberate. Real content arrives only from Jason. Do not seed example
work, biography text, contact addresses or images anywhere outside this
document and the test file, and label anything that is illustrative as a
fixture (as both do).

## Exported interface

```js
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
} from './lib/portfolio-content.mjs';
```

| Export | Signature | Behaviour |
| --- | --- | --- |
| `createEmptyPortfolio` | `() => document` | A fresh, valid, entirely empty document. New arrays each call. |
| `validatePortfolio` | `(document) => string[]` | Human-readable errors; `[]` means safe to render and to publish from. Never throws. |
| `publishedPortfolio` | `(document) => document` | Defensive published-only projection. Never throws, never mutates. |
| `detailPath` | `(type, slug) => string` | Canonical route. **Throws** on an unknown type or an unsafe slug. |
| `safeUrl` | `(value, { image = false } = {}) => string \| null` | Safe URL or `null`. Never throws. |
| `setPublication` | `(document, type, id, state) => document` | Publish/unpublish. Throws on an unknown type, id or state, or on an incomplete publish. |
| `toggleCurated` | `(document, type, id) => document` | Add/remove one curated reference. Throws on an unknown type or id, or when curating a draft. |
| `moveCurated` | `(document, collection, index, direction) => document` | Reorder one curated entry. Throws on an unknown collection/direction or an out-of-range move. |
| `removeRecord` | `(document, type, id) => document` | Delete a record and every reference to it. Throws on an unknown type or id. |

Record `type` strings are `'piece'`, `'art-project'` and `'tech-project'`.
Curated `collection` strings are `'artFavorites'` and `'techStarred'`.
`direction` is `'up'` or `'down'`.

**All four transforms are pure.** They deep-clone the document, return the new
one, and never mutate the input. They throw an `Error` whose message explains
the refusal rather than returning a partially applied document.

### Canonical routes

| Type | Route |
| --- | --- |
| `piece` | `art/pieces/{slug}/index.html` |
| `art-project` | `art/projects/{slug}/index.html` |
| `tech-project` | `tech/projects/{slug}/index.html` |

A piece resolves to the same detail route wherever it is linked from —
Selected Works, a project gallery or Explore by Style. A project resolves to
its own collection page, never to one of its pieces. Routes are relative, so
the generated pages must resolve asset and link paths against the page's own
depth (a piece detail page sits three directories below the site root).

## Document schema (`schemaVersion: 1`)

```jsonc
{
  "schemaVersion": 1,
  "about": "",            // string, may be empty until Jason supplies a biography
  "contacts": [],         // { label, url }
  "styles": [],           // { id, name, description? }
  "artPieces": [],        // art piece records
  "artProjects": [],      // art project records
  "artFavorites": [],     // { type: "piece" | "art-project", id, order }
  "techProjects": [],     // tech project records
  "techStarred": []       // { id, order }
}
```

All nine fields are required; every array must be present, even when empty.

### Shared record fields

| Field | Rule |
| --- | --- |
| `id` | Required, permanent. Letters, digits, `-` or `_`, starting alphanumeric, ≤128 chars. Unique across **all** records (pieces, art projects, tech projects). |
| `slug` | Required. Lowercase words joined by single hyphens (`harbour-lights`). Unique per record type, because each type has its own route namespace. |
| `title` | String. Required and non-blank before publication. |
| `state` | Required. `'draft'` or `'published'`. |
| `sourceSubmissionId` | Optional. Set by the importer for records created from an inbox submission; unique across records so imports stay idempotent. Stripped from public output. |

Ids are immutable in practice: nothing in this module rewrites an id, and the
curated lists, project membership and importer idempotency all key on them.
Changing an id by hand orphans every reference to it.

### Image object

Used by `piece.image`, `artProject.cover`, `techProject.cover` and each entry
of `techProject.screenshots`.

| Field | Rule |
| --- | --- |
| `src` | Required. A safe local asset path or an `https:`/`http:` URL (see `safeUrl`). |
| `alt` | Required and meaningful before publication: non-blank, at least 3 characters, not a bare word like `image`/`photo`, not a filename. |
| `width`, `height` | Pixels, whole numbers greater than 0. **Required on every image of a published record** so the layout can reserve space and avoid shift. |
| `sources` | Optional `[{ src, width }]` for responsive `srcset` candidates. Same `src` rules; `width` a positive whole number. |
| `focalPoint` | Optional `{ x, y }`, each a number from 0 to 1, for the editorial focus of a cropped cover frame. |

### Art piece

Required to publish: `id`, `slug`, `title`, `image` (complete), `state`.
Optional: `year`, `medium`, `dimensions`, `caption` (non-blank strings when
supplied — `dimensions` is the physical artwork size, unrelated to pixel
width/height), `projectId`, `styleIds`.

`year` is a string so ranges such as `"2019–2021"` are expressible; a number is
rejected.

### Art project

Required to publish: `id`, `slug`, `title`, `cover` (complete), `pieceIds`
containing **at least one published piece**, `state`. Optional: `summary`,
`year`.

`pieceIds` is the curated display order of the project's gallery.

### Tech project

Required to publish: `id`, `slug`, `title`, `cover` (complete), `summary`,
`state`. Optional: `role`, `year`, `screenshots` (image objects), `sections`
(`{ title, body }`, both non-blank — an empty section is rejected rather than
rendered), `technologies` (non-blank, no duplicates), `liveUrl`,
`repositoryUrl` (both must be `http(s)` web addresses when supplied).

### Curated lists

`artFavorites` entries are `{ type: 'piece' | 'art-project', id, order }`;
`techStarred` entries are `{ id, order }`. `order` is a whole number ≥ 0 and
must be unique within its own list. The transforms keep each list renumbered
`0..n-1`.

**`moveCurated`'s `index` addresses the order-sorted list, not the stored
array position.** Before indexing, `moveCurated` sorts the collection's
entries by their stored `order` value (ascending), and `index` is a position
into *that* sorted sequence — the same order `publishedPortfolio` and a
rendered curated list would show. It is not `Array.prototype.indexOf` on the
document's `artFavorites`/`techStarred` array as stored on disk. On a
document whose stored array happens to already be in ascending `order`
sequence the two coincide, but on a hand-edited document where the stored
array order and the `order` field have drifted apart, `document.artFavorites
.indexOf(entry)` addresses the wrong row. A caller must compute `index` from
the same order-sorted view it is displaying (for example, the index of the
target entry after sorting the collection by `order`), never from the raw
stored array position.

### Styles

`{ id, name, description? }`. Ids follow the record id rules and are unique
among styles. Names and descriptions must come from Jason's real vocabulary;
a piece may carry zero or more `styleIds`, and every one must be defined here.
Style is not medium and not camera format.

### Contacts

`{ label, url }` with a non-blank label and a safe destination. Until Jason
supplies real contact details this array stays empty and the Contact section
shows an honest empty state. Do not invent an address and do not build a form.

## Safety rules

These rules exist because this content flows into generated HTML (Task 2) and
through an importer that accepts supplied JSON (Task 3).

**`safeUrl(value, { image })`** returns a safe string or `null`; it never
throws and never repairs a value.

| Mode | Allowed |
| --- | --- |
| `{ image: true }` — media sources | Repo-relative local paths, `https:`, `http:` |
| default — destinations (contacts, links) | The above plus `mailto:` and `tel:` |

Everything else is rejected, including `javascript:`, `data:`, `vbscript:`,
`file:`, protocol-relative `//host`, URLs carrying credentials, and any value
containing a control character. `liveUrl` and `repositoryUrl` are validated
more strictly still: they must be absolute `http(s)` addresses.

A **local asset path** must be repo-relative (`assets/harbour-lights.jpg`).
Segments may contain ASCII letters, digits, `.`, `_`, `~` and `-`, and must
begin with a letter, digit, `_` or `~`. That rejects `../` traversal, absolute `/assets/…` paths (which
would break subdirectory hosting), backslashes, dotfiles such as `.env`, and
anything a browser could read as a scheme. Importers and editors must produce
paths in that form.

The character class is exhaustive, not illustrative: a local path may contain
**only** those characters, in those positions. That silently excludes some
things a naive path might contain, and it is fail-closed on purpose rather
than an oversight:

- **No query string or fragment.** `assets/foo.jpg?v=2` and `assets/foo.jpg#a`
  both return `null`, because `?` and `#` are not in the allowed character
  set. Cache-busting or anchor-style suffixes on a local asset path do not
  work here; if a version needs expressing, put it in the filename itself
  (`assets/foo.v2.jpg`).
- **ASCII only, no spaces.** `assets/Foo Bar.jpg` and `assets/café.jpg` both
  return `null` — the space and the accented `é` are outside the allowed
  character set. A local asset path must be pure ASCII with no whitespace.

Consequence for Task 3: the importer must never pass a filename through to a
local asset path unchanged. It must ASCII-slugify any filename that contains
spaces, accented or non-ASCII characters, or a query string/fragment (for
example `Café Bar.jpg` → `cafe-bar.jpg`) before writing it into `src`,
otherwise `safeUrl` rejects the record and the image is dropped from the
published projection rather than rendered.

**Prototype-pollution keys** — `__proto__`, `constructor`, `prototype` — are
rejected as ids, slugs and style ids, are reported by `validatePortfolio`
wherever they appear as an object key in the document, and are stripped by the
clone that every transform and the published projection perform.

Validation is not an HTML escaper. The rule for the renderer is structural,
not a list of field names: **every string field in `publishedPortfolio`'s
output must be treated as arbitrary, unescaped text and HTML-escaped before
it is rendered. There are no exemptions.** Numeric fields (`width`, `height`,
`order`, `focalPoint.x`, `focalPoint.y`) are constrained to numbers and never
need escaping; everything else is escaped, including `id`, `slug`, `src`,
`liveUrl` and `repositoryUrl`. Do not special-case any field by name in the
renderer: it is easy for a new free-text field to be added later and be
missed by an enumeration, and an exemption list is one more thing to
remember correctly under pressure.

The URL fields used to be exempt, on the grounds that `safeUrl` and the
slug pattern already constrain them. That was true of *injection* and beside
the point: `https://example.com/x?a=1&copy;b=2` is a perfectly safe URL whose
`&copy;` an HTML parser reads as `©`, so an unescaped `href` sends the visitor
to a **different address** than the one stored. Escaping is also a no-op on a
value that has nothing to escape, so the constrained fields lose nothing by
being escaped with the rest.

The fields this covers currently include, but are not limited to: `title`,
`caption`, `summary`, `about`, `sections[].title`, `sections[].body`,
`technologies[]`, `contacts[].label`, `contacts[].url`, `styles[].name`,
`styles[].description`, `medium`, `dimensions`, `year`, `role`, `liveUrl`,
`repositoryUrl`, `src` (on an image and on each entry of `sources`, in both
`src` and the `srcset` built from them), and `image.alt` (on a piece's
`image`, a project's `cover`, and each of a tech project's `screenshots`).

`alt` needs particular care: unlike every other free-text field, which
typically lands inside an HTML element's text content, `alt` is rendered
inside an HTML **attribute** (`<img alt="…">`). A bare `"` in an unescaped
`alt` value breaks out of the attribute, so `alt` must be escaped with an
attribute-safe escaper (one that also encodes `"` and `'`, not just `<`,
`>` and `&`), not merely the escaper used for element text content.

## Publication, membership and curation rules

- **Drafts may be incomplete**, but every record still needs safe structural
  fields: a valid id, slug and state, correctly typed values, and safe URLs.
  Publication requirements are enforced only when `state` is `'published'`.
- **Draft records never appear in public lists or count totals.**
- **An art piece belongs to zero or one project.** Membership must agree in
  both directions: if a project lists a piece, that piece's `projectId` must
  name the project, and vice versa. A piece cannot be listed by two projects.
- **An empty art project stays a draft** until it contains at least one
  published piece. Unpublishing or deleting a project's last published piece
  returns the project to draft and drops its favorite.
- **Curated targets must exist and be published.** Duplicate references and
  duplicate orders are rejected.
- **Favoriting is independent.** Favoriting a project does not favorite its
  pieces, and favoriting a piece does not favorite its project; a project and
  one of its own pieces may both be favorites. Art favorites and tech starred
  entries are separate lists with separate orders.
- **Removing a favorite leaves the source record intact.** Unpublishing or
  deleting a record removes its curated references so no card can dangle.
- A favorited item still appears in its ordinary Projects or Explore listing.
  Repetition across sections is intentional.

## What `publishedPortfolio` guarantees

The projection is the safe input for rendering. It is built by whitelist, so a
field the renderer does not expect cannot appear.

- Only `state: 'published'` records, each with a usable image: safe `src`,
  meaningful `alt`, and positive `width`/`height`. A record failing any of
  those is dropped rather than rendered broken.
- Art projects with no surviving published piece are dropped; `pieceIds` is
  filtered to surviving members in the curated order.
- A piece's `projectId` is present only when that project also survived, so a
  detail page never links to an unpublished collection.
- `artFavorites` and `techStarred` are de-duplicated, filtered to surviving
  targets, and sorted ascending by `order` (the stored `order` values are
  preserved). Resolve each entry by `id` against the projected collections.
- Optional arrays (`styleIds`, `pieceIds`, `screenshots`, `sections`,
  `technologies`) are always present, possibly empty. `styleIds` is filtered
  to defined styles; blank sections, blank technologies and unsafe
  `liveUrl`/`repositoryUrl` values are dropped.
- `sourceSubmissionId` and any unknown field are **not** carried into the
  projection, so authoring provenance never reaches public HTML.
- Non-object or malformed input yields an empty portfolio instead of throwing.

Validation and the projection are separate jobs: validate before a build so
problems are visible, then render from the projection so a mistake still
cannot emit unsafe or half-finished markup.

## Draft privacy: the existing public inbox

The Supabase `portfolio-inbox` storage bucket is **public-read** by design
(see `docs/supabase-schema.sql`). Anyone who knows or guesses an object path
can fetch an uploaded file, whether or not the record referencing it is a
draft here.

Consequences for drafts:

- `state: 'draft'` keeps a record out of public pages and totals. It is **not**
  a guarantee that the underlying image is unreachable.
- Treat inbox URLs as already public. For work that must stay unseen, keep the
  media out of the inbox, or accept that the file (not the page) is reachable.
- Submission rows themselves require authentication to read, so titles,
  descriptions and layout proposals are not public — only bucket objects are.
- Prefer local `assets/…` sources for canonical records: they are the only
  media the public build copies deliberately.

## Safe public output

1. Edit `content/portfolio.json` (owner editor, or a deliberate local edit).
2. Run `validatePortfolio` and fix every reported error. An empty array is the
   gate for everything downstream.
3. Render from `publishedPortfolio(document)` only.
4. Build the public output directory. It must contain the generated pages, the
   existing Home and assets, and the runtime scripts — and must **exclude**
   `content/portfolio.json`, drafts, `tests/`, `docs/` and `.env`. Shipping the
   canonical JSON would publish every draft.
5. Review the built site, then deploy separately. Building is not deploying,
   and exporting from the owner editor is neither.

### Building into `--out DIR`

`node scripts/build-portfolio.mjs --out DIR` writes and never deletes. It copies
the allowlisted files and writes every rendered page, but it prunes nothing:
recursively deleting a directory the caller named is not a risk this script
takes, so a detail page that has since been unpublished would survive a rebuild
into a directory that already holds it.

**Build into a fresh or cleared directory.** Delete `DIR` yourself first, or
point `--out` somewhere new. The in-repository build (`node
scripts/build-portfolio.mjs`, no flags) is the one that cleans up after itself,
from `content/generated-pages.json`.

`DIR` must also sit outside the repository. `--out .` from the root would copy
every file over its own source, and a nested output directory would be swept
into the next build's copy step; the build refuses both with an error.

`DIR` is what you deploy — not the repository folder. `docs/launch-checklist.md`
walks that through for GitHub Pages: build to a sibling directory, publish that
directory to a `gh-pages` branch, and point Pages at it. Serving the repository
root instead would publish `content/portfolio.json`, and with it every draft.

### `--site-base` and the not-found page

`node scripts/build-portfolio.mjs --site-base /Portfolio/` sets the absolute
root every link on `404.html` is written against. It affects that page and no
other, and defaults to `/`.

The reason it exists: a static host serves `404.html`'s bytes **at the address
that was requested**, so unlike every other page it has no fixed depth of its
own. This site's deep addresses are the detail routes,
`art/pieces/{slug}/index.html` — exactly what a renamed slug or an unpublished
record leaves behind. A relative `styles.css` on that page would resolve to
`art/pieces/{slug}/styles.css`, so the visitor would get an unstyled page whose
every link 404s in turn. Absolute URLs are the only ones correct at every depth.

Set it to `/` for a user site or an apex domain, and to the project path for a
GitHub project site (`/Portfolio/` for
`jasonjosephit.github.io/Portfolio/`). Every other page stays relative on
purpose, so the site keeps working from any subdirectory.

### Missing image files

The build warns — on stderr, without failing — for any published image whose
`src` is a local path with no file behind it, naming the record and the path.
No other stage can: `validatePortfolio` is pure by design and never touches the
filesystem, and the importer only ever sees the one image it was handed. The
page still renders, with its quiet "Image unavailable" frame; the warning is so
that Jason hears about it before a visitor does.

### Hosting requirements

Because `404.html`'s references are absolute (see above), the page itself no
longer cares what depth it is served from — that is what `--site-base` buys.
What the host still has to do is serve that file's bytes for a request that
does not otherwise resolve, since nothing does this on its own for a static
site. Configure the not-found handler as a root-relative rewrite to
`/404.html` (the default on Netlify, Cloudflare Pages, GitHub Pages and S3
static hosting): with that in place, a request for `/art/pieces/missing/`
still gets `404.html`'s bytes, and because every reference inside it is
absolute, the page renders styled with working links at that depth too.

## The owner workflow

There is no single button that takes a photo from the inbox to a public page,
and there should not be. A browser cannot write to a git repository, so the loop
crosses that boundary once, deliberately, with a file the owner carries across
it. Every step below says what it does and — as importantly — what it does not.

### 1. Submit to the inbox

`admin/submissions/` is unchanged: it uploads the original file to the
`portfolio-inbox` bucket and inserts a `submissions` row with
`status: 'submitted'`. The uploaded bytes are never rewritten after this point,
by anything downstream.

### 2. Write a structured draft for it

Open `admin/content/` (Content in the admin navigation, or `?edit=1` on a
gallery page, which now redirects here). Sign-in is checked before any of the
editor is shown and before any Supabase call is made.

Under **Inbox**, choose a submission and press **Write draft**. Pick the record
type, then supply the title, the alt text and any metadata **yourself**:

- Nothing is derived from the filename.
- A submission's tags are shown for reference. **Tags are not styles.** Styles
  are a separate vocabulary you define under Styles, and they are assigned to a
  piece after import, not at import time.

**Save proposal to submission** writes the draft back onto that submission's own
`layout` column as
`{ schemaVersion: 1, mode: 'structured', record: { …, state: 'draft' }, replaces }`
and moves the row to `status: 'ready_to_place'`. Any non-structured layout the
column already held is kept under `replaces` rather than discarded.

The record is written `state: 'draft'` whatever the form said, the row is never
set to `placed`, and no public page changes. Nothing here publishes anything.

### 3. Export the proposal file

**Export proposal file** collects every `ready_to_place` row that carries a
structured layout and hands the browser
`submission-proposals.json`. That is a download to your machine. It is not a
commit, not a publication and not a deployment.

### 4. Import it, deliberately, in the repository

```sh
node scripts/import-portfolio.mjs --input ~/Downloads/submission-proposals.json --download
```

The importer reads **only that file**. It never queries Supabase, never lists
the inbox, and never marks a submission placed. Deciding what to import is your
job; the proposal file is the record of that decision.

- **Idempotent by `sourceSubmissionId`.** A submission already represented in the
  document is skipped, so a re-import cannot duplicate a record, renumber an id,
  overwrite a local edit or disturb a curated reference.
- **Everything arrives as a draft**, whatever the proposal claims.
- **All-or-nothing.** A proposal that cannot be read, an image that is not where
  it was promised, a failed download, or a result that does not validate: any of
  those and `content/portfolio.json` is left exactly as it was, with no
  half-written file and no orphaned asset.
- **A legacy drag placement is refused, never reinterpreted.** A layout carrying
  `x_pct`, `y_px`, `width_pct`, `free_position`, `after_selector` or `container`
  describes a page that no longer exists. Turning those offsets into structured
  content would invent a placement nobody chose, so the importer stops and asks
  you to re-save the proposal from the content editor.
- **`projectId` cannot be set at import time.** Import the piece, then assign it
  to a project in the editor, where membership is kept honest in both
  directions.

Media, in preference order:

| Source | Behaviour |
| --- | --- |
| `local_image` on the proposal | Preferred. The bytes are already in the working tree; nothing is fetched. The path must be a safe repo-relative asset path and the file must exist, or the import is refused. |
| `image_url` with `--download` | Fetched to `assets/<slugified name>-<submission id>.<ext>` — an immutable, ASCII-only filename, so a re-import lands on the same path. The bytes are written verbatim and the write is verified before the canonical document is touched. |
| Neither | The record keeps whatever `src` the proposal carried. |

That last row has a sharp edge worth knowing: the editor prefills a proposal's
image path with the local path the asset *would* get, so importing without
`--download` and without `local_image` produces a draft naming a file that is
not in the working tree yet. The record is still a draft and the built page
degrades to the "Image unavailable" state rather than breaking, but the file has
to arrive before that record is published. Pass `--download`, or supply
`local_image`, unless you are deliberately going to put the file there yourself.

`--content PATH` points the importer at a different canonical document and
`--root DIR` at a different working tree; both exist for tests and neither is
part of the normal loop.

### 5. Edit the canonical file locally

Back in `admin/content/`, **Open a content file** and choose your local
`content/portfolio.json`. The editor never reads content from the public site
and never loads drafts from a server — you hand it the file.

From there: create, edit and delete records; publish and return to draft;
assign pieces to projects and order them; add and remove Art Favorites and
Starred projects and reorder them with **Move up** / **Move down**; define
styles; write About and contacts. Every rule comes from
`lib/portfolio-content.mjs`, so the editor refuses exactly what a build would.
**Checks** shows the current `validatePortfolio` output at all times, and a
message that names a field is shown beside that field.

**Export content file** downloads `portfolio.json`. **Save it over
`content/portfolio.json` yourself.** The editor cannot do that, does not claim
to, and exporting is neither publishing nor deploying.

### 6. Validate, render, review

```sh
node scripts/build-portfolio.mjs --check   # are the committed pages current?
node scripts/build-portfolio.mjs           # regenerate them in place
```

Fix every error the build reports, then look at the result in a browser.

### 7. Deploy, separately

Deployment is its own decision and its own step. Nothing in this workflow
performs it, and nothing in this workflow should be read as having performed it.

What you deploy is a `--out DIR` build, never the repository folder — see
"The canonical file never ships" below, and `docs/launch-checklist.md` for the
GitHub Pages steps.

### 8. Mark what is now live as placed

`node scripts/mark-placed.mjs <id>` sets a submission to `status: 'placed'`.
Nothing else in this workflow does — not the editor, not the importer — because
only you know when the work is actually on the live site.

This is a real step, not an optional tidy. Until a submission is marked placed
it stays in the inbox count, and **Export proposal file** re-exports it on every
run alongside the ones you have not yet imported.

### The canonical file never ships

`content/portfolio.json` holds your drafts. `node scripts/build-portfolio.mjs
--out DIR` builds from an explicit allowlist — `index.html`, `styles.css`,
`gallery.css`, `gallery.js`, `assets/`, `admin/`, `lib/`, plus the rendered
pages — so `content/`, `tests/`, `docs/`, `scripts/` and `.env` are all absent
from the output by construction. Shipping the canonical JSON would publish every
draft.

`admin/` and `lib/` are in that allowlist on purpose: the deployed site carries
the editor and the schema module so you can run the workflow above against the
live inbox. Both are behind the same Supabase sign-in as the rest of `admin/`,
and no public page imports either of them.

### The retired placement pipeline

The drag-to-place overlay is gone. `admin/edit.js` is now a redirect to this
editor, kept only so a bookmarked `?edit=1` link lands somewhere useful, and no
gallery page imports an admin module any more.

Three pieces of the old pipeline are still in the repository and still work.
None of them runs on its own, and nothing in the structured workflow invokes
them:

- **`scripts/fetch-pending.mjs`** queries every `ready_to_place` row with the
  service-role key and downloads each image into `assets/`. Its output shape —
  the submission row plus a `local_image` path — is exactly what
  `scripts/import-portfolio.mjs --input` accepts, so it remains a usable way to
  get inbox bytes into the working tree in bulk. Two cautions: it names files
  `photo-NN.<ext>` sequentially rather than by immutable submission id, so its
  paths are not stable across runs; and it fetches the whole pending set rather
  than the submissions you chose. **Run it only when you mean to.** It is never
  run automatically, and the importer will not reach for it.
- **`scripts/mark-placed.mjs`** sets a row to `status: 'placed'`. Nothing in the
  structured workflow marks a submission placed — not the editor, not the
  importer — because only you know when the work is actually live. Run it
  yourself, after deploying, if you want the inbox to reflect that.
- **The `/place-image` command** belonged to the retired pipeline: it edited the
  gallery pages directly, which the structured system does not do, and its
  layout keys are the ones `isLegacyLayout` now refuses. Its body has been
  replaced with a deprecation notice — running the old steps would edit
  generated files, and the next build would overwrite them. The file itself is
  kept because deleting the owner's tooling is his call.

## Fixture examples

The record below is **fixture data invented for documentation**. It is not
Jason's work, and it must not be copied into `content/portfolio.json`, into a
page, or into any public output. The same applies to every value in
`tests/portfolio-content.test.mjs`, which carries its own fixture notice.

```jsonc
// FIXTURE — illustration only.
{
  "schemaVersion": 1,
  "about": "",
  "contacts": [{ "label": "Email", "url": "mailto:fixture@example.com" }],
  "styles": [{ "id": "style-fixture", "name": "Fixture Style" }],
  "artPieces": [
    {
      "id": "piece-fixture-1",
      "slug": "fixture-doorway",
      "title": "Fixture Doorway",
      "state": "published",
      "image": {
        "src": "assets/fixture-doorway.jpg",
        "alt": "Fixture: a doorway lit from inside at dusk",
        "width": 1600,
        "height": 1067
      },
      "year": "2024",
      "styleIds": ["style-fixture"],
      "projectId": "art-project-fixture-1"
    }
  ],
  "artProjects": [
    {
      "id": "art-project-fixture-1",
      "slug": "fixture-series",
      "title": "Fixture Series",
      "state": "published",
      "cover": {
        "src": "assets/fixture-cover.jpg",
        "alt": "Fixture: an empty gallery wall",
        "width": 1600,
        "height": 1200
      },
      "pieceIds": ["piece-fixture-1"]
    }
  ],
  "artFavorites": [
    { "type": "art-project", "id": "art-project-fixture-1", "order": 0 },
    { "type": "piece", "id": "piece-fixture-1", "order": 1 }
  ],
  "techProjects": [],
  "techStarred": []
}
```

## Tests

```sh
node --test tests/*.test.mjs
```

`node --test tests/` does **not** work: Node resolves `tests` as a module
specifier rather than a directory. Use the glob.

| Suite | Covers |
| --- | --- |
| `tests/portfolio-content.test.mjs` | The schema, validation, the projection and the curation transforms. |
| `tests/portfolio-render.test.mjs` | The static renderer and the build CLI. |
| `tests/portfolio-editor.test.mjs` | The editor's data transforms in `admin/content-model.mjs`, and that the public build carries the editor. |
| `tests/portfolio-import.test.mjs` | The importer end to end against a throwaway working tree, with `fetch` injected so the suite stays offline. |

Node 22, no dependencies, no `package.json`.
