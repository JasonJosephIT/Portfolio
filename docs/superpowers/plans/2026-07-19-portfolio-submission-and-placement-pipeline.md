# Portfolio Submission & Agent Placement Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a submission backend (Supabase) and a drag-to-place edit mode to Jason's static portfolio, plus a standing `/place-image` Claude Code command that orchestrates subagents to bake each placed image into the HTML/CSS with the exact size and position Jason chose.

**Architecture:** The public site stays 100% static — no runtime JS for visitors. Supabase acts only as an inbox: uploads land in a storage bucket, metadata + layout specs land in a `submissions` table. An admin-only overlay (`admin/edit.js`, loaded via `?edit=1`) lets Jason drag/resize a pending image on the live page and saves a JSON change spec. The `/place-image` command pulls ready specs, dispatches one implementer subagent per placement to edit `art.html` / `tech.html` / `styles.css`, downloads the image into `assets/`, and marks the row placed.

**Tech Stack:** Static HTML/CSS (existing), Supabase (Postgres + Storage + magic-link auth) via `@supabase/supabase-js` v2 CDN, interact.js CDN (admin overlay only), Node 18+ for two small scripts, Claude Code custom slash command for orchestration.

## Global Constraints

- Production pages (`index.html`, `art.html`, `tech.html`) must contain no runtime JS except the 3-line `?edit=1` loader guard on `art.html` and `tech.html`.
- All admin tooling lives under `admin/`; all agent scripts under `scripts/`; the slash command under `.claude/commands/`.
- Existing design tokens in `styles.css` are the source of truth: use `var(--radius)`, `var(--space)`, `var(--accent-art)`, `var(--accent-tech)` — never hard-code replacements.
- Placement edits must preserve the masonry gallery pattern on `art.html` (`.gallery` CSS columns) and the card grid pattern on `tech.html` (`.project-grid`), unless the layout spec explicitly requires an offset override.
- Images committed to the repo go in `assets/`, filenames `photo-NN.jpg` (art) or `project-<slug>.jpg` (tech), lazy-loaded (`loading="lazy"`), with meaningful `alt` from the submission title.
- Secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`) come from `.env` (git-ignored); the anon key + URL may be embedded in `admin/` files.
- Never commit directly to `main` during plan execution; work on branch `feat/submission-pipeline`.

---

### Task 1: Repo scaffolding

**Files:**
- Create: `.gitignore`, `admin/` (dir), `scripts/` (dir), `.claude/commands/` (dir), `docs/` (dir)
- Modify: none

**Interfaces:**
- Produces: git repo on branch `feat/submission-pipeline`; directory layout all later tasks rely on.

- [x] **Step 1: Initialize repo and branch**

```bash
git init
git checkout -b feat/submission-pipeline
mkdir -p admin scripts .claude/commands docs assets
```

- [x] **Step 2: Create `.gitignore`**

```gitignore
.env
node_modules/
.DS_Store
```

- [x] **Step 3: Commit the existing site**

```bash
git add index.html art.html tech.html styles.css .gitignore
git commit -m "chore: baseline static portfolio"
```

- [x] **Step 4: Verify**

Run: `git log --oneline` → one commit; `ls admin scripts .claude/commands` → dirs exist.

---

### Task 2: Supabase schema + storage

**Files:**
- Create: `docs/supabase-schema.sql` (record of what was applied)

**Interfaces:**
- Produces: table `public.submissions` and public storage bucket `portfolio-inbox`. All later tasks use these exact names and columns.

- [x] **Step 1: Write `docs/supabase-schema.sql`**

```sql
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('photo','project')),
  title text not null,
  description text,
  tags text[] not null default '{}',
  target_page text not null check (target_page in ('art.html','tech.html')),
  image_path text,          -- path inside portfolio-inbox bucket
  link_url text,            -- projects only
  status text not null default 'submitted'
    check (status in ('submitted','ready_to_place','placed')),
  layout jsonb,             -- change spec written by edit mode (Task 4)
  created_at timestamptz not null default now()
);

alter table public.submissions enable row level security;

