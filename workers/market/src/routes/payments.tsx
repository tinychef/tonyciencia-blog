import type { Hono } from "hono";
import { MockPaymentProvider } from "../adapters/payments/mock";
import { WebhookSignatureError } from "../adapters/types";
import { clientIp, deps, type AppEnv, type Ctx } from "../context";
import { hit, RATE_RULES } from "../lib/ratelimit";
import { checkCsrf } from "../lib/session";
import { isId } from "../lib/validate";
import { handlePaymentEvent } from "../services/orders";
import { getOrder } from "../services/repo";
import { MockPayPage, PaymentStatusPage } from "../views/account";
import { render, renderMessage } from "../views/render";
import { dispatchQuietly, loginRedirect } from "./shop";

const MAX_WEBHOOK_BYTES = 512 * 1024;

export function registerPayments(app: Hono<AppEnv>) {
	/**
	 * Webhook de pagos — ÚNICO punto de entrada de confirmaciones, en mock y en live.
	 * URL a configurar en Stripe: <SITE_URL>/market/webhooks/pagos
	 * Eventos: checkout.session.completed, checkout.session.async_payment_succeeded,
	 *          checkout.session.async_payment_failed, checkout.session.expired, charge.refunded
	 */
	app.post("/market/webhooks/pagos", async (c) => {
		const declared = Number.parseInt(c.req.header("content-length") ?? "0", 10);
		if (declared > MAX_WEBHOOK_BYTES) return c.json({ error: "payload demasiado grande" }, 413);
		const raw = await c.req.text();
		if (raw.length > MAX_WEBHOOK_BYTES) return c.json({ error: "payload demasiado grande" }, 413);
		const d = deps(c);
		let event;
		try {
			event = await d.adapters.payments.parseWebhook(raw, c.req.raw.headers);
		} catch (err) {
			if (err instanceof WebhookSignatureError) {
				console.warn(`[webhook] rechazado: ${err.message}`);
				return c.json({ error: "firma inválida" }, 400);
			}
			throw err;
		}
		// Si esto lanza, respondemos 500 y Stripe reintenta; el evento queda sin processed_at.
		const outcome = await handlePaymentEvent(d, event);
		if (outcome.status === "processed" && outcome.orderId) c.executionCtx.waitUntil(dispatchQuietly(d, outcome.orderId));
		return c.json({ received: true, duplicate: outcome.status === "duplicate", result: outcome.result });
	});

	app.get("/market/pago/exito", async (c) => {
		const user = c.get("user");
		const id = c.req.query("pedido");
		if (!user) return loginRedirect(c, `/market/pago/exito?pedido=${id ?? ""}`);
		const order = isId(id) ? await getOrder(c.env.MARKET_DB, id) : null;
		if (!order || order.user_id !== user.id) return renderMessage(c, 404, "Pedido no encontrado", "Revisa Mis compras.", { href: "/market/mis-compras", label: "Ir a Mis compras" });
		const product = await c.env.MARKET_DB.prepare("SELECT title FROM products WHERE id = ?1").bind(order.product_id).first<{ title: string }>();
		return render(
			c,
			{ title: "Estado del pago", path: "/market/pago/exito", noindex: true, refreshSeconds: order.status === "pending" ? 3 : undefined },
			<PaymentStatusPage order={order} productTitle={product?.title ?? "tu producto"} />,
		);
	});

	app.get("/market/pago/cancelado", async (c) => {
		const id = c.req.query("pedido");
		const order = isId(id) ? await getOrder(c.env.MARKET_DB, id) : null;
		const product = order
			? await c.env.MARKET_DB.prepare("SELECT slug FROM products WHERE id = ?1").bind(order.product_id).first<{ slug: string }>()
			: null;
		return renderMessage(c, 200, "Pago cancelado", "No se realizó ningún cobro. Puedes volver a intentarlo cuando quieras.", {
			href: product ? `/market/producto/${product.slug}` : "/market",
			label: "Volver al producto",
		});
	});

	// ── Checkout de MAQUETA (404 en live) ──────────────────────────────

	app.get("/market/maqueta/pago/:id", async (c) => {
		const payments = c.get("adapters").payments;
		if (!(payments instanceof MockPaymentProvider)) return c.notFound();
		const user = c.get("user");
		if (!user) return loginRedirect(c, "/market/mis-compras");
		const session = await payments.getSession(c.req.param("id"));
		const order = session ? await getOrder(c.env.MARKET_DB, session.order_id) : null;
		if (!session || !order || order.user_id !== user.id) return renderMessage(c, 404, "Sesión de pago no encontrada", "Vuelve al catálogo.");
		return render(c, { title: "Pago simulado", path: "/market/maqueta/pago", noindex: true }, <MockPayPage session={session} csrf={c.get("csrf")} />);
	});

	app.post("/market/maqueta/pago/:id", async (c) => {
		const payments = c.get("adapters").payments;
		if (!(payments instanceof MockPaymentProvider)) return c.notFound();
		const form = await c.req.formData().catch(() => null);
		if (!(await checkCsrf(c, form))) return renderMessage(c, 403, "Solicitud no válida", "Recarga la página e inténtalo de nuevo.");
		const user = c.get("user");
		if (!user) return loginRedirect(c, "/market/mis-compras");
		if (!(await hit(c.env.MARKET_DB, RATE_RULES.mockPay, clientIp(c)))) return renderMessage(c, 429, "Demasiados intentos", "Espera un momento.");
		const session = await payments.getSession(c.req.param("id"));
		const order = session ? await getOrder(c.env.MARKET_DB, session.order_id) : null;
		if (!session || !order || order.user_id !== user.id) return renderMessage(c, 404, "Sesión de pago no encontrada", "Vuelve al catálogo.");
		if (session.status !== "open") return c.redirect(`/market/maqueta/pago/${session.id}`, 303);
		const outcome = form?.get("resultado") === "expired" ? "expired" : "paid";

		const rawBody = payments.buildEvent(session, outcome);
		const res = await deliverToWebhook(app, c, rawBody, await payments.signEvent(rawBody));
		if (!res.ok) return renderMessage(c, 502, "El webhook rechazó el evento simulado", `Respuesta ${res.status}. Revisa los logs.`);
		await payments.markSession(session.id, outcome === "paid" ? "complete" : "expired", rawBody);
		return c.redirect(outcome === "paid" ? session.success_url : session.cancel_url, 303);
	});

	/** Reenvía el MISMO evento (mismo id) para comprobar a mano que el webhook es idempotente. */
	app.post("/market/maqueta/pago/:id/repetir", async (c) => {
		const payments = c.get("adapters").payments;
		if (!(payments instanceof MockPaymentProvider)) return c.notFound();
		const form = await c.req.formData().catch(() => null);
		if (!(await checkCsrf(c, form))) return renderMessage(c, 403, "Solicitud no válida", "Recarga la página e inténtalo de nuevo.");
		const user = c.get("user");
		if (!user) return loginRedirect(c, "/market/mis-compras");
		const session = await payments.getSession(c.req.param("id"));
		const order = session ? await getOrder(c.env.MARKET_DB, session.order_id) : null;
		if (!session?.last_event || !order || order.user_id !== user.id) return renderMessage(c, 404, "No hay evento para repetir", "Paga primero.");
		const res = await deliverToWebhook(app, c, session.last_event, await payments.signEvent(session.last_event));
		const body = (await res.json().catch(() => ({}))) as { duplicate?: boolean; result?: string };
		return renderMessage(
			c,
			200,
			body.duplicate ? "Evento repetido ignorado (idempotente)" : "Evento reenviado",
			body.duplicate
				? "El webhook reconoció el evento como ya procesado: no se creó otro pedido, otro acceso ni otro correo."
				: `Resultado: ${body.result ?? res.status}`,
			{ href: `/market/maqueta/pago/${session.id}`, label: "Volver al pago simulado" },
		);
	});
}

/** Entrega el evento simulado al mismo endpoint (y por tanto al mismo código) que usa Stripe. */
function deliverToWebhook(app: Hono<AppEnv>, c: Ctx, rawBody: string, signature: string) {
	const req = new Request(new URL("/market/webhooks/pagos", c.get("config").origin), {
		method: "POST",
		headers: { "content-type": "application/json", "stripe-signature": signature },
		body: rawBody,
	});
	return app.fetch(req, c.env, c.executionCtx);
}
