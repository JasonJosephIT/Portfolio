const CAP = 500;
const MAX_TURNS = 3;
const MAX_BYTES = 4096; // fits 4 x 500 ASCII chars plus JSON; long non-ASCII text (3 bytes/char) can exceed it

type Turn = { role: "user" | "assistant"; content: string };
type Reply = [body: unknown, status: number];

const turnOk = (t: Turn) =>
	(t?.role === "user" || t?.role === "assistant") && typeof t.content === "string" && t.content.length <= CAP;

// Never log request text (story 26): nothing here calls console.
async function chat(request: Request, env: Env): Promise<Reply> {
	if (env.CHAT_ENABLED !== "true") return [{ off: true }, 503];
	if (request.method !== "POST") return [{ error: "method not allowed" }, 405];
	// ponytail: trusts content-length; a chunked body without one is still buffered (Workers caps request size).
	if (Number(request.headers.get("content-length")) > MAX_BYTES) return [{ error: "body too large" }, 413];
	const body = await request.json().catch(() => null);
	const { message, history } = (body ?? {}) as { message?: unknown; history?: unknown };
	if (typeof message !== "string" || !Array.isArray(history)) return [{ error: "bad request" }, 400];
	if (message.length > CAP) return [{ error: "message too long" }, 413];
	if (history.length > MAX_TURNS || !history.every(turnOk)) return [{ error: "bad history" }, 400];
	return [{ answer: "I don't know yet. See the contact page.", citations: [] }, 200];
}

export default {
	async fetch(request, env): Promise<Response> {
		if (new URL(request.url).pathname !== "/chat") return Response.json({ error: "not found" }, { status: 404 });

		const origin = request.headers.get("origin") ?? "";
		const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim());
		const headers: Record<string, string> = { vary: "Origin" };
		if (allowed.includes(origin)) {
			headers["access-control-allow-origin"] = origin;
			headers["access-control-allow-methods"] = "POST";
			headers["access-control-allow-headers"] = "content-type";
		}
		if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

		const [body, status] = await chat(request, env);
		return Response.json(body, { status, headers });
	},
} satisfies ExportedHandler<Env>;
