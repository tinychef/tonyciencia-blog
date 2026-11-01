import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { GOOGLE_TAG_CSP } from "../src/app";
import type { Env } from "../src/env";
import { chargedCents, purchaseEvent, viewItemEvent } from "../src/lib/analytics";
import { MERCHANT_IMAGES } from "../src/lib/catalog";
import { getProductBySlug } from "../src/services/repo";
import { feedImages, merchantFeed } from "../src/services/seo";
import { call, createProduct, loginMock, one, postForm, uid } from "./helpers";

const ORIGIN = "http://localhost:8787";
const PRODUCT_JSONLD = /<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"Product".*?)<\/script>/;
const DL = /<script type="application\/json" data-dl>(.*?)<\/script>/;

const xmlText = (t: string) => t.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
const canonicalOf = (html: string) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
const itemOf = (feed: string, slug: string) => feed.split("<item>").find((x) => x.includes(`<g:id>${slug}</g:id>`));
const dlOf = (html: string) => {
	const m = html.match(DL);
	return m ? (JSON.parse(m[1]!) as Array<{ event: string; ecommerce: Record<string, any> }>) : null;
};

/** Pone a la venta un producto real del catálogo (en la BD de prueba no tienen archivo) y lo deja como estaba. */
async function whileAvailable(slug: string, fn: () => Promise<void>) {
	const before = await one<{ availability: string; active: number; price_mode: string; price_cents: number }>(
		"SELECT availability, active, price_mode, price_cents FROM products WHERE slug = ?1",
		slug,
	);
	if (!before) throw new Error(`no existe ${slug}`);
	await env.MARKET_DB.prepare("UPDATE products SET availability = 'available', active = 1, price_mode = 'fixed', price_cents = 1200 WHERE slug = ?1").bind(slug).run();
	try {
		await fn();
	} finally {
		await env.MARKET_DB.prepare("UPDATE products SET availability = ?2, active = ?3, price_mode = ?4, price_cents = ?5 WHERE slug = ?1")
			.bind(slug, before.availability, before.active, before.price_mode, before.price_cents)
			.run();
	}
}

describe("imágenes de Merchant Center", () => {
	it("cada archivo de MERCHANT_IMAGES existe en public/ (si falta, el feed apuntaría a un 404)", async () => {
		const assets = (env as unknown as { ASSETS: Fetcher }).ASSETS;
		// Control: un archivo que no existe da 404 (si no, la prueba no probaría nada).
		expect((await assets.fetch(`${ORIGIN}/market/static/products/specreel/no-existe.jpg`)).status).toBe(404);
		expect(Object.keys(MERCHANT_IMAGES)).toHaveLength(6);
		const missing: string[] = [];
		for (const [slug, files] of Object.entries(MERCHANT_IMAGES)) {
			expect(files[0], slug).toBe("merchant.jpg");
			for (const f of files) {
				const path = `/market/static/products/${slug}/${f}`;
				const res = await assets.fetch(`${ORIGIN}${path}`);
				if (res.status !== 200 || !(res.headers.get("content-type") ?? "").startsWith("image/jpeg")) missing.push(path);
			}
		}
		expect(missing, `faltan: ${missing.join(", ")}`).toEqual([]);
	});

	it("principal: merchant.jpg si está en la lista; adicionales: solo merchant-2 (ni capturas ni portada: llevan texto promocional)", () => {
		const images = [
			{ src: "/market/static/products/specreel/cover.webp", alt: "" },
			{ src: "/market/static/products/specreel/screen-1.webp", alt: "" },
			{ src: "/market/static/products/specreel/screen-2.webp", alt: "" },
		];
		const withMerchant = feedImages({ slug: "specreel", images })!;
		expect(withMerchant.main).toBe("/market/static/products/specreel/merchant.jpg");
		expect(withMerchant.additional).toEqual([
			...MERCHANT_IMAGES.specreel!.slice(1).map((f) => `/market/static/products/specreel/${f}`),
		]);
		expect(withMerchant.additional.some((s) => s.includes("screen-"))).toBe(false);
		const without = feedImages({ slug: "otro-producto", images: images.map((i) => ({ ...i, src: i.src.replace("specreel", "otro-producto") })) })!;
		expect(without.main).toBe("/market/static/products/otro-producto/cover.webp");
		expect(without.additional.some((s) => s.includes("cover"))).toBe(false);
		expect(feedImages({ slug: "sin-imagenes", images: [] })).toBeNull();
	});
});

