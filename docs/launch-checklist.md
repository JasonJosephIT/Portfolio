# Launch Checklist — Jason's Portfolio

**What you're launching:** a 3-page portfolio site (Home / Art / Tech) built as plain HTML and CSS — no build step, no frameworks — plus a private admin pipeline (Supabase for sign-in and submissions, and a browser-based content editor) that only you use to add photos and projects. The editor runs in your browser and can't write to your repository — you export a file from it and save or import that file yourself, then regenerate the pages.

**Recommended path:** GitHub Pages (free static hosting built into GitHub, where your code already lives), with an optional custom domain later.

**Total cost:** **$0/month** (GitHub Pages free + Supabase free tier). A custom domain, if you want one, is ~$10–15/**year**.

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
  - *The pipeline you built:* serve the site locally, sign in at `/admin/` with a magic link (a sign-in email with a one-time link — no password), and submit each photo as before. Then open the **Content** editor (`/admin/content/`, linked from the Dashboard): under **Inbox**, pick the submission, press **Write draft**, fill in the title and alt text yourself, **Save proposal to submission**, then **Export proposal file** to download it. Tell your agent: *"Import this proposal file and rebuild the site"* — it runs `node scripts/import-portfolio.mjs --input <file> --download` (adds the photo as a **draft**) and `node scripts/build-portfolio.mjs` (regenerates the pages). It's still private until you publish it: reopen the Content editor, use **Open a content file** to load your local `content/portfolio.json`, mark the piece published, **Export content file**, and save that download over `content/portfolio.json` yourself — the editor can't touch your repository, only you can. Then rebuild once more. This also doubles as your pipeline's first real test (Phase 5).
  - *The direct way:* tell your agent to add the photo as a published entry directly in `content/portfolio.json` (following the schema in `docs/portfolio-content.md`) and run `node scripts/build-portfolio.mjs` to regenerate the pages.
  **You'll know it worked when...** the gallery reflows nicely at desktop, tablet, and phone widths with your actual work, and `node scripts/build-portfolio.mjs --check` reports "Generated pages are up to date."

- [ ] 🤝 **Fill in the Tech page** (20–40 min). `tech.html` is generated too, so projects go into `content/portfolio.json`, not the page itself. Gather: project names, one-sentence summaries, a cover image for each, technologies/tags, and links.
  > Tell your agent: *"Add these tech projects to content/portfolio.json as published techProjects, following the schema in docs/portfolio-content.md, then run node scripts/build-portfolio.mjs"* — then paste your list. (You can also add them one at a time through the Content editor's Inbox, the same way as photos above, if you'd rather submit and review each one first.)
  **You'll know it worked when...** tech.html shows real project cards instead of a blank page.

---

## Phase 2 — Supabase production settings

Supabase is the service that receives your photo submissions. It's already built and tested; three settings make it launch-ready. All of these live at **supabase.com/dashboard → project `jason-portfolio`**.

- [ ] 🧑 **Put your service-role key in `.env`** (5 min). The service-role key is the master key your local scripts use to mark submissions as placed. Agents can't fetch it for you, and it must never be committed or pasted into chat.
  Go to **Project Settings → API keys**, copy the `service_role` key, then edit the file `.env` in your project folder (copy `.env.example` if it doesn't exist) so it reads:
  ```
  SUPABASE_URL=https://nflhxvypzahwbpxjogbt.supabase.co
  SUPABASE_SERVICE_KEY=<paste the service_role key here>
  ```
  `.env` is git-ignored (listed in a file that tells git what never to upload), so this stays on your machine only.
  **You'll know it worked when...** after placing a test submission, `node scripts/mark-placed.mjs <id>` prints `placed: <id>` instead of a "no row updated" error.

- [ ] 🧑 **Disable public sign-ups** (2 min). Right now anyone who found your site's code could create an account and drop junk into your submission inbox. Go to **Authentication → Sign In / Up** and turn **off** "Allow new users to sign up" *after* you've signed in at `/admin/` at least once (your account must exist first).
  **You'll know it worked when...** the setting shows disabled, and your own magic-link sign-in still works.

- [ ] 🧑 **Add your live site URL to the auth allow-list** (5 min — do this after Phase 3 gives you a URL). Magic-link emails only redirect to pre-approved addresses. Go to **Authentication → URL Configuration**: set **Site URL** to your live site (e.g. `https://jasonjosephit.github.io/Portfolio/`), and add to **Redirect URLs** both that URL and `http://localhost:8080/**` (so local editing keeps working).
  **You'll know it worked when...** a magic link requested from the live `/admin/` page lands you back on the live page, signed in.

---

## Phase 3 — Push and deploy (GitHub Pages)

Your repo `JasonJosephIT/Portfolio` already exists on GitHub; local `main` is 11 commits ahead (all the pipeline work). GitHub Pages will serve the site straight from the repo — no build step needed since the site is plain HTML.

- [ ] 🤝 **Push everything to GitHub** (2 min).
  > Tell your agent: *"Push main to origin."*
  **You'll know it worked when...** github.com/JasonJosephIT/Portfolio shows the latest commit ("docs: mark submission-pipeline plan tasks complete" or newer).

- [ ] 🧑 **Turn on GitHub Pages** (5 min). On github.com, open your repo → **Settings → Pages** → under "Build and deployment", set Source to **Deploy from a branch**, pick branch **main** and folder **/ (root)**, and save. GitHub takes a minute or two to publish.
  Note: this makes the whole repo public-web-readable — that's fine here by design (the Supabase "anon" key in `admin/config.js` is meant to be public; write access is protected by sign-in, which Phase 2 locked down).
  **You'll know it worked when...** `https://jasonjosephit.github.io/Portfolio/` loads your homepage with a padlock (HTTPS) in the address bar.

