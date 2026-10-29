import type { Adapters } from "../adapters";
import type { PaymentEvent } from "../adapters/types";
import type { Config } from "../config";
import { signToken } from "../lib/crypto";
import { adminCopyEmail, deliveryEmail } from "./email-templates";
import { outboxInsert, type EmailDraft } from "./outbox";
import { getActiveEntitlement, getOrder, getUserById, type OrderRow, type Product, type User } from "./repo";

export interface Deps {
	db: D1Database;
	config: Config;
	adapters: Adapters;
}

// ── Enlaces de descarga del correo ───────────────────────────────────

export async function emailDownloadUrl(config: Config, entitlementId: string): Promise<string> {
	const t = await signToken(config.sessionSecret, "dl-email", {
		e: entitlementId,
		exp: Math.floor(Date.now() / 1000) + config.emailLinkTtlDays * 86400,
	});
	const u = new URL(`/market/descargas/${entitlementId}`, config.origin);
	u.searchParams.set("t", t);
	return u.toString();
}

/** Los dos correos de entrega: cliente + copia aparte para ADMIN_COPY_EMAIL. */
async function deliveryDrafts(
	config: Config,
	opts: { order: Pick<OrderRow, "id" | "amount_cents" | "currency" | "kind">; product: Product; user: User; entitlementId: string; dedupeBase: string },
): Promise<EmailDraft[]> {
	const rendered = deliveryEmail({
		kind: opts.order.kind,
		buyerName: opts.user.name,
		productTitle: opts.product.title,
		amountCents: opts.order.amount_cents,
		currency: opts.order.currency,
		downloadUrl: await emailDownloadUrl(config, opts.entitlementId),
		libraryUrl: new URL("/market/mis-compras", config.origin).toString(),
		linkDays: config.emailLinkTtlDays,
		downloadLimit: opts.product.download_limit,
		orderId: opts.order.id,
	});
	const copy = adminCopyEmail(rendered, opts.user.email);
	const kind = opts.order.kind === "paid" ? "purchase" : "free";
	return [
		{ dedupeKey: `${opts.dedupeBase}:buyer`, kind, to: opts.user.email, ...rendered, orderId: opts.order.id },
		{ dedupeKey: `${opts.dedupeBase}:admin-copy`, kind: `${kind}-admin-copy`, to: config.adminCopyEmail, ...copy, orderId: opts.order.id },
	];
}

// ── Checkout (productos de pago) ─────────────────────────────────────

export type CheckoutResult =
	| { ok: true; redirectUrl: string; orderId: string }
	| { ok: false; reason: "not_found" | "already_owned" | "provider_error" };

/**
 * Crea el pedido y la sesión de pago. El precio sale SIEMPRE de `product` (leído de la BD por slug
 * en el servidor). Esta función no recibe ningún dato de precio del navegador.
 */
