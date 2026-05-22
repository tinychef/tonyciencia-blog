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
		schema_type?: string;
		faq_items?: any[];
		key_entities?: string;
		external_id?: string;
		source?: string;
	};
};

const esPosts = import.meta.glob("../../content/posts/es/*.json", { eager: true, import: "default" }) as Record<string, RawPost>;
const enPosts = import.meta.glob("../../content/posts/en/*.json", { eager: true, import: "default" }) as Record<string, RawPost>;

const tagLabels: Record<string, string> = {
	"n8n": "n8n",
	"chatgpt": "ChatGPT",
	"tutorial": "Tutorial",
	"opinion": "Opinión",
	"caso-de-uso": "Caso de Uso",
};

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
				__staticTags: (post.taxonomies?.tag ?? []).map((slug) => ({
					slug,
					label: tagLabels[slug] ?? slug,
				})),
				__staticCategories: post.taxonomies?.category ?? [],
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
