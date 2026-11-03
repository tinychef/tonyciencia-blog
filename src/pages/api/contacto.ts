/**
 * Formulario de contacto (/contacto y /en/contact).
 *
 * Antes enviaba a /_emdash/api/forms/contact, una ruta que no existe (el plugin de formularios nunca se configuró):
 * los mensajes se perdían. Ahora llegan por correo a business@tonyciencia.com con Cloudflare Email Sending, el
 * mismo servicio que usa el market (binding EMAIL en wrangler.jsonc). Responder al correo le responde a quien escribió.
 *
 * Defensas: mismo origen, campo trampa para bots, límites de longitud, sin saltos de línea en los campos que van a
 * cabeceras, y como máximo 5 envíos por IP cada 10 minutos (KV SESSION).
 */
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

const TO = "business@tonyciencia.com";
// Misma forma que el market, que ya envía en producción (workers/market/src/adapters/email/cloudflare.ts):
// remitente { email, name } del dominio verificado y respuesta como correo simple.
const FROM = { email: "market@tonyciencia.com", name: "Tony Ciencia" };
const SUBJECTS: Record<string, string> = {
	automatizacion: "Automatización con IA",
	"agentes-ia": "Agentes IA",
	mentoria: "Mentoría empresarial",
	"diagnostico-ia": "Diagnóstico de IA",
	otro: "Otro",
};
const EMAIL_RE = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[A-Za-z]{2,24}$/;

type Bindings = {
	EMAIL?: { send(msg: Record<string, unknown>): Promise<unknown> };
	SESSION?: { get(k: string): Promise<string | null>; put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void> };
};

const line = (v: FormDataEntryValue | null, max: number) =>
	typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").trim().slice(0, max) : "";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const POST: APIRoute = async ({ request, url, redirect, clientAddress }) => {
	const form = await request.formData().catch(() => null);
	const lang = form?.get("lang") === "en" ? "en" : "es";
	const back = lang === "en" ? "/en/contact" : "/contacto";
	// `codigo` (solo en errores): código corto para diagnosticar sin acceso a los logs; no incluye datos de nadie.
	const done = (state: "enviado" | "error" | "datos", codigo?: string) =>
		redirect(`${back}?${state}=1${codigo ? `&codigo=${encodeURIComponent(codigo.slice(0, 40))}` : ""}#formulario`, 303);

	// Mismo origen (los navegadores siempre mandan Origin en un POST de formulario).
	const origin = request.headers.get("origin");
	if (!form || (origin && origin !== url.origin)) return done("error", "ORIGEN");
	// Campo trampa: invisible para personas; los bots lo llenan. Se responde como si se hubiera enviado.
	if (line(form.get("website"), 200)) return done("enviado");

	const name = line(form.get("name"), 100);
	const email = line(form.get("email"), 254);
	const subjectKey = line(form.get("subject"), 40);
	const message = typeof form.get("message") === "string" ? (form.get("message") as string).trim().slice(0, 5000) : "";
	if (!name || !EMAIL_RE.test(email) || message.length < 5) return done("datos");

	const bindings = env as unknown as Bindings;
	const ip = request.headers.get("cf-connecting-ip") || clientAddress || "desconocida";
	try {
		if (bindings.SESSION) {
			const key = `contacto:${ip}`;
			const count = Number((await bindings.SESSION.get(key)) || "0");
			if (count >= 5) return done("error", "LIMITE");
			await bindings.SESSION.put(key, String(count + 1), { expirationTtl: 600 });
		}
	} catch {
		/* si KV falla, no se bloquea el envío */
	}

	if (!bindings.EMAIL) {
		console.error("[contacto] falta el binding EMAIL (send_email) en wrangler.jsonc");
		return done("error", "SIN_BINDING");
	}
	const topic = SUBJECTS[subjectKey] ?? "Sin tema";
	const text = [`Nombre: ${name}`, `Correo: ${email}`, `Tema: ${topic}`, `Idioma: ${lang}`, "", message].join("\n");
	const html = `<p><strong>Nombre:</strong> ${esc(name)}<br><strong>Correo:</strong> ${esc(email)}<br><strong>Tema:</strong> ${esc(topic)}<br><strong>Idioma:</strong> ${lang}</p><p style="white-space:pre-wrap">${esc(message)}</p>`;
	try {
		await bindings.EMAIL.send({
			to: TO,
			from: FROM,
			replyTo: email,
			subject: `[Contacto web] ${topic} — ${name}`,
			text,
			html,
		});
		return done("enviado");
	} catch (err) {
		const code = typeof (err as { code?: unknown })?.code === "string" ? (err as { code: string }).code : "E_UNKNOWN";
		console.error(`[contacto] no se pudo enviar (${code}):`, err instanceof Error ? err.message : err);
		return done("error", code === "E_UNKNOWN" && err instanceof Error ? err.message.replace(/[^A-Za-z0-9_ .:-]/g, "").slice(0, 40) : code);
	}
};
