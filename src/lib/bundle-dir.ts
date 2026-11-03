import { existsSync } from "node:fs";
import { join } from "node:path";

/** Where the bundle lives; tests point BUNDLE_DIR at a fixture. */
export const BUNDLE_DIR = process.env.BUNDLE_DIR ?? "content/bundle-public";

if (!existsSync(join(BUNDLE_DIR, "bundle.json"))) {
  throw new Error(`Bundle folder not found: ${BUNDLE_DIR} (run \`pnpm pull\` or set BUNDLE_DIR)`);
}
