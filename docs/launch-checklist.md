# Launch Checklist — Jason's Portfolio


**Recommended path:** GitHub Pages (free static hosting built into GitHub, where your code already lives), with an optional custom domain later.


**Total time:** roughly 1–2 hours of your attention, spread out (DNS for a custom domain can take up to a day to take effect).

**Legend**
- 🧑 **You** — needs your identity, accounts, or a decision. An agent can't (or shouldn't) do this for you.
- 🤖 **Agent** — paste the given prompt into your coding agent.
- 🤝 **Together** — the agent prepares it, you click the final button or paste in a value.

---

## Phase 1 — Content (the real launch blocker)

Your site's plumbing is done, but the shelves are nearly empty: the Art gallery has one test photo and the Tech page has no projects yet. A portfolio launches on its content.

- [ ] 🧑 **Decide on "Soul Study I"** (5 min). The photo currently in the gallery was placed as an end-to-end test (it's a downscaled copy of your hero image). Keep it if you like it there.
  > If you want it removed, tell your agent: *"Revert commit db1a467 (the Soul Study I test placement) and delete assets/photo-01.jpg."*
  **You'll know it worked when...** art.html shows the gallery you intend, with no accidental duplicates of the hero image.

- [ ] 🤝 **Add your real photos** (30–60 min, fun part). `art.html` is generated from `content/portfolio.json` (a JSON file listing every piece) — there's no more dragging a photo into place. Two ways to get one in:
  - *The direct way:* tell your agent to add the photo as a published entry directly in `content/portfolio.json` (following the schema in `docs/portfolio-content.md`) and run `node scripts/build-portfolio.mjs` to regenerate the pages.
  **You'll know it worked when...** the gallery reflows nicely at desktop, tablet, and phone widths with your actual work, and `node scripts/build-portfolio.mjs --check` reports "Generated pages are up to date."

- [ ] 🤝 **Fill in the Tech page** (20–40 min). `tech.html` is generated too, so projects go into `content/portfolio.json`, not the page itself. Gather: project names, one-sentence summaries, a cover image for each, technologies/tags, and links.
  > Tell your agent: *"Add these tech projects to content/portfolio.json as published techProjects, following the schema in docs/portfolio-content.md, then run node scripts/build-portfolio.mjs"* — then paste your list. (You can also add them one at a time through the Content editor's Inbox, the same way as photos above, if you'd rather submit and review each one first.)
  **You'll know it worked when...** tech.html shows real project cards instead of a blank page.

---

## Phase 3 — Push and deploy (GitHub Pages)

Your repo `JasonJosephIT/Portfolio` already exists on GitHub; local `main` is 11 commits ahead (all the pipeline work).

**Read this bit before you start — it's the one thing that isn't obvious.** Your repository folder and your website are *not* the same set of files. The repository also holds `content/portfolio.json`, which is your working notebook: every **draft** you haven't published, and the id of the submission each record came from. If GitHub Pages served the repository folder directly, that file would be on the open web — anyone could read your unfinished work at `.../content/portfolio.json`. So the site is **built** into a separate folder that contains only what the public should see (the pages, the stylesheets, the images, the sign-in-gated admin screens), and *that* folder is what gets published. The build does this by an explicit list of what may be copied, so drafts, notes, scripts and `.env` can't slip through.

- [ ] 🤝 **Push everything to GitHub** (2 min).
  > Tell your agent: *"Push main to origin."*
  **You'll know it worked when...** github.com/JasonJosephIT/Portfolio shows the latest commit ("docs: mark submission-pipeline plan tasks complete" or newer).

- [ ] 🤝 **Build the public folder and publish it to a `gh-pages` branch** (10 min). `gh-pages` is a second branch used for nothing but the built website; your source stays on `main` and is never served.
  > Tell your agent: *"Build the public site with `node scripts/build-portfolio.mjs --out ../portfolio-public --site-base /Portfolio/`, then publish the contents of `../portfolio-public` to the `gh-pages` branch of origin (create the branch if it doesn't exist, replacing its previous contents), and confirm `content/`, `docs/`, `tests/`, `scripts/` and `.env` are absent from what you pushed."*
  Two details worth knowing: the build refuses to write inside the repository (that's why the folder is `../portfolio-public`, a sibling of your project folder — it's a scratch folder, safe to delete and rebuild any time), and `--site-base /Portfolio/` tells the "page not found" page where the site's root is. You need it because your site lives at `jasonjosephit.github.io/**Portfolio**/` rather than at the top of a domain; if you later move to a custom domain, the value becomes `/`.

- [ ] 🧑 **Turn on GitHub Pages** (5 min). On github.com, open your repo → **Settings → Pages** → under "Build and deployment", set Source to **Deploy from a branch**, pick branch **gh-pages** and folder **/ (root)**, and save. GitHub takes a minute or two to publish.
  **You'll know it worked when...** `https://jasonjosephit.github.io/Portfolio/` loads your homepage with a padlock (HTTPS) in the address bar, and `https://jasonjosephit.github.io/Portfolio/content/portfolio.json` gives you a "page not found".

- [ ] 🤝 **Whenever you add work, redeploy the same way** (2 min each time). Publishing is always: publish over `content/portfolio.json`, `node scripts/build-portfolio.mjs`, commit and push `main`, then `node scripts/build-portfolio.mjs --out ../portfolio-public --site-base /Portfolio/` (the same `--out` and `--site-base` as the Phase 3 command above — drop to `--site-base /` once you've done Phase 4) and push `gh-pages`.
  > Tell your agent: *"Rebuild and redeploy the site with `node scripts/build-portfolio.mjs --out ../portfolio-public --site-base /Portfolio/`, same as Phase 3."*
  **You'll know it worked when...** the new piece appears on the live URL, not just locally.

---

## Phase 4 — Optional: custom domain

Skip this entirely if `jasonjosephit.github.io/Portfolio` is fine for now — you can add a domain any time without redoing anything else.

- [ ] 🧑 **Buy a domain** (15 min, ~$10–15/year). Any registrar works (Namecheap, Cloudflare, Porkbun). Pick something like `jasonjoseph.dev` or `jasonjoseph.art`.
- [ ] 🧑 **Connect it** (15 min + up to a day of waiting). In your repo's **Settings → Pages → Custom domain**, enter the domain. Then at your registrar, add the DNS records GitHub shows you (DNS is the internet's address book — these records point your domain at GitHub's servers). Check **Enforce HTTPS** once it's verified. DNS changes can take up to 24 hours to spread, usually much less.
- [ ] 🤝 **Rebuild with the new root** (2 min). On a custom domain the site sits at the top of the domain, so the "page not found" page's base changes.
  > Tell your agent: *"Rebuild and redeploy with `--site-base /` from now on."*

---

## Phase 5 — Pre-launch smoke test (walk it like a stranger)

The site isn't launched until this passes on the **live** URL, not localhost.

- [ ] 🧑 **As a visitor** (10 min): on your phone and a desktop browser, open the live Home, Art, and Tech pages. Check: no horizontal scrolling at any size, every photo loads, Art gallery photos shift from grayscale to colour on hover (desktop), nav highlights the current page, and **no admin controls are visible anywhere** — there's no more on-page edit overlay at all; even a bookmarked `?edit=1` link just redirects to the sign-in-gated Content editor.

- [ ] 🤝 **Empty the inbox for anything now live** (2 min, and after every future batch). Nothing marks a submission done on its own — not the editor, not the importer — because only you know when the work is actually on the live site. Until you do, the Dashboard keeps counting it as "awaiting import", and **Export proposal file** keeps re-exporting submissions you already imported, which makes each proposal file longer and more confusing than the last.
  **You'll know it worked when...** the Dashboard's "awaiting import" count drops to the number of submissions you genuinely haven't placed yet, and a fresh **Export proposal file** contains only those.

---

## Phase 6 — After launch

- [ ] 🤖 **Optional: privacy-friendly visit counts** (10 min). A static portfolio doesn't need heavy analytics; a lightweight, cookie-free option like GoatCounter (free) or Plausible (~$9/mo) tells you if anyone's visiting.
  > *"Add GoatCounter analytics to the three portfolio pages — the script tag only, no cookies, and note it in docs."*
- [ ] 🧑 **Housekeeping:** keep `.env` out of screenshots and chats; your magic-link email inbox *is* the admin password, so keep that email account secure (2-factor authentication on Gmail).

---