---

## Phase 4 — Optional: custom domain

Skip this entirely if `jasonjosephit.github.io/Portfolio` is fine for now — you can add a domain any time without redoing anything else.

- [ ] 🧑 **Buy a domain** (15 min, ~$10–15/year). Any registrar works (Namecheap, Cloudflare, Porkbun). Pick something like `jasonjoseph.dev` or `jasonjoseph.art`.
- [ ] 🧑 **Connect it** (15 min + up to a day of waiting). In your repo's **Settings → Pages → Custom domain**, enter the domain. Then at your registrar, add the DNS records GitHub shows you (DNS is the internet's address book — these records point your domain at GitHub's servers). Check **Enforce HTTPS** once it's verified. DNS changes can take up to 24 hours to spread, usually much less.
- [ ] 🧑 **Update Supabase** (2 min). Add the new domain to the auth Site URL / Redirect URLs from Phase 2.
  **You'll know it worked when...** your domain loads the site with HTTPS, and a magic link from `yourdomain.com/admin/` signs you in there.

---

## Phase 5 — Pre-launch smoke test (walk it like a stranger)

The site isn't launched until this passes on the **live** URL, not localhost.

- [ ] 🧑 **As a visitor** (10 min): on your phone and a desktop browser, open the live Home, Art, and Tech pages. Check: no horizontal scrolling at any size, every photo loads, Art gallery photos shift from grayscale to colour on hover (desktop), nav highlights the current page, and **no admin controls are visible anywhere** — there's no more on-page edit overlay at all; even a bookmarked `?edit=1` link just redirects to the sign-in-gated Content editor.
- [ ] 🧑 **As the admin — one full loop on the live site** (20 min): request a magic link at `/admin/`, sign in, submit a test photo → in the Content editor, write and save its draft under Inbox, export the proposal file → tell your agent to import it (`node scripts/import-portfolio.mjs --input <file> --download`) and rebuild (`node scripts/build-portfolio.mjs`) → back in the Content editor, open your local `content/portfolio.json`, publish the piece, export it, and save that export over `content/portfolio.json` yourself (this is the one step the editor genuinely cannot do for you) → rebuild once more → push and deploy → confirm the photo appears on the live page for a normal visitor. This is the one flow that has never been human-tested end to end (everything downstream of it has been verified by agents).
  **You'll know it worked when...** the loop completes without ever touching the Supabase dashboard, and `node scripts/build-portfolio.mjs --check` reports "Generated pages are up to date."

---

## Phase 6 — After launch

- [ ] 🤖 **Optional: privacy-friendly visit counts** (10 min). A static portfolio doesn't need heavy analytics; a lightweight, cookie-free option like GoatCounter (free) or Plausible (~$9/mo) tells you if anyone's visiting.
  > *"Add GoatCounter analytics to the three portfolio pages — the script tag only, no cookies, and note it in docs."*
- [ ] 🧑 **When something breaks, look here:** photo submissions misbehaving → Supabase dashboard → **Logs**; a page looking wrong → your browser's DevTools console (right-click → Inspect → Console); site not updating after a push → repo **Actions** tab (Pages deploys show there). Error-tracking services (Sentry etc.) are overkill for a static site — skip them.
- [ ] 🧑 **Housekeeping:** keep `.env` out of screenshots and chats; your magic-link email inbox *is* the admin password, so keep that email account secure (2-factor authentication on Gmail).

---

*Generated 2026-07-20 from an audit of the actual codebase. Stack detected: plain HTML/CSS (no build), Supabase (auth + storage + Postgres, free tier), Node 18 scripts, GitHub remote already configured.*
