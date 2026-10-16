import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: "./wrangler.jsonc" },
			// Tests run with the chatbot on; a case turns it off with "env".
			miniflare: { bindings: { CHAT_ENABLED: "true" } },
		}),
	],
});
