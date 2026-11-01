import {
	type WelcomeEnsureResult,
	PaymentProviderError,
	type CheckoutRequest,
	type CheckoutSession,
	type PaymentEvent,
	type PaymentProvider,
	type ResolvedPromotion,
} from "../types";
import { normalizeStripeEvent, verifyStripeSignature } from "./stripe-signature";

/**
 * Stripe Checkout por API REST (sin SDK, para no arrastrar dependencias de Node al Worker).
 *
 * ⚠ LIVE SIN PROBAR contra la API real de Stripe (no hay claves en este entorno). Hay pruebas
 * unitarias que verifican el cuerpo exacto enviado (precio desde la BD, idempotencia, impuestos).
 */
export interface StripeOptions {
	secretKey: string;
	webhookSecret: string;
	taxEnabled: boolean;
	taxCode: string | null;
	fetchImpl?: typeof fetch;
}

export class StripePaymentProvider implements PaymentProvider {
	readonly name = "stripe" as const;
	private readonly fetchImpl: typeof fetch;

	constructor(private readonly opts: StripeOptions) {
		// Envoltorio: en Workers, llamar `fetch` como método de otro objeto lanza "Illegal invocation".
		this.fetchImpl = opts.fetchImpl ?? ((input, init) => fetch(input, init));
	}

	/** Parámetros form-encoded de la sesión. Exportado para pruebas. */
	static buildCheckoutParams(req: CheckoutRequest, taxEnabled: boolean, taxCode: string | null): URLSearchParams {
		const p = new URLSearchParams();
		p.set("mode", "payment");
		p.set("locale", "es");
		p.set("client_reference_id", req.orderId);
		p.set("customer_email", req.customerEmail);
		// Cupones: NO se usa allow_promotion_codes (aceptaría cualquier código activo de la cuenta de Stripe,
		// incluidos los de otros negocios). El código lo valida `resolvePromotionCode` y llega aquí ya resuelto.
		// El precio base sigue saliendo de la BD; el webhook compara contra el subtotal, no contra el total.
		if (req.promotionCodeId) p.set("discounts[0][promotion_code]", req.promotionCodeId);
		p.set("success_url", req.successUrl);
		p.set("cancel_url", req.cancelUrl);
		p.set("line_items[0][quantity]", "1");
		p.set("line_items[0][price_data][currency]", req.currency);
		// El monto sale del pedido, que a su vez se copió de la BD. Nunca del navegador.
		p.set("line_items[0][price_data][unit_amount]", String(req.amountCents));
		p.set("line_items[0][price_data][product_data][name]", req.productTitle.slice(0, 250));
		if (req.productDescription) p.set("line_items[0][price_data][product_data][description]", req.productDescription.slice(0, 500));
		if (req.productImageUrl?.startsWith("https://")) p.set("line_items[0][price_data][product_data][images][0]", req.productImageUrl);
		p.set("line_items[0][price_data][product_data][metadata][product_id]", req.productId);
		if (taxCode) p.set("line_items[0][price_data][product_data][tax_code]", taxCode);
		// Impuestos: bandera apagada por defecto (decisión pendiente del dueño). No se asume nada más.
		if (taxEnabled) p.set("automatic_tax[enabled]", "true");
		p.set("metadata[order_id]", req.orderId);
		p.set("metadata[product_id]", req.productId);
		p.set("payment_intent_data[metadata][order_id]", req.orderId);
		p.set("custom_text[submit][message]", "Al pagar recibes el enlace de descarga por correo y en Mis compras de Market Tony.");
		return p;
	}

