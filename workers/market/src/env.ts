/**
 * Bindings y variables del Worker. Los valores sensibles llegan como secretos
 * (`wrangler secret put`) o, en local, desde `.dev.vars` — nunca desde el repositorio.
 */
export interface Env {
	// ── Variables (wrangler.jsonc → vars) ──
	MODE?: string;
	SITE_URL?: string;
	PAYMENT_PROVIDER?: string;
	EMAIL_PROVIDER?: string;
	EMAIL_FALLBACK_PROVIDER?: string;
	EMAIL_FROM?: string;
	EMAIL_REPLY_TO?: string;
	STRIPE_TAX_ENABLED?: string;
	STRIPE_TAX_CODE?: string;
	ALLOW_LIVE_PAYMENTS?: string;
	DOWNLOAD_URL_TTL_SECONDS?: string;
	/** Hosts extra que cuentan como producción, separados por coma. */
	PRODUCTION_HOSTNAMES?: string;
	/** Código de Stripe del popup "10 % en tu primera compra". El popup solo aparece si Stripe lo da por válido. */
	WELCOME_COUPON?: string;
	/** "true" = el cron crea en el proveedor de pagos el cupón de bienvenida si falta (idempotente). */
	WELCOME_COUPON_AUTOCREATE?: string;
	/** Porcentaje del cupón de bienvenida (1–100). Por defecto 10. */
	WELCOME_COUPON_PERCENT?: string;
	/** Página de reservas con pago (Google Calendar → agenda de citas con pago). Vacío = botón de contacto. */
	BOOKING_URL?: string;
	/**
	 * Contenedor de Google Tag Manager ("GTM-XXXXXXX"). Vacío = sin GTM: no se carga nada de Google y la CSP no abre
	 * sus dominios. Con valor, market.js fija Consent Mode v2 (denegado salvo cookie_consent=accepted del blog) y
	 * carga gtm.js.
	 */
	GTM_ID?: string;

	// ── Secretos ──
	STRIPE_SECRET_KEY?: string;
	STRIPE_WEBHOOK_SECRET?: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
	SESSION_SECRET?: string;
	ADMIN_EMAIL?: string;
	/** "true" = solo ADMIN_EMAIL puede iniciar sesión (staging: nadie más puede comprar con tarjetas de prueba). */
	LOGIN_ONLY_ADMIN?: string;
	ADMIN_COPY_EMAIL?: string;
	RESEND_API_KEY?: string;

	// ── Bindings ──
	MARKET_DB: D1Database;
	MARKET_FILES?: R2Bucket;
	EMAIL?: SendEmail;
	ASSETS?: Fetcher;
}

// Tipa `env` de "cloudflare:workers" y "cloudflare:test" con estos bindings.
declare global {
	namespace Cloudflare {
		interface Env extends MarketEnv {}
	}
}
type MarketEnv = Env;
