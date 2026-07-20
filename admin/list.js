// admin/list.js — submissions list with a Photos ⇄ Projects toggle.
// Requires a signed-in session (RLS: submissions are authenticated-read).
import { getClient, SUPABASE_URL, BUCKET } from "./config.js";

const publicUrl = (p) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${p}`;

// Mounts into `root` (expects .kind-toggle buttons + .sub-list inside).
// Returns { refresh }. `kind` is "photo" or "project".
export function createList(root, { kind = "photo" } = {}) {
  const sb = getClient();
  const listEl = root.querySelector(".sub-list");
  const buttons = [...root.querySelectorAll(".kind-toggle button")];
  let current = kind;

  async function refresh() {
    listEl.innerHTML = `<p class="sub-empty">Loading…</p>`;
    const { data: rows, error } = await sb
      .from("submissions")
      .select("*")
      .eq("kind", current)
      .order("created_at", { ascending: false });

    if (error) {
      listEl.innerHTML = `<p class="sub-empty"></p>`;
      listEl.firstChild.textContent = `Couldn't load submissions: ${error.message}`;
      return;
    }
    if (!rows.length) {
      listEl.innerHTML = `<p class="sub-empty">No ${current === "photo" ? "photos" : "projects"} submitted yet.</p>`;
      return;
    }

    listEl.innerHTML = "";
    for (const r of rows) {
      const row = document.createElement("div");
      row.className = "sub-row";

      if (r.image_path) {
        const img = document.createElement("img");
        img.src = publicUrl(r.image_path);
        img.alt = r.title;
        img.loading = "lazy";
        row.appendChild(img);
      } else {
        const ph = document.createElement("div");
        ph.className = "no-thumb";
        ph.textContent = "no image";
        row.appendChild(ph);
      }

      const meta = document.createElement("div");
      meta.className = "sub-meta";
      const h3 = document.createElement("h3");
      h3.textContent = r.title;
      const p = document.createElement("p");
      const when = new Date(r.created_at).toLocaleDateString();
      const bits = [r.target_page, when];
      if (r.tags?.length) bits.push(r.tags.join(", "));
      p.textContent = bits.join(" · ");
      meta.append(h3, p);
      row.appendChild(meta);

      const badge = document.createElement("span");
      badge.className = `badge ${r.status}`;
      badge.textContent = r.status.replaceAll("_", " ");
      row.appendChild(badge);

      listEl.appendChild(row);
    }
  }

  function setKind(k) {
    current = k;
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.kind === k));
    refresh();
  }

  buttons.forEach((b) => b.addEventListener("click", () => setKind(b.dataset.kind)));
  setKind(current);

  return { refresh };
}
