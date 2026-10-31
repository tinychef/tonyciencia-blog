/**
 * Oferta de bienvenida (popup "10 % en tu primera compra").
 * Solo se muestra si el proveedor de pagos confirma que el código existe y está habilitado para el market:
 * así el popup nunca anuncia un cupón que después falle en el checkout.
 */
import type { Adapters } from "../adapters";
import type { Config } from "../config";

export interface WelcomeOffer {
	code: string;
	/** Porcentaje real del cupón en el proveedor (null si es un monto fijo o no se informa). */
	percentOff: number | null;
	amountOffCents: number | null;
}

const OK_TTL_MS = 10 * 60_000;
const MISS_TTL_MS = 2 * 60_000;
/** La tienda nunca espera más que esto por el proveedor de pagos: sin respuesta, no hay popup. */
const RESOLVE_TIMEOUT_MS = 1500;
const cache = new Map<string, { at: number; offer: WelcomeOffer | null }>();

export async function getWelcomeOffer(config: Config, adapters: Adapters, now = Date.now()): Promise<WelcomeOffer | null> {
	const code = config.welcomeCoupon;
	if (!code || !adapters.payments.resolvePromotionCode) return null;
	const key = `${config.mode}:${code}`;
	const hit = cache.get(key);
	if (hit && now - hit.at < (hit.offer ? OK_TTL_MS : MISS_TTL_MS)) return hit.offer;
	let offer: WelcomeOffer | null = null;
	try {
		const r = await Promise.race([
			adapters.payments.resolvePromotionCode(code),
			new Promise<null>((resolve) => setTimeout(() => resolve(null), RESOLVE_TIMEOUT_MS)),
		]);
		if (r) offer = { code: code.toUpperCase(), percentOff: r.percentOff ?? null, amountOffCents: r.amountOffCents ?? null };
	} catch (err) {
		console.warn(`[market] no se pudo validar el cupón de bienvenida ${code}:`, err);
	}
	cache.set(key, { at: now, offer });
	return offer;
}

/** Solo para pruebas. */
export function clearWelcomeCache(): void {
	cache.clear();
}
