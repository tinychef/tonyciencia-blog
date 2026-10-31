/**
 * Interfaces de toda dependencia externa. Cada una tiene una implementación `mock`
 * (MODE=mock, sin claves) y una `live`. Las rutas solo conocen estas interfaces.
 */

// ── Login ────────────────────────────────────────────────────────────

export interface AuthIdentity {
	email: string;
	name: string;
}

/** Datos que viajan firmados en la cookie de estado entre el inicio y el callback. */
export interface LoginState {
	state: string;
	nonce: string;
	verifier: string;
	next: string;
}

export interface AuthProvider {
	readonly name: "dev" | "google";
	/** URL a la que se manda el navegador para iniciar sesión. */
	authorizationUrl(login: LoginState, redirectUri: string): Promise<string>;
	/** Canjea el `code` del callback por una identidad verificada. */
	exchangeCode(code: string, login: LoginState, redirectUri: string): Promise<AuthIdentity>;
}

export class AuthError extends Error {
	constructor(
		message: string,
		readonly userMessage = "No pudimos completar el inicio de sesión. Inténtalo de nuevo.",
	) {
		super(message);
	}
}

// ── Pagos ────────────────────────────────────────────────────────────

export interface CheckoutRequest {
	orderId: string;
	productId: string;
	productTitle: string;
	/** Siempre leído de la base de datos en el servidor. */
	amountCents: number;
	currency: string;
	customerEmail: string;
	successUrl: string;
	cancelUrl: string;
	/** Código promocional YA validado por `resolvePromotionCode` (id del proveedor). Opcional. */
	promotionCodeId?: string | null;
}

export interface CheckoutSession {
	id: string;
	url: string;
}

interface SessionEventBase {
	id: string;
	sessionId: string;
	orderId: string | null;
}

export type PaymentEvent =
	| (SessionEventBase & {
			type: "checkout.completed" | "checkout.async_succeeded";
			paymentStatus: string;
			amountSubtotal: number | null;
			amountTotal: number | null;
			currency: string | null;
			paymentId: string | null;
			customerEmail: string | null;
	  })
	| (SessionEventBase & { type: "checkout.expired" | "checkout.async_failed" })
	| { id: string; type: "refunded"; paymentId: string; fullyRefunded: boolean }
	| { id: string; type: "ignored"; rawType: string };

/** Código promocional válido. El descuento solo se informa si el proveedor lo da (para mostrarlo en la tienda). */
export interface ResolvedPromotion {
	id: string;
	percentOff?: number;
	amountOffCents?: number;
}

export interface PaymentProvider {
	readonly name: "stripe" | "mock";
	createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
	/**
	 * Valida un cupón escrito por el cliente. Devuelve el id del código promocional del proveedor, o null si
	 * no existe, está inactivo o NO está habilitado para el marketplace. Sin esta función no hay cupones.
	 */
	resolvePromotionCode?(code: string): Promise<ResolvedPromotion | null>;
	/** Verifica la firma sobre el cuerpo crudo y normaliza el evento. Lanza WebhookSignatureError. */
	parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
}

export class WebhookSignatureError extends Error {}

export class PaymentProviderError extends Error {}

// ── Archivos ─────────────────────────────────────────────────────────

export interface StoredObject {
	body: ReadableStream | ArrayBuffer;
	size: number;
	contentType: string;
}

export interface FileStorage {
	readonly name: "mock" | "r2";
	put(key: string, data: ArrayBuffer | ReadableStream, opts: { contentType: string; size: number }): Promise<void>;
	get(key: string): Promise<StoredObject | null>;
	head(key: string): Promise<{ size: number; contentType: string } | null>;
	delete(key: string): Promise<void>;
	/** URL firmada y de vida corta para bajar `key` con el nombre `fileName`. */
	createDownloadUrl(key: string, fileName: string, ttlSeconds: number): Promise<string>;
}

// ── Correo ───────────────────────────────────────────────────────────

export interface OutgoingEmail {
	to: string;
	from: string;
	replyTo: string | null;
	subject: string;
	html: string;
	text: string;
	/** Id estable del mensaje lógico (fila de email_outbox). */
	idempotencyKey: string;
}

export interface EmailSender {
	readonly name: "cloudflare" | "resend" | "mock";
	send(msg: OutgoingEmail): Promise<{ messageId: string | null }>;
	/** ¿El proveedor deduplica por idempotencyKey? Si no, un envío interrumpido no se reintenta solo. */
	readonly idempotent: boolean;
}

export class EmailSendError extends Error {
	constructor(
		message: string,
		readonly code: string,
		readonly retryable: boolean,
	) {
		super(message);
	}
}
