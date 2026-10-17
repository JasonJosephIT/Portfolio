import { env } from "cloudflare:workers";
import { expect, it, vi } from "vitest";
import worker, { sign } from "../src/index";
import cases from "./evals.json";
import index from "./fake-index.json";

const CATEGORIES = ["injection", "off-topic", "private-data", "unknown-facts", "abuse", "rate-limit", "char-cap", "kill-switch"];

type Case = {
	name: string;
	// One of CATEGORIES (the spec's eval list, each needing 5+ cases) or "plumbing".
	category: string;
	request: { method: string; path?: string; headers?: Record<string, string>; body?: unknown };
	env?: Record<string, string>;
	// What the stubbed chat model returns; by default it echoes the non-system messages it was sent.
	modelReply?: string;
	// Reply shape the fake chat model uses: Workers AI (default), OpenAI-compatible or Anthropic.
	modelShape?: "openai" | "anthropic";
	// Which binding throws (d1: a fake CHATS replaces the local D1).
	fail?: "ai" | "vectorize" | "d1";
	// "none": no ACTIVE_NS in KV. Otherwise the fixture index is active.
	index?: "none";
	// A JSON object body gets a valid session unless it carries its own, a turnstileToken, or this says otherwise.
	session?: "none" | "forged" | "expired";
	// Send the request this many times on one session (the real local rate limit); expect checks the last.
	repeat?: number;
	expect: {
		status: number;
		bodyIncludes?: string;
		bodyExcludes?: string[];
		json?: Record<string, unknown>;
		headers?: Record<string, string | null>;
		modelCalled?: boolean;
		// This phrase reaches the model, and only inside <excerpt ...> or <transcript ...> blocks.
		untrusted?: string;
		// Roles of the messages sent to the chat model.
		roles?: string[];
	};
};

// "REPEAT:x:n" in a JSON body expands to x repeated n times, so long inputs stay readable in evals.json.
const expand = (v: unknown): unknown =>
	typeof v === "string" && v.startsWith("REPEAT:")
		? v.split(":")[1].repeat(Number(v.split(":")[2]))
		: Array.isArray(v)
			? v.map(expand)
			: v && typeof v === "object"
				? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, expand(x)]))
				: v;

// A session as the spec defines it: <id>.<expiry ms>.<hex HMAC-SHA256(id.expiry, SESSION_SECRET)>.
const mint = (expiry = Date.now() + 3_600_000, id = crypto.randomUUID()) => sign(id, expiry, env);

async function sessionFor(c: Case) {
	if (c.session === "expired") return mint(Date.now() - 1);
	const s = await mint();
	return c.session === "forged" ? s.replace(/.$/, (ch) => (ch === "0" ? "1" : "0")) : s;
}

// Turnstile siteverify, stubbed: Turnstile's published test secrets decide (1x...AA passes, 2x...AA fails).
// A pass reports hostname localhost, or <host> for a "HOST:<host>" token.
const PASS_SECRET = "1x0000000000000000000000000000000AA";
const siteverify = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
	expect(String(url)).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
	const form = new URLSearchParams(init?.body as URLSearchParams);
	const token = form.get("response") ?? "";
	const success = form.get("secret") === PASS_SECRET && !!token;
	const hostname = token.startsWith("HOST:") ? token.slice(5) : "localhost";
	return Response.json({ success, hostname, "error-codes": success ? [] : ["invalid-input-response"] });
});
vi.stubGlobal("fetch", siteverify);
const TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

async function toRequest(c: Case, session: string) {
	const { method, path = "/chat", headers } = c.request;
	let body = c.request.body;
	if (body && typeof body === "object" && !Array.isArray(body)) {
		const obj = body as Record<string, unknown>;
		// "SESSION" inside a body's own session string stands for a freshly minted valid one.
		if (typeof obj.session === "string") body = { ...obj, session: obj.session.replace("SESSION", await mint()) };
		else if (!("turnstileToken" in obj) && c.session !== "none") body = { ...obj, session };
	}
	const raw = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(expand(body));
	// Set content-length as an HTTP client would; a Request built in-process has none.
	const length: Record<string, string> = raw === undefined ? {} : { "content-length": String(new TextEncoder().encode(raw).length) };
	return new Request(`https://chat.test${path}`, { method, headers: { ...headers, ...length }, body: raw }) as Request<
		unknown,
		IncomingRequestCfProperties
	>;
}

