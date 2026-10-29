import type { Env } from "./env";

export type Mode = "mock" | "live";
export type EmailProviderName = "cloudflare" | "resend" | "mock";

export const BASE_PATH = "/market";

/** Dominios donde jamás puede correr la maqueta. */
const PRODUCTION_DOMAIN = "tonyciencia.com";

/**
 * Secretos solo para la maqueta. Son públicos a propósito (están en el repo):
 * nada firmado con ellos vale fuera de MODE=mock, y la guardia impide mock en producción.
 */
export const MOCK_SESSION_SECRET = "maqueta-no-usar-en-produccion-0123456789abcdef";
export const MOCK_WEBHOOK_SECRET = "whsec_maqueta_no_es_un_secreto_real";

export interface Config {
	mode: Mode;
	/** Origen público, p. ej. https://tonyciencia.com (sin barra final). */
	origin: string;
	siteHostname: string;
	paymentProvider: "stripe";
	emailProvider: EmailProviderName;
	emailFallback: "resend" | "none";
	emailFrom: string;
	emailReplyTo: string | null;
	stripeTaxEnabled: boolean;
	stripeTaxCode: string | null;
	allowLivePayments: boolean;
	downloadUrlTtlSeconds: number;
	emailLinkTtlDays: number;
	sessionSecret: string;
	adminEmail: string;
	adminCopyEmail: string;
	stripeSecretKey: string | null;
	webhookSecret: string;
	googleClientId: string | null;
	googleClientSecret: string | null;
	resendApiKey: string | null;
	r2Presign: { accessKeyId: string; secretAccessKey: string; accountId: string; bucket: string } | null;
	productionHostnames: string[];
}

export type BootResult = { ok: true; config: Config } | { ok: false; errors: string[] };

export function isProductionHostname(hostname: string, extra: string[] = []): boolean {
	const h = hostname.toLowerCase().replace(/\.$/, "");
	if (h === PRODUCTION_DOMAIN || h.endsWith(`.${PRODUCTION_DOMAIN}`)) return true;
	return extra.includes(h);
}

function parseExtraHosts(env: Env): string[] {
	return (env.PRODUCTION_HOSTNAMES ?? "")
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
}

function intVar(raw: string | undefined, fallback: number, min: number, max: number): number {
	const n = Number.parseInt(raw ?? "", 10);
	if (!Number.isFinite(n)) return fallback;
	return Math.min(max, Math.max(min, n));
}

const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;

/**
 * Comprobación de "mock en producción" que se puede hacer sin petición (solo con el entorno).
 * La usa el arranque del Worker (src/index.ts) para negarse a cargar.
 */
export function mockInProductionError(env: Partial<Env>): string | null {
	if ((env.MODE ?? "").trim().toLowerCase() !== "mock") return null;
	const extra = parseExtraHosts(env as Env);
	let host = "";
	try {
		host = new URL(env.SITE_URL ?? "").hostname;
	} catch {
		return null;
	}
	if (isProductionHostname(host, extra)) {
		return `MODE=mock con SITE_URL de producción (${host}). Un login falso o un pago simulado en producción sería un hueco grave: el market no arranca.`;
	}
	return null;
}

