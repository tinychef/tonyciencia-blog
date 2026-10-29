import type { Hono } from "hono";
import { clientIp, deps, type AppEnv, type Ctx } from "../context";
import { hit, RATE_RULES } from "../lib/ratelimit";
import { checkCsrf } from "../lib/session";
import { isSlug, safeNextPath } from "../lib/validate";
import { dispatchByOrder } from "../services/outbox";
import { claimFreeProduct, startCheckout, type Deps } from "../services/orders";
import { getActiveEntitlement, getProductBySlug, listActiveProducts, listLibrary, setMarketingOptIn } from "../services/repo";
import { LibraryPage } from "../views/account";
import { LEGAL_DOCS, LegalPage } from "../views/legal";
import { render, renderMessage } from "../views/render";
import { Catalog, ProductPage } from "../views/shop";

export function loginRedirect(c: Ctx, next: string) {
	return c.redirect(`/market/entrar?next=${encodeURIComponent(safeNextPath(next))}`, 303);
}

export function registerShop(app: Hono<AppEnv>) {
	app.get("/market", async (c) => {
		const products = await listActiveProducts(c.env.MARKET_DB);
		return render(
			c,
			{
				title: "Market Tony",
				path: "/market",
				description: "Recursos digitales de Tony Ciencia: agentes de IA, prompts y plantillas para tu marketing. Descarga inmediata.",
			},
			<Catalog products={products} />,
		);
	});

	app.get("/market/producto/:slug", async (c) => {
		const slug = c.req.param("slug");
		if (!isSlug(slug)) return renderMessage(c, 404, "Producto no encontrado", "Revisa el enlace o vuelve al catálogo.");
		const product = await getProductBySlug(c.env.MARKET_DB, slug);
		if (!product) return renderMessage(c, 404, "Producto no encontrado", "Este producto no existe o ya no está disponible.");
		const user = c.get("user");
		const owned = user ? !!(await getActiveEntitlement(c.env.MARKET_DB, user.id, product.id)) : false;
		const flash = c.req.query("aviso") === "pago-error" ? "No pudimos iniciar el pago. Inténtalo de nuevo en unos minutos." : null;
		return render(
			c,
			{ title: product.title, path: `/market/producto/${product.slug}`, description: product.summary },
			<ProductPage product={product} loggedIn={!!user} owned={owned} csrf={c.get("csrf")} mode={c.get("config").mode} flash={flash} />,
		);
	});

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
		const result = await startCheckout(deps(c), user, product);
		if (result.ok) return c.redirect(result.redirectUrl, 303);
		if (result.reason === "already_owned") return c.redirect("/market/mis-compras", 303);
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
