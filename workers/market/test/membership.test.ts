import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { signStripePayload } from "../src/adapters/payments/stripe-signature";
import { MOCK_WEBHOOK_SECRET } from "../src/config";
import { deliveryEmail } from "../src/services/email-templates";
import { syncMemberships } from "../src/services/memberships";
import { call, count, createProduct, loginMock, one, postForm, uid, type Session, type TestProduct } from "./helpers";

type Order = { id: string; provider_session_id: string; customer_email: string; user_id: string };

async function checkout(p: TestProduct, s: Session): Promise<Order> {
	await postForm(`/market/producto/${p.slug}/comprar`, s);
	return (await one<Order>(
		"SELECT o.* FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email = ?1 AND o.product_id = ?2 AND o.status = 'pending'",
		s.email,
		p.id,
	))!;
}

/** Paga el pedido con un webhook firmado. Devuelve el cuerpo (para repetirlo) y el payment_intent. */
async function pay(order: Order, cents: number, eventId = `evt_${uid()}${uid()}`) {
	const pi = `pi_${uid()}`;
	const body = JSON.stringify({
		id: eventId,
		type: "checkout.session.completed",
		data: {
			object: {
				id: order.provider_session_id,
				object: "checkout.session",
				client_reference_id: order.id,
				metadata: { order_id: order.id },
				payment_status: "paid",
				amount_subtotal: cents,
				amount_total: cents,
				currency: "usd",
				customer_details: { email: order.customer_email },
				payment_intent: pi,
			},
		},
	});
	await send(body);
	return { body, pi };
}

async function send(body: string) {
	const res = await call("/market/webhooks/pagos", {
		method: "POST",
		headers: { "content-type": "application/json", "stripe-signature": await signStripePayload(MOCK_WEBHOOK_SECRET, body) },
		body,
	});
	expect(res.status).toBe(200);
}

const price = (id: string) => one<{ price_cents: number; compare_at_cents: number | null }>("SELECT price_cents, compare_at_cents FROM products WHERE id = ?1", id);

async function raisingProduct(priceCents: number) {
	const p = await createProduct({ priceCents });
	await env.MARKET_DB.prepare("UPDATE products SET compare_at_cents = 4700, raise_per_sale_cents = 100, raise_cap_cents = 4700 WHERE id = ?1").bind(p.id).run();
	return p;
}

describe("subida de USD 1 por venta", () => {
	it("cada venta pagada sube USD 1; un evento repetido no vuelve a subir", async () => {
		const p = await raisingProduct(110);
		const s = await loginMock(`sube-${uid()}@maqueta.test`);
		const order = await checkout(p, s);
		const { body } = await pay(order, 110);
		expect(await price(p.id)).toEqual({ price_cents: 210, compare_at_cents: 4700 });
		await send(body); // mismo evento
		await pay(order, 110); // otro evento del mismo pedido ya pagado
		expect(await price(p.id)).toEqual({ price_cents: 210, compare_at_cents: 4700 });

		const s2 = await loginMock(`sube-${uid()}@maqueta.test`);
		await pay(await checkout(p, s2), 210);
		expect((await price(p.id))?.price_cents).toBe(310);
	});

	it("al llegar al tope (USD 47, el precio tachado) se quita el tachado y deja de subir", async () => {
		const p = await raisingProduct(4650);
		await pay(await checkout(p, await loginMock(`tope-${uid()}@maqueta.test`)), 4650);
		expect(await price(p.id)).toEqual({ price_cents: 4700, compare_at_cents: null });
		await pay(await checkout(p, await loginMock(`tope-${uid()}@maqueta.test`)), 4700);
		expect(await price(p.id)).toEqual({ price_cents: 4700, compare_at_cents: null });
	});

	it("sin subida configurada el precio no cambia", async () => {
		const p = await createProduct({ priceCents: 7700 });
		await pay(await checkout(p, await loginMock(`fijo-${uid()}@maqueta.test`)), 7700);
		expect((await price(p.id))?.price_cents).toBe(7700);
	});
});

