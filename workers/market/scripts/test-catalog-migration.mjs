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

// ── v3: precios flexibles + ofertas (0004) y catálogo v3 (0005) ─────────
// Producción real: SpecReel tiene el título en inglés que puso el dueño.
db.prepare("UPDATE products SET title = 'SpecReel: Make 3D Explainer & Product Videos with Claude Code and Codex' WHERE slug = 'specreel'").run();
// Una waitlist real de CutPilot no debe perderse.
db.prepare("INSERT INTO waitlist (id, product_id, email, created_at) VALUES ('w1', (SELECT id FROM products WHERE slug = 'cutpilot'), 'x@y.z', 1)").run();
db.prepare("UPDATE products SET description = 'Intro.\n\n- Price: US$36.90, one-time payment. No subscription.\n\n- Precio: US$36,90, pago único. Sin suscripción.' WHERE slug = 'specreel'").run();
db.exec(sql("0004_precios_flexibles.sql"));
db.exec(sql("0005_catalogo_v3.sql"));
db.exec(sql("0005_catalogo_v3.sql"));
const specDesc = db.prepare("SELECT description FROM products WHERE slug = 'specreel'").get().description;
assert.ok(!specDesc.includes("36.90") && !specDesc.includes("36,90"), "la descripción ya no dice el precio viejo");
assert.ok(specDesc.includes("One-time payment (current price shown above). No subscription."));

const v3 = Object.fromEntries(
	db.prepare("SELECT slug, title, price_cents, compare_at_cents, price_mode, min_price_cents, availability, active, file_key, images FROM products").all().map((r) => [r.slug, r]),
);
assert.equal(v3["anuncios-infinitos"].price_cents, 3333);
assert.equal(v3["anuncios-infinitos"].compare_at_cents, 7690, "precio anterior real tachado");
assert.equal(v3["anuncios-infinitos"].file_key, "products/a.zip", "no toca el archivo");
assert.equal(v3.specreel.price_cents, 1200);
assert.equal(v3.specreel.compare_at_cents, 3690);
assert.equal(v3.specreel.title, "SpecReel: videos 3D explicativos y de producto con Claude Code y Codex");
assert.equal(v3["anuncios-infinitos"].title, "Título del dueño A", "títulos editados por el dueño no se tocan");
for (const slug of ["pagespeed-forensics", "specreel-stick", "motor-creativo-claude-code"]) {
	assert.equal(v3[slug].availability, "coming_soon", `${slug}: entra sin archivo, como Próximamente`);
	assert.equal(v3[slug].file_key, null);
	assert.equal(v3[slug].active, 1);
}
assert.equal(v3["pagespeed-forensics"].price_mode, "pwyw");
assert.equal(v3["pagespeed-forensics"].min_price_cents, 0);
assert.equal(v3["specreel-stick"].price_mode, "fixed");
assert.equal(v3["specreel-stick"].price_cents, 1200);
assert.equal(v3.cutpilot.title, "CutPilot: edita tus videos hablados con Claude Code, en tu PC");
assert.equal(JSON.parse(v3.cutpilot.images).length, 1, "CutPilot: sin la imagen que prometía 5 reels");
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM waitlist").get().n, 1, "la lista de espera se conserva");
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM products").get().n, 8, "5 anteriores + 3 nuevos, sin duplicados");

// Si el dueño ya cambió un precio a mano, 0004 no lo pisa.
const db2 = new DatabaseSync(":memory:");
for (const f of ["0001_init.sql", "0002_vitrina.sql", "0003_catalogo_v2.sql"]) db2.exec(sql(f));
db2.prepare("INSERT INTO products (id, slug, title, price_cents, currency, kind, created_at, updated_at) VALUES ('z', 'specreel', 't', 2900, 'usd', 'paid', 1, 1)").run();
db2.exec(sql("0004_precios_flexibles.sql"));
assert.equal(db2.prepare("SELECT price_cents FROM products WHERE slug = 'specreel'").get().price_cents, 2900);
console.log("✓ migraciones 0004/0005 seguras sobre datos tipo producción");

// ── v4: lanzamiento de CutPilot y del Motor creativo (0006) ─────────────
db.exec(sql("0006_lanzamiento_cutpilot_motor.sql"));
const v4 = Object.fromEntries(db.prepare("SELECT slug, summary, specs, faq, description, images, availability FROM products").all().map((r) => [r.slug, r]));
for (const slug of ["cutpilot", "motor-creativo-claude-code"]) {
	const r = v4[slug];
	assert.ok(!/Próximamente/.test(r.summary), `${slug}: el resumen ya no dice Próximamente`);
	assert.ok(!JSON.parse(r.specs).some((s) => s.label === "Estado"), `${slug}: sin fila «Estado»`);
	assert.ok(!/## Estado/.test(r.description), `${slug}: sin sección «Estado»`);
	assert.ok(!/adobe/i.test(r.description), `${slug}: no menciona Adobe`);
	assert.equal(JSON.parse(r.images).length, 3, `${slug}: portada + 2 pantallas`);
	assert.equal(r.availability, "coming_soon", `${slug}: pasa a Disponible solo cuando llega su ZIP`);
}
assert.ok(!/ArtCraft/.test(v4["motor-creativo-claude-code"].description), "el motor no usa la marca ArtCraft como propia");
// Un producto ya lanzado no se reescribe.
db.prepare("UPDATE products SET title = 'Del dueño', file_key = 'x', availability = 'available' WHERE slug = 'cutpilot'").run();
db.exec(sql("0006_lanzamiento_cutpilot_motor.sql"));
assert.equal(db.prepare("SELECT title FROM products WHERE slug = 'cutpilot'").get().title, "Del dueño");
console.log("✓ migración 0006 segura (solo fichas «Próximamente» sin archivo)");

// ── 0007: logos de compatibilidad y CutPilot a USD 12 (sin precio tachado: nunca se vendió a 29.90) ──
db.exec(sql("0007_logos_y_cutpilot.sql"));
const c7 = db.prepare("SELECT price_cents, compare_at_cents FROM products WHERE slug = 'cutpilot'").get();
// En esta base de prueba el dueño ya había lanzado CutPilot (título "Del dueño") con el precio previsto 29.90.
assert.equal(c7.price_cents, 1200);
assert.equal(c7.compare_at_cents, null, "sin precio tachado inventado");
const a7 = JSON.parse(db.prepare("SELECT compat FROM products WHERE slug = 'anuncios-infinitos'").get().compat);
assert.deepEqual(a7.includes, ["agent|Agente de anuncios", "chrome-ext"]);
db.prepare("UPDATE products SET price_cents = 1500 WHERE slug = 'cutpilot'").run();
db.exec(sql("0007_logos_y_cutpilot.sql").replace(/ALTER TABLE[^;]+;/, ""));
assert.equal(db.prepare("SELECT price_cents FROM products WHERE slug = 'cutpilot'").get().price_cents, 1500, "no pisa un precio cambiado a mano");
console.log("✓ migración 0007 segura (logos y CutPilot a 12)");
