import { env } from "cloudflare:workers";
import { expect, it, vi } from "vitest";
import worker from "../src/index";
import cases from "./evals.json";
import index from "./fake-index.json";

type Case = {
	name: string;
	request: { method: string; path?: string; headers?: Record<string, string>; body?: unknown };
	env?: Record<string, string>;
	// What the stubbed chat model returns; by default it echoes the non-system messages it was sent.
	modelReply?: string;
	// "none": no ACTIVE_NS in KV. Otherwise the fixture index is active.
	index?: "none";
	expect: {
		status: number;
		bodyIncludes?: string;
		bodyExcludes?: string[];
		json?: Record<string, unknown>;
		headers?: Record<string, string | null>;
		modelCalled?: boolean;
		// This phrase reaches the model, and only inside <excerpt ...>...</excerpt> blocks.
		untrusted?: string;
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

function toRequest(c: Case) {
	const { method, path = "/chat", headers, body } = c.request;
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
function fakes(modelReply?: string, activeNs: string | null = index.namespace) {
	const chats: Msg[][] = [];
	const embed = (t: string) => index.vocab.map((w) => t.toLowerCase().split(w).length - 1);
	const cos = (a: number[], b: number[]) => {
		const n = Math.hypot(...a) * Math.hypot(...b);
		return n ? a.reduce((s, x, i) => s + x * b[i], 0) / n : 0;
	};
	const AI = {
		async run(model: string, input: { text?: string[]; messages?: Msg[] }, opts?: { gateway?: { id: string } }) {
			expect(opts?.gateway?.id).toBe(env.AI_GATEWAY_ID);
			if (model === env.EMBED_MODEL) return { shape: [1, index.vocab.length], data: input.text!.map(embed) };
			expect(model).toBe(env.CHAT_MODEL);
			chats.push(input.messages!);
			return { response: modelReply ?? input.messages!.filter((m) => m.role !== "system").map((m) => m.content).join("\n") };
		},
	};
	const VECTORIZE = {
		async query(vector: number[], opts: { topK: number; namespace: string }) {
			const matches = index.chunks
				.filter((c) => c.id.startsWith(`${opts.namespace}:`))
				.map((c) => ({ id: c.id, score: cos(vector, c.values), metadata: c.metadata }))
				.sort((a, b) => b.score - a.score)
				.slice(0, opts.topK);
			return { count: matches.length, matches };
		},
	};
	const INDEX_KV = { get: async (k: string) => (k === "ACTIVE_NS" ? activeNs : null) };
	return { bindings: { AI, VECTORIZE, INDEX_KV } as unknown as Partial<Env>, chats };
}

// Every case goes through the Worker's fetch with fakes wired in: the real AI binding is remote and costs money.
for (const c of cases as Case[]) {
	it(c.name, async () => {
		const { bindings, chats } = fakes(c.modelReply, c.index === "none" ? null : undefined);
		const res = await worker.fetch(toRequest(c), { ...env, ...bindings, ...c.env } as Env);
		const text = await res.text();
		expect(res.status).toBe(c.expect.status);
		for (const [k, v] of Object.entries(c.expect.headers ?? {})) expect(res.headers.get(k)).toBe(v);
		if (c.expect.bodyIncludes) expect(text).toContain(c.expect.bodyIncludes);
		for (const s of c.expect.bodyExcludes ?? []) expect(text).not.toContain(s);
		if (c.expect.json) expect(JSON.parse(text)).toEqual(c.expect.json);
		if (c.expect.modelCalled !== undefined) expect(chats.length > 0).toBe(c.expect.modelCalled);
		if (c.expect.untrusted) {
			const sent = chats.flat().map((m) => m.content).join("\n");
			expect(sent).toContain(c.expect.untrusted);
			expect(sent.replace(/<excerpt\b[^>]*>[\s\S]*?<\/excerpt>/g, "")).not.toContain(c.expect.untrusted);
		}
	});
}

it("never logs message or history text", async () => {
	const secret = "SECRET-7f3a";
	const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m));
	const bodies = [
		{ message: `${secret} alpha`, history: [{ role: "user", content: secret }] },
		{ message: secret.repeat(40), history: [] },
		{ message: "hi", history: [1, 2, 3, { role: "user", content: secret }] },
	];
	for (const body of bodies) {
		const req = new Request("https://chat.test/chat", { method: "POST", body: JSON.stringify(body) });
		await worker.fetch(req as Request<unknown, IncomingRequestCfProperties>, { ...env, ...fakes().bindings } as Env);
	}
	const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
	spies.forEach((s) => s.mockRestore());
	expect(logged).not.toContain(secret);
});
