/** Datos estructurados (schema.org), feed de Google Merchant Center y sitemap del market. */
import { categoryLabel, seoDescription, seoTitle } from "../lib/catalog";
import type { ReviewRow, ShopProduct } from "./repo";

const BRAND = { "@type": "Brand", name: "Tony Ciencia" };
const SELLER = { "@type": "Organization", name: "Tony Ciencia LLC", url: "https://tonyciencia.com" };

const abs = (origin: string, path: string) => new URL(path, origin).toString();
const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
const money = (cents: number, currency: string) => `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;

/** Producto digital: sin envío y con la política de reembolso de 14 días. */
function offerJsonLd(origin: string, p: ShopProduct) {
	const soon = p.availability === "coming_soon";
	return {
		"@type": "Offer",
		url: abs(origin, `/market/producto/${p.slug}`),
		price: (p.price_cents / 100).toFixed(2),
		priceCurrency: p.currency.toUpperCase(),
		availability: soon ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
		itemCondition: "https://schema.org/NewCondition",
		seller: SELLER,
		...(soon
			? {}
			: {
					hasMerchantReturnPolicy: {
						"@type": "MerchantReturnPolicy",
						applicableCountry: "US",
						returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
						merchantReturnDays: 14,
						returnFees: "https://schema.org/FreeReturn",
					},
					shippingDetails: {
						"@type": "OfferShippingDetails",
						shippingRate: { "@type": "MonetaryAmount", value: "0", currency: p.currency.toUpperCase() },
						shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
						deliveryTime: {
							"@type": "ShippingDeliveryTime",
							handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
							transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
						},
					},
				}),
	};
}

export function productJsonLd(origin: string, p: ShopProduct, reviews: ReviewRow[]) {
	const data: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "Product",
		name: seoTitle(p),
		description: seoDescription(p),
		sku: p.slug,
		image: p.images.map((i) => abs(origin, i.src)),
		brand: BRAND,
		category: categoryLabel(p.category) ?? undefined,
		keywords: p.tags.join(", ") || undefined,
		offers: offerJsonLd(origin, p),
	};
	// Solo reseñas reales de compradores (nunca valores por defecto).
	if (p.stats.ratingCount > 0 && p.stats.ratingAvg !== null) {
		data.aggregateRating = {
			"@type": "AggregateRating",
			ratingValue: (Math.round(p.stats.ratingAvg * 10) / 10).toFixed(1),
			reviewCount: p.stats.ratingCount,
			bestRating: 5,
			worstRating: 1,
		};
		data.review = reviews.slice(0, 5).map((r) => ({
			"@type": "Review",
			reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
			author: { "@type": "Person", name: r.display_name || "Comprador verificado" },
			datePublished: new Date(r.created_at).toISOString().slice(0, 10),
			reviewBody: r.body || undefined,
		}));
	}
	return data;
}

export function breadcrumbJsonLd(origin: string, items: Array<{ name: string; path: string }>) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(origin, it.path) })),
	};
}

export function catalogJsonLd(origin: string, products: ShopProduct[]) {
	return [
		{
			"@context": "https://schema.org",
			"@type": "Store",
			name: "Market Tony",
			url: abs(origin, "/market"),
			description: "Tienda de Tony Ciencia: agentes de IA, skills y plantillas para anuncios, video y automatización.",
			parentOrganization: SELLER,
		},
		{
			"@context": "https://schema.org",
			"@type": "ItemList",
			itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(origin, `/market/producto/${p.slug}`), name: p.title })),
		},
	];
}

export function faqJsonLd(items: Array<{ q: string; a: string }>) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
	};
}

export function serviceJsonLd(origin: string) {
	return {
		"@context": "https://schema.org",
		"@type": "Service",
		name: "Agentes de IA a medida para empresas",
		serviceType: "Desarrollo de agentes de inteligencia artificial",
		provider: SELLER,
		areaServed: ["US", "MX", "CO", "ES", "AR", "CL", "PE"],
		availableLanguage: "es",
		url: abs(origin, "/market/agentes-para-empresas"),
		description: "Diseño, construcción y entrega de agentes de IA para ventas por WhatsApp, atención, agenda y automatizaciones conectadas al CRM.",
	};
}

/**
 * Feed de productos para Google Merchant Center (RSS 2.0 + espacio g:).
 * Se publican solo productos de pago disponibles. Los "Próximamente" y los gratis no se incluyen.
 * Ojo: Google limita algunos productos digitales en los anuncios de Shopping; las fichas gratuitas sí los aceptan.
 */
export function merchantFeed(origin: string, products: ShopProduct[]): string {
	const items = products
		.filter((p) => p.kind === "paid" && p.availability === "available" && p.images[0])
		.map((p) => {
			const hasSale = !!p.compare_at_cents && p.compare_at_cents > p.price_cents;
			const extra = p.images.slice(1, 10).map((i) => `<g:additional_image_link>${xml(abs(origin, i.src))}</g:additional_image_link>`);
			const desc = [p.meta_description || p.summary, p.tagline, ...p.highlights].filter(Boolean).join(" · ").slice(0, 4900);
			return [
				"<item>",
				`<g:id>${xml(p.slug)}</g:id>`,
				`<title>${xml(seoTitle(p).slice(0, 150))}</title>`,
				`<description>${xml(desc)}</description>`,
				`<link>${xml(abs(origin, `/market/producto/${p.slug}`))}</link>`,
				`<g:image_link>${xml(abs(origin, p.images[0]!.src))}</g:image_link>`,
				...extra,
				"<g:availability>in_stock</g:availability>",
				`<g:price>${money(hasSale ? p.compare_at_cents! : p.price_cents, p.currency)}</g:price>`,
				hasSale ? `<g:sale_price>${money(p.price_cents, p.currency)}</g:sale_price>` : "",
				"<g:condition>new</g:condition>",
				"<g:brand>Tony Ciencia</g:brand>",
				"<g:identifier_exists>no</g:identifier_exists>",
				"<g:google_product_category>Software &gt; Computer Software</g:google_product_category>",
				`<g:product_type>${xml(`Productos digitales > ${categoryLabel(p.category) ?? "Herramientas de IA"}`)}</g:product_type>`,
				"<g:shipping><g:country>US</g:country><g:service>Descarga digital</g:service><g:price>0 USD</g:price></g:shipping>",
				...p.tags.slice(0, 5).map((t, i) => `<g:custom_label_${i}>${xml(t.slice(0, 100))}</g:custom_label_${i}>`),
				"</item>",
			]
				.filter(Boolean)
				.join("\n");
		});
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
		"<channel>",
		"<title>Market Tony — Tony Ciencia</title>",
		`<link>${xml(abs(origin, "/market"))}</link>`,
		"<description>Herramientas de IA en español: agentes, skills y plantillas.</description>",
		...items,
		"</channel>",
		"</rss>",
	].join("\n");
}

export function sitemapXml(origin: string, products: ShopProduct[], legal: string[]): string {
	const urls: Array<{ loc: string; lastmod?: number; image?: Array<{ src: string; alt: string }> }> = [
		{ loc: "/market" },
		{ loc: "/market/agentes-para-empresas" },
		...products.map((p) => ({ loc: `/market/producto/${p.slug}`, lastmod: p.updated_at, image: p.images.slice(0, 5) })),
		...legal.map((k) => ({ loc: `/market/legal/${k}` })),
	];
	const body = urls.map((u) =>
		[
			"<url>",
			`<loc>${xml(abs(origin, u.loc))}</loc>`,
			u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : "",
			...(u.image ?? []).map((i) => `<image:image><image:loc>${xml(abs(origin, i.src))}</image:loc></image:image>`),
			"</url>",
		]
			.filter(Boolean)
			.join(""),
	);
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
		...body,
		"</urlset>",
	].join("\n");
}