describe("feeds de Merchant (español e inglés)", () => {
	it("feed en español: categoría 313, merchant.jpg, capturas, envío 0 y enlace a la ficha canónica", async () => {
		await whileAvailable("specreel-stick", async () => {
			const res = await call("/market/feed.xml");
			expect(res.headers.get("content-type")).toMatch(/application\/xml/);
			const feed = await res.text();
			expect(feed).toContain("<link>http://localhost:8787/market/</link>");
			expect(feed).toContain("<language>es</language>");
			const item = itemOf(feed, "specreel-stick")!;
			expect(item).toBeTruthy();
			expect(item).toContain("<g:google_product_category>313</g:google_product_category>");
			expect(item).toContain("<g:image_link>http://localhost:8787/market/static/products/specreel-stick/merchant.jpg</g:image_link>");
			// Adicionales: solo merchant-2.jpg (las capturas llevan titulares: Google las rechaza).
			const extra = [...item.matchAll(/<g:additional_image_link>([^<]+)<\/g:additional_image_link>/g)].map((m) => m[1]);
			expect(extra).toEqual([
				"http://localhost:8787/market/static/products/specreel-stick/merchant-2.jpg",
			]);
			expect(item).not.toMatch(/<g:additional_image_link>[^<]*cover/);
			expect(item).toContain("<g:shipping><g:country>US</g:country><g:service>Descarga digital</g:service><g:price>0.00 USD</g:price></g:shipping>");
			expect(item).toContain("<g:condition>new</g:condition>");
			expect(item).toContain("<g:brand>Tony Ciencia</g:brand>");
			expect(item).toContain("<g:identifier_exists>no</g:identifier_exists>");
			expect(item).toContain("<g:availability>in_stock</g:availability>");
			expect(item).toContain("<g:price>12.00 USD</g:price>");
			expect(item).toMatch(/<g:product_type>Productos digitales &gt; [^<]+<\/g:product_type>/);
			expect(item).toContain("<link>http://localhost:8787/market/producto/specreel-stick</link>");
			// El enlace del feed es la canónica de la ficha.
			expect(canonicalOf(await (await call("/market/producto/specreel-stick")).text())).toBe("http://localhost:8787/market/producto/specreel-stick");
		});
	});

	it("feed en inglés: textos de i18n.en, enlaces /market/en/… y solo fichas con versión en inglés", async () => {
		const sinIngles = await createProduct({ priceCents: 2500 });
		await env.MARKET_DB.prepare(`UPDATE products SET images = '[{"src":"/market/static/products/specreel/cover.webp","alt":"x"}]' WHERE id = ?1`).bind(sinIngles.id).run();
		await whileAvailable("specreel-stick", async () => {
			const res = await call("/market/en/feed.xml");
			expect(res.status).toBe(200);
			expect(res.headers.get("content-type")).toMatch(/application\/xml/);
			const feed = await res.text();
			expect(feed).toContain("<link>http://localhost:8787/market/en/</link>");
			expect(feed).toContain("<language>en</language>");
			const item = itemOf(feed, "specreel-stick")!;
			expect(item).toBeTruthy();
			const en = (await getProductBySlug(env.MARKET_DB, "specreel-stick"))!.i18n.en!;
			expect(item).toContain(`<title>${xmlText((en.meta_title || en.title)!)}</title>`);
			expect(item).toContain("<link>http://localhost:8787/market/en/product/specreel-stick</link>");
			expect(item).toContain("<g:google_product_category>313</g:google_product_category>");
			expect(item).toContain("<g:image_link>http://localhost:8787/market/static/products/specreel-stick/merchant.jpg</g:image_link>");
			expect(item).toContain("<g:service>Digital download</g:service><g:price>0.00 USD</g:price>");
			expect(item).toMatch(/<g:product_type>Digital products &gt; [^<]+<\/g:product_type>/);
			expect(item).toContain("<g:price>12.00 USD</g:price>");
			expect(item).not.toContain("/market/producto/");
			// Sin versión en inglés no va al feed en inglés (su /market/en/product/… redirige a la ficha en español).
			expect(feed).not.toContain(`<g:id>${sinIngles.slug}</g:id>`);
			expect(await (await call("/market/feed.xml")).text()).toContain(`<g:id>${sinIngles.slug}</g:id>`);
			expect(canonicalOf(await (await call("/market/en/product/specreel-stick")).text())).toBe("http://localhost:8787/market/en/product/specreel-stick");
		});
	});

	it("los dos feeds dejan fuera los «paga lo que quieras» desde $0 (el precio del feed debe ser el de la página)", async () => {
		const p = await createProduct({ priceCents: 900 });
		await env.MARKET_DB.prepare("UPDATE products SET price_mode = 'pwyw', min_price_cents = 0, i18n = ?2, images = ?3 WHERE id = ?1")
			.bind(p.id, JSON.stringify({ en: { title: "Free EN: sub" } }), JSON.stringify([{ src: "/market/static/products/specreel/cover.webp", alt: "x" }]))
			.run();
		const { listShopProducts } = await import("../src/services/repo");
		const products = await listShopProducts(env.MARKET_DB);
		expect(merchantFeed(ORIGIN, products, "es")).not.toContain(`<g:id>${p.slug}</g:id>`);
		expect(merchantFeed(ORIGIN, products, "en")).not.toContain(`<g:id>${p.slug}</g:id>`);
	});
});

