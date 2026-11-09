import { defineMiddleware } from "astro:middleware";

/**
 * Seguridad del blog (auditoría del 2026-11-03).
 *
 * 1. El admin de EmDash nunca se configuró en producción (/_emdash/api/setup/status → needsSetup: true): cualquiera
 *    podía completar el setup y quedarse como administrador, en el MISMO origen que el admin del market. Nadie usa
 *    ese admin (el contenido llega por git: content/posts/**.json), así que TODO /_emdash queda cerrado (404),
 *    salvo los archivos de medios que los artículos muestran. Vale también para el dominio workers.dev, que sirve
 *    este mismo Worker. Esto corre después del middleware de EmDash y antes de cualquier ruta.
 * 2. Una sola URL por página: /about/ y /about respondían 200 con canonicals distintos (el sitemap listaba /about/ y
 *    el menú enlaza /about). Las rutas con barra final redirigen 301 a la versión sin barra, salvo la portada en
 *    inglés, cuya forma canónica es /en/ (y /en redirige a /en/).
 * 3. Content-Security-Policy con nonce por respuesta en el HTML: solo corren los scripts del sitio (/_astro, con nonce)
 *    y los de Google (GTM/GA4). Cloudflare toma el nonce de la cabecera para su propio script (Bot Fight Mode), igual
 *    que en el market. Los <script is:inline> llevan nonce={Astro.locals.cspNonce}.
 * 4. Cabeceras de seguridad en todas las respuestas del blog (las del market las pone su propio Worker) y sin
 *    Server-Timing (exponía tiempos y número de consultas a la base).
 */
const MEDIA_FILE = /^\/_emdash\/api\/media\/file\/[A-Za-z0-9._-]+$/;
const OAUTH_DISCOVERY = /^\/\.well-known\/oauth-(authorization-server|protected-resource)(\/|$)/;

function blocked(pathname: string, method: string): boolean {
	if (OAUTH_DISCOVERY.test(pathname)) return true;
	if (pathname !== "/_emdash" && !pathname.startsWith("/_emdash/")) return false;
	return !((method === "GET" || method === "HEAD") && MEDIA_FILE.test(pathname));
}

const NO_SLASH_SKIP = /^\/(_emdash|_astro|_image|market|cdn-cgi)(\/|$)/;

function slashRedirect(url: URL): string | null {
	const { pathname, search } = url;
	if (pathname === "/en") return `/en/${search}`;
	if (pathname === "/" || pathname === "/en/" || !pathname.endsWith("/") || NO_SLASH_SKIP.test(pathname)) return null;
	const clean = pathname.replace(/\/+$/, "");
	return clean ? `${clean}${search}` : null;
}

function cspFor(nonce: string): string {
	const google = "https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com";
	return [
		"default-src 'self'",
		`script-src 'self' 'nonce-${nonce}' ${google} https://connect.facebook.net https://challenges.cloudflare.com`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob: https:",
		"font-src 'self' data:",
		"connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://www.google.com https://stats.g.doubleclick.net https://www.facebook.com https://connect.facebook.net https://resend-contact-worker.antonioduquejuliao.workers.dev",
		"frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.googletagmanager.com https://challenges.cloudflare.com",
		"media-src 'self' https:",
		"form-action 'self'",
		"frame-ancestors 'self'",
		"base-uri 'self'",
		"object-src 'none'",
		"upgrade-insecure-requests",
	].join("; ");
}

function newNonce(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]!);
}

export const onRequest = defineMiddleware(async (context, next) => {
	const nonce = newNonce();
	context.locals.cspNonce = nonce;
	const { pathname } = context.url;
	if (context.request.method === "GET" || context.request.method === "HEAD") {
		const target = slashRedirect(context.url);
		if (target) return context.redirect(target, 301);
	}
	if (blocked(pathname, context.request.method)) {
		return new Response("Not found", {
			status: 404,
			headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
		});
	}
	const response = await next();
	const h = response.headers;
	try {
		h.set("Strict-Transport-Security", "max-age=31536000");
		h.set("X-Content-Type-Options", "nosniff");
		h.set("Referrer-Policy", "strict-origin-when-cross-origin");
		h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
		if (!h.has("X-Frame-Options")) h.set("X-Frame-Options", "SAMEORIGIN");
		h.delete("Server-Timing");
		if ((h.get("content-type") ?? "").includes("text/html")) h.set("Content-Security-Policy", cspFor(nonce));
		return response;
	} catch {
		// Respuestas con cabeceras inmutables (p. ej. un fetch reenviado): se copian.
		const copy = new Response(response.body, response);
		copy.headers.set("Strict-Transport-Security", "max-age=31536000");
		copy.headers.set("X-Content-Type-Options", "nosniff");
		copy.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
		copy.headers.delete("Server-Timing");
		if ((copy.headers.get("content-type") ?? "").includes("text/html")) copy.headers.set("Content-Security-Policy", cspFor(nonce));
		return copy;
	}
});
