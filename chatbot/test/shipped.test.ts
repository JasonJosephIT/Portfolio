import { exports } from "cloudflare:workers";
import { expect, it } from "vitest";

// Runs with wrangler.jsonc vars as shipped (no test override): the chatbot must be off.
it("shipped config answers 503 { off: true }", async () => {
	const res = await exports.default.fetch("https://chat.test/chat", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ message: "hi", history: [] }),
	});
	expect(res.status).toBe(503);
	expect(await res.json()).toEqual({ off: true });
});

// Shipped ACCESS_AUD / ACCESS_TEAM_DOMAIN are empty: the admin route refuses until Jason sets them.
it("shipped config refuses /admin/chats with 403", async () => {
	const res = await exports.default.fetch("https://chat.test/admin/chats", { headers: { "cf-access-jwt-assertion": "a.b.c" } });
	expect(res.status).toBe(403);
});
