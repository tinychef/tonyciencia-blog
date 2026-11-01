import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createAdapters } from "../src/adapters";
import { StripePaymentProvider } from "../src/adapters/payments/stripe";
import { loadConfig } from "../src/config";
import type { Env } from "../src/env";
import { checkBuyerAmount, parseBuyerAmount, saleInfo, STRIPE_MAX_CENTS } from "../src/lib/pricing";
import { provisionKey, provisionTestHooks } from "../src/routes/provision";
import { startCheckout } from "../src/services/orders";
import { getProductBySlug, upsertUser } from "../src/services/repo";
import { merchantFeed } from "../src/services/seo";
import { clearWelcomeCache } from "../src/services/welcome";
import { call, count, createProduct, loginMock, one, postForm, uid } from "./helpers";

const cfg = () => {
	const c = loadConfig(env as Env);
	if (!c.ok) throw new Error("config");
	return c.config;
};

async function makePwyw(opts: { min?: number; suggested?: number; max?: number | null } = {}) {
	const p = await createProduct({ priceCents: opts.suggested ?? 900 });
	await env.MARKET_DB.prepare("UPDATE products SET price_mode = 'pwyw', min_price_cents = ?2, max_price_cents = ?3 WHERE id = ?1")
		.bind(p.id, opts.min ?? 0, opts.max ?? null)
		.run();
	return p;
}

