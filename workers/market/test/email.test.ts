import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { CloudflareEmailSender } from "../src/adapters/email/cloudflare";
import { MockEmailSender } from "../src/adapters/email/mock";
import { ResendEmailSender } from "../src/adapters/email/resend";
import { createAdapters } from "../src/adapters";
import { EmailSendError, type EmailSender, type OutgoingEmail } from "../src/adapters/types";
import { loadConfig } from "../src/config";
import type { Env } from "../src/env";
import { MAX_ATTEMPTS, outboxInsert, processOutbox, sendOne, type EmailDraft } from "../src/services/outbox";
import { count, createProduct, loginMock, one, postForm, uid } from "./helpers";

function deps(sender: EmailSender, fallback: EmailSender | null = null) {
	const cfg = loadConfig(env as Env);
	if (!cfg.ok) throw new Error("config");
	const adapters = createAdapters(cfg.config, env as Env);
	adapters.email = sender;
	adapters.emailFallback = fallback;
	return { db: env.MARKET_DB, config: cfg.config, adapters };
}

/** Proveedor falso que cuenta envíos y puede fallar N veces. */
class FakeSender implements EmailSender {
	sent: OutgoingEmail[] = [];
	constructor(
		readonly name: "cloudflare" | "resend" = "cloudflare",
		private failures = 0,
		private retryable = true,
		readonly idempotent = false,
	) {}
	async send(msg: OutgoingEmail) {
		if (this.failures > 0) {
			this.failures--;
			throw new EmailSendError("fallo simulado", this.retryable ? "E_INTERNAL_SERVER_ERROR" : "E_SENDER_NOT_VERIFIED", this.retryable);
		}
		this.sent.push(msg);
		return { messageId: `m_${this.sent.length}` };
	}
}

async function enqueue(kind = "purchase") {
	const id = crypto.randomUUID();
	const draft: EmailDraft = { dedupeKey: `test:${id}`, kind, to: "cliente@example.com", subject: "Asunto", html: "<p>hola</p>", text: "hola", orderId: null };
	await outboxInsert(env.MARKET_DB, id, draft, null).run();
	return id;
}

