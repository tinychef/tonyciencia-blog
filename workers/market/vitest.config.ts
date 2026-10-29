import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Las pruebas corren DENTRO del runtime de Workers (workerd) con D1 y R2 locales de Miniflare,
// usando la configuración raíz de wrangler.jsonc (MODE=mock, SITE_URL=http://localhost:8787).
export default defineConfig(async () => {
	const migrations = await readD1Migrations("./migrations");
	return {
		plugins: [
			cloudflareTest({
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
			}),
		],
		test: {
			setupFiles: ["./test/setup.ts"],
			include: ["test/**/*.test.ts"],
		},
	};
});