describe("montos de «paga lo que quieras»", () => {
	it("entiende los formatos que escribe la gente", () => {
		expect(parseBuyerAmount("12")).toBe(1200);
		expect(parseBuyerAmount("12.5")).toBe(1250);
		expect(parseBuyerAmount("12,50")).toBe(1250);
		expect(parseBuyerAmount("$ 1000")).toBe(100000);
		expect(parseBuyerAmount("1,000,000.00")).toBe(100000000);
		expect(parseBuyerAmount("1.000.000,50")).toBe(100000050);
		expect(parseBuyerAmount("999999.99 USD")).toBe(99999999);
		expect(parseBuyerAmount("0")).toBe(0);
		// En dinero no hay 3 decimales: un grupo de 3 cifras tras el separador son miles (y el botón muestra el monto antes de pagar).
		expect(parseBuyerAmount("12.345")).toBe(1234500);
		expect(parseBuyerAmount("1,500")).toBe(150000);
		for (const bad of ["", "abc", "-5", "1e3", "12.3456", "1..2", "0x10", "1.2.3"]) expect(parseBuyerAmount(bad)).toBeNull();
	});

	it("valida mínimo, máximo y los límites de Stripe", () => {
		const free = { min_price_cents: 0, max_price_cents: null };
		expect(checkBuyerAmount(free, "0")).toEqual({ ok: true, cents: 0, free: true });
		expect(checkBuyerAmount(free, "0.30")).toMatchObject({ ok: false, reason: "below_stripe_min" });
		expect(checkBuyerAmount(free, "0.50")).toEqual({ ok: true, cents: 50, free: false });
		expect(checkBuyerAmount(free, "999999.99")).toEqual({ ok: true, cents: STRIPE_MAX_CENTS, free: false });
		expect(checkBuyerAmount(free, "1000000")).toMatchObject({ ok: false, reason: "above_max" });
		expect(checkBuyerAmount({ min_price_cents: 500, max_price_cents: 10000 }, "4.99")).toMatchObject({ ok: false, reason: "below_min" });
		expect(checkBuyerAmount({ min_price_cents: 500, max_price_cents: 10000 }, "100.01")).toMatchObject({ ok: false, reason: "above_max" });
		expect(checkBuyerAmount(free, "hola")).toMatchObject({ ok: false, reason: "invalid" });
	});

	it("cobra el monto elegido (validado en el servidor) y no otro", async () => {
		const p = await makePwyw({ suggested: 900 });
		const s = await loginMock(`pwyw-${uid()}@maqueta.test`);
		const res = await postForm(`/market/producto/${p.slug}/comprar`, s, { monto: "25", price: "1", amount: "0.5" });
		expect(res.status).toBe(303);
		expect(res.headers.get("location")).toMatch(/\/market\/maqueta\/pago\/cs_mock_/);
		const order = await one<{ id: string; amount_cents: number; kind: string }>(
			"SELECT o.id, o.amount_cents, o.kind FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email = ?1",
			s.email,
		);
		expect(order).toMatchObject({ amount_cents: 2500, kind: "paid" });
		expect((await one<{ amount_cents: number }>("SELECT amount_cents FROM mock_checkout_sessions WHERE order_id = ?1", order!.id))?.amount_cents).toBe(2500);
	});

	it("con 0 se entrega gratis sin pasar por el proveedor de pagos", async () => {
		const p = await makePwyw({ min: 0 });
		const s = await loginMock(`pwyw0-${uid()}@maqueta.test`);
		const res = await postForm(`/market/producto/${p.slug}/comprar`, s, { monto: "0" });
		expect(res.status).toBe(303);
		expect(res.headers.get("location")).toMatch(/\/market\/mis-compras\?listo=.+&nuevo=1/);
		const order = await one<{ kind: string; status: string; amount_cents: number; provider: string }>(
			"SELECT o.kind, o.status, o.amount_cents, o.provider FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email = ?1",
			s.email,
		);
		expect(order).toEqual({ kind: "free", status: "free", amount_cents: 0, provider: "free" });
		expect(await count("SELECT COUNT(*) AS n FROM mock_checkout_sessions WHERE customer_email = ?1", s.email)).toBe(0);
		expect(await count("SELECT COUNT(*) AS n FROM entitlements e JOIN users u ON u.id = e.user_id WHERE u.email = ?1", s.email)).toBe(1);
	});

	it("rechaza montos fuera de rango con un aviso claro (y no crea pedidos)", async () => {
		const p = await makePwyw({ min: 500, max: 10000, suggested: 900 });
		const s = await loginMock(`pwywr-${uid()}@maqueta.test`);
		const cases: Array<[string, string]> = [
			["0", "monto-minimo"],
			["4.99", "monto-minimo"],
			["100.01", "monto-maximo"],
			["doce", "monto-invalido"],
		];
		for (const [monto, aviso] of cases) {
			const res = await postForm(`/market/producto/${p.slug}/comprar`, s, { monto });
			expect(res.headers.get("location")).toContain(`aviso=${aviso}`);
		}
		const free = await makePwyw({ min: 0 });
		expect((await postForm(`/market/producto/${free.slug}/comprar`, s, { monto: "0.25" })).headers.get("location")).toContain("aviso=monto-stripe");
		expect(await count("SELECT COUNT(*) AS n FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email = ?1", s.email)).toBe(0);
	});

	it("no combina cupones con «paga lo que quieras»", async () => {
		const p = await makePwyw({ suggested: 900 });
		const s = await loginMock(`pwywc-${uid()}@maqueta.test`);
		const res = await postForm(`/market/producto/${p.slug}/comprar`, s, { monto: "20", cupon: "TONYCIENCIA" });
		expect(res.headers.get("location")).toContain("aviso=cupon-pwyw");
	});

	it("la ficha muestra el campo de monto, los atajos y el botón de descarga gratis", async () => {
		const p = await makePwyw({ min: 0, suggested: 900 });
		const s = await loginMock(`pwywv-${uid()}@maqueta.test`);
		const html = await (await call(`/market/producto/${p.slug}`, { headers: { cookie: s.cookie } })).text();
		expect(html).toContain('name="monto"');
		expect(html).toContain('data-amount="0"');
		expect(html).toContain("Paga lo que quieras");
		expect(html).not.toContain('name="cupon"');
	});
});

