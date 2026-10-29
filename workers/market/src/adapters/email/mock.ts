import type { EmailSender, OutgoingEmail } from "../types";

/** Correo de MAQUETA: no sale nada; se guarda en D1 y se ve en /dev/correos. */
export class MockEmailSender implements EmailSender {
	readonly name = "mock" as const;
	readonly idempotent = true;

	constructor(private readonly db: D1Database) {}

	async send(msg: OutgoingEmail): Promise<{ messageId: string | null }> {
		const id = crypto.randomUUID();
		await this.db
			.prepare(
				`INSERT INTO dev_emails (id, outbox_id, to_email, from_email, reply_to, subject, html, text, created_at)
				 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
			)
			.bind(id, msg.idempotencyKey, msg.to, msg.from, msg.replyTo, msg.subject, msg.html, msg.text, Date.now())
			.run();
		return { messageId: `mock_${id}` };
	}
}