create policy "public read" on public.submissions
  for select using (true);
create policy "authenticated insert" on public.submissions
  for insert to authenticated with check (true);
create policy "authenticated update" on public.submissions
  for update to authenticated using (true);

insert into storage.buckets (id, name, public)
  values ('portfolio-inbox','portfolio-inbox', true)
  on conflict (id) do nothing;

create policy "inbox public read" on storage.objects
  for select using (bucket_id = 'portfolio-inbox');
create policy "inbox auth write" on storage.objects
  for insert to authenticated with check (bucket_id = 'portfolio-inbox');
```

- [x] **Step 2: Apply it** via Supabase MCP `apply_migration` (name: `submissions_pipeline`) or SQL editor, verbatim.

- [x] **Step 3: Verify**

Run (Supabase `execute_sql`): `select column_name from information_schema.columns where table_name='submissions' order by 1;`
Expected: `created_at, description, id, image_path, kind, layout, link_url, status, tags, target_page, title`.

- [x] **Step 4: Commit**

```bash
git add docs/supabase-schema.sql
git commit -m "feat: supabase submissions schema + inbox bucket"
```

---

### Task 3: Admin submit page

**Files:**
- Create: `admin/index.html`, `admin/config.js`, `admin/submit.js`

**Interfaces:**
- Consumes: `submissions` table + `portfolio-inbox` bucket (Task 2).
- Produces: `admin/config.js` exporting `getClient()` — reused verbatim by Task 4. Rows inserted with `status='submitted'`.

- [x] **Step 1: Write `admin/config.js`**

```js
// admin/config.js — shared Supabase client (anon key is safe to embed; RLS guards writes)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "PASTE_PROJECT_URL";      // e.g. https://xyz.supabase.co
export const SUPABASE_ANON_KEY = "PASTE_ANON_KEY";
export const BUCKET = "portfolio-inbox";

