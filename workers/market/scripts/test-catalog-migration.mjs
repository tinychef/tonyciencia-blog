#!/usr/bin/env node
// Prueba las migraciones (0002 a 0009) sobre una copia SIMULADA de producción (los dos productos reales con las
// imágenes que subió el dueño desde el admin). Comprueba que:
//   - no se tocan precios, títulos ni archivos;
//   - las portadas nuevas quedan primero y las del dueño se conservan detrás;
//   - se crean los 3 productos próximos;
//   - aplicar 0003 dos veces no duplica nada.
// Usa node:sqlite (Node 22.13+), el mismo SQLite que D1.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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

// ── 0008: retirar los «Próximamente» sin archivo (se desactivan, no se borran) ──
db.exec(sql("0008_retirar_proximamente.sql"));
const r8 = Object.fromEntries(db.prepare("SELECT slug, active, availability FROM products").all().map((r) => [r.slug, r]));
assert.equal(r8["kit-n8n-agentes-ia"].active, 0);
assert.equal(r8["carruseles-infinitos"].active, 0);
assert.equal(r8.cutpilot.active, 1, "CutPilot no se toca");
assert.equal(r8["anuncios-infinitos"].active, 1);
console.log("✓ migración 0008 segura (solo retira kit-n8n y carruseles sin archivo)");

// ── 0009: contenido v5 (Anuncios Automáticos, SpecReel solo en español, metas SEO, compat) ──
// Base: copia de las 6 fichas tal como estaban en producción el 2026-11-01 (scripts/fixtures/).
const prodSnap = JSON.parse(readFileSync(join(root, "scripts", "fixtures", "produccion-2026-11-01.json"), "utf8")).products;
const before9 = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql") && f < "0009").sort();
const PRICES = {
	"anuncios-infinitos": ["fixed", 3333, 7690],
	specreel: ["fixed", 1200, 3690],
	"specreel-stick": ["fixed", 1200, null],
	"pagespeed-forensics": ["pwyw", 900, null],
	cutpilot: ["fixed", 1200, null],
	"motor-creativo-claude-code": ["pwyw", 1900, null],
};
const TEXT_COLS = ["title", "summary", "tagline", "meta_title", "meta_description", "description", "images", "highlights", "specs", "faq", "tags", "compat"];
function prodDb() {
	const d = new DatabaseSync(":memory:");
	d.exec(sql(before9[0]));
	for (const [id, slug] of [["6f1d3a2e-7b4c-4e8a-9c11-5a0b1d2e3f01", "anuncios-infinitos"], ["7a2b4c6d-1e3f-4a5b-8c7d-9e0f1a2b3c4d", "specreel"]])
		d.prepare("INSERT INTO products (id, slug, title, price_cents, currency, kind, active, created_at, updated_at) VALUES (?, ?, 't', 7690, 'usd', 'paid', 1, 1, 1)").run(id, slug);
	for (const f of before9.slice(1)) d.exec(sql(f));
	const up = d.prepare(
		`UPDATE products SET title = ?, summary = ?, tagline = ?, meta_title = ?, meta_description = ?, description = ?, images = ?, highlights = ?, specs = ?, faq = ?, tags = ?, compat = ?,
		 price_mode = ?, price_cents = ?, compare_at_cents = ?, min_price_cents = 0, availability = 'available', file_key = ?, active = 1 WHERE slug = ?`,
	);
	for (const p of prodSnap) {
		const [mode, price, was] = PRICES[p.slug];
		// El resumen no se ve en la ficha pública: se simula uno que nombra el producto.
		const summary = `${p.slug === "anuncios-infinitos" ? "Anuncios Infinitos: " : ""}resumen de ${p.slug}`;
		up.run(p.title, summary, p.tagline, p.meta_title, p.meta_description, p.description, JSON.stringify(p.images), JSON.stringify(p.highlights), JSON.stringify(p.specs), JSON.stringify(p.faq), JSON.stringify(p.tags), p.compat, mode, price, was, `products/${p.slug}.zip`, p.slug);
	}
	return d;
}
const rowsOf = (d) => Object.fromEntries(d.prepare("SELECT * FROM products WHERE active = 1").all().map((r) => [r.slug, { ...r }]));

const db9 = prodDb();
const pre9 = rowsOf(db9);
db9.exec(sql("0009_contenido_v5.sql"));
const v9 = rowsOf(db9);
db9.exec(sql("0009_contenido_v5.sql"));
assert.deepEqual(rowsOf(db9), v9, "0009 es idempotente");

