import { defineMiddleware } from "astro:middleware";

/**
 * Seguridad del blog (auditoría del 2026-11-03).
 *
 * 1. El admin de EmDash nunca se configuró en producción (/_emdash/api/setup/status → needsSetup: true): cualquiera
 *    podía completar el setup y quedarse como administrador, en el MISMO origen que el admin del market. Nadie usa
 *    ese admin (el contenido llega por git: content/posts/**.json), así que TODO /_emdash queda cerrado (404),
 *    salvo los archivos de medios que los artículos muestran. Vale también para el dominio workers.dev, que sirve
 *    este mismo Worker. Esto corre después del middleware de EmDash y antes de cualquier ruta.
 * 2. Cabeceras de seguridad en todas las respuestas del blog (las del market las pone su propio Worker) y sin
 *    Server-Timing (exponía tiempos y número de consultas a la base).
 */
const MEDIA_FILE = /^\/_emdash\/api\/media\/file\/[A-Za-z0-9._-]+$/;
const OAUTH_DISCOVERY = /^\/\.well-known\/oauth-(authorization-server|protected-resource)(\/|$)/;

function blocked(pathname: string, method: string): boolean {
	if (OAUTH_DISCOVERY.test(pathname)) return true;
	if (pathname !== "/_emdash" && !pathname.startsWith("/_emdash/")) return false;
	return !((method === "GET" || method === "HEAD") && MEDIA_FILE.test(pathname));
}

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;
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
		return response;
	} catch {
		// Respuestas con cabeceras inmutables (p. ej. un fetch reenviado): se copian.
		const copy = new Response(response.body, response);
		copy.headers.set("Strict-Transport-Security", "max-age=31536000");
		copy.headers.set("X-Content-Type-Options", "nosniff");
		copy.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
		copy.headers.delete("Server-Timing");
		return copy;
	}
});