let client;
export function getClient() {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
```

(Implementer: fetch the real URL + anon key via Supabase MCP `get_project_url` / `get_publishable_keys` and paste them in.)

- [x] **Step 2: Write `admin/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jason — Submit</title>
  <link rel="stylesheet" href="../styles.css">
  <style>
    .admin-form { max-width: 480px; margin: 0 auto; padding: 24px;
      display: flex; flex-direction: column; gap: 12px; }
    .admin-form input, .admin-form textarea, .admin-form select {
      background:#141416; color:var(--text); border:1px solid var(--muted);
      border-radius:var(--radius); padding:10px; font:inherit; }
    .admin-form button { background:var(--accent-art); color:#000; border:0;
      border-radius:var(--radius); padding:12px; font-weight:700; cursor:pointer; }
    #status { color: var(--muted); min-height: 1.5em; }
  </style>
</head>
<body>
  <div class="page-title">
    <span class="eyebrow">Admin</span>
    <h1>Submit</h1>
    <p>Add a photo or project to the inbox, then place it with ?edit=1.</p>
  </div>

  <form class="admin-form" id="submit-form">
    <div id="auth-block">
      <input type="email" id="email" placeholder="you@email.com" required>
      <button type="button" id="send-link">Send magic link</button>
    </div>
    <select id="kind">
      <option value="photo">Photo (Art)</option>
      <option value="project">Project (Tech)</option>
    </select>
    <input type="text" id="title" placeholder="Title" required>
    <textarea id="description" rows="2" placeholder="Description"></textarea>
    <input type="text" id="tags" placeholder="tags, comma, separated">
    <input type="url" id="link_url" placeholder="Project link (projects only)">
    <input type="file" id="image" accept="image/*">
    <button type="submit">Submit</button>
    <p id="status"></p>
  </form>
  <script type="module" src="submit.js"></script>
</body>
</html>
```

- [x] **Step 3: Write `admin/submit.js`**

```js
import { getClient, BUCKET } from "./config.js";

const sb = getClient();
const $ = (id) => document.getElementById(id);
const status = (msg) => ($("status").textContent = msg);

async function refreshAuth() {
  const { data: { session } } = await sb.auth.getSession();
  $("auth-block").style.display = session ? "none" : "block";
  return session;
}
refreshAuth();
sb.auth.onAuthStateChange(refreshAuth);

$("send-link").addEventListener("click", async () => {
  const { error } = await sb.auth.signInWithOtp({
    email: $("email").value,
    options: { emailRedirectTo: location.href },
  });
  status(error ? error.message : "Magic link sent — check your email.");
});

$("submit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!(await refreshAuth())) return status("Sign in first.");

  const kind = $("kind").value;
  const file = $("image").files[0];
  let image_path = null;

  if (file) {
    image_path = `${kind}/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;
    const { error } = await sb.storage.from(BUCKET).upload(image_path, file);
    if (error) return status(`Upload failed: ${error.message}`);
  }

  const { error } = await sb.from("submissions").insert({
    kind,
    title: $("title").value,
    description: $("description").value || null,
    tags: $("tags").value ? $("tags").value.split(",").map((t) => t.trim()) : [],
    target_page: kind === "photo" ? "art.html" : "tech.html",
    image_path,
    link_url: $("link_url").value || null,
  });
  status(error ? `Insert failed: ${error.message}` : "Submitted ✓ — open the page with ?edit=1 to place it.");
  if (!error) e.target.reset();
});
```

- [x] **Step 4: Verify manually**

Run: `python3 -m http.server 8080`, open `http://localhost:8080/admin/`, sign in, submit a test photo.
Expected: row in `submissions` with `status='submitted'` (check via Supabase `execute_sql`: `select id, title, status, image_path from submissions;`) and object in `portfolio-inbox`.

- [x] **Step 5: Commit**

```bash
git add admin/
git commit -m "feat: admin submit page with magic-link auth and storage upload"
```

---

### Task 4: Drag-to-place edit mode

**Files:**
- Create: `admin/edit.js`
- Modify: `art.html` (before `</body>`), `tech.html` (before `</body>`) — 3-line loader guard each

**Interfaces:**
- Consumes: `getClient()` / `BUCKET` from `admin/config.js`; rows with `status='submitted'`.
- Produces: `layout` jsonb written to the row and `status` set to `'ready_to_place'`. Layout spec shape (contract with Task 5):

```json
{
  "page": "art.html",
  "container": ".gallery",
  "after_selector": ".gallery a:nth-of-type(3)",
  "x_pct": 4.2,
  "y_px": -12,
  "width_pct": 47.5,
  "free_position": false,
  "notes": ""
}
```

`after_selector` = the existing child the image was dropped after (`null` = first). `x_pct`/`y_px` = offset of the dropped image from where normal flow would put it; `width_pct` = width relative to the container. `free_position: true` means Jason dragged it well outside normal flow and wants an absolute/offset treatment.

- [x] **Step 1: Add the loader guard** to `art.html` and `tech.html`, immediately before `</body>`:

```html
  <script type="module">
    if (new URLSearchParams(location.search).has("edit")) import("./admin/edit.js");
  </script>
```

- [x] **Step 2: Write `admin/edit.js`**

```js
// admin/edit.js — drag-to-place overlay. Loaded only via ?edit=1.
import { getClient, BUCKET, SUPABASE_URL } from "./config.js";
import "https://cdn.jsdelivr.net/npm/interactjs@1.10.27/dist/interact.min.js";

const sb = getClient();
const page = location.pathname.split("/").pop() || "index.html";
const container = document.querySelector(page === "art.html" ? ".gallery" : ".projects .project-grid, .page-title");
const publicUrl = (p) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${p}`;

const { data: { session } } = await sb.auth.getSession();
if (!session) {
  alert("Not signed in. Open /admin/ first, sign in, then reload with ?edit=1.");
  throw new Error("no session");
}

const { data: pending, error } = await sb
  .from("submissions").select("*")
  .eq("status", "submitted").eq("target_page", page);
if (error) throw error;

// --- Tray of pending submissions ---
const tray = document.createElement("div");
tray.style.cssText =
  "position:fixed;bottom:0;left:0;right:0;z-index:99;display:flex;gap:8px;" +
  "padding:12px;background:rgba(10,10,11,.92);backdrop-filter:blur(10px);overflow-x:auto;";
tray.innerHTML = `<strong style="align-self:center">Pending:</strong>`;
document.body.appendChild(tray);

for (const sub of pending) {
  const thumb = document.createElement("img");
  thumb.src = publicUrl(sub.image_path);
  thumb.title = sub.title;
  thumb.style.cssText = "height:64px;border-radius:8px;cursor:grab;";
  thumb.addEventListener("click", () => placeOnPage(sub, thumb));
  tray.appendChild(thumb);
}

// --- Place into page, make draggable/resizable, save spec ---
function placeOnPage(sub, thumb) {
  thumb.remove();
  const img = document.createElement("img");
  img.src = publicUrl(sub.image_path);
  img.alt = sub.title;
  img.style.cssText =
    "width:40%;border-radius:12px;outline:2px dashed #ff7a4d;position:relative;z-index:50;touch-action:none;";
  container.appendChild(img);

  let dx = 0, dy = 0;
  interact(img)
    .draggable({
      listeners: {
        move(ev) {
          dx += ev.dx; dy += ev.dy;
          img.style.transform = `translate(${dx}px, ${dy}px)`;
        },
      },
    })
    .resizable({
      edges: { right: true, bottom: true },
      listeners: {
        move(ev) { img.style.width = `${ev.rect.width}px`; },
      },
    });

  const save = document.createElement("button");
  save.textContent = `Save placement: ${sub.title}`;
  save.style.cssText =
    "position:fixed;top:76px;right:16px;z-index:99;padding:10px 14px;font-weight:700;" +
    "background:#4dc3ff;color:#000;border:0;border-radius:12px;cursor:pointer;";
  document.body.appendChild(save);

  save.addEventListener("click", async () => {
    const cRect = container.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();
    const siblings = [...container.children].filter((el) => el !== img);
    // nearest existing child ABOVE the drop point
    let after = null;
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i].getBoundingClientRect().top <= iRect.top) after = i + 1;
    }
    const spec = {
      page,
      container: page === "art.html" ? ".gallery" : ".project-grid",
      after_selector: after ? `${spec_container_sel()} > :nth-child(${after})` : null,
      x_pct: +(((dx) / cRect.width) * 100).toFixed(1),
      y_px: Math.round(dy),
      width_pct: +((iRect.width / cRect.width) * 100).toFixed(1),
      free_position: Math.abs(dx) > cRect.width * 0.1 || Math.abs(dy) > 80,
      notes: "",
    };
    function spec_container_sel() { return page === "art.html" ? ".gallery" : ".project-grid"; }

    const { error } = await sb.from("submissions")
      .update({ layout: spec, status: "ready_to_place" })
      .eq("id", sub.id);
    save.textContent = error ? `Failed: ${error.message}` : "Saved ✓ — run /place-image in Claude Code";
    if (!error) img.style.outline = "2px solid #4dc3ff";
  });
}
```

- [x] **Step 3: Verify manually**

Serve locally, open `http://localhost:8080/art.html?edit=1` (after signing in at `/admin/`). Drag/resize the pending image, click save.
Expected: `select layout, status from submissions where status='ready_to_place';` shows the spec JSON.

