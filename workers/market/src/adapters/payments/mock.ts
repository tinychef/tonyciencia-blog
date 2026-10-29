import { randomToken } from "../../lib/crypto";
import type { CheckoutRequest, CheckoutSession, PaymentEvent, PaymentProvider } from "../types";
import { normalizeStripeEvent, signStripePayload, verifyStripeSignature } from "./stripe-signature";

export interface MockCheckoutRow {
	id: string;
	order_id: string;
	amount_cents: number;
	currency: string;
	customer_email: string;
	product_title: string;
	success_url: string;
	cancel_url: string;
	status: "open" | "complete" | "expired";
	last_event: string | null;
	created_at: number;
}

export type MockOutcome = "paid" | "expired";

/**
 * Pagos de MAQUETA. La sesión de "checkout" vive en D1 y su página es /market/maqueta/pago/:id.
 * Al pagar, se construye un evento con la forma exacta de Stripe, se firma con el mismo esquema
 * y se entrega al MISMO endpoint /market/webhooks/pagos que usará Stripe en live.
 */
export class MockPaymentProvider implements PaymentProvider {
	readonly name = "mock" as const;

	constructor(
		private readonly db: D1Database,
		private readonly origin: string,
		private readonly webhookSecret: string,
	) {}

	async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
		const id = `cs_mock_${randomToken(18)}`;
		await this.db
			.prepare(
				`INSERT INTO mock_checkout_sessions
				 (id, order_id, amount_cents, currency, customer_email, product_title, success_url, cancel_url, status, created_at)
				 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'open', ?9)`,
			)
			.bind(id, req.orderId, req.amountCents, req.currency, req.customerEmail, req.productTitle, req.successUrl, req.cancelUrl, Date.now())
			.run();
		return { id, url: new URL(`/market/maqueta/pago/${id}`, this.origin).toString() };
	}

	async parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent> {
		await verifyStripeSignature(this.webhookSecret, rawBody, headers.get("stripe-signature"));
		return normalizeStripeEvent(rawBody);
	}

	getSession(id: string): Promise<MockCheckoutRow | null> {
		return this.db.prepare("SELECT * FROM mock_checkout_sessions WHERE id = ?1").bind(id).first<MockCheckoutRow>();
	}

	/** Evento simulado con la misma forma que `checkout.session.completed` / `.expired` de Stripe. */
	buildEvent(session: MockCheckoutRow, outcome: MockOutcome): string {
		const now = Math.floor(Date.now() / 1000);
		const paid = outcome === "paid";
		return JSON.stringify({
			id: `evt_mock_${randomToken(18)}`,
			object: "event",
			type: paid ? "checkout.session.completed" : "checkout.session.expired",
			created: now,
			livemode: false,
			data: {
				object: {
					id: session.id,
					object: "checkout.session",
					client_reference_id: session.order_id,
					metadata: { order_id: session.order_id },
					mode: "payment",
					status: paid ? "complete" : "expired",
					payment_status: paid ? "paid" : "unpaid",
					amount_subtotal: session.amount_cents,
					amount_total: session.amount_cents,
					currency: session.currency,
					customer_details: { email: session.customer_email },
					payment_intent: paid ? `pi_mock_${session.id.slice(8)}` : null,
				},
			},
		});
	}

	signEvent(rawBody: string): Promise<string> {
		return signStripePayload(this.webhookSecret, rawBody);
	}

	async markSession(id: string, status: "complete" | "expired", lastEvent: string): Promise<void> {
		await this.db
			.prepare("UPDATE mock_checkout_sessions SET status = ?2, last_event = ?3 WHERE id = ?1")
			.bind(id, status, lastEvent)
			.run();
	}
}
