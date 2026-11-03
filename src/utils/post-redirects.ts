/**
 * Artículos duplicados que se redirigen (301) al que queda. Lo usan las fichas de artículo y los sitemaps/RSS
 * para no listar el duplicado. Auditoría SEO del 2026-11-03: /posts/demand-gen-reemplazo-vac era idéntico a la guía.
 */
export const POST_REDIRECTS: Record<"es" | "en", Record<string, string>> = {
	es: {
		"demand-gen-reemplazo-vac": "demand-gen-reemplazo-video-action-campaigns-guia-2026",
		// 2026-11-03: no hubo fusión; el artículo se reescribió sobre el acuerdo de cómputo real (Colossus 1).
		"claude-spacex-fusion-mayo-2026": "acuerdo-anthropic-spacex-colossus-claude-code",
	},
	en: {
		"claude-spacex-merger-may-2026": "anthropic-spacex-colossus-deal-claude-code",
	},
};

/**
 * Pares de traducción que el CMS no tiene enlazados (translation_of vacío): español → inglés. Sin esto no hay
 * hreflang entre ellos y el selector de idioma lleva al listado (auditoría QA del 2026-11-03).
 */
export const TRANSLATION_PAIRS: Record<string, string> = {
	"el-creativo-es-el-nuevo-targeting-2026": "creative-is-the-new-targeting-2026",
};
export const TRANSLATION_PAIRS_EN_TO_ES: Record<string, string> = Object.fromEntries(
	Object.entries(TRANSLATION_PAIRS).map(([es, en]) => [en, es]),
);