describe("JSON-LD de la ficha: envío y devoluciones", () => {
	it("cada Offer comprable trae shippingDetails (0 USD, US, 0 días) y hasMerchantReturnPolicy (14 días, sin costo)", async () => {
		const p = await createProduct({ priceCents: 2900 });
		for (const path of [`/market/producto/${p.slug}`]) {
			const ld = JSON.parse((await (await call(path)).text()).match(PRODUCT_JSONLD)![1]!);
			expect(ld.offers.shippingDetails).toEqual({
				"@type": "OfferShippingDetails",
				shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "USD" },
				shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
				deliveryTime: {
					"@type": "ShippingDeliveryTime",
					handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
					transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
				},
			});
			expect(ld.offers.hasMerchantReturnPolicy).toEqual({
				"@type": "MerchantReturnPolicy",
				applicableCountry: "US",
				returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
				merchantReturnDays: 14,
				returnFees: "https://schema.org/FreeReturn",
			});
		}
		// La política del JSON-LD es la publicada: 14 días si no se descargó o si el archivo está dañado.
		const legal = await (await call("/market/legal/reembolsos")).text();
		expect(legal).toContain("dentro de los 14 días posteriores a la compra y todavía no descargaste el producto");
		expect(legal).toContain("Si el archivo está dañado");
	});

	it("también en la ficha en inglés", async () => {
		await whileAvailable("specreel-stick", async () => {
			const ld = JSON.parse((await (await call("/market/en/product/specreel-stick")).text()).match(PRODUCT_JSONLD)![1]!);
			expect(ld.offers.shippingDetails.shippingRate).toEqual({ "@type": "MonetaryAmount", value: "0", currency: "USD" });
			expect(ld.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(14);
		});
	});
});

