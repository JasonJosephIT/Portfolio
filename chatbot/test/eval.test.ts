import { env, exports } from "cloudflare:workers";
import { expect, it, vi } from "vitest";
import worker from "../src/index";
import cases from "./evals.json";

type Case = {
	name: string;
	request: { method: string; path?: string; headers?: Record<string, string>; body?: unknown };
	env?: Record<string, string>;
	expect: { status: number; bodyIncludes?: string; headers?: Record<string, string | null> };
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
	return new Request(`https://chat.test${path}`, {
		method,
		headers,
		body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(expand(body)),
	}) as Request<unknown, IncomingRequestCfProperties>;
}

for (const c of cases as Case[]) {
	it(c.name, async () => {
		const req = toRequest(c);
		// Over HTTP through the Worker's fetch; an env override calls the same handler with merged vars.
		const res = c.env
			? await worker.fetch(req, { ...env, ...c.env })
			: await exports.default.fetch(req);
		expect(res.status).toBe(c.expect.status);
		for (const [k, v] of Object.entries(c.expect.headers ?? {})) expect(res.headers.get(k)).toBe(v);
		if (c.expect.bodyIncludes) expect(await res.text()).toContain(c.expect.bodyIncludes);
	});
}

it("never logs message or history text", async () => {
	const secret = "SECRET-7f3a";
	const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m));
	const bodies = [
		{ message: secret, history: [{ role: "user", content: secret }] },
		{ message: secret.repeat(100), history: [] },
		{ message: "hi", history: [1, 2, 3, { role: "user", content: secret }] },
	];
	for (const body of bodies)
		await exports.default.fetch("https://chat.test/chat", { method: "POST", body: JSON.stringify(body) });
	const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
	spies.forEach((s) => s.mockRestore());
	expect(logged).not.toContain(secret);
});
