import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { signStripePayload, verifyStripeSignature } from "../src/adapters/payments/stripe-signature";
import { MOCK_WEBHOOK_SECRET } from "../src/config";
import { call, count, createProduct, loginMock, one, postForm, uid } from "./helpers";

async function pendingOrder() {
	const p = await createProduct({ priceCents: 7700 });
	const s = await loginMock(`webhook-${uid()}@maqueta.test`);
	await postForm(`/market/producto/${p.slug}/comprar`, s);
	const order = (await one<{ id: string; provider_session_id: string; customer_email: string }>(
		"SELECT o.* FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email = ?1",
		s.email,
	))!;
	return { order, session: s, product: p };
}

function completedEvent(order: { id: string; provider_session_id: string; customer_email: string }, opts: { id?: string; amount?: number } = {}) {
	return JSON.stringify({
		id: opts.id ?? `evt_${uid()}${uid()}`,
		type: "checkout.session.completed",
		data: {
			object: {
				id: order.provider_session_id,
				object: "checkout.session",
				client_reference_id: order.id,
				metadata: { order_id: order.id },
				payment_status: "paid",
				amount_subtotal: opts.amount ?? 7700,
				amount_total: opts.amount ?? 7700,
				currency: "usd",
				customer_details: { email: order.customer_email },
				payment_intent: `pi_${uid()}`,
			},
		},
	});
}

function deliver(body: string, signature: string | null) {
	return call("/market/webhooks/pagos", {
		method: "POST",
		headers: { "content-type": "application/json", ...(signature ? { "stripe-signature": signature } : {}) },
		body,
	});
}

describe("firma del webhook", () => {
	it("rechaza sin firma, con secreto equivocado, cuerpo alterado o timestamp viejo", async () => {
		const { order } = await pendingOrder();
		const body = completedEvent(order);
		expect((await deliver(body, null)).status).toBe(400);
		expect((await deliver(body, await signStripePayload("whsec_otro", body))).status).toBe(400);
		const good = await signStripePayload(MOCK_WEBHOOK_SECRET, body);
		expect((await deliver(body.replace("7700", "1"), good)).status).toBe(400);
		const old = await signStripePayload(MOCK_WEBHOOK_SECRET, body, Math.floor(Date.now() / 1000) - 600);
		expect((await deliver(body, old)).status).toBe(400);
		expect((await deliver(body, "t=abc,v1=zz")).status).toBe(400);
		// Nada de lo anterior tocó el pedido.
		expect((await one<{ status: string }>("SELECT status FROM orders WHERE id = ?1", order.id))?.status).toBe("pending");
		expect(await count("SELECT COUNT(*) AS n FROM entitlements WHERE order_id = ?1", order.id)).toBe(0);
	});

	it("verifica firmas con varias entradas v1 (rotación de secretos de Stripe)", async () => {
		const body = '{"id":"evt_1"}';
		const t = Math.floor(Date.now() / 1000);
		const real = (await signStripePayload("whsec_a", body, t)).split(",")[1];
		await expect(verifyStripeSignature("whsec_a", body, `t=${t},v1=${"0".repeat(64)},${real}`)).resolves.toBeUndefined();
		await expect(verifyStripeSignature("whsec_b", body, `t=${t},${real}`)).rejects.toThrow(/inválida/);
	});
});