	async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
		const res = await this.fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
			method: "POST",
			headers: {
				authorization: `Bearer ${this.opts.secretKey}`,
				"content-type": "application/x-www-form-urlencoded",
				// Reintentar con el mismo pedido nunca crea dos sesiones.
				"idempotency-key": `checkout-${req.orderId}`,
			},
			body: StripePaymentProvider.buildCheckoutParams(req, this.opts.taxEnabled, this.opts.taxCode),
		});
		const data = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
		if (!res.ok || !data.id || !data.url) {
			throw new PaymentProviderError(`Stripe respondió ${res.status}: ${data.error?.message ?? "sin detalle"}`);
		}
		return { id: data.id, url: data.url };
	}

	private async stripeGet<T>(path: string): Promise<T | null> {
		const res = await this.fetchImpl(`https://api.stripe.com/v1/${path}`, {
			headers: { authorization: `Bearer ${this.opts.secretKey}` },
		});
		if (!res.ok) return null;
		return (await res.json().catch(() => null)) as T | null;
	}

	/**
	 * Un cupón solo vale en el marketplace si el cupón (o su código promocional) tiene la metadata
	 * `market=true`. La cuenta de Stripe se comparte con otros negocios: sus cupones NO deben aplicar aquí.
	 */
	async resolvePromotionCode(code: string): Promise<ResolvedPromotion | null> {
		if (!/^[A-Za-z0-9_-]{1,64}$/.test(code)) return null;
		type Promo = { id: string; active?: boolean; metadata?: Record<string, string>; coupon?: unknown; promotion?: { coupon?: unknown } };
		type Coupon = { valid?: boolean; metadata?: Record<string, string>; percent_off?: number | null; amount_off?: number | null };
		const list = await this.stripeGet<{ data?: Promo[] }>(`promotion_codes?code=${encodeURIComponent(code)}&active=true&limit=1`);
		const promo = list?.data?.[0];
		if (!promo?.id || promo.active === false) return null;
		const ref = promo.coupon ?? promo.promotion?.coupon;
		let coupon: Coupon | null = null;
		if (typeof ref === "string") coupon = await this.stripeGet<Coupon>(`coupons/${encodeURIComponent(ref)}`);
		else if (ref && typeof ref === "object") coupon = ref as Coupon;
		if (!coupon || coupon.valid === false) return null;
		const allowed = coupon.metadata?.market === "true" || promo.metadata?.market === "true";
		if (!allowed) return null;
		const out: ResolvedPromotion = { id: promo.id };
		if (typeof coupon.percent_off === "number" && coupon.percent_off > 0) out.percentOff = coupon.percent_off;
		if (typeof coupon.amount_off === "number" && coupon.amount_off > 0) out.amountOffCents = coupon.amount_off;
		return out;
	}

	/** POST form-encoded con versión de API fija (la forma de `coupon` en promotion_codes cambió en versiones nuevas). */
	private async stripePost<T>(path: string, body: URLSearchParams, idempotencyKey?: string): Promise<{ ok: boolean; status: number; data: T & { error?: { message?: string; code?: string } } }> {
		const headers: Record<string, string> = {
			authorization: `Bearer ${this.opts.secretKey}`,
			"content-type": "application/x-www-form-urlencoded",
			"stripe-version": StripePaymentProvider.PINNED_API_VERSION,
		};
		if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
		const res = await this.fetchImpl(`https://api.stripe.com/v1/${path}`, { method: "POST", headers, body });
		const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: string } };
		return { ok: res.ok, status: res.status, data };
	}

	static readonly PINNED_API_VERSION = "2024-06-20";
	/** Id fijo del cupón de bienvenida: crearlo dos veces es imposible (Stripe responde resource_already_exists). */
	static welcomeCouponId(percentOff: number): string {
		return `market-bienvenida-${percentOff}`;
	}

	/**
	 * Cupón de bienvenida del market: `percentOff` % de descuento, duración "once", con código promocional `code`.
	 * Ambos con metadata `market=true` (sin eso `resolvePromotionCode` lo rechaza). Idempotente:
	 *  - si el código ya es válido para el market → "exists";
	 *  - si existe un código activo igual con un cupón del mismo % pero sin la marca → se marca ("tagged");
	 *  - si existe un código activo igual con OTRO descuento → no se toca nada ("conflict", revisar a mano);
	 *  - si no existe → crea cupón (id fijo) + código ("created").
	 * La regla "solo primera compra" se aplica en el servidor del market (ver startCheckout), que conoce el
	 * historial de compras de cada cuenta; el código nunca se puede escribir en la página de Stripe.
	 */
	async ensureWelcomePromotion(code: string, percentOff: number): Promise<WelcomeEnsureResult> {
		if (!/^[A-Za-z0-9_-]{1,64}$/.test(code) || !(percentOff > 0 && percentOff <= 100)) return { status: "error", detail: "código o porcentaje inválido" };
		try {
			const ok = await this.resolvePromotionCode(code);
			if (ok) return { status: "exists", promotionCodeId: ok.id };

			type Promo = { id: string; active?: boolean; metadata?: Record<string, string>; coupon?: unknown; promotion?: { coupon?: unknown } };
			type Coupon = { id?: string; valid?: boolean; percent_off?: number | null; duration?: string };
			const list = await this.stripeGet<{ data?: Promo[] }>(`promotion_codes?code=${encodeURIComponent(code)}&active=true&limit=1`);
			const existing = list?.data?.[0];
			if (existing?.id) {
				const ref = existing.coupon ?? existing.promotion?.coupon;
				const coupon = typeof ref === "string" ? await this.stripeGet<Coupon>(`coupons/${encodeURIComponent(ref)}`) : ((ref as Coupon | null) ?? null);
				if (coupon?.valid !== false && coupon?.percent_off === percentOff) {
					const tag = new URLSearchParams({ "metadata[market]": "true" });
					const r = await this.stripePost<{ id?: string }>(`promotion_codes/${encodeURIComponent(existing.id)}`, tag);
					return r.ok ? { status: "tagged", promotionCodeId: existing.id } : { status: "error", detail: r.data.error?.message ?? `HTTP ${r.status}` };
				}
				return { status: "conflict", detail: `ya existe un código ${code} activo con otro descuento; no se modifica` };
			}

			const couponId = StripePaymentProvider.welcomeCouponId(percentOff);
			const c = await this.stripePost<{ id?: string }>(
				"coupons",
				new URLSearchParams({
					id: couponId,
					percent_off: String(percentOff),
					duration: "once",
					name: `Market Tony: ${percentOff} % en tu primera compra`,
					"metadata[market]": "true",
					"metadata[purpose]": "welcome-first-purchase",
				}),
			);
			if (!c.ok && c.data.error?.code !== "resource_already_exists") return { status: "error", detail: c.data.error?.message ?? `HTTP ${c.status}` };

			const pc = await this.stripePost<{ id?: string }>(
				"promotion_codes",
				new URLSearchParams({
					coupon: couponId,
					code,
					"metadata[market]": "true",
					"metadata[purpose]": "welcome-first-purchase",
				}),
				`market-welcome-promo-${code}-${couponId}`,
			);
			if (!pc.ok || !pc.data.id) return { status: "error", detail: pc.data.error?.message ?? `HTTP ${pc.status}` };
			return { status: "created", promotionCodeId: pc.data.id };
		} catch (err) {
			return { status: "error", detail: String(err).slice(0, 300) };
		}
	}

	async parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent> {
		await verifyStripeSignature(this.opts.webhookSecret, rawBody, headers.get("stripe-signature"));
		return normalizeStripeEvent(rawBody);
	}
}
