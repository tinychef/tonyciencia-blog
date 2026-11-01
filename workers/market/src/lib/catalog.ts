/** Categorías, etiquetas automáticas y precios derivados de la vitrina. Todo sale de datos reales de la BD. */
import type { Product, ShopProduct } from "../services/repo";

export const CATEGORIES = [
	{ slug: "anuncios", label: "Publicidad con IA" },
	{ slug: "video", label: "Video con IA" },
	{ slug: "automatizacion", label: "Automatización" },
	{ slug: "contenido", label: "Contenido y redes" },
	{ slug: "seo-web", label: "SEO y velocidad web" },
	{ slug: "diseno", label: "Diseño y creatividad" },
	{ slug: "agentes", label: "Agentes de IA" },
] as const;

export function categoryLabel(slug: string): string | null {
	return CATEGORIES.find((c) => c.slug === slug)?.label ?? null;
}

/**
 * Imágenes para Google Merchant Center: 1500×1500, sin texto promocional (las portadas sí lo tienen, por eso el feed
 * no las usa cuando hay una de estas). Viven en public/market/static/products/<slug>/. Lista EXPLÍCITA: el Worker no
 * puede mirar el disco, y test/merchant.test.ts comprueba que cada archivo listado exista de verdad.
 * El primero es la imagen principal (g:image_link); el resto, imágenes adicionales. Al crear merchant-2.jpg de un
 * producto, agrégalo aquí.
 */
export const MERCHANT_IMAGES: Readonly<Record<string, readonly string[]>> = {
	"anuncios-infinitos": ["merchant.jpg"],
	specreel: ["merchant.jpg"],
	"specreel-stick": ["merchant.jpg", "merchant-2.jpg"],
	"pagespeed-forensics": ["merchant.jpg"],
	cutpilot: ["merchant.jpg"],
	"motor-creativo-claude-code": ["merchant.jpg"],
};

/** Rutas públicas de las imágenes de Merchant de un producto (vacío si no tiene). */
export function merchantImages(slug: string): string[] {
	return (MERCHANT_IMAGES[slug] ?? []).map((f) => `/market/static/products/${slug}/${f}`);
}

/** Nombre corto del producto (antes de los dos puntos), para tarjetas, migas y analítica. */
export const shortName = (title: string) => (title.split(":")[0] ?? title).trim();

const NEW_DAYS = 45;
/** "Más vendido" solo con ventas reales suficientes para que signifique algo. */
const BESTSELLER_MIN_SALES = 3;

export interface Badge {
	label: string;
	tone: "soon" | "new" | "hot" | "plain" | "sale" | "free" | "pwyw";
}

/** Etiquetas de la tarjeta: automáticas (de datos reales) + la manual del admin. */
export function badgesFor(p: ShopProduct, maxSales: number, now = Date.now()): Badge[] {
	const out: Badge[] = [];
	if (p.availability === "coming_soon") out.push({ label: "Próximamente", tone: "soon" });
	else {
		if (p.stats.sales >= BESTSELLER_MIN_SALES && p.stats.sales === maxSales) out.push({ label: "Más vendido", tone: "hot" });
	}
	if (p.badge) out.push({ label: p.badge, tone: "plain" });
	return out;
}

/**
 * «Completa tu kit»: misma categoría primero y después el resto. Cada lista rota según la posición de la ficha en el
 * catálogo, para que todas las fichas reciban enlaces desde otras (antes las primeras del catálogo se los llevaban
 * todos y Creative Factory no recibía ninguno).
 */
export function pickRelated<T extends { id: string; category: string }>(all: T[], id: string, n = 3): T[] {
	const self = all.find((p) => p.id === id);
	const pos = Math.max(0, all.findIndex((p) => p.id === id));
	const rotate = (list: T[]) => (list.length ? [...list.slice(pos % list.length), ...list.slice(0, pos % list.length)] : list);
	const others = all.filter((p) => p.id !== id);
	const same = others.filter((p) => p.category === self?.category);
	const rest = others.filter((p) => p.category !== self?.category);
	return [...rotate(same), ...rotate(rest)].slice(0, n);
}

/** Precio con un cupón de porcentaje, redondeado como lo hace Stripe para una sola línea. */
export function priceWithPercentOff(cents: number, percentOff: number): number {
	return cents - Math.round((cents * percentOff) / 100);
}

/** Descuento real frente a un precio de referencia (solo si el admin cargó uno mayor al actual). */
export function discountPercent(p: Pick<Product, "price_cents" | "compare_at_cents">): number | null {
	if (!p.compare_at_cents || p.compare_at_cents <= p.price_cents) return null;
	return Math.round((1 - p.price_cents / p.compare_at_cents) * 100);
}

export function isBuyable(p: Pick<Product, "availability" | "active">): boolean {
	return p.active === 1 && p.availability === "available";
}

export function seoTitle(p: Pick<Product, "meta_title" | "title">): string {
	return p.meta_title || p.title;
}

export function seoDescription(p: Pick<Product, "meta_description" | "summary">): string {
	return p.meta_description || p.summary;
}

/** "4.7" — una cifra decimal, para estrellas. */
export function ratingText(avg: number): string {
	return (Math.round(avg * 10) / 10).toFixed(1);
}

export function salesText(n: number): string {
	return n === 1 ? "1 venta" : `${n.toLocaleString("es")} ventas`;
}

/** Nombre público de una reseña: "Antonio D." (nunca el correo). */
export function publicName(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "Comprador verificado";
	const first = parts[0]!.slice(0, 30);
	const last = parts.length > 1 ? ` ${parts[parts.length - 1]![0]!.toUpperCase()}.` : "";
	return first + last;
}

export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
