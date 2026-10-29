#!/usr/bin/env node
// Carga los productos de ejemplo en D1 de forma idempotente (ON CONFLICT(slug) DO NOTHING):
// nunca pisa productos ya editados desde el admin.
//
// Uso:
//   node scripts/seed.mjs --local                 → D1 local de `wrangler dev` (maqueta)
//   node scripts/seed.mjs --env preview           → D1 remota de la vista previa (maqueta)
//   node scripts/seed.mjs --env staging           → D1 + R2 remotos de staging (live con claves de prueba)
//   node scripts/seed.mjs --env production        → D1 + R2 de producción
//
// En maqueta (local/preview) los productos usan los archivos de PRUEBA incluidos en el código.
// En live (staging/production) se sube el PDF de ejemplo del producto gratis a R2 y el producto de pago
// queda INACTIVO y sin archivo hasta que se suba el ZIP real (HANDOFF.md, paso 5).
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { root, wrangler } from "./wrangler.mjs";

const args = process.argv.slice(2);
const local = args.includes("--local");
const envIdx = args.indexOf("--env");
const envName = envIdx >= 0 ? args[envIdx + 1] : null;
if (!local && !["preview", "staging", "production"].includes(envName ?? "")) {
	console.error("Uso: node scripts/seed.mjs --local | --env preview|staging|production");
	process.exit(1);
}
const live = envName === "staging" || envName === "production";
const bucket = { staging: "tonyciencia-market-files-staging", production: "tonyciencia-market-files" }[envName ?? ""];

const now = Date.now();
const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

const FREE_PDF_KEY = "products/guia-gratis-prueba/guia-gratis-prueba.pdf";

const products = [
	{
		id: "6f1d3a2e-7b4c-4e8a-9c11-5a0b1d2e3f01",
		slug: "anuncios-infinitos",
		title: "Anuncios Infinitos: agente de IA con 250+ prompts de anuncios",
		summary:
			"[Texto provisional] Un agente de IA y más de 250 prompts probados para crear anuncios para Meta, Google y TikTok en minutos.",
		description: [
			"[Texto provisional — Tony enviará la descripción final.]",
			"Anuncios Infinitos es un agente de IA con más de 250 prompts de anuncios organizados por objetivo, plataforma y etapa del embudo, para que nunca te quedes sin ideas ni sin copys.",
			"## Qué incluye",
			"- Agente de IA configurado para redactar anuncios en tu tono de marca\n- 250+ prompts de anuncios listos para copiar y pegar\n- Plantillas para Meta Ads, Google Ads y TikTok Ads\n- Guía rápida de uso",
			"## Para quién es",
			"Emprendedores, agencias y equipos de marketing que necesitan producir anuncios a buen ritmo sin perder calidad.",
			"## Importante",
			"Es una herramienta de trabajo: no garantizamos resultados de ventas. Revisa siempre los textos generados y cumple las políticas de cada plataforma.",
		].join("\n\n"),
		price_cents: 7700,
		kind: "paid",
		images: [{ src: "/market/static/covers/anuncios-infinitos.svg", alt: "Portada de Anuncios Infinitos: agente de IA con 250+ prompts de anuncios" }],
		file_key: live ? null : "mock/anuncios-infinitos-PRUEBA.zip",
		file_name: live ? null : "anuncios-infinitos-PRUEBA.zip",
		download_limit: 5,
		active: live ? 0 : 1,
		sort_order: 0,
	},
	{
		id: "6f1d3a2e-7b4c-4e8a-9c11-5a0b1d2e3f02",
		slug: "guia-gratis-prueba",
		title: "Guía gratis de prueba",
		summary: "Producto gratuito de ejemplo (un PDF) para probar el flujo de descarga gratis.",
		description:
			"Este es un producto gratuito de prueba. Inicia sesión con Google, márcalo como tuyo y descárgalo aquí mismo; además te llega el enlace por correo.",
		price_cents: 0,
		kind: "free",
		images: [{ src: "/market/static/covers/guia-gratis.svg", alt: "Portada de la guía gratis de prueba" }],
		file_key: live ? FREE_PDF_KEY : "mock/guia-gratis-PRUEBA.pdf",
		file_name: "guia-gratis-prueba.pdf",
		download_limit: 10,
		active: 1,
		sort_order: 10,
	},
];

const sql = products
	.map(
		(p) =>
			`INSERT INTO products (id, slug, title, summary, description, price_cents, currency, kind, images, file_key, file_name, download_limit, active, sort_order, created_at, updated_at)
VALUES (${[p.id, p.slug, p.title, p.summary, p.description, p.price_cents, "usd", p.kind, JSON.stringify(p.images), p.file_key, p.file_name, p.download_limit, p.active, p.sort_order, now, now].map(q).join(", ")})
ON CONFLICT(slug) DO NOTHING;`,
	)
	.join("\n");

const dir = mkdtempSync(join(tmpdir(), "market-seed-"));
const file = join(dir, "seed.sql");
writeFileSync(file, sql);

const target = local ? ["--local"] : ["--remote", "--env", envName];

if (live) {
	console.log(`Subiendo el PDF de ejemplo a R2 (${bucket}/${FREE_PDF_KEY})…`);
	wrangler(["r2", "object", "put", `${bucket}/${FREE_PDF_KEY}`, "--file", join(root, "seed/files/guia-gratis-prueba.pdf"), "--content-type", "application/pdf", "--remote"]);
}
wrangler(["d1", "execute", "MARKET_DB", ...target, "--file", file]);
console.log("Seed aplicado (los productos que ya existían no se tocaron).");
