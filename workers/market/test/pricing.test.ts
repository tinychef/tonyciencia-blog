import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { StripePaymentProvider } from "../src/adapters/payments/stripe";
import { createAdapters } from "../src/adapters";
import { loadConfig } from "../src/config";
import type { Env } from "../src/env";
import { startCheckout } from "../src/services/orders";
import { getProductBySlug, upsertUser } from "../src/services/repo";
import { createProduct, loginMock, one, postForm, uid } from "./helpers";

describe("el precio sale SIEMPRE de la base de datos", () => {
	it("ignora cualquier precio enviado por el navegador", async () => {
		const p = await createProduct({ priceCents: 7700 });
		const s = await loginMock(`precio-${uid()}@maqueta.test`);
		const res = await postForm(`/market/producto/${p.slug}/comprar`, s, {
			price: "1",
			price_cents: "1",
			amount: "0.01",
			unit_amount: "1",
			"line_items[0][price_data][unit_amount]": "1",
		});
		expect(res.status).toBe(303);
		expect(res.headers.get("location")).toMatch(/\/market\/maqueta\/pago\/cs_mock_/);
		const order = await one<{ id: string; amount_cents: number; currency: string; status: string }>(
			"SELECT o.id, o.amount_cents, o.currency, o.status FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email = ?1",
			s.email,
		);
		expect(order).toMatchObject({ amount_cents: 7700, currency: "usd", status: "pending" });
		const session = await one<{ amount_cents: number }>("SELECT amount_cents FROM mock_checkout_sessions WHERE order_id = ?1", order!.id);
		expect(session?.amount_cents).toBe(7700);
	});

	it("si el precio cambia en la BD, el siguiente checkout usa el nuevo", async () => {
		const p = await createProduct({ priceCents: 7700 });
		await env.MARKET_DB.prepare("UPDATE products SET price_cents = 9900 WHERE id = ?1").bind(p.id).run();
		const s = await loginMock(`precio2-${uid()}@maqueta.test`);
		await postForm(`/market/producto/${p.slug}/comprar`, s, { price: "77" });
		const order = await one<{ amount_cents: number }>("SELECT o.amount_cents FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email = ?1", s.email);
		expect(order?.amount_cents).toBe(9900);
	});

	it("el adaptador live de Stripe envía unit_amount de la BD, idempotency-key y sin impuestos por defecto", async () => {
		const p = await createProduct({ priceCents: 7700 });
		const product = (await getProductBySlug(env.MARKET_DB, p.slug))!;
		const user = await upsertUser(env.MARKET_DB, `stripe-${uid()}@example.com`, "Cliente");
		const calls: Array<{ url: string; init: RequestInit }> = [];
		const fakeFetch = (async (url: string, init: RequestInit) => {
			calls.push({ url, init });
			return Response.json({ id: "cs_test_123", url: "https://checkout.stripe.com/c/pay/cs_test_123" });
		}) as unknown as typeof fetch;
		const config = loadConfig(env as Env);
		if (!config.ok) throw new Error("config");
		const adapters = createAdapters(config.config, env as Env);
		adapters.payments = new StripePaymentProvider({ secretKey: "sk_test_x", webhookSecret: "whsec_x", taxEnabled: false, taxCode: null, fetchImpl: fakeFetch });
		const r = await startCheckout({ db: env.MARKET_DB, config: config.config, adapters }, user, product);
		expect(r.ok).toBe(true);
		expect(calls).toHaveLength(1);
		const body = new URLSearchParams(String(calls[0]!.init.body));
		expect(calls[0]!.url).toBe("https://api.stripe.com/v1/checkout/sessions");
		expect(body.get("line_items[0][price_data][unit_amount]")).toBe("7700");
		expect(body.get("line_items[0][price_data][currency]")).toBe("usd");
		expect(body.get("mode")).toBe("payment");
		expect(body.get("automatic_tax[enabled]")).toBeNull();
		expect(body.get("client_reference_id")).toBe(body.get("metadata[order_id]"));
		const headers = new Headers(calls[0]!.init.headers);
		expect(headers.get("idempotency-key")).toBe(`checkout-${body.get("client_reference_id")}`);
		expect(headers.get("authorization")).toBe("Bearer sk_test_x");
		const order = await one<{ provider_session_id: string; amount_cents: number }>("SELECT * FROM orders WHERE id = ?1", r.ok ? r.orderId : "");
		expect(order).toMatchObject({ provider_session_id: "cs_test_123", amount_cents: 7700 });
	});

	describe("cupones (solo los marcados con market=true)", () => {
		/** Simula la API de Stripe: códigos promocionales (forma nueva con promotion.coupon) y cupones. */
		function fakeStripe(promos: Record<string, { id: string; active: boolean; coupon: string; metadata?: Record<string, string> }>, coupons: Record<string, { valid: boolean; metadata?: Record<string, string> }>) {
			return (async (url: string) => {
				const u = new URL(url);
				if (u.pathname === "/v1/promotion_codes") {
					const p = promos[u.searchParams.get("code") ?? ""];
					return Response.json({ data: p && p.active ? [{ id: p.id, active: p.active, metadata: p.metadata ?? {}, promotion: { type: "coupon", coupon: p.coupon } }] : [] });
				}
				const m = /^\/v1\/coupons\/(.+)$/.exec(u.pathname);
				const c = m ? coupons[m[1]!] : undefined;
				return c ? Response.json(c) : Response.json({ error: { message: "no existe" } }, { status: 404 });
			}) as unknown as typeof fetch;
		}
		const make = (f: typeof fetch) => new StripePaymentProvider({ secretKey: "sk_test_x", webhookSecret: "whsec_x", taxEnabled: false, taxCode: null, fetchImpl: f });

		it("acepta un cupón con metadata market=true y rechaza los demás", async () => {
			const stripe = make(
				fakeStripe(
					{
						MARKETOK: { id: "promo_ok", active: true, coupon: "c_ok" },
						MERKHIFY: { id: "promo_otro", active: true, coupon: "c_otro" },
						VENCIDO: { id: "promo_v", active: true, coupon: "c_v" },
						PORPROMO: { id: "promo_p", active: true, coupon: "c_otro", metadata: { market: "true" } },
					},
					{ c_ok: { valid: true, metadata: { market: "true" } }, c_otro: { valid: true }, c_v: { valid: false, metadata: { market: "true" } } },
				),
			);
			await expect(stripe.resolvePromotionCode("MARKETOK")).resolves.toEqual({ id: "promo_ok" });
			await expect(stripe.resolvePromotionCode("PORPROMO")).resolves.toEqual({ id: "promo_p" });
			await expect(stripe.resolvePromotionCode("MERKHIFY")).resolves.toBeNull(); // cupón de otro negocio de la misma cuenta
			await expect(stripe.resolvePromotionCode("VENCIDO")).resolves.toBeNull();
			await expect(stripe.resolvePromotionCode("NOEXISTE")).resolves.toBeNull();
			await expect(stripe.resolvePromotionCode("con espacios; DROP")).resolves.toBeNull();
		});

		it("el checkout lleva discounts[0][promotion_code] solo con cupón válido, y nunca allow_promotion_codes", () => {
			const req = { orderId: "o", productId: "p", productTitle: "t", amountCents: 7690, currency: "usd", customerEmail: "a@b.co", successUrl: "https://x/s", cancelUrl: "https://x/c" };
			const sin = StripePaymentProvider.buildCheckoutParams(req, false, null);
			const con = StripePaymentProvider.buildCheckoutParams({ ...req, promotionCodeId: "promo_ok" }, false, null);
			expect(sin.get("discounts[0][promotion_code]")).toBeNull();
			expect(con.get("discounts[0][promotion_code]")).toBe("promo_ok");
			expect(con.get("allow_promotion_codes")).toBeNull();
			expect(con.get("line_items[0][price_data][unit_amount]")).toBe("7690"); // el precio base sigue siendo el de la BD
		});

		it("startCheckout con cupón inválido no crea pedido ni llama a createCheckout", async () => {
			const p = await createProduct({ priceCents: 7690 });
			const product = (await getProductBySlug(env.MARKET_DB, p.slug))!;
			const user = await upsertUser(env.MARKET_DB, `cupon-${uid()}@example.com`, "Cliente");
			const config = loadConfig(env as Env);
			if (!config.ok) throw new Error("config");
			const calls: string[] = [];
			const fake = (async (url: string) => {
				calls.push(url);
				const u = new URL(url);
				if (u.pathname === "/v1/promotion_codes") return Response.json({ data: [] });
				return Response.json({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
			}) as unknown as typeof fetch;
			const adapters = createAdapters(config.config, env as Env);
			adapters.payments = make(fake);
			const r = await startCheckout({ db: env.MARKET_DB, config: config.config, adapters }, user, product, "MERKHIFY");
			expect(r).toEqual({ ok: false, reason: "invalid_coupon" });
			expect(calls.some((c) => c.endsWith("/v1/checkout/sessions"))).toBe(false);
			expect((await one<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?1", user.id))?.n).toBe(0);
		});
	});

	it("STRIPE_TAX_ENABLED activa automatic_tax (y nada más)", () => {
		const req = { orderId: "o", productId: "p", productTitle: "t", amountCents: 7700, currency: "usd", customerEmail: "a@b.co", successUrl: "https://x/s", cancelUrl: "https://x/c" };
		const off = StripePaymentProvider.buildCheckoutParams(req, false, null);
		const on = StripePaymentProvider.buildCheckoutParams(req, true, null);
		expect(off.get("automatic_tax[enabled]")).toBeNull();
		expect(on.get("automatic_tax[enabled]")).toBe("true");
		const diff = [...on.keys()].filter((k) => !off.has(k));
		expect(diff).toEqual(["automatic_tax[enabled]"]);
	});

	it("no se puede comprar un producto gratis ni uno inactivo", async () => {
		const free = await createProduct({ kind: "free" });
		const off = await createProduct({ priceCents: 5000 });
		await env.MARKET_DB.prepare("UPDATE products SET active = 0 WHERE id = ?1").bind(off.id).run();
		const s = await loginMock(`nocompra-${uid()}@maqueta.test`);
		expect((await postForm(`/market/producto/${free.slug}/comprar`, s)).status).toBe(404);
		expect((await postForm(`/market/producto/${off.slug}/comprar`, s)).status).toBe(404);
	});

	it("comprar exige sesión y CSRF", async () => {
		const p = await createProduct();
		const anon = await postForm(`/market/producto/${p.slug}/comprar`, null);
		expect(anon.status).toBe(303);
		expect(anon.headers.get("location")).toMatch(/^\/market\/entrar/);
		const s = await loginMock(`csrf-${uid()}@maqueta.test`);
		const bad = await postForm(`/market/producto/${p.slug}/comprar`, { ...s, csrf: "falso" });
		expect(bad.status).toBe(403);
	});
});
