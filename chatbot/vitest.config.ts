import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const wrangler = { configPath: "./wrangler.jsonc" };
// No remote proxies: tests pass fake AI/Vectorize/KV, and nothing may reach (or bill) Cloudflare.
const remoteBindings = false;

export default defineConfig({
	test: {
		projects: [
			{
				// Evals run with the chatbot on; a case turns it off with "env".
				plugins: [cloudflareTest({ wrangler, remoteBindings, miniflare: { bindings: { CHAT_ENABLED: "true" } } })],
				test: { name: "evals", include: ["test/eval.test.ts"] },
			},
			{
				plugins: [cloudflareTest({ wrangler, remoteBindings })],
				test: { name: "shipped", include: ["test/shipped.test.ts"] },
			},
		],
	},
});
