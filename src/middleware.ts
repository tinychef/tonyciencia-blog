import { defineMiddleware } from "astro:middleware";

/**
 * Caché de edge para páginas públicas (Cloudflare Cache API).
 *
 * Sirve el HTML ya renderizado desde el edge → 0 queries D1 y ~10ms en visita
 * cacheada. El tema (dark/light) se aplica client-side y ninguna respuesta
 * pública usa Set-Cookie, así que el HTML es idéntico para todos → cachear es seguro.
 *
 * BULLETPROOF: toda la lógica de caché está envuelta en try/catch y SIEMPRE
 * existe un camino que devuelve una respuesta válida. Nunca muta headers
 * inmutables (usa `new Headers(...)` mutable). Si algo falla → render normal.
 */

const EDGE_TTL = 600; // s-maxage: el edge sirve la copia 10 min
const SWR = 86400; // sirve copia vieja 24h mientras revalida

const SKIP_PREFIXES = ["/_emdash", "/api", "/_astro", "/_image", "/_server-islands"];

function isCacheableRoute(pathname: string): boolean {
	if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return false;
	if (pathname === "/search" || pathname === "/en/search") return false;
	return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
	const { request, url } = context;
	// @ts-expect-error runtime lo inyecta el adapter de Cloudflare
	const runtime = context.locals?.runtime;
	const cacheStore: Cache | undefined =
		runtime?.caches?.default ??
		(globalThis as { caches?: { default?: Cache } }).caches?.default;

	if (request.method !== "GET" || !cacheStore || !isCacheableRoute(url.pathname)) {
		return next();
	}

	const cacheKey = new Request(new URL(url.pathname, url.origin).toString(), {
		method: "GET",
	});

	// 1) READ — devolver la copia cacheada tal cual (sin mutar headers)
	try {
		const hit = await cacheStore.match(cacheKey);
		if (hit) return hit;
	} catch {
		/* sigue al render */
	}

	// 2) RENDER normal (una sola vez)
	const response = await next();

	// 3) WRITE — totalmente defensivo; ante cualquier fallo devuelve `response`
	try {
		const ct = response.headers.get("content-type") ?? "";
		const isCacheable =
			response.status === 200 &&
			ct.includes("text/html") &&
			!response.headers.has("set-cookie");

		if (isCacheable) {
			// Headers mutables nuevos (los del adapter pueden ser inmutables)
			const headers = new Headers(response.headers);
			headers.set(
				"Cache-Control",
				`public, s-maxage=${EDGE_TTL}, stale-while-revalidate=${SWR}`,
			);
			headers.set("x-edge-cache", "MISS");

			const forCache = new Response(response.clone().body, { status: 200, headers });
			const forClient = new Response(response.body, { status: 200, headers });

			try {
				if (runtime?.ctx?.waitUntil) {
					runtime.ctx.waitUntil(cacheStore.put(cacheKey, forCache));
				} else {
					await cacheStore.put(cacheKey, forCache);
				}
			} catch {
				/* el put falló: igual devolvemos la respuesta al cliente */
			}
			return forClient;
		}
	} catch {
		/* cualquier fallo construyendo la respuesta cacheable → render normal */
	}

	return response;
});
