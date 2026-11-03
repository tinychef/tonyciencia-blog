import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { BASE, call, count, uid } from "./helpers";

function send(data: Record<string, string>, origin = BASE, ip = `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`) {
	return call("/market/contacto", {
		method: "POST",
		headers: { origin, "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": ip },
		body: new URLSearchParams(data),
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
		const before = await count("SELECT COUNT(*) AS n FROM email_outbox WHERE kind = 'contact'");
		expect((await send({ name: "Bot", email: "bot@example.com", message: "spam spam", website: "x" })).headers.get("location")).toBe("/contacto?enviado=1#formulario");
		expect(await count("SELECT COUNT(*) AS n FROM email_outbox WHERE kind = 'contact'")).toBe(before);
		const ip = "10.99.99.1";
		for (let i = 0; i < 5; i++) await send({ name: "Ana", email: "ana@example.com", message: `mensaje ${i} ${uid()}` }, BASE, ip);
		expect((await send({ name: "Ana", email: "ana@example.com", message: "sexto mensaje" }, BASE, ip)).headers.get("location")).toBe("/contacto?error=1#formulario");
	});
});

describe("boletín del blog (POST /market/boletin)", () => {
	const post = (body: unknown, origin = BASE, ip = `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`) =>
		call("/market/boletin", { method: "POST", headers: { origin, "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify(body) });

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
});