describe("copia al administrador", () => {
	it("compra: exactamente una copia aparte (no CCO) a ADMIN_COPY_EMAIL, aunque el webhook y el cron se repitan", async () => {
		const p = await createProduct();
		const s = await loginMock(`copia-${uid()}@maqueta.test`);
		await postForm(`/market/producto/${p.slug}/comprar`, s);
		const order = (await one<{ id: string; provider_session_id: string }>("SELECT o.* FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email = ?1", s.email))!;
		await postForm(`/market/maqueta/pago/${order.provider_session_id}`, s, { resultado: "paid" });
		await postForm(`/market/maqueta/pago/${order.provider_session_id}/repetir`, s);
		await postForm(`/market/maqueta/pago/${order.provider_session_id}/repetir`, s);
		const d = deps(new MockEmailSender(env.MARKET_DB));
		await processOutbox(d, Date.now() + 60 * 60_000);
		await processOutbox(d, Date.now() + 2 * 60 * 60_000);

		const mails = await env.MARKET_DB.prepare(
			"SELECT d.to_email, d.subject FROM dev_emails d JOIN email_outbox o ON o.id = d.outbox_id WHERE o.order_id = ?1",
		)
			.bind(order.id)
			.all<{ to_email: string; subject: string }>();
		const toAdmin = mails.results.filter((m) => m.to_email === "copia-admin@maqueta.test");
		const toBuyer = mails.results.filter((m) => m.to_email === s.email);
		expect(toAdmin).toHaveLength(1);
		expect(toBuyer).toHaveLength(1);
		expect(toAdmin[0]!.subject).toMatch(/^\[Copia admin\] Tu compra:/);
		// Mensajes separados: el del cliente no lleva al admin y viceversa.
		expect(mails.results).toHaveLength(2);
	});

	it("gratis: también una sola copia, aunque se pida el producto varias veces", async () => {
		const p = await createProduct({ kind: "free" });
		const s = await loginMock(`copiagratis-${uid()}@maqueta.test`);
		for (let i = 0; i < 3; i++) await postForm(`/market/producto/${p.slug}/obtener`, s);
		const n = await count(
			`SELECT COUNT(*) AS n FROM dev_emails d JOIN email_outbox o ON o.id = d.outbox_id JOIN orders r ON r.id = o.order_id JOIN users u ON u.id = r.user_id
			 WHERE u.email = ?1 AND d.to_email = 'copia-admin@maqueta.test'`,
			s.email,
		);
		expect(n).toBe(1);
	});

	it("si Cloudflare falla, se registra el error y el reintento envía la copia UNA vez", async () => {
		const id = await enqueue("purchase-admin-copy");
		const sender = new FakeSender("cloudflare", 2);
		const d = deps(sender);
		expect(await sendOne(d, id)).toBe("failed");
		const row = await one<{ status: string; attempts: number; last_error: string; next_attempt_at: number }>("SELECT * FROM email_outbox WHERE id = ?1", id);
		expect(row).toMatchObject({ status: "failed", attempts: 1 });
		expect(row!.last_error).toMatch(/fallo simulado/);
		// Antes del backoff no se reintenta.
		expect(await sendOne(d, id)).toBe("skipped");
		await processOutbox(d, row!.next_attempt_at + 1);
		await processOutbox(d, Date.now() + 24 * 3600_000);
		await processOutbox(d, Date.now() + 48 * 3600_000);
		expect(sender.sent).toHaveLength(1);
		expect((await one<{ status: string }>("SELECT status FROM email_outbox WHERE id = ?1", id))?.status).toBe("sent");
	});

	it("dos despachos simultáneos de la misma fila envían una sola vez (lease)", async () => {
		const id = await enqueue();
		const sender = new FakeSender();
		const d = deps(sender);
		const results = await Promise.all([sendOne(d, id), sendOne(d, id), sendOne(d, id)]);
		expect(results.filter((r) => r === "sent")).toHaveLength(1);
		expect(sender.sent).toHaveLength(1);
	});

	it("un envío interrumpido con Cloudflare (estado incierto) NO se reenvía solo", async () => {
		const id = await enqueue();
		await env.MARKET_DB.prepare("UPDATE email_outbox SET status = 'sending', provider = 'cloudflare', locked_until = ?2, attempts = 1 WHERE id = ?1")
			.bind(id, Date.now() - 1000)
			.run();
		const sender = new FakeSender();
		await processOutbox(deps(sender), Date.now() + 3600_000);
		expect(sender.sent).toHaveLength(0);
		expect((await one<{ status: string }>("SELECT status FROM email_outbox WHERE id = ?1", id))?.status).toBe("dead");
	});

	it("error permanente sin respaldo → dead; con Resend de respaldo → se envía por Resend una vez", async () => {
		const a = await enqueue();
		const noFallback = new FakeSender("cloudflare", 5, false);
		expect(await sendOne(deps(noFallback), a)).toBe("dead");

		const b = await enqueue();
		const primary = new FakeSender("cloudflare", 5, false);
		const backup = new FakeSender("resend", 0, true, true);
		const d = deps(primary, backup);
		expect(await sendOne(d, b)).toBe("failed");
		await processOutbox(d, Date.now() + 3600_000);
		expect(backup.sent).toHaveLength(1);
		expect(primary.sent).toHaveLength(0);
		expect((await one<{ provider: string; status: string }>("SELECT provider, status FROM email_outbox WHERE id = ?1", b))).toMatchObject({ provider: "resend", status: "sent" });
	});

	it(`deja de reintentar tras ${MAX_ATTEMPTS} intentos`, async () => {
		const id = await enqueue();
		const d = deps(new FakeSender("cloudflare", 100));
		let t = Date.now();
		for (let i = 0; i < MAX_ATTEMPTS + 3; i++) {
			t += 24 * 3600_000;
			await processOutbox(d, t);
		}
		expect((await one<{ status: string; attempts: number }>("SELECT status, attempts FROM email_outbox WHERE id = ?1", id))).toMatchObject({ status: "dead", attempts: MAX_ATTEMPTS });
	});
});

