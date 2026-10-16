import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { env } from "cloudflare:workers";

// A real local D1 (Miniflare) with the shipped migrations, so storage tests hit actual SQL.
await applyD1Migrations(env.CHATS, (env as unknown as { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS);
