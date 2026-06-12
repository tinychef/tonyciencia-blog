import { defineMiddleware } from "astro:middleware";

/**
 * Caché de edge para páginas públicas (Cloudflare Cache API).
 *
 * Por qué: las páginas se renderizaban en el servidor (SSR) en CADA visita,
 * consultando D1. Aquí servimos el HTML ya generado desde el edge → 0 queries
 * y ~10ms en visitas cacheadas. El tema (dark/light) se aplica client-side y
 * ninguna respuesta pública usa Set-Cookie, así que el HTML es idéntico para
 * todos → cachear es seguro.
 *
 * Es DEFENSIVO: cualquier error en la lógica de caché cae al renderizado normal.
 * Nunca cachea: métodos != GET, admin (/_emdash), APIs, búsqueda, assets, ni
 * respuestas que no sean 200 text/html o que traigan Set-Cookie.
 */

const EDGE_TTL = 300; // segundos que el edge sirve la copia (s-maxage)
const SWR = 86400; // sirve copia vieja mientras revalida en background

const SKIP_PREFIXES = [
	"/_emdash", // admin + API del CMS
	"/api",
	"/_astro", // assets (ya los cachea el adapter)
	"/_image",
	"/_server-islands",
];

function isCacheableRoute(pathname: string): boolean {
	if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return false;
	if (pathname === "/search" || pathname === "/en/search") return false; // dinámico por query
	return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
	const { request, url } = context;
	// @ts-expect-error runtime lo inyecta el adapter de Cloudflare
	const runtime = context.locals?.runtime;
	// La Cache API de Cloudflare se expone por el runtime del adapter; globalThis
	// es fallback (no siempre trae .default con nodejs_compat).
	const cacheStore: Cache | undefined =
		runtime?.caches?.default ??
		(globalThis as { caches?: { default?: Cache } }).caches?.default;

	if (request.method !== "GET" || !cacheStore || !isCacheableRoute(url.pathname)) {
		return next();
	}

	const cacheKey = new Request(new URL(url.pathname, url.origin).toString(), {
		method: "GET",
	});

	// 1) Lectura de caché (defensiva — si falla, seguimos al render)
	try {
		const hit = await cacheStore.match(cacheKey);
		if (hit) {
			const res = new Response(hit.body, hit);
			res.headers.set("x-edge-cache", "HIT");
			return res;
		}
	} catch {
		/* noop */
	}

	// 2) Render normal (una sola vez)
	const response = await next();

	// 3) Escritura de caché solo si es 200 HTML sin Set-Cookie
	const contentType = response.headers.get("content-type") ?? "";
	if (
		response.status === 200 &&
		contentType.includes("text/html") &&
		!response.headers.has("set-cookie")
	) {
		const cacheable = new Response(response.body, response);
		cacheable.headers.set(
			"Cache-Control",
			`public, s-maxage=${EDGE_TTL}, stale-while-revalidate=${SWR}`,
		);
		cacheable.headers.set("x-edge-cache", "MISS");
		try {
			const copy = cacheable.clone();
			if (runtime?.ctx?.waitUntil) {
				runtime.ctx.waitUntil(cacheStore.put(cacheKey, copy));
			} else {
				await cacheStore.put(cacheKey, copy);
			}
		} catch {
			/* si el put falla, devolvemos la respuesta igual */
		}
		return cacheable;
	}

	return response;
});