export async function startCheckout(deps: Deps, user: User, product: Product): Promise<CheckoutResult> {
	const { db, config, adapters } = deps;
	if (product.kind !== "paid" || product.active !== 1) return { ok: false, reason: "not_found" };
	if (await getActiveEntitlement(db, user.id, product.id)) return { ok: false, reason: "already_owned" };

	const orderId = crypto.randomUUID();
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO orders (id, user_id, product_id, kind, status, amount_cents, currency, provider, customer_email, created_at, updated_at)
			 VALUES (?1, ?2, ?3, 'paid', 'pending', ?4, ?5, ?6, ?7, ?8, ?8)`,
		)
		.bind(orderId, user.id, product.id, product.price_cents, product.currency, adapters.payments.name, user.email, now)
		.run();
	try {
		const session = await adapters.payments.createCheckout({
			orderId,
			productId: product.id,
			productTitle: product.title,
			amountCents: product.price_cents,
			currency: product.currency,
			customerEmail: user.email,
			successUrl: new URL(`/market/pago/exito?pedido=${orderId}`, config.origin).toString(),
			cancelUrl: new URL(`/market/pago/cancelado?pedido=${orderId}`, config.origin).toString(),
		});
		await db
			.prepare("UPDATE orders SET provider_session_id = ?2, updated_at = ?3 WHERE id = ?1")
			.bind(orderId, session.id, Date.now())
			.run();
		return { ok: true, redirectUrl: session.url, orderId };
	} catch (err) {
		console.error(`[checkout] no se pudo crear la sesión de pago del pedido ${orderId}:`, err);
		await db
			.prepare("UPDATE orders SET status = 'expired', note = ?2, updated_at = ?3 WHERE id = ?1")
			.bind(orderId, `Error del proveedor: ${String(err).slice(0, 300)}`, Date.now())
			.run();
		return { ok: false, reason: "provider_error" };
	}
}

// ── Webhook de pagos (idempotente) ───────────────────────────────────

export type EventOutcome = { status: "processed" | "duplicate"; result: string; orderId: string | null };

/**
 * Procesa un evento YA verificado. Idempotente a tres niveles:
 *  1. payment_events: un id de evento con processed_at no se vuelve a procesar.
 *  2. orders: la transición pending→paid es un UPDATE condicional.
 *  3. entitlements (order_id único) y email_outbox (dedupe_key única).
 * Si algo falla se lanza el error: el webhook responde 500 y el proveedor reintenta.
 */
export async function handlePaymentEvent(deps: Deps, event: PaymentEvent): Promise<EventOutcome> {
	const { db } = deps;
	const now = Date.now();
	const orderIdHint = "orderId" in event ? event.orderId : null;
	await db
		.prepare(
			`INSERT INTO payment_events (id, provider, type, order_id, received_at) VALUES (?1, ?2, ?3, ?4, ?5)
			 ON CONFLICT(id) DO NOTHING`,
		)
		.bind(event.id, deps.adapters.payments.name, event.type, orderIdHint, now)
		.run();
	const seen = await db.prepare("SELECT processed_at, result FROM payment_events WHERE id = ?1").bind(event.id).first<{
		processed_at: number | null;
		result: string | null;
	}>();
	if (seen?.processed_at) return { status: "duplicate", result: seen.result ?? "", orderId: orderIdHint };

	const finish = async (result: string, orderId: string | null): Promise<EventOutcome> => {
		await db.prepare("UPDATE payment_events SET processed_at = ?2, result = ?3 WHERE id = ?1").bind(event.id, Date.now(), result).run();
		return { status: "processed", result, orderId };
	};

	switch (event.type) {
		case "ignored":
			return finish(`ignorado (${event.rawType})`, null);

		case "checkout.expired":
		case "checkout.async_failed": {
			const order = await findOrderForSession(db, event.orderId, event.sessionId);
			if (!order) return finish("pedido no encontrado", null);
			await db
				.prepare("UPDATE orders SET status = 'expired', updated_at = ?2 WHERE id = ?1 AND status = 'pending'")
				.bind(order.id, now)
				.run();
			return finish("pedido vencido", order.id);
		}

		case "refunded": {
			const order = await db.prepare("SELECT * FROM orders WHERE provider_payment_id = ?1").bind(event.paymentId).first<OrderRow>();
			if (!order) return finish("reembolso sin pedido asociado", null);
			if (!event.fullyRefunded) {
				await db.prepare("UPDATE orders SET note = 'Reembolso parcial', updated_at = ?2 WHERE id = ?1").bind(order.id, now).run();
				return finish("reembolso parcial (acceso se mantiene)", order.id);
			}
			await db.batch([
				db.prepare("UPDATE orders SET status = 'refunded', updated_at = ?2 WHERE id = ?1").bind(order.id, now),
				db.prepare("UPDATE entitlements SET revoked_at = ?2 WHERE order_id = ?1 AND revoked_at IS NULL").bind(order.id, now),
			]);
			return finish("reembolsado y acceso revocado", order.id);
		}

		case "checkout.completed":
		case "checkout.async_succeeded": {
			const order = await findOrderForSession(db, event.orderId, event.sessionId);
			if (!order) {
				console.error(`[webhook] evento ${event.id}: no hay pedido para la sesión ${event.sessionId}`);
				return finish("pedido no encontrado", null);
			}
			// Un cupón del 100 % cierra la sesión con total 0 y payment_status "no_payment_required" (no "paid").
			const freeByCoupon = event.paymentStatus === "no_payment_required" && event.amountTotal === 0;
			if (event.paymentStatus !== "paid" && !freeByCoupon) return finish(`pago aún no confirmado (${event.paymentStatus})`, order.id);
			if (order.status !== "pending") return finish(`pedido ya estaba en estado ${order.status}`, order.id);

			// Defensa extra: lo cobrado debe coincidir con el precio del pedido (subtotal, sin impuestos).
			const charged = event.amountSubtotal ?? event.amountTotal;
			if (charged !== order.amount_cents || (event.currency ?? "").toLowerCase() !== order.currency.toLowerCase()) {
				await db
					.prepare("UPDATE orders SET status = 'review', note = ?2, updated_at = ?3 WHERE id = ?1 AND status = 'pending'")
					.bind(order.id, `Monto cobrado ${charged} ${event.currency} ≠ pedido ${order.amount_cents} ${order.currency}`, now)
					.run();
				console.error(`[webhook] monto inesperado en pedido ${order.id}`);
				return finish("monto no coincide: pedido en revisión", order.id);
			}

			// Con cupón, Stripe cobra menos que el precio de lista: queda anotado y el correo muestra lo realmente cobrado.
			const paidCents = event.amountTotal ?? order.amount_cents;
			const discountNote =
				event.amountSubtotal !== null && event.amountTotal !== null && event.amountTotal < event.amountSubtotal
					? `Cupón aplicado: cobrado ${(paidCents / 100).toFixed(2)} de ${(event.amountSubtotal / 100).toFixed(2)} ${order.currency.toUpperCase()}`
					: null;

			const [user, product] = await Promise.all([
				getUserById(db, order.user_id),
				db.prepare("SELECT * FROM products WHERE id = ?1").bind(order.product_id).first<Product & { images: string }>(),
			]);
			if (!user || !product) throw new Error(`Pedido ${order.id} con usuario o producto inexistente`);
			const fullProduct: Product = { ...product, images: [] };

			// Si ya tenía acceso (compra duplicada), el correo apunta a ese acceso existente.
			const existing = await getActiveEntitlement(db, user.id, product.id);
			const entitlementId = existing?.id ?? crypto.randomUUID();
			const drafts = await deliveryDrafts(deps.config, {
				order: { ...order, amount_cents: paidCents },
				product: fullProduct,
				user,
				entitlementId,
				dedupeBase: `order:${order.id}`,
			});
			await db.batch([
				db
					.prepare(
						`UPDATE orders SET status = 'paid', paid_at = ?2, provider_payment_id = ?3, updated_at = ?2,
						   note = CASE WHEN ?4 = 1 THEN 'Compra duplicada: ya tenía acceso' WHEN ?5 IS NOT NULL THEN ?5 ELSE note END
						 WHERE id = ?1 AND status = 'pending'`,
					)
					.bind(order.id, now, event.paymentId, existing ? 1 : 0, discountNote),
				db
					.prepare(
						`INSERT INTO entitlements (id, user_id, product_id, order_id, download_limit, download_count, created_at)
						 SELECT ?1, ?2, ?3, ?4, ?5, 0, ?6 WHERE ?7 = 0
						 ON CONFLICT DO NOTHING`,
					)
					.bind(entitlementId, user.id, product.id, order.id, product.download_limit, now, existing ? 1 : 0),
				...drafts.map((d) => outboxInsert(db, crypto.randomUUID(), d, entitlementId, now)),
			]);
			return finish(existing ? "pagado (ya tenía acceso)" : "pagado y entregado", order.id);
		}
	}
}

async function findOrderForSession(db: D1Database, orderId: string | null, sessionId: string): Promise<OrderRow | null> {
	if (orderId) {
		const o = await getOrder(db, orderId);
		// El id de sesión debe corresponder: evita que un evento ajeno marque otro pedido.
		if (o && (o.provider_session_id === null || o.provider_session_id === sessionId)) return o;
		if (o) console.error(`[webhook] sesión ${sessionId} no corresponde al pedido ${orderId}`);
		return null;
	}
	return db.prepare("SELECT * FROM orders WHERE provider_session_id = ?1").bind(sessionId).first<OrderRow>();
}

// ── Productos gratis ─────────────────────────────────────────────────

export type ClaimResult = { ok: true; entitlementId: string; created: boolean; orderId: string } | { ok: false; reason: "not_found" };

export async function claimFreeProduct(deps: Deps, user: User, product: Product): Promise<ClaimResult> {
	const { db, config } = deps;
	if (product.kind !== "free" || product.active !== 1) return { ok: false, reason: "not_found" };
	const existing = await getActiveEntitlement(db, user.id, product.id);
	if (existing) return { ok: true, entitlementId: existing.id, created: false, orderId: existing.order_id };

	const now = Date.now();
	const orderId = crypto.randomUUID();
	const entitlementId = crypto.randomUUID();
	const order = { id: orderId, amount_cents: 0, currency: product.currency, kind: "free" as const };
	const drafts = await deliveryDrafts(config, { order, product, user, entitlementId, dedupeBase: `free:${entitlementId}` });
	// Todo en un lote atómico y condicionado: con un doble clic, el segundo lote no crea nada.
	await db.batch([
		db
			.prepare(
				`INSERT INTO orders (id, user_id, product_id, kind, status, amount_cents, currency, provider, customer_email, created_at, updated_at, paid_at)
				 SELECT ?1, ?2, ?3, 'free', 'free', 0, ?4, 'free', ?5, ?6, ?6, ?6
				 WHERE NOT EXISTS (SELECT 1 FROM entitlements WHERE user_id = ?2 AND product_id = ?3 AND revoked_at IS NULL)`,
			)
			.bind(orderId, user.id, product.id, product.currency, user.email, now),
		db
			.prepare(
				`INSERT INTO entitlements (id, user_id, product_id, order_id, download_limit, download_count, created_at)
				 SELECT ?1, ?2, ?3, ?4, ?5, 0, ?6 WHERE EXISTS (SELECT 1 FROM orders WHERE id = ?4)
				 ON CONFLICT DO NOTHING`,
			)
			.bind(entitlementId, user.id, product.id, orderId, product.download_limit, now),
		...drafts.map((d) => outboxInsert(db, crypto.randomUUID(), d, entitlementId, now)),
	]);
	const final = await getActiveEntitlement(db, user.id, product.id);
	if (!final) throw new Error("No se pudo registrar el producto gratis");
	return { ok: true, entitlementId: final.id, created: final.id === entitlementId, orderId: final.order_id };
}
