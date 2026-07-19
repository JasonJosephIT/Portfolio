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
