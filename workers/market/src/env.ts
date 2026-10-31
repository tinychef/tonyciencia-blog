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
	EMAIL_LINK_TTL_DAYS?: string;
	/** Hosts extra que cuentan como producción, separados por coma. */
	PRODUCTION_HOSTNAMES?: string;
	R2_BUCKET_NAME?: string;
	/** Código de Stripe del popup "10 % en tu primera compra". El popup solo aparece si Stripe lo da por válido. */
	WELCOME_COUPON?: string;
	/** Página de reservas con pago (Google Calendar → agenda de citas con pago). Vacío = botón de contacto. */
	BOOKING_URL?: string;

	// ── Secretos ──
	STRIPE_SECRET_KEY?: string;
	STRIPE_WEBHOOK_SECRET?: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
	SESSION_SECRET?: string;
	ADMIN_EMAIL?: string;
	ADMIN_COPY_EMAIL?: string;
	RESEND_API_KEY?: string;
	/** Opcionales: solo para URLs prefirmadas S3 de R2 (ver adapters/storage/r2.ts). */
	R2_ACCESS_KEY_ID?: string;
	R2_SECRET_ACCESS_KEY?: string;
	R2_ACCOUNT_ID?: string;

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
