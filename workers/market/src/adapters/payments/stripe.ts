import {
	PaymentProviderError,
	type CheckoutRequest,
	type CheckoutSession,
	type PaymentEvent,
	type PaymentProvider,
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
		p.set("success_url", req.successUrl);
		p.set("cancel_url", req.cancelUrl);
		p.set("line_items[0][quantity]", "1");
		p.set("line_items[0][price_data][currency]", req.currency);
		// El monto sale del pedido, que a su vez se copió de la BD. Nunca del navegador.
		p.set("line_items[0][price_data][unit_amount]", String(req.amountCents));
		p.set("line_items[0][price_data][product_data][name]", req.productTitle);
		p.set("line_items[0][price_data][product_data][metadata][product_id]", req.productId);
		if (taxCode) p.set("line_items[0][price_data][product_data][tax_code]", taxCode);
		// Impuestos: bandera apagada por defecto (decisión pendiente del dueño). No se asume nada más.
		if (taxEnabled) p.set("automatic_tax[enabled]", "true");
		p.set("metadata[order_id]", req.orderId);
		p.set("metadata[product_id]", req.productId);
		p.set("payment_intent_data[metadata][order_id]", req.orderId);
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

	async parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent> {
		await verifyStripeSignature(this.opts.webhookSecret, rawBody, headers.get("stripe-signature"));
		return normalizeStripeEvent(rawBody);
	}
}