- [x] **Step 4: Verify guard is inert for visitors**

Run: `curl -s http://localhost:8080/art.html | grep -c "edit.js"` → `1` (the guard only; no network fetch of edit.js happens without `?edit=1` — confirm in DevTools Network tab).

- [x] **Step 5: Commit**

```bash
git add admin/edit.js art.html tech.html
git commit -m "feat: drag-to-place edit mode writing layout specs to supabase"
```

---

### Task 5: Agent scripts + `/place-image` orchestration command

**Files:**
- Create: `scripts/fetch-pending.mjs`, `scripts/mark-placed.mjs`, `.claude/commands/place-image.md`, `.env.example`

**Interfaces:**
- Consumes: rows with `status='ready_to_place'` and the layout spec shape from Task 4.
- Produces: `scripts/fetch-pending.mjs` prints JSON `[{id, kind, title, description, tags, link_url, image_path, layout, local_image}]` and downloads each image to `assets/`; `scripts/mark-placed.mjs <id>` flips status to `'placed'`. The slash command is the orchestration contract Claude Code follows at runtime.

- [x] **Step 1: Write `.env.example`**

```bash
SUPABASE_URL=https://YOURPROJECT.supabase.co
SUPABASE_SERVICE_KEY=service-role-key-here
```

- [x] **Step 2: Write `scripts/fetch-pending.mjs`**

