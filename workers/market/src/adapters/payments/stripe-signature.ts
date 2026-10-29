import { bytesToHex, hmacSha256, timingSafeEqualStr } from "../../lib/crypto";
import { WebhookSignatureError, type PaymentEvent } from "../types";

/**
 * Esquema de firma de webhooks de Stripe:
 *   Stripe-Signature: t=<unix>,v1=<hex(HMAC-SHA256(secret, `${t}.${cuerpo}`))>[,v1=…]
 * Lo usan TANTO el adaptador real como la maqueta (que firma sus eventos simulados con el
 * mismo esquema), así el manejador del webhook es exactamente el mismo código en ambos modos.
 */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export async function signStripePayload(secret: string, rawBody: string, timestamp = Math.floor(Date.now() / 1000)): Promise<string> {
	const sig = bytesToHex(await hmacSha256(secret, `${timestamp}.${rawBody}`));
	return `t=${timestamp},v1=${sig}`;
}

export async function verifyStripeSignature(
	secret: string,
	rawBody: string,
	header: string | null,
	nowSeconds = Math.floor(Date.now() / 1000),
): Promise<void> {
	if (!header || header.length > 2048) throw new WebhookSignatureError("Falta la cabecera Stripe-Signature");
	let timestamp: number | null = null;
	const v1: string[] = [];
	for (const part of header.split(",")) {
		const idx = part.indexOf("=");
		if (idx <= 0) continue;
		const k = part.slice(0, idx).trim();
		const v = part.slice(idx + 1).trim();
		if (k === "t" && /^\d{1,12}$/.test(v)) timestamp = Number.parseInt(v, 10);
		else if (k === "v1" && /^[0-9a-f]{64}$/.test(v)) v1.push(v);
	}
	if (timestamp === null || v1.length === 0) throw new WebhookSignatureError("Cabecera Stripe-Signature mal formada");
	if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
		throw new WebhookSignatureError("Firma fuera de la ventana de tolerancia (posible reenvío)");
	}
	const expected = bytesToHex(await hmacSha256(secret, `${timestamp}.${rawBody}`));
	let match = false;
	for (const candidate of v1) if (timingSafeEqualStr(expected, candidate)) match = true;
	if (!match) throw new WebhookSignatureError("Firma inválida");
}

type Obj = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Convierte un evento de Stripe (JSON ya verificado) al formato interno. */
export function normalizeStripeEvent(rawBody: string): PaymentEvent {
	let evt: Obj;
	try {
		evt = JSON.parse(rawBody) as Obj;
	} catch {
		throw new WebhookSignatureError("Cuerpo JSON inválido");
	}
	const id = str(evt.id);
	const type = str(evt.type);
	const obj = ((evt.data as Obj | undefined)?.object ?? null) as Obj | null;
	if (!id || !type || !obj) throw new WebhookSignatureError("Evento sin id/type/data.object");

	const sessionBase = () => {
		const sessionId = str(obj.id);
		if (!sessionId) throw new WebhookSignatureError("checkout.session sin id");
		const metadata = (obj.metadata ?? {}) as Obj;
		return { id, sessionId, orderId: str(obj.client_reference_id) ?? str(metadata.order_id) };
	};

	switch (type) {
		case "checkout.session.completed":
		case "checkout.session.async_payment_succeeded": {
			const pi = obj.payment_intent;
			return {
				...sessionBase(),
				type: type === "checkout.session.completed" ? "checkout.completed" : "checkout.async_succeeded",
				paymentStatus: str(obj.payment_status) ?? "unknown",
				amountSubtotal: num(obj.amount_subtotal),
				amountTotal: num(obj.amount_total),
				currency: str(obj.currency),
				paymentId: typeof pi === "string" ? pi : str((pi as Obj | null)?.id),
				customerEmail: str((obj.customer_details as Obj | undefined)?.email) ?? str(obj.customer_email),
			};
		}
		case "checkout.session.expired":
			return { ...sessionBase(), type: "checkout.expired" };
		case "checkout.session.async_payment_failed":
			return { ...sessionBase(), type: "checkout.async_failed" };
		case "charge.refunded": {
			const paymentId = str(obj.payment_intent);
			if (!paymentId) return { id, type: "ignored", rawType: type };
			const amount = num(obj.amount);
			const refunded = num(obj.amount_refunded);
			return { id, type: "refunded", paymentId, fullyRefunded: obj.refunded === true || (amount !== null && amount === refunded) };
		}
		default:
			return { id, type: "ignored", rawType: type };
	}
}
