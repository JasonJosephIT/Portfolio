# Application resumes and the full website resume

Jason clarified on 2026-10-19 that the references govern **section layout and styling**, not just similar content. There are three separate formats:

1. Application, business: Stanford Sample Business Resume (handbook p.34 / PDF p.8). Centered uppercase headings, serif type, a left date rail, bold entry lead-ins, compact prose. Education → Experience → Leadership → Skills.
2. Application, engineering: Stanford Sample Engineering Resume (handbook p.43 / PDF p.17). Centered small-cap-style headings with rules, sans-serif type, right dates, bold titles, bullets and categorized skills. Objective (optional) → Education → Relevant Coursework (if supported) → Projects → Experience → Activities → Skills → Professional Affiliations (if supported).
3. Website `/resume`: Haiyuan Mei's full-resume presentation. A narrow centered column, identity/contact card, stacked experience/project cards, date badges, anchored navigation, and technology tags. The page uses a separate `Resume.astro` layout; it does not inherit the Tech page's waves, gallery layout, or chat panel. Other portfolio pages retain their design.

References:
- https://careered.stanford.edu/sites/g/files/sbiybj22801/files/media/file/resume-and-cover-letter-examples.pdf#page=8
- https://careered.stanford.edu/sites/g/files/sbiybj22801/files/media/file/resume-and-cover-letter-examples.pdf#page=17
- https://haroldmei.github.io/resume/

The application templates live in the installed resume skill. Do not use the full website printout as a job-specific application resume. The website shows all current bundle projects and the supported career/community record, rather than forcing everything into one page. Its print control is labeled “Print full resume.”

## Evidence and approval

Career and community copy in `src/data/resume.json` traces to the canonical Open Thoughts source of truth (v1.1-rebuilt, 2026-10-14), sections 2–4. Career copy still has `approved_at: null` and renders only in a preview. Degree and unfinished certifications remain explicitly in progress. No private contacts, departure narrative, advisory positions, or uncertain organization names are included. LinkedIn is the verified profile URL.

Projects, summaries, and tags come from the selected content bundle. Curated technical excerpts render only while they occur verbatim in that project's current description. No facts, titles, or measurements are borrowed from the reference resumes. Approving a layout does not implicitly approve a pending content bundle or career record.

The existing raw `content/bundle` does not pass the bundle schema. Do not weaken validation or approve it to make a build pass. The local preview uses the valid `content/bundle-preview` with `PREVIEW=1`.

## Verification

The revised resume checks and responsive browser checks pass: bundle-driven project/skill rendering, exclusion of pending career copy from production HTML, draft/in-progress labels, navigation, separate full-resume layout, 320/390/768/1440px widths, project destinations, print-control behavior, and no page errors.

The full suite ran 84 tests: 83 passed; the unrelated clone-path bundle-pull test fails because its temporary clone omits `standards/portfolio.mjs`, now imported by the bundle validator. This change does not alter that validator or test. Isolated snapshots use a local `cacheDir` and Vite cache instead of the shared symlinked node_modules cache, so concurrent builds cannot pollute each other's content store.

No production deployment was performed. The content records remain pending review.
