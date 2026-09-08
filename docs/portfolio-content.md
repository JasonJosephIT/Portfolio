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
| `docs/portfolio-content.md` | Task 1 (Task 3 appends the owner workflow) | This document. |
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
it is rendered, except `id`, `slug`, `src` (on an image and on each entry of
`sources`), `liveUrl` and `repositoryUrl`** — those are already constrained
by the id/slug patterns or by `safeUrl`, so they are safe to place in `href`,
`src` or route-building code as-is. Numeric fields (`width`, `height`,
`order`, `focalPoint.x`, `focalPoint.y`) are constrained to numbers and never
need escaping. Do not special-case this list by field name in the renderer;
treat it as "escape every string except the six named above," because it is
easy for a new free-text field to be added later and be missed by an
enumeration. That currently includes, but is not limited to: `title`,
`caption`, `summary`, `about`, `sections[].title`, `sections[].body`,
`technologies[]`, `contacts[].label`, `styles[].name`,
`styles[].description`, `medium`, `dimensions`, `year`, `role`, and
`image.alt` (on a piece's `image`, a project's `cover`, and each of a tech
project's `screenshots`).

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
node --test tests/portfolio-content.test.mjs
```

Node 22, no dependencies, no `package.json`.