for (const [slug, r] of Object.entries(v9)) {
	for (const k of ["price_mode", "price_cents", "compare_at_cents", "min_price_cents", "availability", "file_key", "active", "id"]) assert.equal(r[k], pre9[slug][k], `${slug}: no toca ${k}`);
	assert.ok(r.meta_title.length <= 60, `${slug}: meta título ≤ 60 (${r.meta_title.length})`);
	assert.ok(r.meta_description.length >= 120 && r.meta_description.length <= 160, `${slug}: meta descripción 120–160 (${r.meta_description.length})`);
	assert.ok(r.title.length <= 70, `${slug}: H1 ≤ 70 (${r.title.length})`);
	for (const k of ["images", "highlights", "specs", "faq", "tags", "compat"]) JSON.parse(r[k]);
	const compat = JSON.parse(r.compat);
	assert.ok(!JSON.stringify(compat).toLowerCase().includes("grok"), `${slug}: sin Grok`);
}

// 1. Anuncios Automáticos (el slug no cambia; ninguna promesa de «infinitos»).
const an = v9["anuncios-infinitos"];
assert.equal(an.title, "Anuncios Automáticos: 250+ prompts para anuncios publicitarios con IA");
assert.equal(an.meta_title, "Anuncios Automáticos: 250+ prompts para anuncios con IA");
assert.ok(an.meta_description.startsWith("Anuncios Automáticos: agente de IA en español"));
for (const k of TEXT_COLS) assert.ok(!/infinit/i.test(an[k].replaceAll("anuncios-infinitos", "")), `anuncios: «${k}» ya no dice Infinitos`);
assert.ok(an.description.includes("Anuncios Automáticos es un sistema"));
assert.ok(an.description.endsWith("no cambian tu precio."), "termina antes de la FAQ duplicada");
assert.ok(!an.description.includes("## Preguntas frecuentes") && !an.description.includes("In English"));
assert.ok(an.description.includes("## Para quién no es"), "conserva el resto de la descripción");
assert.ok(JSON.parse(an.images).every((i, n) => i.src === JSON.parse(pre9["anuncios-infinitos"].images)[n].src), "no toca las rutas de las imágenes");
assert.ok(JSON.parse(an.images).some((i) => i.alt === "Qué recibes con Anuncios Automáticos"));
const anFaq = JSON.parse(an.faq);
assert.equal(anFaq.length, 7);
assert.equal(anFaq.find((f) => f.q === "¿Incluye una extensión de Chrome?")?.a, "No. El paquete trae el agente, la app local y las guías.");
assert.ok(anFaq.some((f) => f.q === "¿Qué herramientas de IA necesito?"));
const anCompat = JSON.parse(an.compat);
assert.deepEqual(anCompat.includes, ["agent|Agente de anuncios", "node|App local"], "sin extensión de Chrome");
assert.deepEqual(anCompat.works, JSON.parse(pre9["anuncios-infinitos"].compat).works, "«Funciona con» igual (ya tenía codex y antigravity)");
assert.ok(/\bnode: \{/.test(readFileSync(join(root, "src", "lib", "brands.ts"), "utf8")), "la clave node existe en brands.ts");

// 2. CutPilot: sin «Lista de espera».
assert.ok(!/lista de espera/i.test(v9.cutpilot.meta_description));
assert.equal(v9.cutpilot.meta_title, "CutPilot: edita videos con Claude Code y quita muletillas");
assert.equal(v9.cutpilot.title, pre9.cutpilot.title, "H1 de CutPilot sin cambio");

// 3. SpecReel: solo en español, reembolso del market y soporte business@.
const sr = v9.specreel;
assert.ok(sr.description.startsWith("SpecReel es una skill para Claude Code y Codex que convierte"));
assert.ok(!/\b(the|and|your|you|with)\b/i.test(sr.description), "sin texto en inglés");
assert.ok(!/contact@|funciona o te devolvemos|Descripción en español/.test(sr.description));
assert.ok(sr.description.includes("Soporte: business@tonyciencia.com"));
assert.ok(sr.description.includes("dentro de los 14 días posteriores a la compra y todavía no descargaste el producto, o si el archivo está dañado"));
for (const h of ["## Qué obtienes", "## Requisitos", "## Después de descargar", "## Reembolsos y soporte", "Plantillas de spec:", "eSpeak", "Microneedling (español, 47 s)", "soltura con la terminal"])
	assert.equal(sr.description.split(h).length - 1, 1, `SpecReel: «${h}» una sola vez`);
assert.ok(sr.description.length < pre9.specreel.description.length * 0.6, "la descripción quedó en una sola versión");
const srFaq = JSON.parse(sr.faq);
assert.equal(srFaq.length, 8);
assert.ok(srFaq.find((f) => f.q === "¿Y si no me funciona?").a.includes("business@tonyciencia.com"));
assert.ok(!JSON.stringify(srFaq).includes("renderizar el demo incluido"), "sin la garantía vieja");
assert.equal(sr.meta_title, "SpecReel: videos explicativos 3D con Claude Code y Codex");
assert.equal(sr.title, pre9.specreel.title, "H1 de SpecReel sin cambio");

// 5. Compatibilidad: Antigravity solo en el Motor creativo (y Anuncios, que ya lo tenía); codex se mantiene.
const works = (s) => JSON.parse(v9[s].compat).works;
assert.deepEqual(works("motor-creativo-claude-code"), ["claude-code", "antigravity", "python", "windows"]);
assert.ok(JSON.parse(v9["motor-creativo-claude-code"].faq).some((f) => f.q === "¿Funciona con Antigravity u otros agentes?"));
for (const s of ["specreel", "specreel-stick", "pagespeed-forensics", "cutpilot"]) {
	assert.deepEqual(works(s), JSON.parse(pre9[s].compat).works, `${s}: «Funciona con» sin cambios`);
	assert.ok(!works(s).includes("antigravity"));
}
for (const s of ["anuncios-infinitos", "specreel", "specreel-stick"]) assert.ok(works(s).includes("codex"), `${s}: conserva codex`);
for (const s of ["specreel-stick", "pagespeed-forensics", "cutpilot", "motor-creativo-claude-code"])
	assert.equal(v9[s].description, pre9[s].description, `${s}: descripción intacta`);
assert.equal(v9["motor-creativo-claude-code"].title, "Motor creativo: 13 agentes de Claude Code para diseño, video y PDF");

// Lo que el dueño ya editó a mano no se pisa (salvo el cambio de nombre, que está aprobado).
const dbOwner = prodDb();
dbOwner.exec(`
	UPDATE products SET title = 'Anuncios Infinitos PRO', meta_title = 'Mi meta título', compat = '{"works":["claude-code"],"includes":["agent|Agente","chrome-ext"]}' WHERE slug = 'anuncios-infinitos';
	UPDATE products SET meta_description = 'Texto propio del dueño para CutPilot. Lista de espera.' WHERE slug = 'cutpilot';
	UPDATE products SET description = 'Descripción nueva del dueño, solo en español.', faq = '[{"q":"¿Y si no me funciona?","a":"Respuesta del dueño."}]' WHERE slug = 'specreel';
	UPDATE products SET meta_title = 'Meta del dueño', title = 'H1 del dueño', compat = '{"works":["claude-code","codex"],"includes":[]}' WHERE slug = 'motor-creativo-claude-code';
`);
dbOwner.exec(sql("0009_contenido_v5.sql"));
const o9 = rowsOf(dbOwner);
assert.equal(o9["anuncios-infinitos"].title, "Anuncios Automáticos PRO", "solo cambia el nombre");
assert.equal(o9["anuncios-infinitos"].meta_title, "Mi meta título");
assert.equal(o9["anuncios-infinitos"].compat, '{"works":["claude-code"],"includes":["agent|Agente","chrome-ext"]}', "compat editado a mano: no se toca");
assert.equal(o9.cutpilot.meta_description, "Texto propio del dueño para CutPilot.", "solo quita la coletilla");
assert.equal(o9.specreel.description, "Descripción nueva del dueño, solo en español.");
assert.equal(JSON.parse(o9.specreel.faq)[0].a, "Respuesta del dueño.");
assert.equal(o9["motor-creativo-claude-code"].meta_title, "Meta del dueño");
assert.equal(o9["motor-creativo-claude-code"].title, "H1 del dueño");
assert.equal(o9["motor-creativo-claude-code"].compat, '{"works":["claude-code","codex"],"includes":[]}');
assert.ok(!JSON.parse(o9["motor-creativo-claude-code"].faq).some((f) => f.q.includes("Antigravity")), "sin Antigravity en compat, no se agrega su pregunta");
console.log("✓ migración 0009 segura (contenido v5 sobre la copia de producción; no pisa lo editado a mano)");
