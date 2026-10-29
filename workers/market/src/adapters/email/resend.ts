import { EmailSendError, type EmailSender, type OutgoingEmail } from "../types";

/**
 * Resend (respaldo) por API HTTP. Usa la cabecera Idempotency-Key, así un reintento tras un
 * corte no duplica el correo.
 *
 * ⚠ LIVE SIN PROBAR contra Resend (sin clave aquí). Probado con respuestas HTTP simuladas.
 */
export class ResendEmailSender implements EmailSender {
	readonly name = "resend" as const;
	readonly idempotent = true;

	private readonly fetchImpl: typeof fetch;

	constructor(
		private readonly apiKey: string,
		fetchImpl?: typeof fetch,
	) {
		// Envoltorio: en Workers, llamar `fetch` como método de otro objeto lanza "Illegal invocation".
		this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
	}

	async send(msg: OutgoingEmail): Promise<{ messageId: string | null }> {
		let res: Response;
		try {
			res = await this.fetchImpl("https://api.resend.com/emails", {
				method: "POST",
				headers: {
					authorization: `Bearer ${this.apiKey}`,
					"content-type": "application/json",
					"idempotency-key": msg.idempotencyKey,
				},
				body: JSON.stringify({
					from: msg.from,
					to: [msg.to],
					subject: msg.subject,
					html: msg.html,
					text: msg.text,
					...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
				}),
			});
		} catch (err) {
			throw new EmailSendError(`Resend: error de red ${String(err)}`, "NETWORK", true);
		}
		const data = (await res.json().catch(() => ({}))) as { id?: string; name?: string; message?: string };
		if (!res.ok) {
			const retryable = res.status === 429 || res.status >= 500;
			throw new EmailSendError(`Resend ${res.status}: ${data.name ?? ""} ${data.message ?? ""}`.trim(), `HTTP_${res.status}`, retryable);
		}
		return { messageId: data.id ?? null };
	}
}