describe("ofertas: precio anterior real tachado", () => {
	it("la migración 0004 agrega el modo de precio y la tabla de estado", async () => {
		// Las guardas de los precios se prueban sobre datos tipo producción en scripts/test-catalog-migration.mjs.
		const cols = (await env.MARKET_DB.prepare("PRAGMA table_info(products)").all<{ name: string }>()).results.map((c) => c.name);
		expect(cols).toEqual(expect.arrayContaining(["price_mode", "min_price_cents", "max_price_cents"]));
		expect(await count("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'market_state'")).toBe(1);
	});

	it("tarjeta, ficha, JSON-LD y feed muestran la oferta", async () => {
		const p = await createProduct({ priceCents: 3333 });
		await env.MARKET_DB.prepare("UPDATE products SET compare_at_cents = 7690, images = ?2 WHERE id = ?1")
			.bind(p.id, JSON.stringify([{ src: "/market/static/products/anuncios-infinitos/cover.webp", alt: "portada" }]))
			.run();
		const product = (await getProductBySlug(env.MARKET_DB, p.slug))!;
		expect(saleInfo(product)).toEqual({ wasCents: 7690, saveCents: 4357, percent: 57 });

		const html = await (await call(`/market/producto/${p.slug}`)).text();
		expect(html).toContain("OFERTA −57%");
		expect(html).toMatch(/<s class="mk3-price-was"[^>]*>\$76\.90<\/s>/);
		expect(html).toContain("Ahorras $43.57 USD");
		const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"Product".*?)<\/script>/)![1]!);
		expect(ld.offers.price).toBe("33.33");
		expect(ld.offers.priceSpecification[1]).toMatchObject({ priceType: "https://schema.org/StrikethroughPrice", price: "76.90" });
		expect(ld.offers.priceValidUntil).toMatch(/^\d{4}-12-31$/);

		const catalog = await (await call("/market")).text();
		// Tarjeta v5: etiqueta de precio, precio anterior real tachado y % de ahorro.
		expect(catalog).toContain('<span class="mk5-tag">$33.33</span>');
		expect(catalog).toMatch(/<s class="mk5-was"[^>]*>\$76\.90<\/s>/);
		expect(catalog).toContain("Oferta −57 %");

		const feed = await (await call("/market/feed.xml")).text();
		const item = feed.split("<item>").find((x) => x.includes(`<g:id>${p.slug}</g:id>`))!;
		expect(item).toContain("<g:price>76.90 USD</g:price>");
		expect(item).toContain("<g:sale_price>33.33 USD</g:sale_price>");
	});

	it("el feed excluye «paga lo que quieras» desde $0 (Merchant no acepta precio 0) y usa el mínimo si es mayor", async () => {
		const zero = await makePwyw({ min: 0 });
		const five = await makePwyw({ min: 500, suggested: 900 });
		const img = JSON.stringify([{ src: "/market/static/products/specreel/cover.webp", alt: "x" }]);
		await env.MARKET_DB.prepare("UPDATE products SET images = ?1 WHERE id IN (?2, ?3)").bind(img, zero.id, five.id).run();
		const { listShopProducts } = await import("../src/services/repo");
		const feed = merchantFeed("https://tonyciencia.com", await listShopProducts(env.MARKET_DB));
		expect(feed).not.toContain(`<g:id>${zero.slug}</g:id>`);
		const item = feed.split("<item>").find((x) => x.includes(`<g:id>${five.slug}</g:id>`))!;
		expect(item).toContain("<g:price>5.00 USD</g:price>");
	});
});

