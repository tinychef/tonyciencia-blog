import { EmailSendError, type EmailSender, type OutgoingEmail } from "../types";
import { parseAddress } from "./address";

/**
 * Cloudflare Email Sending (beta) vía binding `send_email` → `env.EMAIL.send({...})`.
 * Requiere plan Workers de pago para enviar a cualquier destinatario y el dominio "onboarded"
 * en Compute > Email Service > Email Sending (ver HANDOFF.md).
 *
 * ⚠ LIVE SIN PROBAR contra Cloudflare (sin cuenta aquí). Probado con un binding falso que imita
 * la API documentada (éxito → { messageId }, error → Error con `code`).
 */
const RETRYABLE = new Set(["E_RATE_LIMIT_EXCEEDED", "E_DAILY_LIMIT_EXCEEDED", "E_INTERNAL_SERVER_ERROR", "E_DELIVERY_FAILED"]);

export class CloudflareEmailSender implements EmailSender {
	readonly name = "cloudflare" as const;
	/** La API no documenta deduplicación por clave: un envío interrumpido no se reintenta solo. */
	readonly idempotent = false;

	constructor(private readonly binding: SendEmail) {}

	async send(msg: OutgoingEmail): Promise<{ messageId: string | null }> {
		try {
			const res = await this.binding.send({
				to: msg.to,
				from: parseAddress(msg.from),
				...(msg.replyTo ? { replyTo: parseAddress(msg.replyTo) } : {}),
				subject: msg.subject,
				html: msg.html,
				text: msg.text,
			});
			return { messageId: res?.messageId ?? null };
		} catch (err) {
			const code = typeof (err as { code?: unknown })?.code === "string" ? (err as { code: string }).code : "E_UNKNOWN";
			const message = err instanceof Error ? err.message : String(err);
			// Errores desconocidos (red, runtime) se tratan como transitorios.
			throw new EmailSendError(`Cloudflare Email: ${code} ${message}`, code, code === "E_UNKNOWN" || RETRYABLE.has(code));
		}
	}
}
