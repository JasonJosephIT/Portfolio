# /place-image — bake pending placements into the site

You are the orchestrator. Use superpowers:dispatching-parallel-agents rules:
placements touching DIFFERENT pages may run in parallel; placements on the
SAME page run sequentially.

1. Run `node scripts/fetch-pending.mjs` (env from `.env`). If empty, report
   "nothing to place" and stop.
2. For EACH pending row, dispatch one implementer subagent (cheap model —
   this is mechanical HTML/CSS work) with exactly this context:
   - The row's JSON (title, description, tags, link_url, local_image, layout)
   - The current contents of the target page and `styles.css`
   - These rules:
     a. kind=photo → insert `<a href="{local_image}"><img src="{local_image}"
        alt="{title}" loading="lazy"></a>` into `.gallery`, positioned after
        `layout.after_selector` (or first if null).
     b. kind=project → insert a `.project-card` (h3=title, p=description,
        `.tech-tags` from tags, `.project-link` from link_url) into
        `.project-grid`; create the Projects section from the HTML comment
        spec in tech.html if it doesn't exist yet.
     c. Sizing: if `width_pct` deviates >10% from the natural column width,
        add a scoped class in styles.css (e.g. `.gallery .wide-01 { ... }`)
        using existing design tokens — no inline styles.
     d. If `free_position` is true, apply `position: relative` with
        `left: {x_pct}%` / `top: {y_px}px` via that same scoped class.
     e. Do not touch any other markup. Use var(--radius), var(--space).
3. Review each subagent's diff yourself (spec vs. layout JSON). Reject and
   re-dispatch with findings if the placement drifts from the spec.
4. Verify: `python3 -m http.server 8080 &`, then
   `curl -s localhost:8080/{page} | grep {local_image}` returns the tag.
5. `node scripts/mark-placed.mjs {id}` for each success.
6. One commit per placement: `feat(place): {title} on {page}`.
7. Report: table of title → page → commit hash, and anything skipped.
