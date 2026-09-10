// admin/submit.js — submit-form handler. The page that includes this is
// already auth-gated (requireAuth); the session check here is a backstop.
import { getClient, BUCKET } from "./config.js";

const sb = getClient();
const $ = (id) => document.getElementById(id);
const status = (msg) => ($("status").textContent = msg);

$("submit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return status("Session expired — sign in again at /admin/login/.");

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
  status(error ? `Insert failed: ${error.message}` : "Submitted ✓ — write its draft record under Content.");
  if (!error) {
    e.target.reset();
    document.dispatchEvent(new CustomEvent("submission:created"));
  }
});
