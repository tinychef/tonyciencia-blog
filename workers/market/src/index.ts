import { env as startupEnv } from "cloudflare:workers";
import { createAdapters } from "./adapters";
import { app } from "./app";
import { loadConfig, mockInProductionError } from "./config";
import type { Env } from "./env";
import { cleanupRateLimits } from "./lib/ratelimit";
import { processOutbox } from "./services/outbox";

/**
 * ARRANQUE: si MODE=mock y SITE_URL es de producción (tonyciencia.com), el Worker lanza un error
 * al cargarse. Cloudflare rechaza el deploy ("startup error") y nunca llega a atender peticiones.
 * Además, cada petición vuelve a comprobarlo contra el Host real (ver app.tsx).
 */
const startupError = mockInProductionError(startupEnv as Partial<Env>);
if (startupError) throw new Error(`[market] ARRANQUE DENEGADO: ${startupError}`);

export default {
	fetch: app.fetch,

	/** Cron (cada 5 min): reintentos de correo y limpieza. */
	async scheduled(_controller, env, ctx) {
		const boot = loadConfig(env);
		if (!boot.ok) {
			console.error(`[market] cron omitido, configuración inválida:\n- ${boot.errors.join("\n- ")}`);
			return;
		}
		const deps = { db: env.MARKET_DB, config: boot.config, adapters: createAdapters(boot.config, env) };
		ctx.waitUntil(
			(async () => {
				const r = await processOutbox(deps);
				await cleanupRateLimits(env.MARKET_DB);
				await env.MARKET_DB.prepare("DELETE FROM sessions WHERE expires_at < ?1").bind(Date.now()).run();
				if (r.processed) console.log(`[market] cron: ${r.processed} correos procesados`);
			})(),
		);
	},
} satisfies ExportedHandler<Env>;