describe("idempotencia del webhook", () => {
	it("un evento repetido no duplica pedido, acceso ni correos", async () => {
		const { order } = await pendingOrder();
		const body = completedEvent(order);
		const sig = await signStripePayload(MOCK_WEBHOOK_SECRET, body);
		const first = await deliver(body, sig);
		expect(first.status).toBe(200);
		expect(await first.json()).toMatchObject({ received: true, duplicate: false });
		for (let i = 0; i < 3; i++) {
			const again = await deliver(body, await signStripePayload(MOCK_WEBHOOK_SECRET, body));
			expect(again.status).toBe(200);
			expect(await again.json()).toMatchObject({ duplicate: true });
		}
		expect((await one<{ status: string }>("SELECT status FROM orders WHERE id = ?1", order.id))?.status).toBe("paid");
		expect(await count("SELECT COUNT(*) AS n FROM entitlements WHERE order_id = ?1", order.id)).toBe(1);
		expect(await count("SELECT COUNT(*) AS n FROM email_outbox WHERE order_id = ?1", order.id)).toBe(2);
		expect(await count("SELECT COUNT(*) AS n FROM dev_emails d JOIN email_outbox o ON o.id = d.outbox_id WHERE o.order_id = ?1", order.id)).toBe(2);
		expect(await count("SELECT COUNT(*) AS n FROM payment_events WHERE id = ?1", JSON.parse(body).id)).toBe(1);
	});

	it("dos eventos DISTINTOS para la misma sesión tampoco duplican", async () => {
		const { order } = await pendingOrder();
		for (const id of [`evt_a_${uid()}`, `evt_b_${uid()}`]) {
			const body = completedEvent(order, { id });
			expect((await deliver(body, await signStripePayload(MOCK_WEBHOOK_SECRET, body))).status).toBe(200);
		}
		expect(await count("SELECT COUNT(*) AS n FROM entitlements WHERE order_id = ?1", order.id)).toBe(1);
		expect(await count("SELECT COUNT(*) AS n FROM email_outbox WHERE order_id = ?1", order.id)).toBe(2);
	});

	it("entregas concurrentes del mismo evento solo cumplen el pedido una vez", async () => {
		const { order } = await pendingOrder();
		const body = completedEvent(order);
		const results = await Promise.all([1, 2, 3, 4].map(async () => deliver(body, await signStripePayload(MOCK_WEBHOOK_SECRET, body))));
		for (const r of results) expect(r.status).toBe(200);
		expect(await count("SELECT COUNT(*) AS n FROM entitlements WHERE order_id = ?1", order.id)).toBe(1);
		expect(await count("SELECT COUNT(*) AS n FROM email_outbox WHERE order_id = ?1", order.id)).toBe(2);
	});

	it("si el monto cobrado no coincide, el pedido queda en revisión y no se entrega", async () => {
		const { order } = await pendingOrder();
		const body = completedEvent(order, { amount: 100 });
		expect((await deliver(body, await signStripePayload(MOCK_WEBHOOK_SECRET, body))).status).toBe(200);
		expect((await one<{ status: string }>("SELECT status FROM orders WHERE id = ?1", order.id))?.status).toBe("review");
		expect(await count("SELECT COUNT(*) AS n FROM entitlements WHERE order_id = ?1", order.id)).toBe(0);
	});

	it("la página de pago simulado usa el MISMO webhook y repetirla es idempotente", async () => {
		const { order, session } = await pendingOrder();
		const pay = await postForm(`/market/maqueta/pago/${order.provider_session_id}`, session, { resultado: "paid" });
		expect(pay.status).toBe(303);
		expect(pay.headers.get("location")).toContain(`/market/pago/exito?pedido=${order.id}`);
		expect(await count("SELECT COUNT(*) AS n FROM payment_events WHERE order_id = ?1 AND processed_at IS NOT NULL", order.id)).toBe(1);
		const repeat = await postForm(`/market/maqueta/pago/${order.provider_session_id}/repetir`, session);
		expect(await repeat.text()).toMatch(/idempotente/);
		expect(await count("SELECT COUNT(*) AS n FROM entitlements WHERE order_id = ?1", order.id)).toBe(1);
		expect(await count("SELECT COUNT(*) AS n FROM email_outbox WHERE order_id = ?1", order.id)).toBe(2);
	});

	it("reembolso total revoca el acceso; vencido marca el pedido", async () => {
		const { order } = await pendingOrder();
		const body = completedEvent(order);
		await deliver(body, await signStripePayload(MOCK_WEBHOOK_SECRET, body));
		const pi = JSON.parse(body).data.object.payment_intent;
		const refund = JSON.stringify({ id: `evt_r_${uid()}`, type: "charge.refunded", data: { object: { id: "ch_1", payment_intent: pi, amount: 7700, amount_refunded: 7700, refunded: true } } });
		expect((await deliver(refund, await signStripePayload(MOCK_WEBHOOK_SECRET, refund))).status).toBe(200);
		expect((await one<{ status: string }>("SELECT status FROM orders WHERE id = ?1", order.id))?.status).toBe("refunded");
		expect((await one<{ revoked_at: number | null }>("SELECT revoked_at FROM entitlements WHERE order_id = ?1", order.id))?.revoked_at).not.toBeNull();

		const second = await pendingOrder();
		const expired = JSON.stringify({ id: `evt_e_${uid()}`, type: "checkout.session.expired", data: { object: { id: second.order.provider_session_id, client_reference_id: second.order.id } } });
		await deliver(expired, await signStripePayload(MOCK_WEBHOOK_SECRET, expired));
		expect((await one<{ status: string }>("SELECT status FROM orders WHERE id = ?1", second.order.id))?.status).toBe("expired");
	});

	it("un evento cuyo id de sesión no corresponde al pedido no lo marca como pagado", async () => {
		const { order } = await pendingOrder();
		const body = completedEvent({ ...order, provider_session_id: "cs_ajena" });
		expect((await deliver(body, await signStripePayload(MOCK_WEBHOOK_SECRET, body))).status).toBe(200);
		expect((await one<{ status: string }>("SELECT status FROM orders WHERE id = ?1", order.id))?.status).toBe("pending");
	});
});

describe("tamaño del webhook", () => {
	it("rechaza cuerpos enormes", async () => {
		const res = await call("/market/webhooks/pagos", { method: "POST", headers: { "content-length": String(10 * 1024 * 1024) }, body: "x" });
		expect(res.status).toBe(413);
	});
});
