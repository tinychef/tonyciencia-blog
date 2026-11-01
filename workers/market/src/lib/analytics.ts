/**
 * Eventos de comercio electrónico de GA4 para el dataLayer de Google Tag Manager.
 *
 * La vista los escribe como datos en <script type="application/json" data-dl> (src/views/layout.tsx) y
 * public/market/static/market.js los empuja al dataLayer: view_item_list (catálogo), view_item (ficha),
 * begin_checkout (al enviar el formulario de compra, con los datos de view_item) y purchase («¡Gracias por tu compra!»,
 * una sola vez por pedido). Sin GTM (GTM_ID vacío) el dataLayer no envía nada a ningún lado.
 *
 * Formato: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 * - item_id = slug (el mismo g:id del feed de Merchant, para remarketing dinámico).
 * - price = precio unitario YA descontado; discount = descuento unitario (oferta real o cupón).
 * - item_name y item_category salen siempre en español, para que los informes no partan un producto en dos idiomas.
 */
import type { OrderRow, Product } from "../services/repo";
import { categoryLabel, shortName } from "./catalog";
import { fromPriceCents, saleInfo } from "./pricing";

export interface GaItem {
	item_id: string;
	item_name: string;
	item_brand: string;
	item_category?: string;
	price: number;
	discount?: number;
	quantity: number;
	index?: number;
	item_list_id?: string;
	item_list_name?: string;
}

export interface DataLayerEvent {
	event: "view_item_list" | "view_item" | "purchase";
	ecommerce: Record<string, unknown>;
}

export const GA_BRAND = "Tony Ciencia";
export const GA_LIST = { item_list_id: "catalogo", item_list_name: "Catálogo Market Tony" } as const;

/** Centavos → dólares con 2 decimales exactos (número, como pide GA4). */
const dollars = (cents: number) => Math.round(cents) / 100;

type ItemSource = Pick<Product, "slug" | "title" | "category" | "kind" | "price_cents" | "compare_at_cents" | "price_mode" | "min_price_cents" | "max_price_cents" | "availability">;

/** Un producto como ítem de GA4, con su precio «desde» (el mismo del JSON-LD y del feed). */
export function gaItem(p: ItemSource, extra: Partial<GaItem> = {}): GaItem {
	const sale = p.availability === "available" ? saleInfo(p) : null;
	const category = categoryLabel(p.category);
	return {
		item_id: p.slug,
		item_name: shortName(p.title),
		item_brand: GA_BRAND,
		...(category ? { item_category: category } : {}),
		price: dollars(fromPriceCents(p)),
		...(sale ? { discount: dollars(sale.saveCents) } : {}),
		quantity: 1,
		...extra,
	};
}

/** Catálogo: los productos que se ven al cargar, en el orden de la página. */
export function viewItemListEvent(products: ItemSource[]): DataLayerEvent {
	return {
		event: "view_item_list",
		ecommerce: { ...GA_LIST, items: products.map((p, index) => gaItem(p, { index, ...GA_LIST })) },
	};
}

/** Ficha. market.js reutiliza estos datos para begin_checkout (con el monto elegido en «paga lo que quieras»). */
export function viewItemEvent(p: ItemSource & Pick<Product, "currency">): DataLayerEvent {
	const item = gaItem(p);
	return { event: "view_item", ecommerce: { currency: p.currency.toUpperCase(), value: item.price, items: [item] } };
}

/**
 * Compra confirmada. value = lo realmente cobrado (con cupón, menos que el precio del pedido); el precio del ítem es
 * ese mismo monto y el descuento del cupón va en `discount`.
 */
export function purchaseEvent(order: Pick<OrderRow, "id" | "amount_cents" | "currency" | "note">, p: Pick<Product, "slug" | "title" | "category">): DataLayerEvent {
	const charged = chargedCents(order);
	const category = categoryLabel(p.category);
	const item: GaItem = {
		item_id: p.slug,
		item_name: shortName(p.title),
		item_brand: GA_BRAND,
		...(category ? { item_category: category } : {}),
		price: dollars(charged),
		...(charged < order.amount_cents ? { discount: dollars(order.amount_cents - charged) } : {}),
		quantity: 1,
	};
	return {
		event: "purchase",
		ecommerce: { transaction_id: order.id, currency: order.currency.toUpperCase(), value: dollars(charged), items: [item] },
	};
}

/**
 * Monto cobrado de un pedido. Con cupón, el webhook guarda en la nota «Cupón aplicado: cobrado X de Y USD»
 * (src/services/orders.ts) y `amount_cents` sigue siendo el precio de lista; sin esa nota, es `amount_cents`.
 */
export function chargedCents(order: Pick<OrderRow, "amount_cents" | "note">): number {
	const m = order.note?.match(/^Cupón aplicado: cobrado (\d+)\.(\d{2}) de \d+\.\d{2} /);
	if (!m) return order.amount_cents;
	const cents = Number.parseInt(m[1]!, 10) * 100 + Number.parseInt(m[2]!, 10);
	return cents <= order.amount_cents ? cents : order.amount_cents;
}
