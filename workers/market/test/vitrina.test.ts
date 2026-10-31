import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createAdapters } from "../src/adapters";
import { loadConfig } from "../src/config";
import type { Env } from "../src/env";
import { startCheckout } from "../src/services/orders";
import { getProductBySlug, upsertUser } from "../src/services/repo";
import { clearWelcomeCache, getWelcomeOffer } from "../src/services/welcome";
import { call, count, createProduct, loginMock, one, postForm, uid } from "./helpers";

const PRODUCT_JSONLD = /<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"Product".*?)<\/script>/;

describe("catálogo v2", () => {
	it("muestra los productos próximos de la migración, con su etiqueta y sin botón de compra", async () => {
		const html = await (await call("/market")).text();
		for (const slug of ["cutpilot", "kit-n8n-agentes-ia", "carruseles-infinitos"]) expect(html).toContain(`/market/producto/${slug}`);
		expect(html).toContain("Próximamente");
		const page = await (await call("/market/producto/cutpilot")).text();
		expect(page).toContain('action="/market/producto/cutpilot/avisame"');
		expect(page).not.toContain("/comprar");
		expect(page).not.toMatch(/Comprar por/);
	});

	it("filtra por categoría y búsqueda en el servidor (sin JS)", async () => {
		const html = await (await call("/market?categoria=video")).text();
		// Los de otra categoría quedan ocultos con el atributo hidden.
		expect(html).toMatch(/data-cat="automatizacion"[^>]*hidden/);
		expect(html).not.toMatch(/data-cat="video"[^>]*hidden/);
		const q = await (await call("/market?q=carruseles")).text();
		expect(q).toMatch(/data-cat="video"[^>]*hidden/);
	});

	it("un producto próximo nunca se cobra: ni por el formulario ni llamando a startCheckout", async () => {
		const s = await loginMock(`proximo-${uid()}@maqueta.test`);
		const res = await postForm("/market/producto/cutpilot/comprar", s);
		expect(res.status).toBe(404);
		const product = (await getProductBySlug(env.MARKET_DB, "cutpilot"))!;
		const user = await upsertUser(env.MARKET_DB, s.email, "x");
		const config = loadConfig(env as Env);
		if (!config.ok) throw new Error("config");
		const r = await startCheckout({ db: env.MARKET_DB, config: config.config, adapters: createAdapters(config.config, env as Env) }, user, product, null);
		expect(r).toEqual({ ok: false, reason: "not_found" });
		expect(await count("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?1", user.id)).toBe(0);
	});
});

