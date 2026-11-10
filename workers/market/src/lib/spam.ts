/**
 * Filtros de contenido para el formulario de contacto (segunda capa, detrás de Turnstile). Son conservadores a
 * propósito: un mensaje descartado no le llega al dueño y la persona cree que se envió, así que solo se cortan patrones
 * que una persona real no escribe. Firmas sacadas del ataque del 2026-11-09 (ver docs/SEGURIDAD-CONTACTO.md).
 */

/** Nombres que firman los bots que spamean el formulario (minúsculas, sin espacios). Ampliar si aparecen más. */
const BOT_NAMES = new Set(["robertgab", "richardter"]);

/** Una "palabra" sin espacios de 12+ caracteres con letras y 4+ cifras seguidas: NAERTERHTE1588468NERTHRRTH. */
const GIBBERISH_TOKEN = /(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*\d{4})[A-Za-z0-9]{12,}/;

export interface ContactFields {
	name: string;
	email: string;
	message: string;
}

/** Devuelve el motivo si el mensaje es spam evidente, o null si pasa. */
export function spamReason({ name, message }: ContactFields): string | null {
	const compactName = name.toLowerCase().replace(/\s+/g, "");
	if (BOT_NAMES.has(compactName)) return "bot-name";
	if (/\d{4,}/.test(name)) return "digits-in-name";
	const trimmed = message.trim();
	// Mensaje que es solo una "palabra" de basura (METRYTRE1588468MAVNGHJTH).
	if (!/\s/.test(trimmed) && GIBBERISH_TOKEN.test(trimmed)) return "gibberish-message";
	return null;
}

/**
 * Trampa para agentes de IA: un campo fuera de pantalla (y oculto a lectores de pantalla) cuya etiqueta le pide a un
 * asistente o agente automático que escriba algo. Una persona no lo ve; un LLM que lee el HTML suele obedecer.
 * El nombre lo comparten el blog (ContactPage.astro, EmailCapture.astro) y este Worker.
 */
export const AI_TRAP_FIELD = "agent_code";

/** Tiempo mínimo (ms) entre que se abre la página y se envía. El blog manda `elapsed`, medido en el navegador. */
export const MIN_FILL_MS = { contact: 3000, newsletter: 1500 } as const;

/**
 * Trampas de comportamiento. `elapsed` lo calcula el navegador al enviar (no depende del reloj del usuario);
 * si falta, el envío no vino de la página (un script que hace POST directo). Devuelve el motivo o null.
 */
export function trapReason(form: "contact" | "newsletter", fields: { aiTrap: unknown; elapsed: unknown }): string | null {
	if (typeof fields.aiTrap === "string" && fields.aiTrap.trim()) return "ai-trap";
	const raw = fields.elapsed;
	const ms = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,10}$/.test(raw.trim()) ? Number(raw) : NaN;
	if (!Number.isFinite(ms)) return "no-elapsed";
	if (ms < MIN_FILL_MS[form]) return "too-fast";
	return null;
}
