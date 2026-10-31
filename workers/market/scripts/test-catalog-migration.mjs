#!/usr/bin/env node
// Prueba las migraciones 0002/0003 sobre una copia SIMULADA de producción (los dos productos reales con las
// imágenes que subió el dueño desde el admin). Comprueba que:
//   - no se tocan precios, títulos ni archivos;
//   - las portadas nuevas quedan primero y las del dueño se conservan detrás;
//   - se crean los 3 productos próximos;
//   - aplicar 0003 dos veces no duplica nada.
// Usa node:sqlite (Node 22.13+), el mismo SQLite que D1.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = (f) => readFileSync(join(root, "migrations", f), "utf8");
const db = new DatabaseSync(":memory:");
db.exec(sql("0001_init.sql"));

const now = 1761800000000;
const ins = db.prepare(
	`INSERT INTO products (id, slug, title, summary, description, price_cents, currency, kind, images, file_key, file_name, download_limit, active, sort_order, created_at, updated_at)
	 VALUES (?, ?, ?, 's', 'd', ?, 'usd', 'paid', ?, ?, 'x.zip', 5, 1, ?, ?, ?)`,
);
ins.run("6f1d3a2e-7b4c-4e8a-9c11-5a0b1d2e3f01", "anuncios-infinitos", "Título del dueño A", 7690, JSON.stringify([{ src: "/market/media/images/a/portada.png", alt: "A" }]), "products/a.zip", 0, now, now);
ins.run("7a2b4c6d-1e3f-4a5b-8c7d-9e0f1a2b3c4d", "specreel", "Título del dueño B", 3690, JSON.stringify([{ src: "/market/media/images/b/1.png", alt: "B1" }, { src: "/market/media/images/b/2.png", alt: "B2" }]), "products/b.zip", 5, now, now);
// El dueño ya había escrito un tagline a mano: no se debe pisar.
db.exec(sql("0002_vitrina.sql"));
db.prepare("UPDATE products SET tagline = 'Mío' WHERE slug = 'specreel'").run();

db.exec(sql("0003_catalogo_v2.sql"));
db.exec(sql("0003_catalogo_v2.sql"));

const rows = db.prepare("SELECT slug, title, price_cents, file_key, images, tagline, availability, active FROM products ORDER BY sort_order").all();
const by = Object.fromEntries(rows.map((r) => [r.slug, r]));
assert.equal(rows.length, 5, "2 existentes + 3 próximos");

const a = by["anuncios-infinitos"];
assert.equal(a.title, "Título del dueño A");
assert.equal(a.price_cents, 7690);
assert.equal(a.file_key, "products/a.zip");
const aImgs = JSON.parse(a.images).map((i) => i.src);
assert.deepEqual(aImgs.slice(0, 3).map((s) => s.split("/").pop()), ["cover.webp", "screen-1.webp", "screen-2.webp"]);
assert.equal(aImgs[3], "/market/media/images/a/portada.png", "la portada del dueño se conserva");
assert.equal(aImgs.length, 4, "sin duplicados al aplicar dos veces");

const b = by.specreel;
assert.equal(b.tagline, "Mío", "no pisa lo editado por el dueño");
assert.equal(JSON.parse(b.images).length, 5);

for (const slug of ["cutpilot", "kit-n8n-agentes-ia", "carruseles-infinitos"]) {
	assert.equal(by[slug].availability, "coming_soon");
	assert.equal(by[slug].active, 1);
	assert.equal(by[slug].file_key, null);
}
console.log("✓ migraciones 0002/0003 seguras sobre datos tipo producción");
