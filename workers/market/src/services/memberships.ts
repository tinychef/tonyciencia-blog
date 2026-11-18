/**
 * Membresía Dorada (2026-11-17): un producto con `grants_all = 1` da acceso de por vida a todos los demás productos
 * activos y a la venta, los de hoy y los que salgan después.
 *
 * Cómo: por cada membresía vigente (acceso sin revocar a un producto grants_all, con su pedido PAGADO) y cada producto
 * al que esa persona todavía no tiene acceso, se crea un pedido de USD 0 (`provider = 'membership'`,
 * `membership_order_id` = el pedido de la membresía) y su acceso. No cuentan como ventas (status 'free') ni mandan
 * correo. Se sincroniza al pagar la membresía, en el cron (cada 5 min: así llegan los productos nuevos), al abrir
 * Mis compras y antes de un checkout. Si la membresía se reembolsa o se disputa, sus accesos derivados se revocan con
 * ella (handlePaymentEvent en orders.ts).
 */

interface MissingGrant {
	user_id: string;
	product_id: string;
	membership_order_id: string;
	customer_email: string;
	currency: string;
	download_limit: number;
}

/** Productos que cada membresía vigente debería dar y todavía no da. `userId` limita a una persona. */
const MISSING_SQL = `
	SELECT m.user_id, p.id AS product_id, mo.id AS membership_order_id, mo.customer_email, p.currency, p.download_limit
	FROM entitlements m
	JOIN products mp ON mp.id = m.product_id AND mp.grants_all = 1
	JOIN orders mo ON mo.id = m.order_id AND mo.status = 'paid'
	JOIN products p ON p.active = 1 AND p.availability = 'available' AND p.grants_all = 0
	WHERE m.revoked_at IS NULL AND (?1 IS NULL OR m.user_id = ?1)
	  AND NOT EXISTS (SELECT 1 FROM entitlements x WHERE x.user_id = m.user_id AND x.product_id = p.id AND x.revoked_at IS NULL)
	ORDER BY m.user_id, p.sort_order
	LIMIT 500`;

/** Cuántos accesos nuevos creó. Idempotente: llamarla dos veces (o a la vez) no duplica nada. */
export async function syncMemberships(db: D1Database, userId: string | null = null, now = Date.now()): Promise<number> {
	const { results } = await db.prepare(MISSING_SQL).bind(userId).all<MissingGrant>();
	if (!results.length) return 0;
	const stmts: D1PreparedStatement[] = [];
	// Si dos personas tienen varias membresías (no debería pasar: startCheckout rechaza «already_owned»), un par
	// usuario-producto sale una sola vez.
	const seen = new Set<string>();
	for (const g of results) {
		const key = `${g.user_id}:${g.product_id}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const orderId = crypto.randomUUID();
		// Lote atómico y condicionado, como claimFreeProduct: si otra llamada ya dio el acceso, no se crea nada.
		stmts.push(
			db
				.prepare(
					`INSERT INTO orders (id, user_id, product_id, kind, status, amount_cents, currency, provider, customer_email, note,
					   created_at, updated_at, paid_at, membership_order_id)
					 SELECT ?1, ?2, ?3, 'free', 'free', 0, ?4, 'membership', ?5, 'Incluido en la Membresía Dorada', ?6, ?6, ?6, ?7
					 WHERE NOT EXISTS (SELECT 1 FROM entitlements WHERE user_id = ?2 AND product_id = ?3 AND revoked_at IS NULL)
					   AND EXISTS (SELECT 1 FROM orders WHERE id = ?7 AND status = 'paid')`,
				)
				.bind(orderId, g.user_id, g.product_id, g.currency, g.customer_email, now, g.membership_order_id),
			db
				.prepare(
					`INSERT INTO entitlements (id, user_id, product_id, order_id, download_limit, download_count, created_at)
					 SELECT ?1, ?2, ?3, ?4, ?5, 0, ?6 WHERE EXISTS (SELECT 1 FROM orders WHERE id = ?4)
					 ON CONFLICT DO NOTHING`,
				)
				.bind(crypto.randomUUID(), g.user_id, g.product_id, orderId, g.download_limit, now),
		);
	}
	const res = await db.batch(stmts);
	return res.filter((r, i) => i % 2 === 1 && (r.meta?.changes ?? 0) > 0).length;
}

/** ¿Esta persona tiene una membresía vigente? */
export async function hasActiveMembership(db: D1Database, userId: string): Promise<boolean> {
	const r = await db
		.prepare(
			`SELECT 1 AS ok FROM entitlements m
			 JOIN products mp ON mp.id = m.product_id AND mp.grants_all = 1
			 JOIN orders mo ON mo.id = m.order_id AND mo.status = 'paid'
			 WHERE m.user_id = ?1 AND m.revoked_at IS NULL LIMIT 1`,
		)
		.bind(userId)
		.first<{ ok: number }>();
	return !!r;
}

/** Sentencias que revocan los accesos que dio una membresía (reembolso o disputa del pedido de la membresía). */
export function revokeMembershipGrants(db: D1Database, membershipOrderId: string, reason: "refund" | "dispute", now: number): D1PreparedStatement[] {
	return [
		db
			.prepare(
				`UPDATE entitlements SET revoked_at = ?2, revoked_reason = ?3
				 WHERE revoked_at IS NULL AND order_id IN (SELECT id FROM orders WHERE membership_order_id = ?1)`,
			)
			.bind(membershipOrderId, now, reason),
		// Con reembolso, lo que ya estaba suspendido por disputa pasa a «refund» (no vuelve si se gana la disputa).
		...(reason === "refund"
			? [
					db
						.prepare(
							`UPDATE entitlements SET revoked_reason = 'refund'
							 WHERE revoked_reason = 'dispute' AND order_id IN (SELECT id FROM orders WHERE membership_order_id = ?1)`,
						)
						.bind(membershipOrderId),
				]
			: []),
	];
}

/**
 * Disputa ganada: devuelve los accesos derivados que quitó la disputa, si la membresía sigue pagada y la persona no
 * consiguió ese producto de otra forma mientras tanto (el índice único de accesos vigentes lo impediría).
 */
export function restoreMembershipGrants(db: D1Database, membershipOrderId: string): D1PreparedStatement {
	return db
		.prepare(
			`UPDATE entitlements SET revoked_at = NULL, revoked_reason = NULL
			 WHERE revoked_reason = 'dispute'
			   AND order_id IN (SELECT id FROM orders WHERE membership_order_id = ?1)
			   AND (SELECT status FROM orders WHERE id = ?1) = 'paid'
			   AND NOT EXISTS (SELECT 1 FROM entitlements x WHERE x.user_id = entitlements.user_id
			                   AND x.product_id = entitlements.product_id AND x.revoked_at IS NULL)`,
		)
		.bind(membershipOrderId);
}
