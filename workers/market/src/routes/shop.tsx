import { categoryLabelIn, hasEnglish, localize, productPath, storeRoot, t, type Lang } from "../lib/i18n";
import type { Hono, MiddlewareHandler } from "hono";
import { clientIp, deps, type AppEnv, type Ctx } from "../context";
import { hit, RATE_RULES } from "../lib/ratelimit";
import { checkCsrf } from "../lib/session";
import { cleanText, isSlug, normalizeEmail, parseIntInRange, safeNextPath } from "../lib/validate";
import { dispatchByOrder } from "../services/outbox";
import { claimFreeProduct, startCheckout, type Deps } from "../services/orders";
import { viewItemEvent, viewItemListEvent } from "../lib/analytics";
import { CATEGORIES, categoryLabel, pickRelated, publicName, RENAMED_PRODUCTS, seoDescription, seoTitle } from "../lib/catalog";
import { formatPrice } from "../lib/money";
import { canBeFree, checkBuyerAmount, fromPriceCents, isPwyw } from "../lib/pricing";
import {
	getActiveEntitlement,
	getProductBySlug,
	getShopProduct,
	joinWaitlist,
	listLibrary,
	listPublishedReviews,
	listShopProducts,
	ratingBreakdown,
	setMarketingOptIn,
	upsertReview,
} from "../services/repo";
import { breadcrumbJsonLd, catalogJsonLd, faqJsonLd, merchantFeed, productJsonLd, serviceJsonLd, sitemapXml } from "../services/seo";
import { getWelcomeOffer, readWelcomeSetup } from "../services/welcome";
import { LibraryPage } from "../views/account";
import { LEGAL_DOCS, LegalPage } from "../views/legal";
import { render, renderMessage } from "../views/render";
import { Catalog, catalogVisible, ProductPage, SERVICE_FAQ, ServicePage, sortProducts, storeFaq } from "../views/shop";

export function loginRedirect(c: Ctx, next: string) {
	return c.redirect(`/market/entrar?next=${encodeURIComponent(safeNextPath(next))}`, 303);
}

/** Valida (con caché) el cupón del popup de bienvenida para las páginas públicas de la tienda (no para los XML). */
const welcomeMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
	const page = c.req.method === "GET" && !c.req.path.endsWith(".xml");
	c.set("welcome", page ? await getWelcomeOffer(c.get("config"), c.get("adapters")) : null);
	await next();
};

/** Para iframes: solo la agenda de Google Calendar (la CSP lo permite y nada más). */
export function bookingEmbedUrl(url: string | null): string | null {
	if (!url) return null;
	try {
		const u = new URL(url);
		if (u.hostname !== "calendar.google.com" || !u.pathname.startsWith("/calendar/appointments/")) return null;
		u.searchParams.set("gv", "true");
		return u.toString();
	} catch {
		return null;
	}
}