describe("Google Tag Manager: CSP y atributo data-gtm", () => {
	const GOOGLE = /googletagmanager|google-analytics|doubleclick|googleadservices|googlesyndication|gstatic/;

	it("sin GTM_ID (como en todos los entornos hoy): ni dominios de Google en la CSP ni data-gtm", async () => {
		const res = await call("/market/");
		const csp = res.headers.get("content-security-policy") ?? "";
		expect(csp).not.toMatch(GOOGLE);
		expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]{20,}' https:\/\/static\.cloudflareinsights\.com;/);
		expect(await res.text()).not.toContain("data-gtm");
		// Un valor con otro formato se ignora (GTM queda apagado).
		const bad = await call("/market/", {}, { ...env, GTM_ID: "UA-12345-1" } as Env);
		expect(bad.headers.get("content-security-policy")).not.toMatch(GOOGLE);
		expect(await bad.text()).not.toContain("data-gtm");
	});

	it("con GTM_ID: la CSP agrega GTM, GA4 y Ads (script, img, connect y frame) y mantiene el nonce", async () => {
		const e = { ...env, GTM_ID: "GTM-TEST123" } as Env;
		for (const path of ["/market/", "/market/en/", "/market/legal/terminos"]) {
			const res = await call(path, {}, e);
			const csp = res.headers.get("content-security-policy") ?? "";
			const dir = (name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";
			expect(dir("script-src")).toMatch(/^script-src 'self' 'nonce-[A-Za-z0-9+/=]{20,}' /);
			expect(dir("script-src")).not.toContain("unsafe-inline");
			expect(dir("script-src")).not.toContain("unsafe-eval");
			for (const d of GOOGLE_TAG_CSP.script) expect(dir("script-src")).toContain(d);
			for (const d of GOOGLE_TAG_CSP.img) expect(dir("img-src")).toContain(d);
			for (const d of GOOGLE_TAG_CSP.connect) expect(dir("connect-src")).toContain(d);
			expect(dir("script-src")).toContain("https://www.googletagmanager.com");
			expect(dir("img-src")).toContain("https://*.google-analytics.com");
			expect(dir("connect-src")).toContain("https://*.google-analytics.com");
			expect(dir("connect-src")).toContain("https://pagead2.googlesyndication.com");
			expect(dir("frame-src")).toContain("https://www.googletagmanager.com");
			// Lo de antes sigue: YouTube, Calendar, Stripe y Cloudflare.
			expect(dir("frame-src")).toContain("https://www.youtube-nocookie.com");
			expect(csp).toContain("form-action 'self' https://checkout.stripe.com");
			expect(await res.text()).toContain('data-gtm="GTM-TEST123"');
		}
		// Los XML no llevan CSP (no son HTML).
		expect((await call("/market/feed.xml", {}, e)).headers.get("content-security-policy")).toBeNull();
	});
});

