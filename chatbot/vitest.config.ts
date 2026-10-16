import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const wrangler = { configPath: "./wrangler.jsonc" };
// No remote proxies: tests pass fake AI/Vectorize/KV, and nothing may reach (or bill) Cloudflare.
const remoteBindings = false;
const migrations = await readD1Migrations("./migrations");

export default defineConfig({
	test: {
		projects: [
			{
				// Evals run with the chatbot on; a case turns it off with "env". Turnstile's published always-pass
				// test secret; siteverify itself is stubbed in the test, so no request leaves the machine.
				plugins: [
					cloudflareTest({
						wrangler,
						remoteBindings,
						miniflare: {
							bindings: {
								CHAT_ENABLED: "true",
								TURNSTILE_SECRET: "1x0000000000000000000000000000000AA",
								SESSION_SECRET: "test-session-secret",
								TEST_MIGRATIONS: migrations,
							},
						},
					}),
				],
				test: { name: "evals", include: ["test/eval.test.ts"], setupFiles: ["test/apply-migrations.ts"] },
			},
			{
				// Admin routes and retention: a test Access team whose certs fetch the test stubs with its own key.
				plugins: [
					cloudflareTest({
						wrangler,
						remoteBindings,
						miniflare: {
							bindings: {
								ACCESS_AUD: "test-aud",
								ACCESS_TEAM_DOMAIN: "https://test-team.cloudflareaccess.com",
								TEST_MIGRATIONS: migrations,
							},
						},
					}),
				],
				test: { name: "admin", include: ["test/admin.test.ts"], setupFiles: ["test/apply-migrations.ts"] },
			},
			{
				plugins: [cloudflareTest({ wrangler, remoteBindings })],
				test: { name: "shipped", include: ["test/shipped.test.ts"] },
			},
		],
	},
});
