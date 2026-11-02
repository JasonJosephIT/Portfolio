---
status: active
progress: PR #14 open (explorer + enrichment + design pass); project demo videos and real project copy pending
next_date: 2026-11-03
updated: 2026-11-02
---

# Portfolio status

## Now
- PR #14 (https://github.com/JasonJosephIT/Portfolio/pull/14) combines PR #12, the explorer branch and the design pass. Auto-fix is watching it. 16 chat tests could not run locally (Playwright build mismatch); CI is their first run.
- Demo drawings and videos: one orchestrator drawing done (scratchpad, 2026-11-02). Higgsfield balance 2.08 credits; a Seedance 2.5 clip costs 35.

## Next
1. Jason tops up Higgsfield credits (budget about $15, up to $20). Then: drawings for the other demos, then short Seedance 2.5 videos from them, product-demo style aimed at engineers.
2. Hercules: Jason is making his own drawing. Use it as the video input.
3. Aristocrat: reuse the existing design and the phone demo as video input. Find the design folder (not in ~/Projects).
4. Know Your Vote: capture screens from https://knowyour.vote (done, scratchpad `shots/kyv/`), then video.
5. Apply the content edits below to the Open Thoughts drafts (they are not published; the public feed has 0 records).

## Decisions (newest first)
- 2026-11-02 Know Your Vote: no eval results. Instead describe the eval process for the news intake, and that Jason set the standard through iterative review and verification.
- 2026-11-02 It is Know Your Vote, not "Kylene" (a dictation error).
- 2026-11-02 Outcome for the agent orchestrator: point to the projects it was used to build (Hercules, Know Your Vote, Aristocrat) as the evidence. Know Your Vote has a separate code path because it is a course. Do not explain every use case; most are private.
- 2026-11-02 No limits section where there is no data (Hercules and others). Hercules: add one short sentence on the release plan; leave out the link if none exists yet (Jason to get it).
- 2026-11-02 Remove any reflection that mentions signing in, tokens or putting something in chat.
- 2026-11-02 "Iolas" belongs to Hercules, not to Jason's code path. Do not include that gap. Training runs: not confirmed, leave out unless Jason supplies them.
- 2026-11-02 Demo videos: use the quick-generate skill or a custom Higgsfield job; Seedance 2.5 is fine; drawing first, then video from it.
- 2026-10-22 Combined the explorer branch with PR #12 on one branch rather than merging them separately.

## Open items / waiting on
- Higgsfield credits (Jason).
- Hercules drawing (Jason).
- Aristocrat design file location (Jason).
- Hercules release-plan link, if one exists (Jason).
- Close PR #12 and draft PR #13 once #14 merges.

## Idea Shelf
- Photography page with the sliding panel explorer (see docs/photography-sliding-bookmark.md in the Astro checkout).
