import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { MOCK_TURNSTILE_FAIL } from "../src/adapters/turnstile/mock";
import { hit, RATE_RULES } from "../src/lib/ratelimit";
import { spamReason } from "../src/lib/spam";
import { BASE, call, count, uid } from "./helpers";

/** Token de Turnstile que la maqueta acepta (cualquiera salvo MOCK_TURNSTILE_FAIL). */
const TOKEN = "token-de-prueba";
const contactCount = () => count("SELECT COUNT(*) AS n FROM email_outbox WHERE kind = 'contact'");

function send(data: Record<string, string>, origin = BASE, ip = `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`) {
	return call("/market/contacto", {
		method: "POST",
		headers: { origin, "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": ip },
		body: new URLSearchParams({ "cf-turnstile-response": TOKEN, ...data }),
	});
}

describe("formulario de contacto del blog (POST /market/contacto)", () => {
	it("encola un correo a ADMIN_COPY_EMAIL y vuelve a /contacto?enviado=1", async () => {
		const marca = `Hola ${uid()}, quiero información`;
		const res = await send({ name: "Ana", email: "ana@example.com", subject: "otro", message: marca, lang: "es" });
		expect(res.status).toBe(303);
		expect(res.headers.get("location")).toBe("/contacto?enviado=1#formulario");
		const row = await env.MARKET_DB.prepare("SELECT kind, subject, text FROM email_outbox WHERE kind = 'contact' AND instr(text, ?1) > 0").bind(marca).first<{ kind: string; subject: string; text: string }>();
		expect(row?.subject).toBe("[Contacto web] Otro — Ana");
		expect(row?.text).toContain("ana@example.com");
	});

	it("inglés vuelve a /en/contact; datos malos → ?datos=1; otro origen → ?error=1", async () => {
		expect((await send({ name: "Ann", email: "ann@example.com", message: "Hello there", lang: "en" })).headers.get("location")).toBe("/en/contact?enviado=1#formulario");
		expect((await send({ name: "", email: "malo", message: "x" })).headers.get("location")).toBe("/contacto?datos=1#formulario");
		expect((await send({ name: "Eve", email: "eve@example.com", message: "hola hola" }, "https://evil.example")).headers.get("location")).toBe("/contacto?error=1#formulario");
	});

	it("el campo trampa no envía nada y el límite corta a la sexta vez", async () => {
		const before = await contactCount();
		expect((await send({ name: "Bot", email: "bot@example.com", message: "spam spam", website: "x" })).headers.get("location")).toBe("/contacto?enviado=1#formulario");
		expect(await contactCount()).toBe(before);
		const ip = "10.99.99.1";
		for (let i = 0; i < 5; i++) await send({ name: "Ana", email: "ana@example.com", message: `mensaje ${i} ${uid()}` }, BASE, ip);
		expect((await send({ name: "Ana", email: "ana@example.com", message: "sexto mensaje" }, BASE, ip)).headers.get("location")).toBe("/contacto?error=1#formulario");
	});

	it("sin token de Turnstile o con uno rechazado vuelve con ?verificacion=1 y no envía nada", async () => {
		const before = await contactCount();
		const noToken = await call("/market/contacto", {
			method: "POST",
			headers: { origin: BASE, "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "10.6.0.1" },
			body: new URLSearchParams({ name: "Ana", email: "ana@example.com", message: "hola, quiero información" }),
		});
		expect(noToken.headers.get("location")).toBe("/contacto?verificacion=1#formulario");
		const bad = await send({ name: "Ana", email: "ana@example.com", message: "hola, quiero información", "cf-turnstile-response": MOCK_TURNSTILE_FAIL, lang: "en" });
		expect(bad.headers.get("location")).toBe("/en/contact?verificacion=1#formulario");
		expect(await contactCount()).toBe(before);
	});

	it("descarta en silencio las firmas del bot (2026-11) y deja pasar a personas reales", async () => {
		const before = await contactCount();
		for (const data of [
			{ name: "RobertGab", email: "bot1@example.com", message: "Barev, uzum ei imanal dzer gine." },
			{ name: "RichardTer", email: "bot2@example.com", message: "kjsdhf kjsdhf tonyciencia.com" },
			{ name: "NAERTERHTE1588468NERTHRRTH", email: "bot3@example.com", message: "hola hola hola" },
			{ name: "Pedro", email: "bot4@example.com", message: "METRYTRE1588468MAVNGHJTH" },
		]) {
			expect((await send(data)).headers.get("location")).toBe("/contacto?enviado=1#formulario");
		}
		expect(await contactCount()).toBe(before);
		await send({ name: "Robert Gabriel", email: "robert@example.com", message: `Hola ${uid()}, quiero saber el precio de una automatización` });
		expect(await contactCount()).toBe(before + 1);
	});

	it("los filtros no tocan nombres ni mensajes normales", () => {
		for (const name of ["María José", "Jean-Luc Picard", "O'Connor", "李小龙", "Robert", "Juan Pablo II"]) {
			expect(spamReason({ name, email: "a@example.com", message: "Hola, necesito cotizar 2 agentes para 2026." })).toBeNull();
		}
		expect(spamReason({ name: "Ana", email: "a@example.com", message: "https://tonyciencia.com/contacto" })).toBeNull();
		expect(spamReason({ name: "Ana", email: "a@example.com", message: "Pedido 12345" })).toBeNull();
		expect(spamReason({ name: "Ana", email: "a@example.com", message: "hi, I wanted to know your price" })).toBeNull();
	});

	// Último del archivo a propósito: agota el tope global del día.
	it("con el tope global diario agotado no se envía nada", async () => {
		for (let i = 0; i < RATE_RULES.contactGlobal.limit; i++) await hit(env.MARKET_DB, RATE_RULES.contactGlobal, "global");
		const before = await contactCount();
		expect((await send({ name: "Ana", email: "ana@example.com", message: `tarde ${uid()}` })).headers.get("location")).toBe("/contacto?error=1#formulario");
		expect(await contactCount()).toBe(before);
	});
});

describe("boletín del blog (POST /market/boletin)", () => {
	const post = (body: Record<string, unknown>, origin = BASE, ip = `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`) =>
		call("/market/boletin", {
			method: "POST",
			headers: { origin, "content-type": "application/json", "cf-connecting-ip": ip },
			body: JSON.stringify({ "cf-turnstile-response": TOKEN, ...body }),
		});

	it("guarda el correo una vez, con origen e idioma", async () => {
		const email = `lector-${uid()}@example.com`;
		expect((await post({ email: email.toUpperCase(), source: "home", lang: "en" })).status).toBe(200);
		expect((await post({ email, source: "otra" })).status).toBe(200);
		const row = await env.MARKET_DB.prepare("SELECT source, lang FROM newsletter WHERE email = ?1").bind(email).first<{ source: string; lang: string }>();
		expect(row).toEqual({ source: "home", lang: "en" });
	});

	it("rechaza otro origen, correos inválidos y respeta el campo trampa", async () => {
		expect((await post({ email: `x-${uid()}@example.com` }, "https://evil.example")).status).toBe(403);
		expect((await post({ email: "no-es-correo" })).status).toBe(400);
		const email = `bot-${uid()}@example.com`;
		expect((await post({ email, website: "spam" })).status).toBe(200);
		expect(await count("SELECT COUNT(*) AS n FROM newsletter WHERE email = ?1", email)).toBe(0);
	});

	it("sin Turnstile válido responde 403 y no guarda el correo", async () => {
		const email = `sin-token-${uid()}@example.com`;
		const res = await post({ email, "cf-turnstile-response": "" });
		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({ ok: false, error: "turnstile" });
		expect(await count("SELECT COUNT(*) AS n FROM newsletter WHERE email = ?1", email)).toBe(0);
	});
});