describe("Membresía Dorada", () => {
	async function membership() {
		const m = await createProduct({ priceCents: 10000, fileKey: null });
		await env.MARKET_DB.prepare("UPDATE products SET grants_all = 1, title = 'Membresía Dorada: todo Market Tony' WHERE id = ?1").bind(m.id).run();
		return m;
	}
	const access = (userId: string, productId: string) =>
		one<{ revoked_at: number | null; revoked_reason: string | null; provider: string; status: string; amount_cents: number }>(
			`SELECT e.revoked_at, e.revoked_reason, o.provider, o.status, o.amount_cents FROM entitlements e JOIN orders o ON o.id = e.order_id
			 WHERE e.user_id = ?1 AND e.product_id = ?2 ORDER BY e.created_at DESC LIMIT 1`,
			userId,
			productId,
		);

	it("al pagarla da acceso a todo, sin ventas ni correos extra, y a los productos que salgan después", async () => {
		const a = await createProduct({ priceCents: 4700 });
		const b = await createProduct({ kind: "free" });
		const soon = await createProduct({ priceCents: 4700 });
		await env.MARKET_DB.prepare("UPDATE products SET availability = 'coming_soon' WHERE id = ?1").bind(soon.id).run();
		const m = await membership();
		const s = await loginMock(`socio-${uid()}@maqueta.test`);
		const order = await checkout(m, s);
		await pay(order, 10000);

		for (const p of [a, b]) expect(await access(order.user_id, p.id)).toMatchObject({ revoked_at: null, provider: "membership", status: "free", amount_cents: 0 });
		expect(await access(order.user_id, soon.id)).toBeNull();
		// Solo un correo (el de la membresía, más su copia de admin): los accesos derivados no mandan nada.
		expect(await count("SELECT COUNT(*) AS n FROM email_outbox WHERE order_id = ?1", order.id)).toBe(2);
		expect(await count("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?1 AND status = 'paid'", order.user_id)).toBe(1);
		// La membresía no se sube de precio a sí misma.
		expect((await price(m.id))?.price_cents).toBe(10000);

		// Idempotente.
		expect(await syncMemberships(env.MARKET_DB, order.user_id)).toBe(0);
		// Producto nuevo (o uno que pasa a la venta): llega con la siguiente sincronización.
		const later = await createProduct({ priceCents: 9900 });
		await env.MARKET_DB.prepare("UPDATE products SET availability = 'available' WHERE id = ?1").bind(soon.id).run();
		expect(await syncMemberships(env.MARKET_DB, order.user_id)).toBe(2);
		expect(await access(order.user_id, later.id)).toMatchObject({ revoked_at: null, provider: "membership" });
		expect(await access(order.user_id, soon.id)).toMatchObject({ revoked_at: null, provider: "membership" });

		// Comprar algo ya incluido no abre un checkout.
		await postForm(`/market/producto/${a.slug}/comprar`, s);
		expect(await count("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?1 AND product_id = ?2 AND status = 'pending'", order.user_id, a.id)).toBe(0);

		// Mis compras lo explica.
		const lib = await (await call("/market/mis-compras", { headers: { cookie: s.cookie } })).text();
		expect(lib).toContain("Incluido en tu Membresía Dorada");
		expect(lib).toContain("Membresía activa");
	});

	it("un producto que ya tenía se conserva con su compra; la membresía no lo duplica", async () => {
		const a = await createProduct({ priceCents: 4700 });
		const s = await loginMock(`previo-${uid()}@maqueta.test`);
		const own = await checkout(a, s);
		await pay(own, 4700);
		const m = await membership();
		await pay(await checkout(m, s), 10000);
		expect(await count("SELECT COUNT(*) AS n FROM entitlements WHERE user_id = ?1 AND product_id = ?2", own.user_id, a.id)).toBe(1);
		expect(await access(own.user_id, a.id)).toMatchObject({ provider: expect.not.stringMatching(/^membership$/) });
	});

	it("si se reembolsa, se revoca todo lo que dio; si no se paga, no da nada", async () => {
		const a = await createProduct({ priceCents: 4700 });
		const m = await membership();
		const s = await loginMock(`reembolso-${uid()}@maqueta.test`);
		const order = await checkout(m, s);
		expect(await syncMemberships(env.MARKET_DB, order.user_id)).toBe(0); // pendiente: nada
		const { pi } = await pay(order, 10000);
		const refund = JSON.stringify({ id: `evt_r_${uid()}`, type: "charge.refunded", data: { object: { id: "ch_1", payment_intent: pi, amount: 10000, amount_refunded: 10000, refunded: true } } });
		await send(refund);
		expect(await access(order.user_id, a.id)).toMatchObject({ revoked_reason: "refund" });
		expect(await syncMemberships(env.MARKET_DB, order.user_id)).toBe(0); // no vuelve con el cron
	});

	it("contracargo: suspende lo que dio y, si se gana, lo devuelve", async () => {
		const a = await createProduct({ priceCents: 4700 });
		const m = await membership();
		const s = await loginMock(`disputa-${uid()}@maqueta.test`);
		const order = await checkout(m, s);
		const { pi } = await pay(order, 10000);
		const ev = (type: string, extra: Record<string, unknown> = {}) =>
			JSON.stringify({ id: `evt_d_${uid()}`, type, data: { object: { id: `dp_${uid()}`, payment_intent: pi, ...extra } } });
		await send(ev("charge.dispute.created"));
		expect(await access(order.user_id, a.id)).toMatchObject({ revoked_reason: "dispute" });
		expect(await syncMemberships(env.MARKET_DB, order.user_id)).toBe(0);
		await send(ev("charge.dispute.closed", { status: "won" }));
		expect(await access(order.user_id, a.id)).toMatchObject({ revoked_at: null });
	});

	it("el correo de la membresía lleva a Mis compras, no a una descarga", () => {
		const mail = deliveryEmail({
			kind: "paid",
			buyerName: "Ana",
			productTitle: "Membresía Dorada: todo Market Tony",
			amountCents: 10000,
			currency: "usd",
			accountEmail: "ana@maqueta.test",
			downloadUrl: "https://tonyciencia.com/market/descargas/x",
			libraryUrl: "https://tonyciencia.com/market/mis-compras",
			downloadLimit: 5,
			orderId: "o1",
			membership: true,
		});
		expect(mail.subject).toBe("Tu Membresía Dorada está activa");
		expect(mail.text).toContain("Ver mis productos: https://tonyciencia.com/market/mis-compras");
		expect(mail.text + mail.html).not.toContain("/market/descargas/");
		expect(mail.text.split("\n").length).toBeGreaterThan(5);
	});
});