// Fake AI, Vectorize and KV: no real calls. The embed counts fixture vocab words in the text.
type Msg = { role: string; content: string };
const BOOM = "boom: internal detail 9c1e";
function fakes(c: Partial<Case> = {}, activeNs: string | null = index.namespace) {
	const { modelReply, modelShape, fail } = c;
	const chats: Msg[][] = [];
	const embed = (t: string) => index.vocab.map((w) => t.toLowerCase().split(w).length - 1);
	const cos = (a: number[], b: number[]) => {
		const n = Math.hypot(...a) * Math.hypot(...b);
		return n ? a.reduce((s, x, i) => s + x * b[i], 0) / n : 0;
	};
	const AI = {
		async run(model: string, input: { text?: string[]; messages?: Msg[] }, opts?: { gateway?: { id: string; collectLog?: boolean } }) {
			expect(opts?.gateway?.id).toBe(env.AI_GATEWAY_ID);
			expect(opts?.gateway?.collectLog).toBe(false); // chat text never lands in AI Gateway logs
			if (fail === "ai") throw new Error(BOOM);
			if (model === env.EMBED_MODEL) return { shape: [1, index.vocab.length], data: input.text!.map(embed) };
			expect(model).toBe(env.CHAT_MODEL);
			chats.push(input.messages!);
			const text = modelReply ?? input.messages!.filter((m) => m.role !== "system").map((m) => m.content).join("\n");
			if (modelShape === "openai") return { choices: [{ message: { role: "assistant", content: text } }] };
			if (modelShape === "anthropic") return { content: [{ type: "text", text }] };
			return { response: text };
		},
	};
	const VECTORIZE = {
		async query(vector: number[], opts: { topK: number; namespace: string }) {
			if (fail === "vectorize") throw new Error(BOOM);
			const matches = index.chunks
				.filter((c) => c.id.startsWith(`${opts.namespace}:`))
				.map((c) => ({ id: c.id, score: cos(vector, c.values), metadata: c.metadata }))
				.sort((a, b) => b.score - a.score)
				.slice(0, opts.topK);
			return { count: matches.length, matches };
		},
	};
	const INDEX_KV = { get: async (k: string) => (k === "ACTIVE_NS" ? activeNs : null) };
	const CHATS = fail === "d1" ? { prepare: () => { throw new Error(BOOM); } } : env.CHATS;
	return { bindings: { AI, VECTORIZE, INDEX_KV, CHATS } as unknown as Partial<Env>, chats };
}

it("every spec category has at least 5 cases and every case has a known category", () => {
	const counts = Object.fromEntries(CATEGORIES.map((k) => [k, 0]));
	for (const c of cases as Case[]) {
		expect([...CATEGORIES, "plumbing"], c.name).toContain(c.category);
		counts[c.category]++;
	}
	for (const k of CATEGORIES) expect(counts[k], k).toBeGreaterThanOrEqual(5);
});

