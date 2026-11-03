type RawPost = {
	id: string;
	slug: string;
	status: string;
	locale: "es" | "en";
	published_at: string;
	taxonomies?: Record<string, string[]>;
	data: {
		title: string;
		excerpt?: string;
		content: any[];
		featured_image?: {
			$media?: {
				url: string;
				alt?: string;
				filename?: string;
			};
			src?: string;
			alt?: string;
		};
		translation_of?: string;
		/** Título para <title> si debe ser distinto del H1 (más corto). */
		seo_title?: string;
		schema_type?: string;
		faq_items?: any[];
		key_entities?: string;
		external_id?: string;
		source?: string;
	};
};

const esPosts = import.meta.glob("../../content/posts/es/*.json", { eager: true, import: "default" }) as Record<string, RawPost>;
const enPosts = import.meta.glob("../../content/posts/en/*.json", { eager: true, import: "default" }) as Record<string, RawPost>;

/** Nombres visibles de categorías y etiquetas por idioma (antes vivían en D1, algunos sin tildes). */
export const TAXONOMY_LABELS: Record<"category" | "tag", Record<string, { es: string; en: string }>> = {
	category: {
		ia: { es: "Inteligencia artificial", en: "Artificial intelligence" },
		automatizacion: { es: "Automatización", en: "Automation" },
		herramientas: { es: "Herramientas", en: "Tools" },
		negocios: { es: "Negocios", en: "Business" },
	},
	tag: {
		n8n: { es: "n8n", en: "n8n" },
		chatgpt: { es: "ChatGPT", en: "ChatGPT" },
		tutorial: { es: "Tutorial", en: "Tutorial" },
		opinion: { es: "Opinión", en: "Opinion" },
		"caso-de-uso": { es: "Caso de uso", en: "Use case" },
		ia: { es: "IA", en: "AI" },
	},
};

const label = (taxonomy: "category" | "tag", slug: string, locale: "es" | "en") => TAXONOMY_LABELS[taxonomy][slug]?.[locale] ?? slug;

function normalizeImage(image: RawPost["data"]["featured_image"]) {
	if (!image) return null;
	if (image.$media?.url) {
		return {
			src: image.$media.url,
			alt: image.$media.alt ?? "",
		};
	}
	if (image.src) {
		return {
			src: image.src,
			alt: image.alt ?? "",
		};
	}
	return null;
}

export function getStaticPosts(locale: "es" | "en") {
	const modules = locale === "en" ? enPosts : esPosts;
	return Object.values(modules)
		.filter((post) => post.status === "published")
		.map((post) => ({
			id: post.slug,
			edit: {
				title: {},
				excerpt: {},
				featured_image: {},
			},
			data: {
				id: post.id,
				title: post.data.title,
				seoTitle: post.data.seo_title,
				excerpt: post.data.excerpt,
				content: post.data.content,
				featured_image: normalizeImage(post.data.featured_image),
				translation_of: post.data.translation_of,
				schema_type: post.data.schema_type,
				faq_items: post.data.faq_items,
				key_entities: post.data.key_entities,
				external_id: post.data.external_id,
				source: post.data.source,
				publishedAt: new Date(post.published_at),
				updatedAt: new Date(post.published_at),
				bylines: [],
				locale,
				__staticTags: (post.taxonomies?.tag ?? []).map((slug) => ({ slug, label: label("tag", slug, locale) })),
				__staticCategories: post.taxonomies?.category ?? [],
				terms: {
					tag: (post.taxonomies?.tag ?? []).map((slug) => ({ slug, label: label("tag", slug, locale) })),
					category: (post.taxonomies?.category ?? []).map((slug) => ({ slug, label: label("category", slug, locale) })),
				},
			},
		}))
		.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
} 

export function getStaticPost(locale: "es" | "en", slug: string) {
	return getStaticPosts(locale).find((post) => post.id === slug) ?? null;
}

export function getStaticTags(post: any): Array<{ slug: string; label: string }> {
	return post.data?.__staticTags ?? [];
}