const xmlResponse = (c: Ctx, body: string) =>
	c.body(body, 200, { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=900" });

export function registerShop(app: Hono<AppEnv>) {
	app.use("/market", welcomeMiddleware);
	app.use("/market/producto/*", welcomeMiddleware);
	app.use("/market/agentes-para-empresas", welcomeMiddleware);
	app.use("/market/en", welcomeMiddleware);
	app.use("/market/en/*", welcomeMiddleware);

	const catalogPage = async (c: Ctx, lang: Lang) => {
		const base = await listShopProducts(c.env.MARKET_DB);
		const products = base.map((p) => localize(p, lang));
		const rawCat = c.req.query("categoria") ?? "";
		const category = CATEGORIES.some((x) => x.slug === rawCat) ? rawCat : null;
		const query = (c.req.query("q") ?? "").slice(0, 60);
		const rawSort = c.req.query("orden") ?? "";
		const sort = (["precio-asc", "precio-desc", "nuevos", "valorados"] as const).find((x) => x === rawSort) ?? "destacados";
		const rawFilter = c.req.query("filtro") ?? "";
		const filter = (["ofertas", "gratis", "disponibles"] as const).find((x) => x === rawFilter) ?? null;
		const origin = c.get("config").origin;
		// GA4: las tarjetas visibles al cargar, en el orden de la página (nombres en español: ver src/lib/analytics.ts).
		const baseById = new Map(base.map((p) => [p.id, p]));
		const listed = sortProducts(products, sort)
			.filter((p) => catalogVisible(p, { category, query, filter }))
			.map((p) => baseById.get(p.id) ?? p);
		return render(
			c,
			{
				title: "Market Tony",
				fullTitle: lang === "en" ? "AI agents and skills for Claude Code and Codex | Market Tony" : "Mi stack de herramientas de IA en español | Market Tony",
				// Canónica con barra final (/market/ y /market/en/): la misma URL que el hreflang, el sitemap y storeRoot().
				// /market (sin barra) sigue respondiendo y declara /market/ como canónica.
				path: storeRoot(lang),
				description:
					lang === "en"
						? "AI agents and skills for Claude Code and Codex: ad prompts, 3D explainer videos, talking-head video editing and PageSpeed fixes. One-time payment."
						: "Agentes y skills de IA en español para Claude Code y Codex: anuncios, videos 3D, edición de video y PageSpeed. Pago único o paga lo que quieras.",
				image: products.find((p) => p.images[0])?.images[0]?.src,
				imageAlt: products.find((p) => p.images[0])?.images[0]?.alt,
				alternates: { es: storeRoot("es"), en: storeRoot("en") },
				jsonLd: [...catalogJsonLd(origin, products, lang), faqJsonLd(storeFaq(products.some((p) => p.availability === "coming_soon"), lang))],
				dataLayer: listed.length ? [viewItemListEvent(listed)] : undefined,
			},
			<Catalog products={products} welcome={c.get("welcome")} category={category} query={query} sort={sort} filter={filter} />,
		);
	};
	app.get("/market", (c) => catalogPage(c, "es"));
	// /market/en (sin barra) ya no llega aquí: responde 301 a /market/en/ (canonicalRedirects, en app.tsx).
	app.get("/market/en", (c) => catalogPage(c, "en"));
	app.get("/market/en/", (c) => catalogPage(c, "en"));

	const productPage = async (c: Ctx, lang: Lang) => {
		const slug = c.req.param("slug") ?? "";
		if (!isSlug(slug)) return renderMessage(c, 404, "Producto no encontrado", "Revisa el enlace o vuelve al catálogo.");
		const db = c.env.MARKET_DB;
		const base = await getShopProduct(db, slug);
		if (base && lang === "en" && !hasEnglish(base)) return c.redirect(productPath(slug, "es"), 302);
		const product = base ? localize(base, lang) : null;
		if (!product) {
			// Un producto retirado (existe pero está inactivo) redirige al catálogo en vez de dar 404; si se retiró por un
			// cambio de nombre (RENAMED_PRODUCTS), a la ficha nueva en el mismo idioma y con la misma query (UTM).
			if (await getProductBySlug(db, slug, false)) {
				const renamed = Object.hasOwn(RENAMED_PRODUCTS, slug) ? RENAMED_PRODUCTS[slug] : undefined;
				return c.redirect(renamed ? `${productPath(renamed, lang)}${new URL(c.req.url).search}` : storeRoot(lang), 301);
			}
			return renderMessage(c, 404, "Producto no encontrado", "Este producto no existe o ya no está disponible.");
		}
		const user = c.get("user");
		const [owned, reviews, breakdown, all] = await Promise.all([
			user ? getActiveEntitlement(db, user.id, product.id).then(Boolean) : Promise.resolve(false),
			listPublishedReviews(db, product.id),
			ratingBreakdown(db, product.id),
			listShopProducts(db),
		]);
		const aviso = c.req.query("aviso");
		const tr = (es: string) => t(lang, es);
		const montoMsg = (() => {
			if (!aviso?.startsWith("monto-") || !isPwyw(product)) return null;
			const { minText, maxText } = { minText: formatPrice(product.min_price_cents), maxText: formatPrice(product.max_price_cents ?? 99_999_999) };
			if (aviso === "monto-invalido") return tr("Escribe un monto válido en dólares, por ejemplo 12 o 12.50.");
			if (aviso === "monto-minimo")
				return product.min_price_cents > 0
					? lang === "en"
						? `The minimum amount for this product is ${minText}.`
						: `El monto mínimo para este producto es ${minText}.`
					: tr("Escribe 0 para descargarlo gratis o un monto desde $0.50 USD.");
			if (aviso === "monto-maximo") return lang === "en" ? `The maximum amount is ${maxText}.` : `El monto máximo es ${maxText}.`;
			if (aviso === "monto-stripe") return tr("Los pagos con tarjeta empiezan en $0.50 USD. Escribe 0 para descargarlo gratis o un monto desde $0.50.");
			return null;
		})();
		const AVISOS: Record<string, string> = {
			"pago-error": "No pudimos iniciar el pago. Inténtalo de nuevo en unos minutos.",
			"cupon-invalido": "Ese cupón no es válido o ya no está disponible. Revisa el código o compra sin cupón.",
			"correo-invalido": "Revisa tu correo: no parece válido.",
			"resena-error": "No pudimos guardar tu reseña: elige de 1 a 5 estrellas y usa menos de 1500 caracteres.",
			"cupon-primera": "El cupón de bienvenida es solo para tu primera compra. ¡Gracias por volver! Puedes comprar sin cupón.",
			"cupon-pwyw": "En «paga lo que quieras» tú eliges el precio, así que no se combinan cupones.",
		};
		const flash = montoMsg ?? (aviso && Object.hasOwn(AVISOS, aviso) ? tr(AVISOS[aviso]!) : null);
		const notice =
			aviso === "lista-ok" ? tr("¡Listo! Te avisaremos por correo el día del lanzamiento.") : aviso === "resena-ok" ? tr("¡Gracias por tu reseña!") : null;
		const related = pickRelated(all, product.id).map((p) => localize(p, lang));
		const origin = c.get("config").origin;
		const path = productPath(product.slug, lang);
		const cat = categoryLabelIn(lang, product.category, categoryLabel(product.category));
		return render(
			c,
			{
				title: seoTitle(product),
				// El sufijo de marca solo si el título completo entra en ~60 caracteres (lo que muestra Google).
				fullTitle: `${seoTitle(product)} | Market Tony`.length <= 60 ? `${seoTitle(product)} | Market Tony` : seoTitle(product),
				path,
				description: seoDescription(product),
				image: product.images[0]?.src,
				imageAlt: product.images[0]?.alt,
				ogType: "product",
				priceCents: fromPriceCents(product),
				currency: product.currency,
				alternates: hasEnglish(base!) ? { es: productPath(product.slug, "es"), en: productPath(product.slug, "en") } : undefined,
				jsonLd: [
					productJsonLd(origin, product, reviews, path, lang),
					breadcrumbJsonLd(origin, [
						{ name: "Market Tony", path: storeRoot(lang) },
						...(cat ? [{ name: cat, path: `${storeRoot(lang)}?categoria=${product.category}` }] : []),
						{ name: product.title, path },
					]),
					...(product.faq.length ? [faqJsonLd(product.faq)] : []),
				],
				dataLayer: [viewItemEvent(base!)],
			},
			<ProductPage
				product={product}
				loggedIn={!!user}
				owned={owned}
				csrf={c.get("csrf")}
				mode={c.get("config").mode}
				flash={flash}
				notice={notice}
				reviews={reviews}
				breakdown={breakdown}
				related={related}
				maxSales={Math.max(0, ...all.map((p) => p.stats.sales))}
				welcome={c.get("welcome")}
				userEmail={user?.email ?? null}
				pwywInitial={(() => {
					if (!isPwyw(product)) return null;
					const check = checkBuyerAmount(product, c.req.query("monto"));
					return check.ok ? check.cents : null;
				})()}
			/>,
		);
	};
	app.get("/market/producto/:slug", (c) => productPage(c, "es"));
	app.get("/market/en/product/:slug", (c) => productPage(c, "en"));

	// "Avísame cuando salga": solo para productos próximos. Guarda el correo; nada más.
	app.post("/market/producto/:slug/avisame", async (c) => {
		const slug = c.req.param("slug");
		const form = await c.req.formData().catch(() => null);
		if (!(await checkCsrf(c, form))) return renderMessage(c, 403, "Solicitud no válida", "Recarga la página e inténtalo de nuevo.");
		if (!isSlug(slug)) return renderMessage(c, 404, "Producto no encontrado", "Revisa el enlace.");
		if (!(await hit(c.env.MARKET_DB, RATE_RULES.waitlist, clientIp(c)))) {
			return renderMessage(c, 429, "Demasiados intentos", "Espera unos minutos y vuelve a intentarlo.");
		}
		const product = await getProductBySlug(c.env.MARKET_DB, slug);
		if (!product || product.availability !== "coming_soon") return renderMessage(c, 404, "Producto no encontrado", "Este producto no tiene lista de espera.");
		const email = normalizeEmail(form?.get("email"));
		if (!email) return c.redirect(`/market/producto/${slug}?aviso=correo-invalido#comprar`, 303);
		await joinWaitlist(c.env.MARKET_DB, product.id, email);
		return c.redirect(`/market/producto/${slug}?aviso=lista-ok#comprar`, 303);
	});

	// Reseñas: solo quien tiene acceso vigente al producto (compra o descarga verificada).
	app.post("/market/producto/:slug/resena", async (c) => {
		const slug = c.req.param("slug");
		const form = await c.req.formData().catch(() => null);
		if (!(await checkCsrf(c, form))) return renderMessage(c, 403, "Solicitud no válida", "Recarga la página e inténtalo de nuevo.");
		const user = c.get("user");
		if (!user) return loginRedirect(c, "/market/mis-compras");
		if (!isSlug(slug)) return renderMessage(c, 404, "Producto no encontrado", "Revisa el enlace.");
		if (!(await hit(c.env.MARKET_DB, RATE_RULES.review, user.id))) {
			return renderMessage(c, 429, "Demasiados intentos", "Espera unos minutos y vuelve a intentarlo.");
		}
		const product = await getProductBySlug(c.env.MARKET_DB, slug, false);
		if (!product) return renderMessage(c, 404, "Producto no encontrado", "Revisa el enlace.");
		if (!(await getActiveEntitlement(c.env.MARKET_DB, user.id, product.id))) {
			return renderMessage(c, 403, "Solo compradores", "Las reseñas solo las pueden dejar personas que tienen el producto.", { href: `/market/producto/${slug}`, label: "Ver el producto" });
		}
		const rating = parseIntInRange(typeof form?.get("rating") === "string" ? (form!.get("rating") as string) : "", 1, 5);
		const body = cleanText(form?.get("body") ?? "", 1500);
		if (rating === null || body === null) return c.redirect(`/market/mis-compras?resena=error#resena-${product.slug}`, 303);
		await upsertReview(c.env.MARKET_DB, { productId: product.id, userId: user.id, rating, body, displayName: publicName(user.name) });
		return c.redirect(`/market/producto/${slug}?aviso=resena-ok#resenas`, 303);
	});

	app.get("/market/agentes-para-empresas", (c) => {
		const config = c.get("config");
		return render(
			c,
			{
				title: "Agentes de IA para empresas",
				fullTitle: "Agentes de IA a medida para empresas | Tony Ciencia",
				path: "/market/agentes-para-empresas",
				description:
					"Diseñamos, construimos y entregamos agentes de IA para tu empresa: ventas por WhatsApp, atención, agenda y automatizaciones con tu CRM. Reserva tu diagnóstico.",
				image: "/market/static/products/agentes-para-empresas/cover.webp",
				jsonLd: [serviceJsonLd(config.origin), faqJsonLd(SERVICE_FAQ)],
			},
			<ServicePage bookingUrl={config.bookingUrl} embedUrl={bookingEmbedUrl(config.bookingUrl)} />,
		);
	});

	// Feeds de Google Merchant Center, uno por idioma (Merchant Center → Productos → Fuentes → archivo en sitio web).
	app.get("/market/feed.xml", async (c) => xmlResponse(c, merchantFeed(c.get("config").origin, await listShopProducts(c.env.MARKET_DB), "es")));
	app.get("/market/en/feed.xml", async (c) => xmlResponse(c, merchantFeed(c.get("config").origin, await listShopProducts(c.env.MARKET_DB), "en")));

	// Estado público mínimo (sin datos personales): sirve para monitoreo y para verificar un deploy.
	app.get("/market/estado.json", async (c) => {
		const products = await listShopProducts(c.env.MARKET_DB);
		const welcome = await getWelcomeOffer(c.get("config"), c.get("adapters"));
		return c.json(
			{
				ok: true,
				mode: c.get("config").mode,
				welcomeCoupon: welcome ? { code: welcome.code, percentOff: welcome.percentOff } : null,
				welcomeSetup: await readWelcomeSetup(c.env.MARKET_DB),
				products: products.map((p) => ({
					slug: p.slug,
					availability: p.availability,
					priceMode: p.kind === "free" ? "free" : p.price_mode,
					priceCents: p.price_cents,
					compareAtCents: p.compare_at_cents,
					minPriceCents: p.price_mode === "pwyw" ? p.min_price_cents : undefined,
					hasFile: !!p.file_key,
				})),
			},
			200,
			{ "cache-control": "no-store" },
		);
	});

	app.get("/market/sitemap.xml", async (c) =>
		xmlResponse(c, sitemapXml(c.get("config").origin, await listShopProducts(c.env.MARKET_DB), Object.keys(LEGAL_DOCS))),
	);

	// Compra: el formulario manda el slug (en la URL), el token CSRF, el cupón opcional y — SOLO en "paga lo que
	// quieras" — el monto elegido. En precio fijo cualquier "precio" inyectado se ignora: el monto sale de la BD.
	app.post("/market/producto/:slug/comprar", async (c) => {
		const slug = c.req.param("slug");
		const form = await c.req.formData().catch(() => null);
		if (!(await checkCsrf(c, form))) return renderMessage(c, 403, "Solicitud no válida", "Recarga la página e inténtalo de nuevo.");
		const user = c.get("user");
		if (!user) return loginRedirect(c, `/market/producto/${slug}`);
		if (!isSlug(slug)) return renderMessage(c, 404, "Producto no encontrado", "Revisa el enlace.");
		const db = c.env.MARKET_DB;
		if (!(await hit(db, RATE_RULES.checkoutUser, user.id)) || !(await hit(db, RATE_RULES.checkoutIp, clientIp(c)))) {
			return renderMessage(c, 429, "Demasiados intentos", "Espera unos minutos antes de volver a intentar el pago.");
		}
		const product = await getProductBySlug(db, slug);
		// Un producto «Próximamente» nunca se cobra, aunque sea «paga lo que quieras» (antes de validar el monto).
		if (!product || product.kind !== "paid" || product.availability === "coming_soon") return renderMessage(c, 404, "Producto no encontrado", "Este producto no está a la venta.");
		const d = deps(c);

		let amountCents: number | null = null;
		if (isPwyw(product)) {
			const check = checkBuyerAmount(product, form?.get("monto"));
			if (!check.ok) {
				const code = { invalid: "monto-invalido", below_min: "monto-minimo", above_max: "monto-maximo", below_stripe_min: "monto-stripe" }[check.reason];
				return c.redirect(`/market/producto/${slug}?aviso=${code}#comprar`, 303);
			}
			if (check.free) {
				// USD 0: mismo flujo que un producto gratis (sin Stripe). Solo si el mínimo del producto lo permite.
				if (form?.get("marketing") === "1") await setMarketingOptIn(db, user.id, true, `producto:${product.slug}`);
				const claimed = await claimFreeProduct(d, user, product);
				if (!claimed.ok) return renderMessage(c, 404, "Producto no encontrado", "Este producto no está disponible.");
				if (claimed.created) c.executionCtx.waitUntil(dispatchQuietly(d, claimed.orderId));
				return c.redirect(`/market/mis-compras?listo=${claimed.entitlementId}${claimed.created ? "&nuevo=1" : ""}#acceso-${claimed.entitlementId}`, 303);
			}
			amountCents = check.cents;
		}

		// Único dato opcional en precio fijo: el código de cupón (se valida en el servidor).
		const rawCoupon = form?.get("cupon");
		const coupon = typeof rawCoupon === "string" ? rawCoupon.trim().slice(0, 64) : "";
		const result = await startCheckout(d, user, product, { couponCode: coupon || null, amountCents });
		if (result.ok) return c.redirect(result.redirectUrl, 303);
		if (result.reason === "already_owned") return c.redirect("/market/mis-compras", 303);
		if (result.reason === "invalid_coupon") return c.redirect(`/market/producto/${slug}?aviso=cupon-invalido#comprar`, 303);
		if (result.reason === "welcome_not_first") return c.redirect(`/market/producto/${slug}?aviso=cupon-primera#comprar`, 303);
		if (result.reason === "coupon_not_allowed") return c.redirect(`/market/producto/${slug}?aviso=cupon-pwyw#comprar`, 303);
		if (result.reason === "invalid_amount") return c.redirect(`/market/producto/${slug}?aviso=monto-invalido#comprar`, 303);
		if (result.reason === "provider_error") return c.redirect(`/market/producto/${slug}?aviso=pago-error#comprar`, 303);
		return renderMessage(c, 404, "Producto no encontrado", "Este producto no está a la venta.");
	});

	app.post("/market/producto/:slug/obtener", async (c) => {
		const slug = c.req.param("slug");
		const form = await c.req.formData().catch(() => null);
		if (!(await checkCsrf(c, form))) return renderMessage(c, 403, "Solicitud no válida", "Recarga la página e inténtalo de nuevo.");
		const user = c.get("user");
		if (!user) return loginRedirect(c, `/market/producto/${slug}`);
		if (!isSlug(slug)) return renderMessage(c, 404, "Producto no encontrado", "Revisa el enlace.");
		if (!(await hit(c.env.MARKET_DB, RATE_RULES.claim, user.id))) {
			return renderMessage(c, 429, "Demasiados intentos", "Espera unos minutos y vuelve a intentarlo.");
		}
		const product = await getProductBySlug(c.env.MARKET_DB, slug);
		// Gratis, o "paga lo que quieras" con mínimo 0 (botón "Descargar gratis").
		if (!product || !canBeFree(product)) return renderMessage(c, 404, "Producto no encontrado", "Este recurso no está disponible.");
		// Casilla opcional: solo un "1" explícito cuenta como consentimiento. Sin marcar, no se toca nada.
		if (form?.get("marketing") === "1") await setMarketingOptIn(c.env.MARKET_DB, user.id, true, `producto:${product.slug}`);
		const d = deps(c);
		const result = await claimFreeProduct(d, user, product);
		if (!result.ok) return renderMessage(c, 404, "Producto no encontrado", "Este recurso no está disponible.");
		if (result.created) c.executionCtx.waitUntil(dispatchQuietly(d, result.orderId));
		return c.redirect(`/market/mis-compras?listo=${result.entitlementId}${result.created ? "&nuevo=1" : ""}#acceso-${result.entitlementId}`, 303);
	});

	app.get("/market/mis-compras", async (c) => {
		const user = c.get("user");
		if (!user) return loginRedirect(c, "/market/mis-compras");
		const items = await listLibrary(c.env.MARKET_DB, user.id);
		const highlight = c.req.query("listo") ?? null;
		const notice = c.req.query("nuevo")
			? "¡Listo! Ya puedes descargarlo aquí mismo. También te enviamos el enlace por correo."
			: highlight
				? "Ya tenías este producto. Puedes descargarlo aquí."
				: c.req.query("guardado")
					? "Preferencia guardada."
					: c.req.query("resena") === "error"
						? "No pudimos guardar tu reseña: elige de 1 a 5 estrellas y usa menos de 1500 caracteres."
						: null;
		return render(
			c,
			{ title: "Mis compras", path: "/market/mis-compras", noindex: true },
			<LibraryPage user={user} items={items} csrf={c.get("csrf")} highlight={highlight} notice={notice} />,
		);
	});

	app.post("/market/mis-compras/preferencias", async (c) => {
		const form = await c.req.formData().catch(() => null);
		if (!(await checkCsrf(c, form))) return renderMessage(c, 403, "Solicitud no válida", "Recarga la página e inténtalo de nuevo.");
		const user = c.get("user");
		if (!user) return loginRedirect(c, "/market/mis-compras");
		await setMarketingOptIn(c.env.MARKET_DB, user.id, form?.get("marketing") === "1", "mis-compras");
		return c.redirect("/market/mis-compras?guardado=1", 303);
	});

	app.get("/market/legal/:doc", (c) => {
		const key = c.req.param("doc") as keyof typeof LEGAL_DOCS;
		const doc = Object.hasOwn(LEGAL_DOCS, key) ? LEGAL_DOCS[key] : null;
		if (!doc) return renderMessage(c, 404, "Página no encontrada", "Revisa el enlace.");
		return render(
			c,
			{ title: doc.title, path: `/market/legal/${key}` },
			<LegalPage doc={doc} showDraftNote={c.get("config").mode === "mock"} />,
		);
	});
}

/** Envío inmediato tras la respuesta; si falla, el cron lo reintenta. */
export async function dispatchQuietly(d: Deps, orderId: string) {
	try {
		await dispatchByOrder(d, orderId);
	} catch (err) {
		console.error(`[correo] despacho inmediato del pedido ${orderId} falló; lo reintenta el cron:`, err);
	}
}