describe("adaptadores de correo live (con dobles de prueba)", () => {
	const msg: OutgoingEmail = { to: "c@example.com", from: "Tony Ciencia <market@tonyciencia.com>", replyTo: "business@tonyciencia.com", subject: "S", html: "<p>h</p>", text: "h", idempotencyKey: "k1" };

	it("Cloudflare: usa env.EMAIL.send con from/replyTo estructurados y clasifica errores", async () => {
		const calls: unknown[] = [];
		const ok = new CloudflareEmailSender({ send: async (m: unknown) => (calls.push(m), { messageId: "cf-1" }) } as unknown as SendEmail);
		expect(await ok.send(msg)).toEqual({ messageId: "cf-1" });
		expect(calls[0]).toMatchObject({ to: "c@example.com", from: { email: "market@tonyciencia.com", name: "Tony Ciencia" }, replyTo: "business@tonyciencia.com", subject: "S" });
		const failing = (code: string) =>
			new CloudflareEmailSender({ send: async () => { throw Object.assign(new Error("x"), { code }); } } as unknown as SendEmail);
		await expect(failing("E_RATE_LIMIT_EXCEEDED").send(msg)).rejects.toMatchObject({ retryable: true });
		await expect(failing("E_SENDER_NOT_VERIFIED").send(msg)).rejects.toMatchObject({ retryable: false });
	});

	it("Resend: manda Idempotency-Key y clasifica 429/5xx como reintentable", async () => {
		const seen: Request[] = [];
		const r = new ResendEmailSender("re_test", (async (u: string, init: RequestInit) => {
			seen.push(new Request(u, init));
			return Response.json({ id: "re-1" });
		}) as unknown as typeof fetch);
		expect(await r.send(msg)).toEqual({ messageId: "re-1" });
		expect(seen[0]!.headers.get("idempotency-key")).toBe("k1");
		expect(seen[0]!.headers.get("authorization")).toBe("Bearer re_test");
		expect(await seen[0]!.json()).toMatchObject({ to: ["c@example.com"], reply_to: "business@tonyciencia.com" });
		const status = (s: number) => new ResendEmailSender("re_test", (async () => Response.json({ message: "x" }, { status: s })) as unknown as typeof fetch);
		await expect(status(429).send(msg)).rejects.toMatchObject({ retryable: true });
		await expect(status(503).send(msg)).rejects.toMatchObject({ retryable: true });
		await expect(status(422).send(msg)).rejects.toMatchObject({ retryable: false });
	});
});

describe("cron", () => {
	it("el handler scheduled envía los correos pendientes", async () => {
		const { createExecutionContext, createScheduledController, waitOnExecutionContext } = await import("cloudflare:test");
		const worker = (await import("../src/index")).default;
		const id = await enqueue();
		await env.MARKET_DB.prepare("UPDATE email_outbox SET next_attempt_at = 0 WHERE id = ?1").bind(id).run();
		const ctx = createExecutionContext();
		await worker.scheduled(createScheduledController({ cron: "*/5 * * * *", scheduledTime: Date.now() }), env as Env, ctx);
		await waitOnExecutionContext(ctx);
		expect((await one<{ status: string }>("SELECT status FROM email_outbox WHERE id = ?1", id))?.status).toBe("sent");
		expect(await count("SELECT COUNT(*) AS n FROM dev_emails WHERE outbox_id = ?1", id)).toBe(1);
	});
});
