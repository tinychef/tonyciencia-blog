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

const CSP = [
	"default-src 'self'",
	// Miniaturas de YouTube (video de demostración de un producto).
	"img-src 'self' data: https://i.ytimg.com",
	"style-src 'self' 'unsafe-inline'",
	// Único JS: /market/static/market.js (galería, filtros, menú, popup). Nada en línea.
	"script-src 'self'",
	"font-src 'self'",
	// Video de demostración (YouTube sin cookies) y agenda de reservas de Google Calendar.
	"frame-src 'self' https://www.youtube-nocookie.com https://calendar.google.com",
	// El POST de "Comprar" redirige a Stripe; el resto de formularios se quedan en el sitio.
	"form-action 'self' https://checkout.stripe.com",
	"frame-ancestors 'none'",
	"base-uri 'none'",
	"object-src 'none'",
].join("; ");

const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
	await next();
	const h = c.res.headers;
	if (!h.has("x-content-type-options")) h.set("X-Content-Type-Options", "nosniff");
	if (!h.has("referrer-policy")) h.set("Referrer-Policy", "strict-origin-when-cross-origin");
	h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	if ((h.get("content-type") ?? "").startsWith("text/html")) {
		if (!h.has("content-security-policy")) h.set("Content-Security-Policy", CSP);
		if (!h.has("x-frame-options")) h.set("X-Frame-Options", "DENY");
		if (!h.has("cache-control")) h.set("Cache-Control", "no-store");
	}
	if (c.get("config")?.origin.startsWith("https://")) h.set("Strict-Transport-Security", "max-age=31536000");
};

export function createApp() {
	const app = new Hono<AppEnv>({ strict: false });
	app.use("*", bootMiddleware);
	app.use("*", securityHeaders);
	app.use("*", sessionMiddleware);

	app.get("/", (c) => c.redirect("/market", 302));
	registerShop(app);
	registerAuth(app);
	registerPayments(app);
	registerDownloads(app);
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
