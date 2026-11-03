/**
 * Artículos duplicados que se redirigen (301) al que queda. Lo usan las fichas de artículo y los sitemaps/RSS
 * para no listar el duplicado. Auditoría SEO del 2026-11-03: /posts/demand-gen-reemplazo-vac era idéntico a la guía.
 */
export const POST_REDIRECTS: Record<"es" | "en", Record<string, string>> = {
	es: {
		"demand-gen-reemplazo-vac": "demand-gen-reemplazo-video-action-campaigns-guia-2026",
	},
	en: {},
};
