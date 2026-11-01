import { Hono, type MiddlewareHandler } from "hono";
import { createAdapters } from "./adapters";
import { loadConfig, requestHostError, type BootResult } from "./config";
import type { AppEnv } from "./context";
import type { Env } from "./env";
import { sessionMiddleware } from "./lib/session";
import { registerAdmin } from "./routes/admin";
import { registerAuth } from "./routes/auth";
import { registerDev } from "./routes/dev";
import { registerDownloads } from "./routes/downloads";
import { registerPayments } from "./routes/payments";
import { registerProvision } from "./routes/provision";
import { registerShop } from "./routes/shop";
import { renderMessage } from "./views/render";

const bootCache = new WeakMap<object, BootResult>();

function boot(env: Env): BootResult {
	let r = bootCache.get(env);
	if (!r) {
		r = loadConfig(env);
		if (!r.ok) console.error(`[market] configuración inválida — el market no arranca:\n- ${r.errors.join("\n- ")}`);
		bootCache.set(env, r);
	}
	return r;
}

function refusePage(title: string, detail: string): Response {
	const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
	return new Response(
		`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="robots" content="noindex"><title>${esc(title)}</title>` +
			`<body style="font-family:system-ui,sans-serif;max-width:640px;margin:10vh auto;padding:0 16px;line-height:1.6">` +
			`<h1>${esc(title)}</h1><p>${esc(detail)}</p></body></html>`,
		{ status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "retry-after": "300" } },
	);
}

/** Guardia de arranque por petición: configuración válida y nada de maqueta en dominios de producción. */
const bootMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
	const r = boot(c.env);
	if (!r.ok) {
		// Al público no se le muestran los detalles (están en los logs).
		return refusePage("Market no disponible", "La tienda no está configurada correctamente. Vuelve más tarde.");
	}
	const hostErr = requestHostError(r.config, new URL(c.req.url));
	if (hostErr) {
		console.error(`[market] ${hostErr}`);
		return refusePage("Market no disponible", "Configuración insegura detectada: la tienda se niega a arrancar.");
	}
	c.set("config", r.config);
	c.set("adapters", createAdapters(r.config, c.env));
	await next();
};

/**
 * Dominios de Google Tag Manager, Google Analytics 4 y Google Ads, tal como los lista Google:
 * https://developers.google.com/tag-platform/security/guides/csp (GTM + modo vista previa, Analytics con funciones de
 * Ads, Ads de conversión/remarketing y datos de usuario). SOLO se agregan cuando hay GTM_ID.
 * Google pide listar cada dominio de país (google.<TLD>) por separado: van los de los países que atiende la tienda
 * (serviceJsonLd → areaServed); EE. UU. usa google.com. No se agregan 'unsafe-inline' ni 'unsafe-eval': las etiquetas
 * de HTML personalizado y las variables de JavaScript personalizado de GTM no correrán (usar plantillas de GTM).
 */
const GOOGLE_TLDS = ["com.mx", "com.co", "es", "com.ar", "cl", "com.pe"].map((tld) => `https://*.google.${tld}`);
export const GOOGLE_TAG_CSP = {
	script: ["https://www.googletagmanager.com", "https://tagmanager.google.com", "https://www.googleadservices.com", "https://www.google.com"],
	img: [
		"https://www.googletagmanager.com",
		"https://ssl.gstatic.com",
		"https://www.gstatic.com",
		"https://*.google-analytics.com",
		"https://*.google.com",
		...GOOGLE_TLDS,
		"https://*.g.doubleclick.net",
		"https://googleads.g.doubleclick.net",
		"https://www.googleadservices.com",
		"https://pagead2.googlesyndication.com",
	],
	connect: [
		"https://www.googletagmanager.com",
		"https://*.google-analytics.com",
		"https://*.google.com",
		...GOOGLE_TLDS,
		"https://*.g.doubleclick.net",
		"https://googleads.g.doubleclick.net",
		"https://ad.doubleclick.net",
		"https://www.googleadservices.com",
		"https://pagead2.googlesyndication.com",
	],
	frame: ["https://www.googletagmanager.com"],
	// Solo para el modo vista previa de GTM (Tag Assistant).
	style: ["https://www.googletagmanager.com", "https://tagmanager.google.com", "https://fonts.googleapis.com"],
	font: ["https://fonts.gstatic.com", "data:"],
};

