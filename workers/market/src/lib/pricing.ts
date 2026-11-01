/**
 * Modos de precio del market (tipo Gumroad).
 *
 *  - fixed: precio fijo (`price_cents`). Puede tener un precio anterior REAL tachado (`compare_at_cents`) → OFERTA.
 *  - pwyw:  "paga lo que quieras". El comprador escribe el monto; `price_cents` es el precio SUGERIDO.
 *           `min_price_cents` puede ser 0 (se puede descargar gratis) o ≥ 0.50; `max_price_cents` ≤ tope de Stripe.
 *  - free:  producto gratis (`kind = 'free'`, precio 0).
 *
 * Límites reales de Stripe (USD): cobro mínimo 0.50 y máximo 999,999.99 (8 dígitos en centavos).
 * Un monto de 0 nunca pasa por Stripe: se entrega por el mismo flujo de los productos gratis.
 * Las redes de tarjetas o el banco del comprador pueden rechazar montos altos aunque Stripe los acepte.
 */
import type { Product } from "../services/repo";

/** Cobro mínimo de Stripe en USD (centavos). */
export const STRIPE_MIN_CENTS = 50;
/** Cobro máximo de Stripe en USD (centavos): 999,999.99. */
export const STRIPE_MAX_CENTS = 99_999_999;

export type PriceMode = "fixed" | "pwyw";

type Priced = Pick<Product, "kind" | "price_cents" | "compare_at_cents" | "price_mode" | "min_price_cents" | "max_price_cents" | "availability">;

export const isPwyw = (p: Pick<Product, "kind" | "price_mode">): boolean => p.kind === "paid" && p.price_mode === "pwyw";

/** ¿Se puede obtener gratis (producto gratis o "paga lo que quieras" con mínimo 0)? */
export const canBeFree = (p: Pick<Product, "kind" | "price_mode" | "min_price_cents">): boolean =>
	p.kind === "free" || (isPwyw(p) && p.min_price_cents === 0);

export function pwywBounds(p: Pick<Product, "min_price_cents" | "max_price_cents">): { min: number; max: number } {
	const max = p.max_price_cents && p.max_price_cents > 0 ? Math.min(p.max_price_cents, STRIPE_MAX_CENTS) : STRIPE_MAX_CENTS;
	return { min: Math.max(0, p.min_price_cents), max };
}

/** Oferta real: hay un precio anterior mayor al actual (solo precio fijo). */
export function saleInfo(p: Priced): { wasCents: number; saveCents: number; percent: number } | null {
	if (p.kind !== "paid" || isPwyw(p) || !p.compare_at_cents || p.compare_at_cents <= p.price_cents) return null;
	const saveCents = p.compare_at_cents - p.price_cents;
	return { wasCents: p.compare_at_cents, saveCents, percent: Math.round((saveCents / p.compare_at_cents) * 100) };
}

/**
 * Monto escrito por el comprador → centavos. Acepta "12", "12.5", "12.50", "12,50", "$ 1000", "1,000,000.00".
 * Devuelve null si no es un número válido (nunca redondea en silencio más de 2 decimales).
 */
export function parseBuyerAmount(v: unknown): number | null {
	if (typeof v !== "string") return null;
	let s = v.trim().replace(/^(us)?\$\s*/i, "").replace(/\s*(usd|us\$|\$)$/i, "").replace(/\s+/g, "");
	if (!s) return null;
	if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) s = s.replace(/,/g, ""); // 1,000,000.50
	else if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); // 1.000.000,50
	else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(",", "."); // 12,50
	if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
	const [whole, frac = ""] = s.split(".");
	const cents = Number.parseInt(whole!, 10) * 100 + Number.parseInt(frac.padEnd(2, "0") || "0", 10);
	return Number.isSafeInteger(cents) ? cents : null;
}

export type AmountCheck =
	| { ok: true; cents: number; free: boolean }
	| { ok: false; reason: "invalid" | "below_min" | "above_max" | "below_stripe_min"; min: number; max: number };

/**
 * Valida el monto de "paga lo que quieras" en el SERVIDOR. 0 solo si el mínimo es 0 (descarga gratis);
 * entre 0.01 y 0.49 no se puede cobrar con Stripe.
 */
export function checkBuyerAmount(p: Pick<Product, "min_price_cents" | "max_price_cents">, raw: unknown): AmountCheck {
	const { min, max } = pwywBounds(p);
	const cents = parseBuyerAmount(raw);
	if (cents === null) return { ok: false, reason: "invalid", min, max };
	if (cents < min) return { ok: false, reason: "below_min", min, max };
	if (cents > max) return { ok: false, reason: "above_max", min, max };
	if (cents === 0) return { ok: true, cents: 0, free: true };
	if (cents < STRIPE_MIN_CENTS) return { ok: false, reason: "below_stripe_min", min, max };
	return { ok: true, cents, free: false };
}

/** Precio "desde" para listados, feeds y datos estructurados. */
export function fromPriceCents(p: Priced): number {
	if (p.kind === "free") return 0;
	if (isPwyw(p)) return pwywBounds(p).min;
	return p.price_cents;
}
