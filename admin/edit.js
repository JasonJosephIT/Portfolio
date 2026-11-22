// admin/edit.js — drag-to-place overlay. Loaded only via ?edit=1.
import { getClient, BUCKET, SUPABASE_URL } from "./config.js";
import "https://cdn.jsdelivr.net/npm/interactjs@1.10.27/dist/interact.min.js";

const sb = getClient();
const page = location.pathname.split("/").pop() || "index.html";
const grid = page === "art.html" ? null : document.querySelector(".projects .project-grid");
const container = page === "art.html" ? document.querySelector(".gallery") : (grid ?? document.querySelector(".page-title"));
const publicUrl = (p) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${p}`;

const { data: { session } } = await sb.auth.getSession();
if (!session) {
  alert("Not signed in. Sign in at /admin/login/ first, then reload with ?edit=1.");
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
    const containerSel = page === "art.html" ? ".gallery" : ".project-grid";
    const usingFallback = page !== "art.html" && !grid;
    const spec = {
      page,
      container: containerSel,
      after_selector: usingFallback ? null : (after ? `${containerSel} > :nth-child(${after})` : null),
      x_pct: +(((dx) / cRect.width) * 100).toFixed(1),
      y_px: Math.round(dy),
      width_pct: +((iRect.width / cRect.width) * 100).toFixed(1),
      free_position: Math.abs(dx) > cRect.width * 0.1 || Math.abs(dy) > 80,
      notes: usingFallback ? "project-grid absent at placement; offsets measured against .page-title" : "",
    };

    const { error } = await sb.from("submissions")
      .update({ layout: spec, status: "ready_to_place" })
      .eq("id", sub.id);
    save.textContent = error ? `Failed: ${error.message}` : "Saved ✓ — run /place-image in Claude Code";
    if (!error) img.style.outline = "2px solid #4dc3ff";
  });
}