describe("cupón de bienvenida: solo primera compra", () => {
	beforeEach(() => clearWelcomeCache());

	it("se acepta en la primera compra y se rechaza si ya compró antes", async () => {
		const p = await createProduct({ priceCents: 1200 });
		const s = await loginMock(`bienv-${uid()}@maqueta.test`);
		const first = await postForm(`/market/producto/${p.slug}/comprar`, s, { cupon: "tonyciencia" });
		expect(first.headers.get("location")).toMatch(/\/market\/maqueta\/pago\//);

		const other = await createProduct({ priceCents: 1200 });
		const user = await one<{ id: string }>("SELECT id FROM users WHERE email = ?1", s.email);
		await env.MARKET_DB.prepare(
			"INSERT INTO orders (id, user_id, product_id, kind, status, amount_cents, currency, provider, customer_email, created_at, updated_at) VALUES (?1, ?2, ?3, 'paid', 'paid', 1080, 'usd', 'mock', ?4, ?5, ?5)",
		)
			.bind(crypto.randomUUID(), user!.id, p.id, s.email, Date.now())
			.run();
		const second = await postForm(`/market/producto/${other.slug}/comprar`, s, { cupon: "TONYCIENCIA" });
		expect(second.headers.get("location")).toContain("aviso=cupon-primera");
		// Sin cupón sí puede comprar.
		const plain = await postForm(`/market/producto/${other.slug}/comprar`, s, {});
		expect(plain.headers.get("location")).toMatch(/\/market\/maqueta\/pago\//);
	});

	it("el popup flotante usa el texto pedido y no es modal", async () => {
		const html = await (await call("/market")).text();
		expect(html).toContain("¡Obtén un 10 % de descuento en tu primera compra!");
		expect(html).toContain('class="mk3-pop"');
		expect(html).not.toContain('aria-modal="true"');
	});
});

describe("Stripe: checkout con oferta y cupón de bienvenida", () => {
	it("el checkout muestra la oferta y la portada en la página de pago", async () => {
		const p = await createProduct({ priceCents: 3333 });
		await env.MARKET_DB.prepare("UPDATE products SET compare_at_cents = 7690, images = ?2 WHERE id = ?1")
			.bind(p.id, JSON.stringify([{ src: "/market/static/products/anuncios-infinitos/cover.webp", alt: "x" }]))
			.run();
		const product = (await getProductBySlug(env.MARKET_DB, p.slug))!;
		const user = await upsertUser(env.MARKET_DB, `oferta-${uid()}@example.com`, "Cliente");
		let body: URLSearchParams | null = null;
		const fake = (async (_url: string, init: RequestInit) => {
			body = new URLSearchParams(String(init.body));
			return Response.json({ id: "cs_test_o", url: "https://checkout.stripe.com/c/pay/cs_test_o" });
		}) as unknown as typeof fetch;
		const adapters = createAdapters(cfg(), env as Env);
		adapters.payments = new StripePaymentProvider({ secretKey: "sk_test_x", webhookSecret: "whsec_x", taxEnabled: false, taxCode: null, fetchImpl: fake });
		const r = await startCheckout({ db: env.MARKET_DB, config: cfg(), adapters }, user, product);
		expect(r.ok).toBe(true);
		expect(body!.get("line_items[0][price_data][unit_amount]")).toBe("3333");
		expect(body!.get("line_items[0][price_data][product_data][description]")).toContain("antes $76.90 USD");
		expect(body!.get("line_items[0][price_data][product_data][images][0]")).toBeNull(); // origen http en pruebas: Stripe exige https
	});

	type Call = { url: string; method: string; body: URLSearchParams; version: string | null };
	function fakeStripe(state: { promos: Array<Record<string, unknown>>; coupons: Record<string, Record<string, unknown>> }) {
		const calls: Call[] = [];
		const f = (async (url: string, init: RequestInit = {}) => {
			const u = new URL(url);
			const method = init.method ?? "GET";
			const body = new URLSearchParams(String(init.body ?? ""));
			const headers = new Headers(init.headers);
			calls.push({ url: u.pathname + u.search, method, body, version: headers.get("stripe-version") });
			if (method === "GET" && u.pathname === "/v1/promotion_codes") {
				return Response.json({ data: state.promos.filter((p) => p.code === u.searchParams.get("code") && p.active) });
			}
			if (method === "GET" && u.pathname.startsWith("/v1/coupons/")) {
				const c = state.coupons[decodeURIComponent(u.pathname.split("/").pop()!)];
				return c ? Response.json(c) : Response.json({ error: { message: "no" } }, { status: 404 });
			}
			if (method === "POST" && u.pathname === "/v1/coupons") {
				const id = body.get("id")!;
				if (state.coupons[id]) return Response.json({ error: { code: "resource_already_exists", message: "exists" } }, { status: 400 });
				state.coupons[id] = { id, valid: true, percent_off: Number(body.get("percent_off")), metadata: { market: body.get("metadata[market]") } };
				return Response.json(state.coupons[id]);
			}
			if (method === "POST" && u.pathname === "/v1/promotion_codes") {
				const promo = { id: "promo_new", code: body.get("code"), active: true, coupon: body.get("coupon"), metadata: { market: body.get("metadata[market]") } };
				state.promos.push(promo);
				return Response.json(promo);
			}
			if (method === "POST" && u.pathname.startsWith("/v1/promotion_codes/")) {
				const promo = state.promos.find((p) => p.id === u.pathname.split("/").pop())!;
				promo.metadata = { market: body.get("metadata[market]") };
				return Response.json(promo);
			}
			return Response.json({ error: { message: `ruta no simulada ${method} ${u.pathname}` } }, { status: 500 });
		}) as unknown as typeof fetch;
		return { calls, provider: new StripePaymentProvider({ secretKey: "sk_live_x", webhookSecret: "whsec_x", taxEnabled: false, taxCode: null, fetchImpl: f }) };
	}

	it("crea cupón (10 %, once, market=true) y código promocional si no existen", async () => {
		const state = { promos: [] as Array<Record<string, unknown>>, coupons: {} as Record<string, Record<string, unknown>> };
		const { calls, provider } = fakeStripe(state);
		const r = await provider.ensureWelcomePromotion("TONYCIENCIA", 10);
		expect(r).toEqual({ status: "created", promotionCodeId: "promo_new" });
		const coupon = calls.find((c) => c.method === "POST" && c.url === "/v1/coupons")!;
		expect(Object.fromEntries(coupon.body)).toMatchObject({ id: "market-bienvenida-10", percent_off: "10", duration: "once", "metadata[market]": "true" });
		const promo = calls.find((c) => c.method === "POST" && c.url === "/v1/promotion_codes")!;
		expect(Object.fromEntries(promo.body)).toMatchObject({ coupon: "market-bienvenida-10", code: "TONYCIENCIA", "metadata[market]": "true" });
		expect(promo.version).toBe(StripePaymentProvider.PINNED_API_VERSION);
		// Segunda vez: ya existe y es válido → no crea nada.
		const before = calls.filter((c) => c.method === "POST").length;
		expect((await provider.ensureWelcomePromotion("TONYCIENCIA", 10)).status).toBe("exists");
		expect(calls.filter((c) => c.method === "POST").length).toBe(before);
	});

	it("marca un código existente del mismo % sin la etiqueta market, y no toca uno con otro descuento", async () => {
		const same = { promos: [{ id: "promo_1", code: "TONYCIENCIA", active: true, coupon: "c10", metadata: {} }], coupons: { c10: { id: "c10", valid: true, percent_off: 10, metadata: {} } } };
		const a = fakeStripe(same);
		expect(await a.provider.ensureWelcomePromotion("TONYCIENCIA", 10)).toEqual({ status: "tagged", promotionCodeId: "promo_1" });

		const other = { promos: [{ id: "promo_2", code: "TONYCIENCIA", active: true, coupon: "c50", metadata: {} }], coupons: { c50: { id: "c50", valid: true, percent_off: 50, metadata: {} } } };
		const b = fakeStripe(other);
		expect((await b.provider.ensureWelcomePromotion("TONYCIENCIA", 10)).status).toBe("conflict");
		expect(b.calls.filter((c) => c.method === "POST")).toHaveLength(0);
	});
});

describe("carga de archivos con hash fijado", () => {
	async function sha(buf: Uint8Array) {
		return [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].map((b) => b.toString(16).padStart(2, "0")).join("");
	}

	it("solo acepta el archivo exacto del manifiesto y luego activa el producto", async () => {
		const p = await createProduct({ priceCents: 1200, fileKey: null });
		await env.MARKET_DB.prepare("UPDATE products SET availability = 'coming_soon' WHERE id = ?1").bind(p.id).run();
		const good = new TextEncoder().encode(`zip real ${uid()}`);
		const entry = { slug: p.slug, sha256: await sha(good), size: good.length, fileName: "producto.zip", contentType: "application/zip", activate: true };
		provisionTestHooks.entries = [entry];
		try {
			const bad = new TextEncoder().encode("x".repeat(good.length));
			const r1 = await call(`/market/provision/${p.slug}`, { method: "PUT", body: bad, headers: { "content-type": "application/zip", "content-length": String(bad.length) } });
			expect(r1.status).toBe(400);
			const wrongSize = await call(`/market/provision/${p.slug}`, { method: "PUT", body: good.slice(1), headers: { "content-length": String(good.length - 1) } });
			expect(wrongSize.status).toBe(400);
			expect((await getProductBySlug(env.MARKET_DB, p.slug))!.file_key).toBeNull();

			const r2 = await call(`/market/provision/${p.slug}`, { method: "PUT", body: good, headers: { "content-type": "application/zip", "content-length": String(good.length) } });
			expect(r2.status).toBe(200);
			expect(await r2.json()).toMatchObject({ status: "stored", activated: true });
			const after = (await getProductBySlug(env.MARKET_DB, p.slug))!;
			expect(after).toMatchObject({ file_key: provisionKey(entry), file_size: good.length, availability: "available", active: 1 });

			const r3 = await call(`/market/provision/${p.slug}`, { method: "PUT", body: bad, headers: { "content-length": String(bad.length) } });
			expect(await r3.json()).toMatchObject({ status: "already" });
			expect((await call(`/market/provision/otro-${uid()}`, { method: "PUT", body: good })).status).toBe(404);
		} finally {
			provisionTestHooks.entries = null;
		}
	});
});

describe("catálogo: filtros y orden sin JS", () => {
	it("ordena por precio y filtra «desde $0»", async () => {
		const free = await makePwyw({ min: 0 });
		const html = await (await call("/market?filtro=gratis&orden=precio-asc")).text();
		const visible = [...html.matchAll(/<li class="mk3-item"([^>]*)>/g)].filter((m) => !m[1]!.includes("hidden"));
		expect(visible.length).toBeGreaterThan(0);
		expect(visible.every((m) => m[1]!.includes('data-free="1"'))).toBe(true);
		expect(html).toContain(free.slug);
		const status = (await (await call("/market/estado.json")).json()) as { ok: boolean; products: unknown[] };
		expect(status.ok).toBe(true);
	});
});

describe("R2: escritura verificada por SHA-256 (camino real de la carga con hash fijado)", () => {
	it("rechaza un stream que no coincide y guarda el correcto", async () => {
		const { R2FileStorage } = await import("../src/adapters/storage/r2");
		const bucket = (env as Env).MARKET_FILES!;
		const storage = new R2FileStorage(bucket, "s".repeat(40), "http://localhost:8787", null);
		const good = new TextEncoder().encode(`contenido ${uid()}`);
		const hex = [...new Uint8Array(await crypto.subtle.digest("SHA-256", good))].map((b) => b.toString(16).padStart(2, "0")).join("");
		const stream = (bytes: Uint8Array) => new Response(bytes).body!;
		const key = `tests/${uid()}.zip`;
		await expect(storage.put(key, stream(new Uint8Array(good.length).fill(65)), { contentType: "application/zip", size: good.length, sha256: hex })).rejects.toThrow();
		expect(await bucket.head(key)).toBeNull();
		await storage.put(key, stream(good), { contentType: "application/zip", size: good.length, sha256: hex });
		expect((await bucket.head(key))?.size).toBe(good.length);
	});
});

describe("ronda 3: enlaces, emojis, logos y tema", () => {
	const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

	it("ningún enlace ni formulario apunta a /market?… (en producción eso cae en el 404 del blog)", async () => {
		const p = await createProduct({ priceCents: 1200 });
		await env.MARKET_DB.prepare("UPDATE products SET category = 'video', tags = '[\"videos con IA\"]' WHERE id = ?1").bind(p.id).run();
		for (const path of ["/market", `/market/producto/${p.slug}`, "/market/agentes-para-empresas"]) {
			const html = await (await call(path)).text();
			expect(html, path).not.toMatch(/(href|action)="\/market\?/);
			expect(html, path).not.toMatch(/"item":"[^"]*\/market\?/);
		}
	});

	it("la tienda no usa emojis: íconos y logos son SVG", async () => {
		const p = await createProduct({ priceCents: 1200 });
		for (const path of ["/market", `/market/producto/${p.slug}`]) {
			const html = await (await call(path)).text();
			const text = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
			expect(text.match(EMOJI)?.[0] ?? null, path).toBeNull();
			expect(html).toContain('class="mk-ic');
		}
	});

	it("logos de compatibilidad y «2 en 1» en tarjeta y ficha; marcas sin logo permitido van como texto", async () => {
		const p = await createProduct({ priceCents: 3333 });
		await env.MARKET_DB.prepare("UPDATE products SET compat = ?2 WHERE id = ?1")
			.bind(p.id, JSON.stringify({ works: ["claude-code", "codex", "chrome", "inventada"], includes: ["agent|Agente de anuncios", "chrome-ext"] }))
			.run();
		const product = (await getProductBySlug(env.MARKET_DB, p.slug))!;
		expect(product.compat.works.map((w) => w.k)).toEqual(["claude-code", "codex", "chrome"]);
		const card = await (await call("/market")).text();
		expect(card).toMatch(/<span class="mk5-incl">[\s\S]{0,80}Agente de anuncios \+ Extensión de Chrome<\/span>/);
		const html = await (await call(`/market/producto/${p.slug}`)).text();
		expect(html).toContain("Funciona con");
		expect(html).toContain("Agente de anuncios");
		expect(html).toContain("Extensión de Chrome");
		expect(html).toContain('class="mk-brand-logo"');
		// Codex lleva el logo de OpenAI (lobe-icons, MIT), con fill-rule evenodd.
		expect(html).toMatch(/<li><svg class="mk-brand-logo"[^>]*><path fill-rule="evenodd"[\s\S]{0,2000}?Codex<\/li>/);
	});

	it("botón de tema claro/oscuro con la misma cookie que el blog", async () => {
		const html = await (await call("/market", { headers: { cookie: "scheme=light" } })).text();
		expect(html).toContain('<html lang="es" class="light">');
		expect(html).toContain("data-theme-toggle");
	});
});

describe("v5: catálogo «Mi stack de herramientas» y precios con número", () => {
	it("el catálogo abre con su título, tarjetas con etiqueta de precio y sin la insignia «Nuevo»", async () => {
		await createProduct({ priceCents: 1200 });
		const html = await (await call("/market")).text();
		expect(html).toContain('<h1 id="catalogo-titulo">Mi stack de herramientas</h1>');
		expect(html).toContain("<title>Mi stack de herramientas de IA en español | Market Tony</title>");
		expect(html).toContain('<span class="mk5-tag">$12</span>');
		expect(html).not.toContain(">Nuevo<");
		expect(html).not.toContain("n8n.");
	});

	it("«paga lo que quieras» muestra $0 (no «Gratis») y los montos antes de entrar; el monto elegido vuelve tras el login", async () => {
		const p = await makePwyw({ min: 0, suggested: 900 });
		const card = await (await call("/market")).text();
		expect(card).toMatch(/<span class="mk5-tag"[^>]*>\$0\+<\/span>/);
		const out = await (await call(`/market/producto/${p.slug}`)).text();
		expect(out).toMatch(/class="mk3-preset "[^>]*>\$0<\/a>/);
		expect(out).not.toMatch(/class="mk3-preset[^"]*"[^>]*>Gratis</);
		expect(out).toContain(encodeURIComponent(`/market/producto/${p.slug}?monto=9#comprar`));
		const s = await loginMock(`monto-${uid()}@maqueta.test`);
		const inside = await (await call(`/market/producto/${p.slug}?monto=18`, { headers: { cookie: s.cookie } })).text();
		expect(inside).toMatch(/id="monto"[^>]*value="18"/);
		const bad = await (await call(`/market/producto/${p.slug}?monto=abc`, { headers: { cookie: s.cookie } })).text();
		expect(bad).toMatch(/id="monto"[^>]*value="9"/);
	});
});

describe("tienda en inglés (/market/en/)", () => {
	it("catálogo y ficha en inglés: interfaz, título, alt y portada en inglés; hreflang y selector ES/EN", async () => {
		const p = await createProduct({ priceCents: 1200 });
		await env.MARKET_DB.prepare("UPDATE products SET images = ?2, i18n = ?3, title = 'Producto: en español' WHERE id = ?1")
			.bind(
				p.id,
				JSON.stringify([{ src: `/market/static/products/specreel-stick/cover.webp`, alt: "Portada" }]),
				JSON.stringify({ en: { title: "Product in English: subtitle", tagline: "English tagline", image_alts: ["English cover"] } }),
			)
			.run();
		const cat = await (await call("/market/en/")).text();
		expect(cat).toContain('<html lang="en"');
		expect(cat).toContain('<h1 id="catalogo-titulo">My tool stack</h1>');
		expect(cat).toContain("English tagline");
		expect(cat).toContain('hreflang="es" href="http://localhost:8787/market/"');
		expect(cat).toContain('class="mk-lang"');
		const row = { slug: p.slug };
		const en = await (await call(`/market/en/product/${row.slug}`)).text();
		expect(en).toContain("Product in English");
		expect(en).toContain('alt="English cover"');
		expect(en).toContain(`hreflang="en" href="http://localhost:8787/market/en/product/${row.slug}"`);
		const es = await (await call(`/market/producto/${row.slug}`)).text();
		expect(es).toContain('<html lang="es"');
		expect(es).toContain("Producto");
	});

	it("una ficha sin inglés redirige a la española y el sitemap anuncia las dos versiones", async () => {
		const p = await createProduct({ priceCents: 900 });
		const r = await call(`/market/en/product/${p.slug}`);
		expect(r.status).toBe(302);
		expect(r.headers.get("location")).toBe(`/market/producto/${p.slug}`);
		const sitemap = await (await call("/market/sitemap.xml")).text();
		expect(sitemap).toContain("<loc>http://localhost:8787/market/en/</loc>");
		expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
	});
});