describe("dataLayer de GA4 (view_item_list, view_item, begin_checkout, purchase)", () => {
	it("catálogo: view_item_list con los productos visibles, item_id = slug y nombres en español también en /market/en/", async () => {
		const html = await (await call("/market/")).text();
		const dl = dlOf(html)!;
		expect(dl).toHaveLength(1);
		expect(dl[0]!.event).toBe("view_item_list");
		expect(dl[0]!.ecommerce.item_list_id).toBe("catalogo");
		const items = dl[0]!.ecommerce.items as Array<Record<string, unknown>>;
		expect(items.length).toBeGreaterThan(0);
		expect(items.map((i) => i.index)).toEqual(items.map((_, i) => i));
		const stick = items.find((i) => i.item_id === "specreel-stick")!;
		expect(stick).toMatchObject({ item_brand: "Tony Ciencia", quantity: 1, item_list_id: "catalogo" });
		expect(typeof stick.price).toBe("number");
		const en = dlOf(await (await call("/market/en/")).text())!;
		expect(en[0]!.ecommerce.items.find((i: { item_id: string }) => i.item_id === "specreel-stick").item_name).toBe(stick.item_name);
		// Con un filtro, solo lo que se ve al cargar (y nada si no se ve ninguno).
		const video = dlOf(await (await call("/market/?categoria=video")).text())!;
		expect(video[0]!.ecommerce.items.length).toBeLessThan(items.length);
		expect(dlOf(await (await call("/market/?q=zzzz-nada")).text())).toBeNull();
		// Los datos van antes de market.js y como JSON (no se ejecutan).
		expect(html.indexOf("data-dl>")).toBeLessThan(html.indexOf("/market/static/market.js"));
	});

	it("ficha: view_item con precio, moneda y descuento real; formularios de compra marcados para begin_checkout", async () => {
		const p = await createProduct({ priceCents: 3333 });
		await env.MARKET_DB.prepare("UPDATE products SET compare_at_cents = 7690, category = 'video' WHERE id = ?1").bind(p.id).run();
		const s = await loginMock(`dl-${uid()}@maqueta.test`);
		const html = await (await call(`/market/producto/${p.slug}`, { headers: { cookie: s.cookie } })).text();
		const dl = dlOf(html)!;
		expect(dl).toEqual([
			{
				event: "view_item",
				ecommerce: {
					currency: "USD",
					value: 33.33,
					items: [{ item_id: p.slug, item_name: `Producto ${p.slug}`, item_brand: "Tony Ciencia", item_category: "Video con IA", price: 33.33, discount: 43.57, quantity: 1 }],
				},
			},
		]);
		expect(html).toMatch(/<form method="post" action="\/market\/producto\/[^"]+\/comprar" data-checkout/);
	});

	it("«¡Gracias por tu compra!»: purchase con transaction_id = pedido, value, currency e items; solo con el pago confirmado", async () => {
		const p = await createProduct({ priceCents: 4900 });
		const s = await loginMock(`compra-${uid()}@maqueta.test`);
		await postForm(`/market/producto/${p.slug}/comprar`, s);
		const order = (await one<{ id: string; provider_session_id: string }>("SELECT o.* FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email = ?1", s.email))!;
		const pending = await (await call(`/market/pago/exito?pedido=${order.id}`, { headers: { cookie: s.cookie } })).text();
		expect(pending).toContain("Estamos confirmando tu pago");
		expect(dlOf(pending)).toBeNull();
		await postForm(`/market/maqueta/pago/${order.provider_session_id}`, s, { resultado: "paid" });
		const html = await (await call(`/market/pago/exito?pedido=${order.id}`, { headers: { cookie: s.cookie } })).text();
		expect(html).toContain("¡Gracias por tu compra!");
		expect(dlOf(html)).toEqual([
			{
				event: "purchase",
				ecommerce: {
					transaction_id: order.id,
					currency: "USD",
					value: 49,
					items: [{ item_id: p.slug, item_name: `Producto ${p.slug}`, item_brand: "Tony Ciencia", price: 49, quantity: 1 }],
				},
			},
		]);
	});

	it("purchase con cupón: value = lo cobrado (nota del webhook) y el descuento en el ítem", () => {
		const order = { id: "ord_1", amount_cents: 4900, currency: "usd", note: "Cupón aplicado: cobrado 44.10 de 49.00 USD" };
		expect(chargedCents(order)).toBe(4410);
		expect(chargedCents({ amount_cents: 4900, note: null })).toBe(4900);
		expect(chargedCents({ amount_cents: 4900, note: "Compra duplicada: ya tenía acceso" })).toBe(4900);
		const ev = purchaseEvent(order, { slug: "specreel", title: "Motion 3D Video: videos 3D", category: "video" });
		expect(ev.ecommerce).toEqual({
			transaction_id: "ord_1",
			currency: "USD",
			value: 44.1,
			items: [{ item_id: "specreel", item_name: "Motion 3D Video", item_brand: "Tony Ciencia", item_category: "Video con IA", price: 44.1, discount: 4.9, quantity: 1 }],
		});
		// «Paga lo que quieras»: view_item usa el mínimo (el mismo precio «desde» del JSON-LD y del feed).
		const pw = viewItemEvent({ slug: "x", title: "X", category: "", kind: "paid", price_cents: 900, compare_at_cents: null, price_mode: "pwyw", min_price_cents: 500, max_price_cents: null, availability: "available", currency: "usd" });
		expect(pw.ecommerce).toMatchObject({ currency: "USD", value: 5, items: [{ item_id: "x", price: 5 }] });
	});

	it("market.js: Consent Mode antes de gtm.js, misma cookie del blog, purchase sin duplicados y begin_checkout al enviar", async () => {
		const res = await (env as unknown as { ASSETS: Fetcher }).ASSETS.fetch(`${ORIGIN}/market/static/market.js`);
		const js = await res.text();
		const at = (s: string) => {
			const i = js.indexOf(s);
			expect(i, s).toBeGreaterThan(-1);
			return i;
		};
		expect(at('gtag("consent", "default", consent(false))')).toBeLessThan(at("https://www.googletagmanager.com/gtm.js?id="));
		expect(at("cookie_consent=")).toBeLessThan(at("https://www.googletagmanager.com/gtm.js?id="));
		at("doc.dataset.gtm");
		at('"mk_purchases"');
		at('"begin_checkout"');
		at("script[data-dl]");
		at("form[data-checkout]");
		// Aviso propio del market (solo con GTM activo y sin decisión): la MISMA cookie y el MISMO evento que el del blog,
		// y se arma después de cargar gtm.js (los valores por defecto denegados ya están puestos).
		expect(js).toContain("cookie_consent=${value}; path=/; max-age=31536000; SameSite=Lax");
		expect(js).toContain('new CustomEvent("tc:consent"');
		expect(at('bar.className = "mk-consent"')).toBeGreaterThan(at("https://www.googletagmanager.com/gtm.js?id="));
		expect(js).not.toMatch(/document\.cookie = `(?!cookie_consent=|scheme=)/);
	});
});
