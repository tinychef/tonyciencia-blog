/**
 * Contenido del blog desde git (content/posts/{es,en}/*.json), con la misma forma de funciones que usaba EmDash.
 *
 * Migración del 2026-11-03: EmDash (CMS 0.x con base D1) se quitó. Había dos fuentes de verdad que no se
 * sincronizaban (D1 y los JSON), su admin nunca se configuró y era la causa de la mayoría de los errores repetidos
 * (buscador, RSS, sitemap, etiquetas, slugs «en/…»). Los 7 artículos que solo estaban en D1 se exportaron a JSON.
 * Ahora git es la única fuente: n8n y los agentes ya publican así (un JSON por artículo, por PR).
 *
 * Las páginas siguen llamando getEmDashCollection/getEmDashEntry/getTerm… para que el cambio sea mínimo; cuando se
 * toque cada página se pueden renombrar.
 */
import { getStaticPosts, TAXONOMY_LABELS } from "../utils/static-posts";
import type { BlogSiteIdentitySettings } from "../utils/site-identity";

type Lang = "es" | "en";
export type Entry = ReturnType<typeof getStaticPosts>[number];

interface CollectionOptions {
	locale?: string;
	where?: { category?: string; tag?: string; translation_of?: string };
	orderBy?: Record<string, "asc" | "desc">;
	limit?: number;
}

const lang = (l?: string): Lang => (l === "en" ? "en" : "es");
const published = (now = Date.now()) => (e: Entry) => e.data.publishedAt.getTime() <= now;

export async function getEmDashCollection(collection: string, opts: CollectionOptions = {}) {
	if (collection !== "posts") return { entries: [] as Entry[], cacheHint: {} };
	let entries = getStaticPosts(lang(opts.locale)).filter(published());
	const w = opts.where ?? {};
	if (w.category) entries = entries.filter((e) => e.data.__staticCategories.includes(w.category!));
	if (w.tag) entries = entries.filter((e) => e.data.__staticTags.some((t) => t.slug === w.tag));
	if (w.translation_of) entries = entries.filter((e) => e.data.translation_of === w.translation_of);
	if (opts.orderBy?.published_at === "asc") entries = [...entries].reverse();
	if (opts.limit) entries = entries.slice(0, opts.limit);
	return { entries, cacheHint: {} };
}

/**
 * Un artículo por slug. Con `locale` busca solo en ese idioma; sin `locale`, primero en español y después en inglés
 * (la ficha en español redirige a /en/posts/<slug> si el artículo es en inglés, como antes).
 */
export async function getEmDashEntry(collection: string, slug: string, opts: { locale?: string } = {}) {
	const none = { entry: null as Entry | null, cacheHint: {}, fallbackLocale: undefined as string | undefined };
	if (collection !== "posts" || !slug) return none;
	const find = (l: Lang) => getStaticPosts(l).filter(published()).find((e) => e.id === slug) ?? null;
	const entry = opts.locale ? find(lang(opts.locale)) : (find("es") ?? find("en"));
	return { ...none, entry };
}

/** Término de una taxonomía si existe (tiene etiqueta conocida o algún artículo lo usa). */
export async function getTerm(taxonomy: "tag" | "category", slug: string, locale?: string) {
	const l = lang(locale);
	const labels = TAXONOMY_LABELS[taxonomy];
	const used = (["es", "en"] as const).some((x) =>
		getStaticPosts(x).some((e) =>
			taxonomy === "category" ? e.data.__staticCategories.includes(slug) : e.data.__staticTags.some((t) => t.slug === slug),
		),
	);
	if (!labels[slug] && !used) return null;
	return { slug, label: labels[slug]?.[l] ?? slug };
}

/** Todos los términos usados en un idioma, con su número de artículos. */
export function listTerms(taxonomy: "tag" | "category", locale?: string) {
	const l = lang(locale);
	const counts = new Map<string, number>();
	for (const e of getStaticPosts(l).filter(published())) {
		const slugs = taxonomy === "category" ? e.data.__staticCategories : e.data.__staticTags.map((t) => t.slug);
		for (const s of slugs) counts.set(s, (counts.get(s) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([slug, count]) => ({ slug, label: TAXONOMY_LABELS[taxonomy][slug]?.[l] ?? slug, count }))
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Identidad del sitio (antes en los ajustes de D1). */
export async function getSiteSettings(): Promise<BlogSiteIdentitySettings> {
	return { title: "Tony Ciencia", tagline: "Implementa IA, Avanza" };
}

/** Menús: los del pie están en el código (Footer.astro trae su lista). */
export async function getMenu(_name: string): Promise<{ items: Array<{ label: string; url: string }> } | null> {
	return null;
}

export function decodeSlug(value: string | undefined | null): string | null {
	if (!value) return null;
	try {
		const s = decodeURIComponent(value).trim();
		return s && !s.includes("/") && s.length <= 200 ? s : null;
	} catch {
		return null;
	}
}

/** Solo enlaces http(s), mailto, tel, relativos y anclas; cualquier otro esquema (javascript:, data:) → "#". */
export function sanitizeHref(href: unknown): string {
	if (typeof href !== "string") return "#";
	const h = href.trim();
	if (/^(https?:|mailto:|tel:)/i.test(h) || h.startsWith("/") || h.startsWith("#")) return h;
	if (!/^[a-z][a-z0-9+.-]*:/i.test(h)) return h;
	return "#";
}

const SITE = "https://tonyciencia.com";

/** SEO de un artículo (misma forma que el getSeoMeta de EmDash que usaban las fichas). */
export function getSeoMeta(
	post: Entry,
	opts: { siteTitle: string; siteUrl?: string; path: string; defaultOgImage?: string | null },
) {
	return {
		title: `${post.data.seoTitle ?? post.data.title} — ${opts.siteTitle}`,
		ogTitle: post.data.title,
		description: post.data.excerpt ?? "",
		ogImage: opts.defaultOgImage ?? null,
		canonical: new URL(opts.path, SITE).href,
		robots: null as string | null,
	};
}

/** Tipos que antes venían de EmDash. */
export type PortableTextBlock = { _type: string; style?: string; children?: Array<{ _type?: string; text?: string; marks?: string[] }>; [k: string]: unknown };
export type ContentBylineCredit = {
	byline: { displayName: string; avatarMediaId?: string | null; bio?: string | null };
	roleLabel?: string | null;
};
