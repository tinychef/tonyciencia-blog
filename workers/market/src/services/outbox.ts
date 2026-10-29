import type { Adapters } from "../adapters";
import { EmailSendError, type EmailSender } from "../adapters/types";
import type { Config } from "../config";

/**
 * Cola de correos (tabla email_outbox).
 *
 * Garantías:
 *  - `dedupe_key` única: un correo lógico (p. ej. "copia admin del pedido X") existe una sola vez.
 *  - "lease": antes de enviar se reclama la fila con un UPDATE condicional; dos ejecuciones
 *    simultáneas (respuesta del webhook + cron) nunca envían la misma fila.
 *  - Errores se registran (last_error, consola) y se reintentan con backoff desde el cron.
 *  - Si un envío queda interrumpido a mitad (estado incierto) y el proveedor no deduplica
 *    (Cloudflare), NO se reintenta solo: queda "dead" para revisión manual. Preferimos no
 *    duplicar antes que arriesgar dos correos.
 */
export const MAX_ATTEMPTS = 6;
/** Intentos con el proveedor principal antes de pasar al de respaldo (si está configurado). */
export const PRIMARY_ATTEMPTS = 3;
const LEASE_MS = 2 * 60_000;
const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 60 * 60_000];

export interface EmailDraft {
	dedupeKey: string;
	kind: string;
	to: string;
	subject: string;
	html: string;
	text: string;
	orderId: string | null;
}

export interface OutboxRow {
	id: string;
	dedupe_key: string;
	kind: string;
	to_email: string;
	subject: string;
	html: string;
	text: string;
	status: "pending" | "sending" | "sent" | "failed" | "dead";
	provider: string | null;
	provider_message_id: string | null;
	attempts: number;
	last_error: string | null;
	next_attempt_at: number;
	locked_until: number | null;
	order_id: string | null;
	created_at: number;
	sent_at: number | null;
}

/**
 * Sentencia de inserción idempotente. `requireEntitlementId` hace que el correo solo se encole si
 * ese acceso existe (así nunca se manda un enlace a un acceso que no se llegó a crear).
 */
export function outboxInsert(db: D1Database, id: string, d: EmailDraft, requireEntitlementId: string | null, now = Date.now()): D1PreparedStatement {
	return db
		.prepare(
			`INSERT INTO email_outbox (id, dedupe_key, kind, to_email, subject, html, text, status, attempts, next_attempt_at, order_id, created_at)
			 SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', 0, ?8, ?9, ?8
			 WHERE ?10 IS NULL OR EXISTS (SELECT 1 FROM entitlements WHERE id = ?10)
			 ON CONFLICT(dedupe_key) DO NOTHING`,
		)
		.bind(id, d.dedupeKey, d.kind, d.to, d.subject, d.html, d.text, now, d.orderId, requireEntitlementId);
}

export interface DispatchDeps {
	db: D1Database;
	config: Config;
	adapters: Adapters;
}

function pickSender(deps: DispatchDeps, attempts: number, lastErrorPermanent: boolean): EmailSender {
	const fb = deps.adapters.emailFallback;
	if (fb && (attempts > PRIMARY_ATTEMPTS || lastErrorPermanent)) return fb;
	return deps.adapters.email;
}

