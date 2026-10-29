/**
 * Límite de frecuencia con ventana fija sobre D1. Funciona igual en mock y live, sin bindings extra.
 * Para tráfico alto conviene sumar una regla de Rate Limiting de Cloudflare (WAF) — ver HANDOFF.md.
 */
export interface RateRule {
	/** Nombre lógico, p. ej. "login". */
	name: string;
	limit: number;
	windowSeconds: number;
}

export const RATE_RULES = {
	login: { name: "login", limit: 20, windowSeconds: 60 },
	checkoutUser: { name: "checkout-user", limit: 8, windowSeconds: 600 },
	checkoutIp: { name: "checkout-ip", limit: 30, windowSeconds: 600 },
	claim: { name: "claim", limit: 10, windowSeconds: 600 },
	downloadUser: { name: "download-user", limit: 20, windowSeconds: 600 },
	downloadIp: { name: "download-ip", limit: 40, windowSeconds: 600 },
	fileFetch: { name: "file-ip", limit: 60, windowSeconds: 600 },
	adminWrite: { name: "admin", limit: 120, windowSeconds: 600 },
	mockPay: { name: "mock-pay", limit: 30, windowSeconds: 600 },
} satisfies Record<string, RateRule>;

/** Devuelve true si la petición está dentro del límite (y la cuenta). */
export async function hit(db: D1Database, rule: RateRule, subject: string, nowMs = Date.now()): Promise<boolean> {
	const windowStart = Math.floor(nowMs / 1000 / rule.windowSeconds) * rule.windowSeconds;
	const key = `${rule.name}:${subject}`.slice(0, 200);
	const row = await db
		.prepare(
			`INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
			 ON CONFLICT(key) DO UPDATE SET
			   count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END,
			   window_start = excluded.window_start
			 RETURNING count`,
		)
		.bind(key, windowStart)
		.first<{ count: number }>();
	return (row?.count ?? 0) <= rule.limit;
}

export async function cleanupRateLimits(db: D1Database, nowMs = Date.now()): Promise<void> {
	await db.prepare("DELETE FROM rate_limits WHERE window_start < ?1").bind(Math.floor(nowMs / 1000) - 86400).run();
}
