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

const ENSURE_OK_TTL_MS = 6 * 60 * 60_000;
let lastEnsureOk = 0;

/**
 * Cron: si WELCOME_COUPON_AUTOCREATE=true, se asegura de que el cupón de bienvenida exista en el proveedor
 * (Stripe: cupón de `welcomePercent` %, duración "once", código WELCOME_COUPON, ambos con metadata market=true).
 * Idempotente y barato: tras un resultado correcto no vuelve a consultar en 6 horas (por isolate).
 */
export async function ensureWelcomeCoupon(config: Config, adapters: Adapters, now = Date.now(), db?: D1Database): Promise<string> {
	if (!config.welcomeAutocreate || !config.welcomeCoupon || !adapters.payments.ensureWelcomePromotion) return "omitido";
	if (now - lastEnsureOk < ENSURE_OK_TTL_MS) return "reciente";
	const r = await adapters.payments.ensureWelcomePromotion(config.welcomeCoupon, config.welcomePercent);
	// Diagnóstico público en /market/estado.json: solo el estado y una pista genérica (nunca el mensaje crudo del proveedor).
	if (db) {
		const hint =
			"detail" in r
				? /permission|not have the required|restricted/i.test(r.detail)
					? "la clave de Stripe no tiene permiso para crear cupones o códigos promocionales"
					: r.status === "conflict"
						? "ya existe un código activo con ese nombre y otro descuento"
						: "error del proveedor (ver logs del Worker)"
				: null;
		await db
			.prepare(
				"INSERT INTO market_state (key, value, updated_at) VALUES ('welcome_setup', ?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
			)
			.bind(JSON.stringify({ status: r.status, hint }), now)
			.run()
			.catch(() => undefined);
	}
	if ("promotionCodeId" in r) {
		lastEnsureOk = now;
		if (r.status !== "exists") {
			console.log(`[market] cupón de bienvenida ${config.welcomeCoupon}: ${r.status} (${r.promotionCodeId})`);
			cache.clear();
		}
	} else {
		console.error(`[market] cupón de bienvenida ${config.welcomeCoupon}: ${r.status} — ${r.detail}`);
	}
	return r.status;
}

/** Solo para pruebas. */
export function resetWelcomeEnsure(): void {
	lastEnsureOk = 0;
}

export async function readWelcomeSetup(db: D1Database): Promise<{ status: string; hint: string | null; at: number } | null> {
	const row = await db
		.prepare("SELECT value, updated_at FROM market_state WHERE key = 'welcome_setup'")
		.first<{ value: string; updated_at: number }>()
		.catch(() => null);
	if (!row) return null;
	try {
		return { ...(JSON.parse(row.value) as { status: string; hint: string | null }), at: row.updated_at };
	} catch {
		return null;
	}
}