/** Valida el entorno completo. En live falla cerrado si falta cualquier pieza. */
export function loadConfig(env: Env): BootResult {
	const errors: string[] = [];
	const modeRaw = (env.MODE ?? "").trim().toLowerCase();
	if (modeRaw !== "mock" && modeRaw !== "live") {
		errors.push(`MODE debe ser "mock" o "live" (recibido: "${env.MODE ?? ""}").`);
		return { ok: false, errors };
	}
	const mode: Mode = modeRaw;
	const productionHostnames = parseExtraHosts(env);

	let origin = "";
	let siteHostname = "";
	try {
		const u = new URL(env.SITE_URL ?? "");
		origin = u.origin;
		siteHostname = u.hostname;
	} catch {
		errors.push("SITE_URL no es una URL válida.");
	}

	const prodErr = mockInProductionError(env);
	if (prodErr) errors.push(prodErr);

	if (!env.MARKET_DB) errors.push("Falta el binding D1 MARKET_DB.");

	const emailProviderRaw = (env.EMAIL_PROVIDER ?? (mode === "mock" ? "mock" : "")).trim().toLowerCase();
	const emailProvider = (["cloudflare", "resend", "mock"] as const).find((p) => p === emailProviderRaw);
	if (!emailProvider) errors.push(`EMAIL_PROVIDER debe ser cloudflare | resend | mock (recibido: "${env.EMAIL_PROVIDER ?? ""}").`);

	const fallbackRaw = (env.EMAIL_FALLBACK_PROVIDER ?? "none").trim().toLowerCase();
	const emailFallback = fallbackRaw === "resend" ? "resend" : "none";

	const paymentProvider = (env.PAYMENT_PROVIDER ?? "stripe").trim().toLowerCase();
	if (paymentProvider !== "stripe") errors.push(`PAYMENT_PROVIDER "${paymentProvider}" no está implementado (solo "stripe").`);

	const sessionSecret = mode === "mock" ? env.SESSION_SECRET || MOCK_SESSION_SECRET : env.SESSION_SECRET ?? "";
	const adminEmail = (env.ADMIN_EMAIL ?? (mode === "mock" ? "admin@maqueta.test" : "")).trim().toLowerCase();
	const adminCopyEmail = (env.ADMIN_COPY_EMAIL ?? (mode === "mock" ? "copia-admin@maqueta.test" : "")).trim().toLowerCase();
	const emailFrom = (env.EMAIL_FROM ?? "").trim() || "Tony Ciencia <market@tonyciencia.com>";

	if (!EMAIL_RE.test(adminEmail)) errors.push("ADMIN_EMAIL falta o no es un correo válido.");
	if (!EMAIL_RE.test(adminCopyEmail)) errors.push("ADMIN_COPY_EMAIL falta o no es un correo válido.");

	const stripeSecretKey = env.STRIPE_SECRET_KEY?.trim() || null;
	const allowLivePayments = env.ALLOW_LIVE_PAYMENTS === "true";

	if (mode === "live") {
		if (!origin.startsWith("https://")) errors.push("En live, SITE_URL debe usar https.");
		if (sessionSecret.length < 32) errors.push("SESSION_SECRET falta o tiene menos de 32 caracteres.");
		if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) errors.push("Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.");
		if (!stripeSecretKey || !/^(sk|rk)_(test|live)_/.test(stripeSecretKey)) {
			errors.push("STRIPE_SECRET_KEY falta o no parece una clave de Stripe (sk_test_… / sk_live_…).");
		}
		if (!env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) errors.push("STRIPE_WEBHOOK_SECRET falta o no empieza por whsec_.");
		if (stripeSecretKey && /^(sk|rk)_live_/.test(stripeSecretKey) && !allowLivePayments) {
			errors.push("Clave de Stripe en modo LIVE (cobros reales) sin ALLOW_LIVE_PAYMENTS=true.");
		}
		if (emailProvider === "mock") errors.push("EMAIL_PROVIDER=mock no está permitido en live.");
		if (emailProvider === "cloudflare" && !env.EMAIL) errors.push("EMAIL_PROVIDER=cloudflare requiere el binding send_email EMAIL.");
		if ((emailProvider === "resend" || emailFallback === "resend") && !env.RESEND_API_KEY) {
			errors.push("Resend configurado (principal o respaldo) pero falta RESEND_API_KEY.");
		}
		if (!env.MARKET_FILES) errors.push("Falta el binding R2 MARKET_FILES.");
	}

	if (errors.length > 0 || !emailProvider) return { ok: false, errors };

	const presignParts = [env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY, env.R2_ACCOUNT_ID, env.R2_BUCKET_NAME];
	const r2Presign = presignParts.every(Boolean)
		? {
				accessKeyId: env.R2_ACCESS_KEY_ID!,
				secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
				accountId: env.R2_ACCOUNT_ID!,
				bucket: env.R2_BUCKET_NAME!,
			}
		: null;

	return {
		ok: true,
		config: {
			mode,
			origin,
			siteHostname,
			paymentProvider: "stripe",
			emailProvider,
			emailFallback,
			emailFrom,
			emailReplyTo: env.EMAIL_REPLY_TO?.trim() || null,
			stripeTaxEnabled: env.STRIPE_TAX_ENABLED === "true",
			stripeTaxCode: env.STRIPE_TAX_CODE?.trim() || null,
			allowLivePayments,
			downloadUrlTtlSeconds: intVar(env.DOWNLOAD_URL_TTL_SECONDS, 300, 30, 3600),
			emailLinkTtlDays: intVar(env.EMAIL_LINK_TTL_DAYS, 14, 1, 90),
			sessionSecret,
			adminEmail,
			adminCopyEmail,
			stripeSecretKey: mode === "live" ? stripeSecretKey : null,
			// En mock nunca se usa un secreto real: los eventos simulados se firman con uno público.
			webhookSecret: mode === "live" ? env.STRIPE_WEBHOOK_SECRET! : MOCK_WEBHOOK_SECRET,
			googleClientId: env.GOOGLE_CLIENT_ID ?? null,
			googleClientSecret: env.GOOGLE_CLIENT_SECRET ?? null,
			resendApiKey: env.RESEND_API_KEY ?? null,
			r2Presign: mode === "live" ? r2Presign : null,
			productionHostnames,
		},
	};
}

/** Comprobación por petición: la maqueta se niega a responder si el Host es de producción. */
export function requestHostError(config: Config, url: URL): string | null {
	if (config.mode === "mock" && isProductionHostname(url.hostname, config.productionHostnames)) {
		return `MODE=mock atendiendo un dominio de producción (${url.hostname}). El market no arranca.`;
	}
	return null;
}
