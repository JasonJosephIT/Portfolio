import { createScheduledController } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { expect, it, vi } from "vitest";
import worker from "../src/index";

const DAY = 86_400_000;
const insert = (session: string, createdAt: number, question = "q") =>
	env.CHATS.prepare("INSERT INTO chats (session_id, created_at, question, answer, citations) VALUES (?, ?, ?, 'a', '[]')")
		.bind(session, createdAt, question)
		.run();
const sessions = async (prefix: string) =>
	(await env.CHATS.prepare("SELECT session_id FROM chats WHERE session_id LIKE ? ORDER BY session_id").bind(`${prefix}%`).all<{ session_id: string }>())
		.results.map((r) => r.session_id);

it("the daily scheduled run deletes a 91-day-old chat and keeps an 89-day-old one", async () => {
	await insert("retain-91", Date.now() - 91 * DAY);
	await insert("retain-89", Date.now() - 89 * DAY);
	await worker.scheduled!(createScheduledController({ cron: "0 3 * * *" }), env);
	expect(await sessions("retain-")).toEqual(["retain-89"]);
});

// Cloudflare Access, faked: our own RSA key published at the team's certs URL, tokens signed with it.
const TEAM = "https://test-team.cloudflareaccess.com";
const rsa = () =>
	crypto.subtle.generateKey(
		{ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
		true,
		["sign", "verify"],
	);
const keys = await rsa();
const other = await rsa();
const jwk = { ...(await crypto.subtle.exportKey("jwk", keys.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
const certs = vi.fn(async (url: RequestInfo | URL) => {
	expect(String(url)).toBe(`${TEAM}/cdn-cgi/access/certs`);
	return Response.json({ keys: [jwk] });
});
vi.stubGlobal("fetch", certs);

const b64url = (b: ArrayBuffer | Uint8Array) =>
	btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = (o: object) => b64url(new TextEncoder().encode(JSON.stringify(o)));
async function jwt(claims: Record<string, unknown> = {}, signer = keys.privateKey) {
	const now = Math.floor(Date.now() / 1000);
	const body = `${enc({ alg: "RS256", kid: "k1", typ: "JWT" })}.${enc({ aud: ["test-aud"], iss: TEAM, email: "jason@example.com", iat: now, exp: now + 600, ...claims })}`;
	return `${body}.${b64url(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", signer, new TextEncoder().encode(body)))}`;
}

const admin = (path: string, token?: string, method = "GET", extra: Partial<Env> = {}) =>
	worker.fetch(
		new Request(`https://chat.test${path}`, { method, headers: token ? { "cf-access-jwt-assertion": token } : {} }) as Request<
			unknown,
			IncomingRequestCfProperties
		>,
		{ ...env, ...extra } as Env,
	);

it("/admin/chats refuses every caller without a valid Access JWT, and never shows chat text", async () => {
	await insert("secret-session", Date.now(), "SECRET-QUESTION-81b2");
	const now = Math.floor(Date.now() / 1000);
	const bad = {
		"no header": undefined,
		"not a jwt": "nope",
		"bad signature": await jwt({}, other.privateKey),
		"wrong aud": await jwt({ aud: ["someone-else"] }),
		"wrong issuer": await jwt({ iss: "https://evil.cloudflareaccess.com" }),
		expired: await jwt({ exp: now - 1 }),
		"unknown kid": (await jwt()).replace(/^[^.]+/, enc({ alg: "RS256", kid: "k2" })),
		"alg none": `${enc({ alg: "none", kid: "k1" })}.${enc({ aud: ["test-aud"], iss: TEAM, exp: now + 600 })}.`,
	};
	for (const [name, token] of Object.entries(bad)) {
		for (const method of ["GET", "DELETE"]) {
			const res = await admin("/admin/chats?session=secret-session", token, method);
			const text = await res.text();
			expect(res.status, `${name} ${method}`).toBe(403);
			expect(text).not.toContain("SECRET-QUESTION");
		}
	}
	expect(await sessions("secret-session")).toEqual(["secret-session"]); // no refused DELETE removed anything
	// Unset config fails closed even with a token that would otherwise pass.
	expect((await admin("/admin/chats", await jwt(), "GET", { ACCESS_AUD: "" })).status).toBe(403);
	expect((await admin("/admin/chats", await jwt(), "GET", { ACCESS_TEAM_DOMAIN: "" })).status).toBe(403);
});

it("Jason's Access JWT lists chats newest first, paged with limit and before", async () => {
	const t = Date.now() - 1000;
	await insert("list-a", t - 2, "oldest");
	await insert("list-b", t - 1, "middle");
	await insert("list-c", t, "newest");
	const token = await jwt();
	const res = await admin(`/admin/chats?limit=2&before=${t + 1}`, token);
	expect(res.status).toBe(200);
	const { chats } = (await res.json()) as { chats: { session_id: string; question: string }[] };
	expect(chats.map((c) => c.question)).toEqual(["newest", "middle"]);
	const next = (await (await admin(`/admin/chats?limit=2&before=${t - 1}`, token)).json()) as { chats: { question: string }[] };
	expect(next.chats[0].question).toBe("oldest");
});

it("a verified DELETE by session id removes only that session's chats and says how many", async () => {
	await insert("del-mine", Date.now());
	await insert("del-mine", Date.now());
	await insert("del-other", Date.now());
	const res = await admin("/admin/chats?session=del-mine", await jwt(), "DELETE");
	expect(res.status).toBe(200);
	expect(await res.json()).toEqual({ deleted: 2 });
	expect(await sessions("del-")).toEqual(["del-other"]);
	expect((await admin("/admin/chats", await jwt(), "DELETE")).status).toBe(400); // no session: never "delete all"
});

it("admin routes ignore the kill switch", async () => {
	expect((await admin("/admin/chats", await jwt(), "GET", { CHAT_ENABLED: "false" })).status).toBe(200);
});
