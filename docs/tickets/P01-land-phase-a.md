---
id: P01
title: Land the staged cleanup as its own PR, tag static-final
status: open
type: HITL
phase: A
repo: Portfolio (main checkout ~/Projects/Portfolio)
claimed-by:
---
# P01 — Land the staged cleanup as its own PR, tag `static-final`

**Blocked by:** —
**Spec:** user stories 22, 23; Migration phases A; migration ticket.

## What to build
The staged changes in the main checkout (`git diff --cached --stat`: 44 files, about 11,300 lines removed; the spec says 46) go onto a new branch as they are, committed as `chore: retire the generated-gallery system`, and become a PR. No agent edits, resets, stashes or discards them. After Jason merges it, he tags that merge commit `static-final`; rollback is redeploying that tag.

Watch-outs found while slicing:
- `styles.css` is both staged and modified in the working tree (8 unstaged lines). Jason decides whether those 8 lines join the PR.
- `.agents/`, `CONTEXT.md`, `docs/portfolio-design-brief.md` (re-added), `docs/specs/` and `docs/wayfinder/` are untracked in the main checkout. The spec, map and CONTEXT.md are also committed on the tickets branch; identical content merges cleanly.

## Acceptance criteria
- [ ] A branch and PR titled `chore: retire the generated-gallery system` holds exactly the staged set.
- [ ] The PR body says the reversal of the generated-gallery system is intended.
- [ ] After merge, `git tag static-final <merge-sha>` exists (pushing the tag is Jason's call).

## Notes
- If Jason wants an agent to cut the branch: `git switch -c chore/retire-generated-gallery` then `git commit` (staged set only, no `-a`). Confirm with Jason first; that is the only allowed write.
