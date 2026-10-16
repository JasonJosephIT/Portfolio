import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const wrangler = { configPath: "./wrangler.jsonc" };

export default defineConfig({
	test: {
		projects: [
			{
				// Evals run with the chatbot on; a case turns it off with "env".
				plugins: [cloudflareTest({ wrangler, miniflare: { bindings: { CHAT_ENABLED: "true" } } })],
				test: { name: "evals", include: ["test/eval.test.ts"] },
			},
			{
				plugins: [cloudflareTest({ wrangler })],
				test: { name: "shipped", include: ["test/shipped.test.ts"] },
			},
		],
	},
});
