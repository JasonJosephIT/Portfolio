# Eight-section enrichment consumer

The approved Open Thoughts project record can carry `portfolio` using standard version `1.0.0`. Its contract is vendored in `standards/` from Open Thoughts; section and field names match the shared cloud API.

The case-study page renders all eight sections. Missing facts remain empty in the record and display as “Not yet documented.” The four original interactive topics are marked by semantic key, so a display's chapter numbers cannot change their meaning.

`PUBLIC_ENRICHMENT_API_URL` selects the approved cloud feed (defaults to the deployed Open Thoughts enrichment Worker). A page fetches its project by slug and subscribes to snapshot notifications. It reconnects and refetches after changes, reconnect, visibility changes and returning online. Offline readers retain the reviewed bundle. If a previously live record is withdrawn, its case study is hidden until it becomes public again. All live values use text nodes and validated public HTTPS links.

## Publication and compatibility

- Existing schema-version-1 bundles remain readable. Legacy records gain eight conservative display sections, using only their already approved name and summary; no personal facts are inferred.
- A record with `portfolio` must include all eight sections, valid source references and consistent missing-field state.
- Complete sections must be `reviewed` before a normal bundle import; partial sections remain `needs_input`.
- Pending bundles still require `PREVIEW=1`. This integration does not approve or publish a pending bundle.
- Structured timeline and links do not change the legacy narrative fields.

## Verify

`npm test` covers bundle validation, all eight rendered sections, source-backed author facts, missing fields and compatibility. Use `BUNDLE_DIR=tests/fixtures/bundle npm run build` when the checkout has no approved content bundle.
