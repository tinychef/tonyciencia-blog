import type { Config } from "../config";
import type { Env } from "../env";
import { DevAuthProvider } from "./auth/dev";
import { GoogleAuthProvider } from "./auth/google";
import { CloudflareEmailSender } from "./email/cloudflare";
import { MockEmailSender } from "./email/mock";
import { ResendEmailSender } from "./email/resend";
import { MockPaymentProvider } from "./payments/mock";
import { StripePaymentProvider } from "./payments/stripe";
import { MockFileStorage } from "./storage/mock";
import { R2FileStorage } from "./storage/r2";
import type { AuthProvider, EmailSender, FileStorage, PaymentProvider } from "./types";

export interface Adapters {
	auth: AuthProvider;
	payments: PaymentProvider;
	storage: FileStorage;
	email: EmailSender;
	/** Proveedor de respaldo (solo live, si EMAIL_FALLBACK_PROVIDER=resend). */
	emailFallback: EmailSender | null;
}

/** Único lugar donde MODE decide qué implementación se usa. */
export function createAdapters(config: Config, env: Env): Adapters {
	if (config.mode === "mock") {
		return {
			auth: new DevAuthProvider(config.sessionSecret, config.origin),
			payments: new MockPaymentProvider(env.MARKET_DB, config.origin, config.webhookSecret),
			// Sin binding de R2: la maqueta no puede leer archivos reales.
			storage: new MockFileStorage(env.MARKET_DB, config.sessionSecret, config.origin),
			email: new MockEmailSender(env.MARKET_DB),
			emailFallback: null,
		};
	}
	const email =
		config.emailProvider === "cloudflare" ? new CloudflareEmailSender(env.EMAIL!) : new ResendEmailSender(config.resendApiKey!);
	return {
		auth: new GoogleAuthProvider(config.googleClientId!, config.googleClientSecret!),
		payments: new StripePaymentProvider({
			secretKey: config.stripeSecretKey!,
			webhookSecret: config.webhookSecret,
			taxEnabled: config.stripeTaxEnabled,
			taxCode: config.stripeTaxCode,
		}),
		storage: new R2FileStorage(env.MARKET_FILES!, config.sessionSecret, config.origin, config.r2Presign),
		email,
		emailFallback:
			config.emailFallback === "resend" && config.emailProvider !== "resend" ? new ResendEmailSender(config.resendApiKey!) : null,
	};
}