export const cspFor = (nonce: string, googleTags = false) => {
	const g = (k: keyof typeof GOOGLE_TAG_CSP) => (googleTags ? ` ${GOOGLE_TAG_CSP[k].join(" ")}` : "");
	return [
		"default-src 'self'",
		// Miniaturas de YouTube (video de demostración de un producto).
		`img-src 'self' data: https://i.ytimg.com${g("img")}`,
		`style-src 'self' 'unsafe-inline'${g("style")}`,
		// Único JS propio: /market/static/market.js (galería, filtros, menú, popup). Nada en línea nuestro.
		// + Cloudflare Web Analytics (beacon que inyecta el borde de Cloudflare).
		// + nonce por respuesta: Bot Fight Mode (plan Free) inyecta siempre un script en línea de "JavaScript detections" y
		//   Cloudflare le agrega el nonce que lee de este encabezado; su script externo vive en /cdn-cgi/challenge-platform/
		//   ('self'). Sin nonce, la CSP lo bloqueaba y dejaba un error en la consola (H15 de la revisión SEO v6).
		//   https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/
		// + con GTM_ID: gtm.js (lo inserta market.js) y las etiquetas de Google.
		`script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com${g("script")}`,
		`connect-src 'self' https://cloudflareinsights.com${g("connect")}`,
		`font-src 'self'${g("font")}`,
		// Video de demostración (YouTube sin cookies) y agenda de reservas de Google Calendar (+ GTM con GTM_ID).
		`frame-src 'self' https://www.youtube-nocookie.com https://calendar.google.com${g("frame")}`,
		// El POST de "Comprar" redirige a Stripe; el resto de formularios se quedan en el sitio.
		"form-action 'self' https://checkout.stripe.com",
		"frame-ancestors 'none'",
		"base-uri 'none'",
		"object-src 'none'",
	].join("; ");
};

const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
	await next();
	const h = c.res.headers;
	if (!h.has("x-content-type-options")) h.set("X-Content-Type-Options", "nosniff");
	if (!h.has("referrer-policy")) h.set("Referrer-Policy", "strict-origin-when-cross-origin");
	h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	if ((h.get("content-type") ?? "").startsWith("text/html")) {
		if (!h.has("content-security-policy")) {
			const bytes = crypto.getRandomValues(new Uint8Array(16));
			const nonce = btoa(String.fromCharCode(...bytes));
			h.set("Content-Security-Policy", cspFor(nonce, !!c.get("config")?.gtmId));
		}
		if (!h.has("x-frame-options")) h.set("X-Frame-Options", "DENY");
		if (!h.has("cache-control")) h.set("Cache-Control", "no-store");
	}
	if (c.get("config")?.origin.startsWith("https://")) h.set("Strict-Transport-Security", "max-age=31536000");
};

/** Fichas con barra final: /market/producto/<slug>/ y /market/en/product/<slug>/. */
const PRODUCT_TRAILING_SLASH = /^\/market\/(?:producto|en\/product)\/[a-z0-9-]+\/$/;

/**
 * Una sola URL por página (H14 de la revisión SEO v6): las variantes con o sin barra que antes respondían 200
 * redirigen con 301 a la forma canónica, conservando la query. /market (sin barra) NO se redirige: la ruta de
 * Cloudflare "tonyciencia.com/market" llega al Worker y su canonical ya apunta a /market/.
 */
export function canonicalRedirect(path: string): string | null {
	if (path === "/market/en") return "/market/en/";
	if (PRODUCT_TRAILING_SLASH.test(path)) return path.slice(0, -1);
	return null;
}

const canonicalRedirects: MiddlewareHandler<AppEnv> = async (c, next) => {
	if (c.req.method === "GET" || c.req.method === "HEAD") {
		// Ruta tal como llegó: con strict: false, c.req.path ya viene sin la barra final.
		const url = new URL(c.req.url);
		const to = canonicalRedirect(url.pathname);
		if (to) return c.redirect(`${to}${url.search}`, 301);
	}
	await next();
};

export function createApp() {
	const app = new Hono<AppEnv>({ strict: false });
	app.use("*", bootMiddleware);
	app.use("*", securityHeaders);
	app.use("*", canonicalRedirects);
	app.use("*", sessionMiddleware);

	app.get("/", (c) => c.redirect("/market/", 302));
	registerShop(app);
	registerAuth(app);
	registerPayments(app);
	registerDownloads(app);
	registerProvision(app);
	registerAdmin(app);
	registerDev(app);

	app.notFound((c) => (c.get("config") ? renderMessage(c, 404, "Página no encontrada", "Revisa el enlace o vuelve al catálogo.") : c.text("Not found", 404)));
	app.onError((err, c) => {
		console.error(`[market] error no controlado en ${c.req.method} ${c.req.path}:`, err);
		if (c.req.path.startsWith("/market/webhooks/")) return c.json({ error: "error interno" }, 500);
		return c.get("config")
			? renderMessage(c, 500, "Algo salió mal", "Ocurrió un error inesperado. Inténtalo de nuevo en unos minutos.")
			: c.text("Error interno", 500);
	});
	return app;
}

export const app = createApp();
