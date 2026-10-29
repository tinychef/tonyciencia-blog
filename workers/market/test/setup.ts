import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";

declare global {
	namespace Cloudflare {
		interface Env {
			TEST_MIGRATIONS: D1Migration[];
		}
	}
}

await applyD1Migrations(env.MARKET_DB, env.TEST_MIGRATIONS);
