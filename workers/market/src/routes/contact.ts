import type { Hono } from "hono";
import { clientIp, deps, type AppEnv } from "../context";
import { hit, RATE_RULES } from "../lib/ratelimit";
import { checkOrigin } from "../lib/session";
import { esc } from "../services/email-templates";
import { outboxInsert, sendOne } from "../services/outbox";

/**
 * Formulario de contacto del BLOG (tonyciencia.com/contacto y /en/contact). Vive aquí porque el market ya envía
 * correos en producción con Cloudflare Email Sending y su outbox (reintentos del cron): desde el Worker del blog el
 * mismo envío falla con E_SENDER_DOMAIN_NOT_AVAILABLE. Mismo origen (tonyciencia.com), así que el formulario del blog
 * hace POST aquí y vuelve a /contacto con el resultado.
 *
 * Defensas: Origin del sitio, campo trampa, límites de longitud y 5 envíos por IP cada 10 minutos.
 */
const SUBJECTS: Record<string, string> = {
	automatizacion: "Automatización con IA",
	"agentes-ia": "Agentes IA",
	mentoria: "Mentoría empresarial",
	"diagnostico-ia": "Diagnóstico de IA",
	otro: "Otro",
};
const EMAIL_RE = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[A-Za-z]{2,24}$/;
const line = (v: unknown, max: number) =>
	typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").trim().slice(0, max) : "";

export function registerContact(app: Hono<AppEnv>) {
	app.post("/market/contacto", async (c) => {
		const form = await c.req.formData().catch(() => null);
		const lang = form?.get("lang") === "en" ? "en" : "es";
		const back = lang === "en" ? "/en/contact" : "/contacto";
		const done = (state: "enviado" | "error" | "datos") => c.redirect(`${back}?${state}=1#formulario`, 303);

		if (!form || !checkOrigin(c)) return done("error");
		// Campo trampa: las personas no lo ven; los bots lo llenan. Se responde como si se hubiera enviado.
		if (line(form.get("website"), 200)) return done("enviado");

		const name = line(form.get("name"), 100);
		const email = line(form.get("email"), 254);
		const topic = SUBJECTS[line(form.get("subject"), 40)] ?? "Sin tema";
		const rawMessage = form.get("message");
		const message = typeof rawMessage === "string" ? rawMessage.trim().slice(0, 5000) : "";
		if (!name || !EMAIL_RE.test(email) || message.length < 5) return done("datos");

		const db = c.env.MARKET_DB;
		if (!(await hit(db, RATE_RULES.contact, clientIp(c)))) return done("error");

		const config = c.get("config");
		const id = crypto.randomUUID();
		const subject = `[Contacto web] ${topic} — ${name}`;
		const text = [
			`Nombre: ${name}`,
			`Correo: ${email}  ← respóndele a este correo`,
			`Tema: ${topic}`,
			`Idioma: ${lang}`,
			"",
			message,
		].join("\n");
		const html = `<p><strong>Nombre:</strong> ${esc(name)}<br><strong>Correo:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a> (respóndele a este correo)<br><strong>Tema:</strong> ${esc(topic)}<br><strong>Idioma:</strong> ${lang}</p><p style="white-space:pre-wrap">${esc(message)}</p>`;
		await outboxInsert(
			db,
			id,
			{ dedupeKey: `contacto:${id}`, kind: "contact", to: config.adminCopyEmail, subject, html, text, orderId: null },
			null,
		).run();
		// Envío inmediato; si falla, el cron lo reintenta (outbox).
		c.executionCtx.waitUntil(sendOne(deps(c), id).then(() => undefined, (err) => console.error("[contacto] envío inmediato falló; lo reintenta el cron:", err)));
		return done("enviado");
	});
}
