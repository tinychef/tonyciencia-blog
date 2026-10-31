import type { Hono, MiddlewareHandler } from "hono";
import { clientIp, deps, type AppEnv, type Ctx } from "../context";
import { hit, RATE_RULES } from "../lib/ratelimit";
import { checkCsrf } from "../lib/session";
import { cleanText, isSlug, normalizeEmail, parseIntInRange, safeNextPath } from "../lib/validate";
import { dispatchByOrder } from "../services/outbox";
import { claimFreeProduct, startCheckout, type Deps } from "../services/orders";
import { CATEGORIES, categoryLabel, publicName, seoDescription, seoTitle } from "../lib/catalog";
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
import { getWelcomeOffer } from "../services/welcome";
import { LibraryPage } from "../views/account";
import { LEGAL_DOCS, LegalPage } from "../views/legal";
import { render, renderMessage } from "../views/render";
import { Catalog, ProductPage, SERVICE_FAQ, STORE_FAQ, ServicePage } from "../views/shop";

export function loginRedirect(c: Ctx, next: string) {
	return c.redirect(`/market/entrar?next=${encodeURIComponent(safeNextPath(next))}`, 303);
}

/** Valida (con caché) el cupón del popup de bienvenida para las páginas públicas de la tienda. */
const welcomeMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
	c.set("welcome", c.req.method === "GET" ? await getWelcomeOffer(c.get("config"), c.get("adapters")) : null);
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

	app.get("/market", async (c) => {
		const products = await listShopProducts(c.env.MARKET_DB);
		const rawCat = c.req.query("categoria") ?? "";
		const category = CATEGORIES.some((x) => x.slug === rawCat) ? rawCat : null;
		const query = (c.req.query("q") ?? "").slice(0, 60);
		const origin = c.get("config").origin;
		return render(
			c,
			{
				title: "Market Tony",
				fullTitle: "Market Tony: agentes de IA, skills y plantillas en español — Tony Ciencia",
				path: "/market",
				description:
					"Herramientas de IA en español para crear anuncios, videos 3D y automatizaciones con Claude Code, Codex y n8n. Pago único y descarga inmediata.",
				image: products.find((p) => p.images[0])?.images[0]?.src,
				jsonLd: [...catalogJsonLd(origin, products), faqJsonLd(STORE_FAQ)],
			},
			<Catalog products={products} welcome={c.get("welcome")} category={category} query={query} />,
		);
	});

	app.get("/market/producto/:slug", async (c) => {
		const slug = c.req.param("slug");
		if (!isSlug(slug)) return renderMessage(c, 404, "Producto no encontrado", "Revisa el enlace o vuelve al catálogo.");
		const db = c.env.MARKET_DB;
		const product = await getShopProduct(db, slug);
		if (!product) return renderMessage(c, 404, "Producto no encontrado", "Este producto no existe o ya no está disponible.");
		const user = c.get("user");
		const [owned, reviews, breakdown, all] = await Promise.all([
			user ? getActiveEntitlement(db, user.id, product.id).then(Boolean) : Promise.resolve(false),
			listPublishedReviews(db, product.id),
			ratingBreakdown(db, product.id),
			listShopProducts(db),
		]);
		const aviso = c.req.query("aviso");
		const flash =
			aviso === "pago-error"
				? "No pudimos iniciar el pago. Inténtalo de nuevo en unos minutos."
				: aviso === "cupon-invalido"
					? "Ese cupón no es válido o ya no está disponible. Revisa el código o compra sin cupón."
					: aviso === "correo-invalido"
						? "Revisa tu correo: no parece válido."
						: aviso === "resena-error"
							? "No pudimos guardar tu reseña: elige de 1 a 5 estrellas y usa menos de 1500 caracteres."
							: null;
		const notice = aviso === "lista-ok" ? "¡Listo! Te avisaremos por correo el día del lanzamiento." : aviso === "resena-ok" ? "¡Gracias por tu reseña!" : null;
		// Relacionados: misma categoría primero, luego el resto (disponibles antes que próximos).
		const others = all.filter((p) => p.id !== product.id);
		const related = [...others.filter((p) => p.category === product.category), ...others.filter((p) => p.category !== product.category)].slice(0, 3);
		const origin = c.get("config").origin;
		const path = `/market/producto/${product.slug}`;
		const cat = categoryLabel(product.category);
		return render(
			c,
			{
				title: seoTitle(product),
				fullTitle: `${seoTitle(product)} | Market Tony`,
				path,
				description: seoDescription(product),
				image: product.images[0]?.src,
				ogType: "product",
				priceCents: product.price_cents,
				currency: product.currency,
				jsonLd: [
					productJsonLd(origin, product, reviews),
					breadcrumbJsonLd(origin, [
						{ name: "Market Tony", path: "/market" },
						...(cat ? [{ name: cat, path: `/market?categoria=${product.category}` }] : []),
						{ name: product.title, path },
					]),
					...(product.faq.length ? [faqJsonLd(product.faq)] : []),
				],
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
			/>,
		);
	});

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

	app.get("/market/feed.xml", async (c) => xmlResponse(c, merchantFeed(c.get("config").origin, await listShopProducts(c.env.MARKET_DB))));

	app.get("/market/sitemap.xml", async (c) =>
		xmlResponse(c, sitemapXml(c.get("config").origin, await listShopProducts(c.env.MARKET_DB), Object.keys(LEGAL_DOCS))),
	);

	// Compra: el formulario solo manda el slug (en la URL) y el token CSRF. Cualquier otro campo
	// (p. ej. un "precio" inyectado) se ignora: el monto sale de la BD dentro de startCheckout.
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
		if (!product || product.kind !== "paid") return renderMessage(c, 404, "Producto no encontrado", "Este producto no está a la venta.");
		// Único dato opcional que acepta el formulario además del CSRF: el código de cupón (se valida en el servidor).
		const rawCoupon = form?.get("cupon");
		const coupon = typeof rawCoupon === "string" ? rawCoupon.trim().slice(0, 64) : "";
		const result = await startCheckout(deps(c), user, product, coupon || null);
		if (result.ok) return c.redirect(result.redirectUrl, 303);
		if (result.reason === "already_owned") return c.redirect("/market/mis-compras", 303);
		if (result.reason === "invalid_coupon") return c.redirect(`/market/producto/${slug}?aviso=cupon-invalido`, 303);
		if (result.reason === "provider_error") return c.redirect(`/market/producto/${slug}?aviso=pago-error`, 303);
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
		if (!product || product.kind !== "free") return renderMessage(c, 404, "Producto no encontrado", "Este recurso no está disponible.");
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