/** Envía una fila si logra reclamarla. Devuelve el estado final de este intento. */
export async function sendOne(deps: DispatchDeps, id: string, now = Date.now()): Promise<OutboxRow["status"] | "skipped"> {
	const { db, config } = deps;
	const row = await db
		.prepare(
			`UPDATE email_outbox SET status = 'sending', locked_until = ?2, attempts = attempts + 1
			 WHERE id = ?1 AND status IN ('pending', 'failed') AND next_attempt_at <= ?3
			 RETURNING *`,
		)
		.bind(id, now + LEASE_MS, now)
		.first<OutboxRow>();
	if (!row) return "skipped";

	const lastErrorPermanent = row.last_error?.startsWith("[permanente]") ?? false;
	const sender = pickSender(deps, row.attempts, lastErrorPermanent);
	await db.prepare("UPDATE email_outbox SET provider = ?2 WHERE id = ?1").bind(id, sender.name).run();
	try {
		const res = await sender.send({
			to: row.to_email,
			from: config.emailFrom,
			replyTo: config.emailReplyTo,
			subject: row.subject,
			html: row.html,
			text: row.text,
			idempotencyKey: row.id,
		});
		await db
			.prepare(
				`UPDATE email_outbox SET status = 'sent', sent_at = ?2, provider_message_id = ?3, locked_until = NULL, last_error = NULL
				 WHERE id = ?1`,
			)
			.bind(id, Date.now(), res.messageId)
			.run();
		return "sent";
	} catch (err) {
		const permanent = err instanceof EmailSendError && !err.retryable;
		const msg = `${permanent ? "[permanente] " : ""}${err instanceof Error ? err.message : String(err)}`.slice(0, 500);
		const canFallback = !!deps.adapters.emailFallback && sender !== deps.adapters.emailFallback;
		const dead = row.attempts >= MAX_ATTEMPTS || (permanent && !canFallback);
		const delay = BACKOFF_MS[Math.min(row.attempts - 1, BACKOFF_MS.length - 1)]!;
		console.error(`[correo] fallo al enviar ${row.id} (${row.kind}) con ${sender.name}, intento ${row.attempts}: ${msg}`);
		await db
			.prepare("UPDATE email_outbox SET status = ?2, last_error = ?3, next_attempt_at = ?4, locked_until = NULL WHERE id = ?1")
			.bind(id, dead ? "dead" : "failed", msg, Date.now() + delay)
			.run();
		return dead ? "dead" : "failed";
	}
}

export async function dispatchByOrder(deps: DispatchDeps, orderId: string): Promise<void> {
	const { results } = await deps.db
		.prepare("SELECT id FROM email_outbox WHERE order_id = ?1 AND status IN ('pending', 'failed') ORDER BY created_at")
		.bind(orderId)
		.all<{ id: string }>();
	for (const r of results) await sendOne(deps, r.id);
}

/** Lo ejecuta el cron: rescata envíos interrumpidos y reintenta los vencidos. */
export async function processOutbox(deps: DispatchDeps, now = Date.now(), limit = 50): Promise<{ processed: number }> {
	const { db } = deps;
	// Envíos que quedaron "sending" con el lease vencido: el Worker murió a mitad de envío.
	const { results: stale } = await db
		.prepare("SELECT id, provider FROM email_outbox WHERE status = 'sending' AND locked_until < ?1")
		.bind(now)
		.all<{ id: string; provider: string | null }>();
	for (const s of stale) {
		const idempotentProvider = s.provider === "resend" || s.provider === "mock";
		await db
			.prepare(
				`UPDATE email_outbox SET status = ?2, locked_until = NULL, last_error = ?3, next_attempt_at = ?4
				 WHERE id = ?1 AND status = 'sending'`,
			)
			.bind(
				s.id,
				idempotentProvider ? "failed" : "dead",
				idempotentProvider
					? "Envío interrumpido; se reintenta (el proveedor deduplica)."
					: "Envío interrumpido con estado incierto. Revisa si llegó y usa «Reintentar» en el admin si no.",
				now,
			)
			.run();
		console.error(`[correo] envío interrumpido ${s.id} (${s.provider ?? "?"})`);
	}
	const { results } = await db
		.prepare("SELECT id FROM email_outbox WHERE status IN ('pending', 'failed') AND next_attempt_at <= ?1 ORDER BY next_attempt_at LIMIT ?2")
		.bind(now, limit)
		.all<{ id: string }>();
	for (const r of results) await sendOne(deps, r.id, now);
	return { processed: results.length };
}

/** Reintento manual desde el admin. */
export async function retryEmail(db: D1Database, id: string): Promise<void> {
	await db
		.prepare(
			`UPDATE email_outbox SET status = 'failed', attempts = 0, next_attempt_at = ?2, locked_until = NULL
			 WHERE id = ?1 AND status IN ('failed', 'dead')`,
		)
		.bind(id, Date.now())
		.run();
}