describe("lista de espera", () => {
	it("guarda el correo una sola vez y vuelve a la ficha con aviso", async () => {
		const email = `espera-${uid()}@example.com`;
		const r1 = await postForm("/market/producto/kit-n8n-agentes-ia/avisame", null, { email });
		expect(r1.status).toBe(303);
		expect(r1.headers.get("location")).toMatch(/aviso=lista-ok/);
		await postForm("/market/producto/kit-n8n-agentes-ia/avisame", null, { email: email.toUpperCase() });
		expect(await count("SELECT COUNT(*) AS n FROM waitlist WHERE email = ?1", email)).toBe(1);
	});

	it("rechaza correos inválidos, productos disponibles y peticiones de otro origen", async () => {
		const bad = await postForm("/market/producto/kit-n8n-agentes-ia/avisame", null, { email: "no-es-correo" });
		expect(bad.headers.get("location")).toMatch(/aviso=correo-invalido/);
		const p = await createProduct();
		expect((await postForm(`/market/producto/${p.slug}/avisame`, null, { email: `a-${uid()}@example.com` })).status).toBe(404);
		const csrf = await call("/market/producto/kit-n8n-agentes-ia/avisame", {
			method: "POST",
			headers: { origin: "https://evil.example", "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ email: `b-${uid()}@example.com` }),
		});
		expect(csrf.status).toBe(403);
	});
});

describe("reseñas reales", () => {
	it("solo quien tiene el producto puede reseñar; la reseña sale en la ficha y en el JSON-LD", async () => {
		const p = await createProduct({ kind: "free" });
		const intruso = await loginMock(`sin-compra-${uid()}@maqueta.test`);
		expect((await postForm(`/market/producto/${p.slug}/resena`, intruso, { rating: "5", body: "Falsa" })).status).toBe(403);

		// Sin reseñas: nada de estrellas ni aggregateRating.
		const before = await (await call(`/market/producto/${p.slug}`)).text();
		expect(before).toContain("Aún no hay reseñas");
		expect(before).not.toContain("aggregateRating");

		const s = await loginMock(`con-compra-${uid()}@maqueta.test`);
		expect((await postForm(`/market/producto/${p.slug}/obtener`, s)).status).toBe(303);
		const ok = await postForm(`/market/producto/${p.slug}/resena`, s, { rating: "4", body: "Me sirvió para mis clientes." });
		expect(ok.status).toBe(303);
		const html = await (await call(`/market/producto/${p.slug}`)).text();
		expect(html).toContain("Me sirvió para mis clientes.");
		expect(html).toContain("Compra verificada");
		const ld = JSON.parse(html.match(PRODUCT_JSONLD)![1]!);
		expect(ld.aggregateRating).toMatchObject({ ratingValue: "4.0", reviewCount: 1 });

		// Editar reemplaza (una reseña por persona y producto).
		await postForm(`/market/producto/${p.slug}/resena`, s, { rating: "5", body: "Aún mejor" });
		expect(await count("SELECT COUNT(*) AS n FROM reviews WHERE product_id = ?1", p.id)).toBe(1);
		expect((await one<{ rating: number }>("SELECT rating FROM reviews WHERE product_id = ?1", p.id))?.rating).toBe(5);
	});

	it("rechaza calificaciones fuera de 1 a 5", async () => {
		const p = await createProduct({ kind: "free" });
		const s = await loginMock(`rango-${uid()}@maqueta.test`);
		await postForm(`/market/producto/${p.slug}/obtener`, s);
		const r = await postForm(`/market/producto/${p.slug}/resena`, s, { rating: "9" });
		expect(r.headers.get("location")).toMatch(/resena=error/);
		expect(await count("SELECT COUNT(*) AS n FROM reviews WHERE product_id = ?1", p.id)).toBe(0);
	});
});

describe("cifras reales en la tienda", () => {
	it("las ventas cuentan solo pedidos pagados (más las ventas reales cargadas fuera del market)", async () => {
		const p = await createProduct({ priceCents: 2500 });
		const u = await upsertUser(env.MARKET_DB, `ventas-${uid()}@example.com`, "x");
		const insert = (status: string) =>
			env.MARKET_DB.prepare(
				`INSERT INTO orders (id, user_id, product_id, kind, status, amount_cents, currency, provider, customer_email, created_at, updated_at)
				 VALUES (?1, ?2, ?3, 'paid', ?4, 2500, 'usd', 'mock', 'x@example.com', 1, 1)`,
			)
				.bind(crypto.randomUUID(), u.id, p.id, status)
				.run();
		await insert("pending");
		expect(await (await call(`/market/producto/${p.slug}`)).text()).not.toMatch(/\d+ ventas?</);
		await insert("paid");
		expect(await (await call(`/market/producto/${p.slug}`)).text()).toContain("1 venta<");
		await env.MARKET_DB.prepare("UPDATE products SET sales_offset = 2 WHERE id = ?1").bind(p.id).run();
		expect(await (await call(`/market/producto/${p.slug}`)).text()).toContain("3 ventas<");
	});
});

describe("SEO y Google Merchant", () => {
	it("el feed incluye solo productos de pago disponibles, con precio y enlaces absolutos", async () => {
		const p = await createProduct({ priceCents: 3690 });
		await env.MARKET_DB.prepare(`UPDATE products SET images = '[{"src":"/market/static/products/specreel/cover.webp","alt":"x"}]' WHERE id = ?1`).bind(p.id).run();
		const res = await call("/market/feed.xml");
		expect(res.headers.get("content-type")).toMatch(/application\/xml/);
		const xml = await res.text();
		expect(xml).toMatch(/^<\?xml/);
		expect(xml).toContain(`<g:id>${p.slug}</g:id>`);
		expect(xml).toContain("<g:price>36.90 USD</g:price>");
		expect(xml).toContain("<g:image_link>http://localhost:8787/market/static/products/specreel/cover.webp</g:image_link>");
		expect(xml).not.toContain("<g:id>cutpilot</g:id>"); // próximamente
		expect(xml).not.toContain("<g:id>guia-gratis-prueba</g:id>"); // gratis
	});

	it("el sitemap lista la tienda, el servicio y las fichas", async () => {
		const xml = await (await call("/market/sitemap.xml")).text();
		expect(xml).toContain("<loc>http://localhost:8787/market</loc>");
		expect(xml).toContain("/market/agentes-para-empresas</loc>");
		expect(xml).toContain("/market/producto/cutpilot</loc>");
	});

	it("la ficha trae meta título, descripción, imagen para compartir y Product + BreadcrumbList", async () => {
		const html = await (await call("/market/producto/cutpilot")).text();
		expect(html).toContain("<title>Edita videos con Claude Code y Codex — CutPilot | Market Tony</title>");
		expect(html).toMatch(/<meta name="description" content="¿Quieres editar videos con Claude\?/);
		expect(html).toContain('property="og:image" content="http://localhost:8787/market/static/products/cutpilot/cover.webp"');
		const ld = JSON.parse(html.match(PRODUCT_JSONLD)![1]!);
		expect(ld.offers.availability).toBe("https://schema.org/PreOrder");
		expect(ld.aggregateRating).toBeUndefined();
		expect(html).toContain('"@type":"BreadcrumbList"');
	});
});

describe("popup de bienvenida", () => {
	it("aparece solo si el proveedor confirma el cupón", async () => {
		clearWelcomeCache();
		const html = await (await call("/market")).text();
		expect(html).toContain("data-welcome");
		expect(html).toContain("TONYCIENCIA");

		const config = loadConfig(env as Env);
		if (!config.ok) throw new Error("config");
		const adapters = createAdapters(config.config, env as Env);
		clearWelcomeCache();
		adapters.payments.resolvePromotionCode = async () => null; // el código no existe en Stripe
		expect(await getWelcomeOffer(config.config, adapters)).toBeNull();
		clearWelcomeCache();
		expect(await getWelcomeOffer({ ...config.config, welcomeCoupon: null }, adapters)).toBeNull();
		clearWelcomeCache();
		adapters.payments.resolvePromotionCode = async () => ({ id: "promo_x", percentOff: 10 });
		expect(await getWelcomeOffer(config.config, adapters)).toEqual({ code: "TONYCIENCIA", percentOff: 10, amountOffCents: null });
		clearWelcomeCache();
	});

	it("no se muestra en el admin ni en Mis compras", async () => {
		const s = await loginMock(`popup-${uid()}@maqueta.test`);
		const lib = await (await call("/market/mis-compras", { headers: { cookie: s.cookie } })).text();
		expect(lib).not.toContain("data-welcome");
	});
});

describe("admin: vitrina", () => {
	it("permite activar un producto próximo sin archivo y exige que el precio tachado sea mayor", async () => {
		const admin = await loginMock("admin@maqueta.test");
		const fd = (extra: Record<string, string>) => {
			const f = new FormData();
			f.set("csrf", admin.csrf);
			for (const [k, v] of Object.entries({ title: "Próximo de prueba", slug: `proximo-${uid()}`, kind: "paid", price: "20", download_limit: "5", sort_order: "0", active: "1", ...extra })) f.set(k, v);
			return f;
		};
		const post = (f: FormData) => call("/market/admin/productos/nuevo", { method: "POST", headers: { origin: "http://localhost:8787", cookie: admin.cookie }, body: f });

		const sinArchivo = await post(fd({ availability: "available" }));
		expect(sinArchivo.status).toBe(400);
		const proximo = await post(fd({ availability: "coming_soon", tags: "uno, dos", highlights: "A\nB", specs: "Formato: ZIP", faq: "¿P?\nR." }));
		expect(proximo.status).toBe(303);
		const tachadoMal = await post(fd({ availability: "coming_soon", compare_at: "10" }));
		expect(tachadoMal.status).toBe(400);
		expect(await tachadoMal.text()).toMatch(/mayor que el precio actual/);
	});
});
