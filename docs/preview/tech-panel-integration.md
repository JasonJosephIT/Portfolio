# Tech project explorer

The Tech index uses the selected A concept: a large active project, visible neighbors, horizontal switching, and independent vertical reading. Keyboard arrows, touch swipes, project/section pickers, saved reading positions, images, and video are supported.

## Source of truth

The default source is now the Open Thoughts **approved public enrichment API**, not exports/drafts. Run:

```sh
pnpm pull
pnpm build
```

The pull script reads only GET /v1/snapshot from the configured HTTPS endpoint, validates every public record's approval and structured portfolio fields, and writes content/bundle-public. Projects absent from the public snapshot are absent from the site. Private/context-only/excluded publishing metadata and unapproved records are rejected. Fetch errors fail; no draft fallback occurs. Withdrawals are reflected by the next pull and build. Open Thoughts files are read-only throughout.

An empty snapshot produces an empty list and no fabricated profile. Tests can explicitly select a fixture with BUNDLE_DIR. Older public records without structured fields normalize to the standard with unknown facts left empty.

The five public-import tests cover approved content, exact eight-section preservation, empty/withdrawn lists, rejection of drafts/private/excluded records, factual-review validation, and relation filtering. The live configured endpoint currently returns no approved public records; the preview correctly displays an empty state.

## Eight-section presentation

Canonical order: Overview; Problem and audience; Your role and scope; Approach and key decisions; Challenges and solutions; Outcome and evidence; Reflection; Links. All sections come from the same public enriched record. Missing fields do not justify invented text. Internal review statuses and source references are not rendered.

Site palette: dark board, bone text, cyan, navy, amber, and coral accents. Directional instruction text is removed. The standards and schema are vendored from Open Thoughts.

## Correction

An earlier local preview used eight unapproved projects from exports/drafts. That was the wrong source. Its importer has been removed, its files are no longer a default input, and the served site has been rebuilt from the public snapshot. Earlier ignored preview files are retained locally but are not rendered or published.

Photography's deferred sliding concept remains in docs/photography-sliding-bookmark.md.