// Every case goes through the Worker's fetch with fakes wired in: the real AI binding is remote and costs money.
for (const c of cases as Case[]) {
	it(c.name, async () => {
		const session = await sessionFor(c);
		let res!: Response, chats!: Msg[][];
		for (let i = 0; i < (c.repeat ?? 1); i++) {
			const f = fakes(c, c.index === "none" ? null : undefined);
			chats = f.chats;
			res = await worker.fetch(await toRequest(c, session), { ...env, ...f.bindings, ...c.env } as Env);
		}
		const text = await res.text();
		expect(res.status).toBe(c.expect.status);
		for (const [k, v] of Object.entries(c.expect.headers ?? {})) expect(res.headers.get(k)).toBe(v);
		if (c.expect.bodyIncludes) expect(text).toContain(c.expect.bodyIncludes);
		for (const s of c.expect.bodyExcludes ?? []) expect(text).not.toContain(s);
		if (c.fail) expect(text).not.toContain("boom");
		if (c.expect.json) expect(JSON.parse(text)).toEqual(c.expect.json);
		if (c.expect.modelCalled !== undefined) expect(chats.length > 0).toBe(c.expect.modelCalled);
		if (c.expect.untrusted) {
			const sent = chats.flat().map((m) => m.content).join("\n");
			expect(sent).toContain(c.expect.untrusted);
			expect(sent.replace(/<(excerpt|transcript)\b[^>]*>[\s\S]*?<\/\1>/g, "")).not.toContain(c.expect.untrusted);
		}
		if (c.expect.roles) for (const sent of chats) expect(sent.map((m) => m.role)).toEqual(c.expect.roles);
	});
}

it("never logs question, history or answer text over full requests", async () => {
	const secret = "SECRET-7f3a";
	const answerText = "ANSWER-c41d about alpha";
	const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m));
	const session = await mint();
	const bodies = [
		// Turnstile first message, then a full answered request (model called, row stored), then rate-limited ones.
		{ message: `${secret} alpha`, history: [], turnstileToken: TOKEN },
		...Array(11).fill({ message: `${secret} alpha`, history: [{ role: "user", content: secret }], session }),
		{ message: secret.repeat(40), history: [], session },
		{ message: "hi", history: [1, 2, 3, { role: "user", content: secret }], session },
		{ message: secret, history: [] },
	];
	const statuses: number[] = [];
	let answered = false;
	for (const body of bodies) {
		const req = new Request("https://chat.test/chat", { method: "POST", body: JSON.stringify(body) });
		const res = await worker.fetch(req as Request<unknown, IncomingRequestCfProperties>, {
			...env,
			...fakes({ modelReply: answerText }).bindings,
		} as Env);
		statuses.push(res.status);
		answered ||= (await res.text()).includes(answerText);
	}
	const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
	spies.forEach((s) => s.mockRestore());
	expect(answered).toBe(true); // the model was called and its answer stored, not only short-circuited
	expect(statuses).toContain(429);
	expect(statuses).toContain(403);
	expect(logged).not.toContain(secret);
	expect(logged).not.toContain("ANSWER-c41d");
});

const post = (body: unknown) =>
	worker.fetch(
		new Request("https://chat.test/chat", { method: "POST", body: JSON.stringify(body) }) as Request<unknown, IncomingRequestCfProperties>,
		{ ...env, ...fakes().bindings } as Env,
	);

it("a session from a test token carries the next message without Turnstile", async () => {
	const first = (await (await post({ message: "hi", history: [], turnstileToken: TOKEN })).json()) as { session: string };
	const calls = siteverify.mock.calls.length;
	const next = await post({ message: "hi", history: [], session: first.session });
	expect(next.status).toBe(200);
	expect(await next.json()).not.toHaveProperty("session");
	expect(siteverify.mock.calls.length).toBe(calls);
});

// The real local D1 with migrations/ applied (test/apply-migrations.ts).
it("a chat stores one row with the question's email and phone scrubbed", async () => {
	const session = await mint();
	const res = await post({ message: "Is jason@example.com or +1 (555) 123-4567 on alpha?", history: [], session });
	expect(res.status).toBe(200);
	const { results } = await env.CHATS.prepare("SELECT * FROM chats WHERE session_id = ?").bind(session.split(".")[0]).all<Record<string, string>>();
	expect(results).toHaveLength(1);
	expect(results[0].question).toBe("Is [email removed] or [phone removed] on alpha?");
	expect(results[0].answer).toBe(((await res.json()) as { answer: string }).answer);
	expect(results[0].answer).not.toContain("jason@example.com");
	expect(Array.isArray(JSON.parse(results[0].citations))).toBe(true);
});
