// Usage: node scripts/mark-placed.mjs <submission-id>
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
const id = process.argv[2];
if (!id) { console.error("Usage: mark-placed.mjs <id>"); process.exit(1); }
const res = await fetch(`${URL_}/rest/v1/submissions?id=eq.${id}`, {
  method: "PATCH",
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ status: "placed" }),
});
if (!res.ok) {
  console.log(`failed: ${res.status}`);
} else {
  const rows = await res.json();
  if (Array.isArray(rows) && rows.length > 0) {
    console.log(`placed: ${id}`);
  } else {
    console.log(`failed: no row updated (check id and that SUPABASE_SERVICE_KEY is the service-role key): ${id}`);
    process.exit(1);
  }
}