```js
// Usage: node scripts/fetch-pending.mjs
// Prints pending placements as JSON and downloads images into assets/.
import { writeFile, readdir } from "node:fs/promises";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY"); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const rows = await (await fetch(
  `${URL_}/rest/v1/submissions?status=eq.ready_to_place&select=*`, { headers: H }
)).json();

const existing = await readdir("assets").catch(() => []);
let n = existing.filter((f) => /^photo-\d+\.jpg$/.test(f))
  .reduce((m, f) => Math.max(m, +f.match(/\d+/)[0]), 0);

const out = [];
for (const r of rows) {
  const ext = (r.image_path.match(/\.(\w+)$/) || [, "jpg"])[1];
  const local = r.kind === "photo"
    ? `assets/photo-${String(++n).padStart(2, "0")}.${ext}`
    : `assets/project-${r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${ext}`;
  const img = await fetch(`${URL_}/storage/v1/object/public/portfolio-inbox/${r.image_path}`);
  await writeFile(local, Buffer.from(await img.arrayBuffer()));
  out.push({ ...r, local_image: local });
}
console.log(JSON.stringify(out, null, 2));
```

- [x] **Step 3: Write `scripts/mark-placed.mjs`**

```js
// Usage: node scripts/mark-placed.mjs <submission-id>
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
const id = process.argv[2];
if (!id) { console.error("Usage: mark-placed.mjs <id>"); process.exit(1); }
const res = await fetch(`${URL_}/rest/v1/submissions?id=eq.${id}`, {
  method: "PATCH",
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ status: "placed" }),
});
console.log(res.ok ? `placed: ${id}` : `failed: ${res.status}`);
```

- [x] **Step 4: Write `.claude/commands/place-image.md`** — the runtime orchestration contract:

```markdown
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
```

- [x] **Step 5: Verify scripts**

Run: `cp .env.example .env` (fill real values), then `node scripts/fetch-pending.mjs`.
Expected: JSON array with the Task 4 test row, image file in `assets/`.

- [x] **Step 6: Commit**

```bash
git add scripts/ .claude/commands/place-image.md .env.example
git commit -m "feat: place-image orchestration command and supabase scripts"
```

---

### Task 6: First end-to-end placement (dogfood run)

**Files:**
- Modify: `art.html` or `tech.html`, possibly `styles.css` (via the `/place-image` command itself)

**Interfaces:**
- Consumes: everything above.
- Produces: proof the whole loop works; the Task 4 test submission rendered on the live page.

- [x] **Step 1: Run the loop**

In Claude Code: `/place-image`. Expected: subagent dispatched, image inserted, status flipped to `placed`, commit created.

- [x] **Step 2: Visual check**

Serve locally, open the target page with no query params. Expected: image appears at the saved size/position, hover lift works, no admin UI visible.

- [x] **Step 3: Confirm idempotence**

Run `/place-image` again. Expected: "nothing to place".

- [x] **Step 4: Merge**

Use superpowers:finishing-a-development-branch to merge `feat/submission-pipeline`.

---

## Self-Review Notes

- Spec coverage: submit backend (T2–T3), drag-to-place with custom sizing/position (T4), agent adjusts code to bake placement (T5–T6). ✓
- Contract consistency: layout spec shape defined once in Task 4 Interfaces and consumed verbatim in the T5 command rules. `ready_to_place`/`placed` statuses match T2 check constraint. ✓
- Known simplification: `after_selector` uses nth-child, which shifts as items are added; acceptable because specs are consumed immediately after saving. Noted in the command's review step.
