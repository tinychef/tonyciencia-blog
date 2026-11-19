#!/usr/bin/env node
// Prueba las migraciones (0002 a 0010) sobre una copia SIMULADA de producción (los dos productos reales con las
// imágenes que subió el dueño desde el admin). Comprueba que:
//   - no se tocan precios, títulos ni archivos;
//   - las portadas nuevas quedan primero y las del dueño se conservan detrás;
//   - se crean los 3 productos próximos;
//   - aplicar 0003 dos veces no duplica nada.
// Usa node:sqlite (Node 22.13+), el mismo SQLite que D1.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

// ── D1 rechaza patrones LIKE/GLOB largos («LIKE or GLOB pattern too complex», límite de 50 bytes) aunque node:sqlite los
// acepte. Pasó con la 0009 en producción: ninguna migración puede tener un patrón así. Usar instr()/substr().
for (const f of readdirSync(new URL("../migrations/", import.meta.url)).filter((n) => n.endsWith(".sql"))) {
	const text = readFileSync(new URL(`../migrations/${f}`, import.meta.url), "utf8");
	for (const m of text.matchAll(/\b(?:LIKE|GLOB)\s+'((?:[^']|'')*)'/gi)) {
		assert.ok(Buffer.byteLength(m[1]) <= 50, `${f}: patrón LIKE/GLOB de ${Buffer.byteLength(m[1])} bytes (D1 admite hasta 50): ${m[1].slice(0, 60)}…`);
	}
}
console.log("✓ ningún patrón LIKE/GLOB supera el límite de D1");

// ── 0010: nombres v6 (Motion 3D Video, Edit Pro para YouTube, Creative Factory; slugs iguales) ──
// Base: producción tras la 0009 (el HTML público del 2026-11-01 coincide campo por campo con fixture + 0009).
const db10 = prodDb();
db10.exec(sql("0009_contenido_v5.sql"));
// El resumen no se ve en la ficha pública: se simulan resúmenes que nombran cada producto.
db10.exec(`
	UPDATE products SET summary = 'SpecReel: videos 3D narrados. No confundir con SpecReel Stick.' WHERE slug = 'specreel';
	UPDATE products SET summary = 'CutPilot: estudio de video local.' WHERE slug = 'cutpilot';
	UPDATE products SET summary = 'Motor creativo para Claude Code: 13 agentes.' WHERE slug = 'motor-creativo-claude-code';
`);
const pre10 = rowsOf(db10);
db10.exec(sql("0010_nombres_v6.sql"));
const v10 = rowsOf(db10);
db10.exec(sql("0010_nombres_v6.sql"));
assert.deepEqual(rowsOf(db10), v10, "0010 es idempotente");
for (const [slug, r] of Object.entries(v10)) {
	for (const k of ["slug", "price_mode", "price_cents", "compare_at_cents", "availability", "file_key", "active", "id", "compat", "tags", "highlights"])
		assert.equal(r[k], pre10[slug][k], `${slug}: 0010 no toca ${k}`);
	assert.ok(r.meta_title.length <= 60, `${slug}: meta título ≤ 60 (${r.meta_title.length})`);
	assert.ok(r.meta_description.length >= 120 && r.meta_description.length <= 160, `${slug}: meta descripción 120–160 (${r.meta_description.length})`);
	assert.ok(r.title.length <= 70, `${slug}: H1 ≤ 70 (${r.title.length})`);
	for (const k of ["images", "specs", "faq"]) JSON.parse(r[k]);
	assert.deepEqual(JSON.parse(r.images).map((i) => i.src), JSON.parse(pre10[slug].images).map((i) => i.src), `${slug}: rutas de imágenes iguales`);
}
for (const s of ["anuncios-infinitos", "pagespeed-forensics"]) assert.deepEqual(v10[s], pre10[s], `${s}: sin cambios`);
const count = (txt, s) => txt.split(s).length - 1;

// specreel → Motion 3D Video (la skill sigue llamándose SpecReel: se aclara una vez en la descripción y en la FAQ).
const m3 = v10.specreel;
assert.equal(m3.title, "Motion 3D Video: videos explicativos y de producto con Claude Code");
assert.equal(m3.meta_title, "Motion 3D Video: videos explicativos con Claude Code y Codex");
assert.ok(m3.meta_description.startsWith("Motion 3D Video: skill para Claude Code y Codex"));
assert.ok(m3.description.startsWith("Motion 3D Video es una skill para Claude Code y Codex que convierte"));
assert.equal(count(m3.description, "la skill se llama SpecReel"), 1);
assert.ok(m3.description.includes("Motion 3D Video es un producto independiente"));
assert.ok(m3.description.includes("La skill SpecReel (formato abierto SKILL.md)"), "el nombre real de la skill se conserva");
assert.ok(m3.description.includes("skills/specreel"), "rutas del ZIP intactas");
assert.ok(JSON.parse(m3.images).every((i) => i.alt.startsWith("Motion 3D Video: ")));
const m3Faq = JSON.parse(m3.faq);
assert.equal(m3Faq.length, 9);
assert.equal(m3Faq.filter((f) => f.q === "¿Por qué el ZIP dice SpecReel?").length, 1);
assert.ok(m3Faq.some((f) => f.a.startsWith("No por parte de Motion 3D Video.")));
assert.equal(m3.summary, "Motion 3D Video: videos 3D narrados. No confundir con SpecReel Stick.");
assert.equal(v10.cutpilot.summary, "Edit Pro para YouTube: estudio de video local.");
assert.equal(v10["motor-creativo-claude-code"].summary, "Creative Factory: 13 agentes.");
const stFaq = JSON.parse(v10["specreel-stick"].faq);
assert.ok(stFaq.some((f) => f.q === "¿Necesito tener Motion 3D Video?" && f.a.includes("Motion 3D Video (la skill SpecReel) es otro producto")));
assert.ok(v10["specreel-stick"].title.startsWith("SpecReel Stick:"), "SpecReel Stick no cambia de nombre");
assert.equal(v10["specreel-stick"].description, pre10["specreel-stick"].description);

// cutpilot → Edit Pro para YouTube («YouTube» nunca al inicio del nombre).
const ep = v10.cutpilot;
assert.equal(ep.title, "Edit Pro para YouTube: edita tus videos hablados con Claude Code");
assert.equal(ep.meta_title, "Edit Pro para YouTube: edita videos con Claude Code");
assert.ok(ep.meta_description.startsWith("Edit Pro para YouTube:") && ep.meta_description.includes("Shorts y Reels"));
assert.ok(ep.description.startsWith("Edit Pro para YouTube es un editor automático para videos hablados"));
assert.equal(count(ep.description, "Por dentro se llama CutPilot"), 1);
assert.ok(ep.description.includes("no corta varios reels de una grabación larga"), "la limitación sigue a la vista");
assert.ok(!JSON.stringify(JSON.parse(ep.images).map((i) => i.alt)).includes("CutPilot"));
const epFaq = JSON.parse(ep.faq);
assert.ok(epFaq.some((f) => f.q === "¿Por qué el ZIP dice CutPilot?"));
assert.ok(epFaq.find((f) => f.q === "¿Sirve para Shorts, Reels y TikTok?").a.includes("No corta varios clips"));
for (const r of Object.values(v10)) assert.ok(!/^YouTube/i.test(r.title), "ningún nombre empieza con YouTube");

// motor-creativo-claude-code → Creative Factory.
const cf = v10["motor-creativo-claude-code"];
assert.equal(cf.title, "Creative Factory: 13 agentes de Claude Code para diseño, video y PDF");
assert.equal(cf.meta_title, "Creative Factory: agentes de Claude Code para diseño gráfico");
assert.ok(cf.meta_description.startsWith("Creative Factory: 13 subagentes de Claude Code"));
assert.ok(cf.description.startsWith("Creative Factory es un kit para Claude Code que trabaja como un estudio creativo"));
assert.equal(count(cf.description, "Por dentro se llama «Motor creativo para Claude Code»"), 1);
assert.ok(JSON.parse(cf.images)[0].alt.startsWith("Creative Factory: 13 agentes de Claude Code en español"));
assert.ok(cf.specs.includes("sin reventa de Creative Factory") && cf.specs.includes("Studio Motor"), "el panel conserva su nombre real");
const cfFaq = JSON.parse(cf.faq);
assert.ok(cfFaq.some((f) => f.q === "¿Creative Factory se conecta a internet?"));
assert.ok(cfFaq.some((f) => f.a.includes("Creative Factory las registra")));
assert.ok(cfFaq.some((f) => f.q === "¿Por qué el ZIP dice «Motor creativo para Claude Code»?"));
assert.ok(!/\b[Ee]l motor\b|Motor creativo:/.test(cf.faq + cf.title + cf.meta_title));

// Lo que el dueño editó a mano no se pisa.
const dbOwn10 = prodDb();
dbOwn10.exec(sql("0009_contenido_v5.sql"));
dbOwn10.exec(`
	UPDATE products SET title = 'SpecReel 2: título del dueño', meta_title = 'Meta del dueño', description = 'Texto del dueño.' WHERE slug = 'specreel';
	UPDATE products SET title = 'CutPilot del dueño', meta_description = 'Descripción propia del dueño.' WHERE slug = 'cutpilot';
	UPDATE products SET title = 'Motor del dueño', faq = '[{"q":"¿El motor se conecta?","a":"Del dueño."}]' WHERE slug = 'motor-creativo-claude-code';
`);
dbOwn10.exec(sql("0010_nombres_v6.sql"));
const o10 = rowsOf(dbOwn10);
assert.equal(o10.specreel.title, "SpecReel 2: título del dueño");
assert.equal(o10.specreel.meta_title, "Meta del dueño");
assert.equal(o10.specreel.description, "Texto del dueño.");
assert.equal(o10.cutpilot.title, "CutPilot del dueño");
assert.equal(o10.cutpilot.meta_description, "Descripción propia del dueño.");
assert.ok(!o10.cutpilot.faq.includes("¿Por qué el ZIP dice CutPilot?"), "sin el nombre nuevo, no se agrega la pregunta del nombre interno");
assert.equal(o10["motor-creativo-claude-code"].title, "Motor del dueño");
assert.equal(o10["motor-creativo-claude-code"].faq, '[{"q":"¿El motor se conecta?","a":"Del dueño."}]');
console.log("✓ migración 0010 segura (nombres v6 sobre producción tras la 0009; no pisa lo editado a mano)");

// ── 0011: fichas en inglés (columna i18n = {"en": {...}}) ──
const db11 = prodDb();
for (const f of ["0009_contenido_v5.sql", "0010_nombres_v6.sql"]) db11.exec(sql(f));
const pre11 = rowsOf(db11);
db11.exec(sql("0011_ingles.sql"));
const v11 = rowsOf(db11);
db11.exec(sql("0011_ingles.sql").replace(/ALTER TABLE[^;]+;/, ""));
assert.deepEqual(rowsOf(db11), v11, "0011 aplicada dos veces no cambia nada");
const EN_KEYS = ["title", "tagline", "summary", "meta_title", "meta_description", "description", "highlights", "specs", "faq", "tags", "image_alts"];
const NAMES = {
	"anuncios-infinitos": "Automatic Ads",
	specreel: "Motion 3D Video",
	"specreel-stick": "SpecReel Stick",
	"pagespeed-forensics": "PageSpeed Forensics",
	cutpilot: "Edit Pro for YouTube",
	"motor-creativo-claude-code": "Creative Factory",
};
assert.deepEqual(Object.keys(v11).sort(), Object.keys(NAMES).sort(), "los 6 productos activos");
for (const [slug, r] of Object.entries(v11)) {
	for (const k of Object.keys(pre11[slug])) if (k !== "i18n" && k !== "updated_at") assert.equal(r[k], pre11[slug][k], `${slug}: 0011 no toca ${k}`);
	assert.equal(db11.prepare("SELECT json_valid(i18n) AS ok FROM products WHERE slug = ?").get(slug).ok, 1, `${slug}: i18n es JSON válido para SQLite`);
	const en = JSON.parse(r.i18n).en;
	assert.ok(en, `${slug}: tiene i18n.en`);
	assert.deepEqual(Object.keys(en).sort(), [...EN_KEYS].sort(), `${slug}: todas las claves`);
	assert.ok(en.title.startsWith(`${NAMES[slug]}:`), `${slug}: título con el nombre en inglés`);
	assert.ok(en.title.length <= 70, `${slug}: title ≤ 70 (${en.title.length})`);
	assert.ok(en.meta_title.length <= 60, `${slug}: meta_title ≤ 60 (${en.meta_title.length})`);
	assert.ok(en.meta_description.length >= 120 && en.meta_description.length <= 160, `${slug}: meta_description 120–160 (${en.meta_description.length})`);
	assert.equal(en.image_alts.length, JSON.parse(r.images).length, `${slug}: un ALT por imagen`);
	assert.ok(en.image_alts.every((a) => typeof a === "string" && a.length > 10));
	const specsEs = JSON.parse(r.specs);
	assert.equal(en.specs.length, specsEs.length, `${slug}: mismas filas en la ficha técnica`);
	assert.ok(en.specs.every((s) => s.label && s.value));
	assert.ok(en.faq.length >= 3 && en.faq.every((f) => f.q.endsWith("?") && f.a));
	assert.ok(en.highlights.length >= 4 && en.highlights.length <= 6);
	assert.ok(en.tags.length >= 5 && en.tags.length <= 7);
	// Sin restos en español en los textos que ve el comprador (los nombres internos y rutas sí se citan).
	const visible = [en.title, en.tagline, en.meta_title, en.meta_description, en.description, ...en.highlights, ...en.faq.flatMap((f) => [f.q, f.a])].join("\n");
	assert.ok(!/\b(para|con|que|los|las|una|del)\b/.test(visible.replace(/«[^»]*»|"[^"]*"|\[precio\]|Motor creativo para Claude Code/g, "")), `${slug}: sin frases en español`);
	assert.ok(!/Anuncios Automáticos|Edit Pro para YouTube|Anuncios Infinitos/.test(visible), `${slug}: nombres en inglés`);
	assert.ok(!/\$\d/.test(en.description) || slug === "pagespeed-forensics", `${slug}: sin precios fijos en la descripción`);
}
// Honestidad con el idioma: los productos que solo funcionan en español lo dicen en inglés, arriba y en la ficha técnica.
const en11 = (s) => JSON.parse(v11[s].i18n).en;
for (const s of ["anuncios-infinitos", "cutpilot"]) {
	const en = en11(s);
	assert.ok(/Spanish/.test(en.title + en.meta_title) && /Spanish/.test(en.meta_description), `${s}: título y meta dicen Spanish`);
	assert.ok(en.specs.some((x) => /^Spanish only/.test(x.value)), `${s}: «Spanish only» en la ficha técnica`);
	assert.ok(/^(Is it in English\?|Does it work for videos in English\?)$/.test(en.faq[0].q) && en.faq[0].a.startsWith("No."), `${s}: primera pregunta = idioma`);
}
assert.ok(en11("motor-creativo-claude-code").faq[0].a.startsWith("No.") && /Spanish/.test(en11("motor-creativo-claude-code").meta_description));
assert.ok(en11("pagespeed-forensics").faq.some((f) => f.q === "Is it in English?" && f.a.startsWith("Yes.")));
assert.ok(en11("specreel").description.includes("the skill is called SpecReel"));
assert.ok(en11("cutpilot").description.includes("Inside it is called CutPilot"));
assert.ok(!/^YouTube/.test(en11("cutpilot").title), "«YouTube» no va al inicio del nombre");
// No pisa un i18n ya escrito (por ejemplo desde el admin).
const db11b = prodDb();
for (const f of ["0009_contenido_v5.sql", "0010_nombres_v6.sql", "0011_ingles.sql"]) db11b.exec(sql(f));
db11b.prepare(`UPDATE products SET i18n = '{"en":{"title":"Owner title"}}' WHERE slug = 'specreel'`).run();
db11b.exec(sql("0011_ingles.sql").replace(/ALTER TABLE[^;]+;/, ""));
assert.equal(db11b.prepare("SELECT i18n FROM products WHERE slug = 'specreel'").get().i18n, '{"en":{"title":"Owner title"}}');
console.log("✓ migración 0011 segura (inglés: JSON válido, metas, un ALT por imagen, idempotente, no pisa i18n editado)");

// ── 0012: Edit Pro para YouTube desde $0 (sugerido $12) ──
db.exec(sql("0012_edit_pro_desde_cero.sql"));
db.exec(sql("0012_edit_pro_desde_cero.sql"));
{
	const r = db.prepare("SELECT price_mode, min_price_cents, price_cents FROM products WHERE slug = 'cutpilot'").get();
	if (r.price_cents === 1200) {
		assert.equal(r.price_mode, "pwyw");
		assert.equal(r.min_price_cents, 0);
	}
	console.log("✓ migración 0012 segura (Edit Pro desde $0)");
}

// ── 0013: títulos, taglines, metas y etiquetas por palabra clave (ES + i18n.en) ──
{
	const base13 = () => {
		const d = prodDb();
		for (const f of ["0009_contenido_v5.sql", "0010_nombres_v6.sql", "0011_ingles.sql", "0012_edit_pro_desde_cero.sql"]) d.exec(sql(f));
		return d;
	};
	const db13 = base13();
	const pre13 = rowsOf(db13);
	db13.exec(sql("0013_titulos_keywords.sql"));
	const v13 = rowsOf(db13);
	db13.exec(sql("0013_titulos_keywords.sql"));
	assert.deepEqual(rowsOf(db13), v13, "0013 es idempotente");

	// Nombre (lo que va antes de «:») y la línea de la tarjeta, en los dos idiomas.
	const EXPECT = {
		"anuncios-infinitos": {
			es: ["Anuncios Automáticos: agente de anuncios con inteligencia artificial", "Anuncios con inteligencia artificial: tu agente investiga y escribe los ads"],
			en: ["Automatic Ads: AI advertising agent that writes your ads in Spanish", "AI ads in Spanish: your agent researches your business and writes the ads"],
		},
		specreel: {
			es: ["Motion 3D Video: crea videos explicativos 3D con IA y Claude Code", "Videos explicativos con IA: pides un tema y recibes un MP4 3D narrado"],
			en: ["Motion 3D Video: AI explainer and 3D product videos with Claude Code", "AI explainer videos: give your agent a topic, get a narrated 3D MP4"],
		},
		"specreel-stick": {
			es: ["SpecReel Stick: videos de palitos animados con IA para Reels y TikTok", "Animaciones de palitos con IA: cuentas la idea y recibes el MP4 con música"],
			en: ["SpecReel Stick: AI stick figure animation videos with Claude Code", "Stick figure animation with AI: tell your agent the idea, get the MP4"],
		},
		"pagespeed-forensics": {
			es: ["PageSpeed Forensics: mejora tu PageSpeed móvil con Claude Code", "¿PageSpeed móvil atascado en 85? Encuentra la causa y prueba arreglos"],
			en: ["PageSpeed Forensics: find why your mobile PageSpeed score is low", "Low PageSpeed mobile score? Find the cause with evidence and test fixes"],
		},
		cutpilot: {
			es: ["Edit Pro para YouTube: edita con IA tus videos hablados en español", "Edita con IA tus videos en español: quita muletillas y silencios, subtitula"],
			en: ["Edit Pro for YouTube: AI video editor for Spanish talking videos", "AI video editor for Spanish videos: cuts filler words and silences"],
		},
		"motor-creativo-claude-code": {
			es: ["Creative Factory: 13 agentes de IA para diseño gráfico, video y PDF", "Agentes de IA para diseño gráfico: pides la pieza y Claude Code la produce"],
			en: ["Creative Factory: 13 AI agents for graphic design, video and PDF", "AI agents for graphic design: ask in Spanish and Claude Code makes it"],
		},
	};
	// Palabra clave principal: en el título o la línea, y en el meta título o la meta descripción.
	const KEYWORD = {
		"anuncios-infinitos": { es: ["anuncios con inteligencia artificial", "anuncios con inteligencia artificial"], en: ["ai advertising agent", "ai advertising agent"] },
		specreel: { es: ["videos explicativos con ia", "videos explicativos con ia"], en: ["ai explainer", "ai explainer"] },
		"specreel-stick": { es: ["videos de palitos animados", "videos de palitos animados"], en: ["stick figure animation", "stick figure animation"] },
		"pagespeed-forensics": { es: ["pagespeed móvil", "pagespeed móvil"], en: ["mobile pagespeed score", "pagespeed insights mobile score"] },
		cutpilot: { es: ["edita con ia", "videos para youtube con ia"], en: ["ai video editor", "ai video editor"] },
		"motor-creativo-claude-code": { es: ["agentes de ia para diseño gráfico", "agentes de ia para diseño gráfico"], en: ["ai agents for graphic design", "ai agents for graphic design"] },
	};
	const len = (s) => [...s].length;
	const CHANGED = ["title", "tagline", "meta_title", "meta_description", "tags", "i18n", "updated_at"];
	const EN_TOUCHED = ["title", "tagline", "meta_title", "meta_description", "tags"];
	assert.deepEqual(Object.keys(v13).sort(), Object.keys(EXPECT).sort(), "los 6 productos activos");
	for (const [slug, r] of Object.entries(v13)) {
		const p = pre13[slug];
		for (const k of Object.keys(p)) if (!CHANGED.includes(k)) assert.equal(r[k], p[k], `${slug}: 0013 no toca ${k}`);
		const en = JSON.parse(r.i18n).en;
		const enPre = JSON.parse(p.i18n).en;
		for (const k of Object.keys(enPre)) if (!EN_TOUCHED.includes(k)) assert.deepEqual(en[k], enPre[k], `${slug}: 0013 no toca i18n.en.${k}`);
		assert.deepEqual(Object.keys(en).sort(), Object.keys(enPre).sort(), `${slug}: i18n.en con las mismas claves`);
		const es = { title: r.title, tagline: r.tagline, meta_title: r.meta_title, meta_description: r.meta_description, tags: JSON.parse(r.tags) };
		for (const [lang, f] of [["es", es], ["en", en]]) {
			const tag = `${slug} (${lang})`;
			assert.deepEqual([f.title, f.tagline], EXPECT[slug][lang], `${tag}: título y línea de la tarjeta`);
			const name = (lang === "es" ? p.title : enPre.title).split(":")[0];
			assert.equal(f.title.split(":")[0], name, `${tag}: el nombre de marca no cambia`);
			assert.ok(len(f.title) <= 70, `${tag}: title ≤ 70 (${len(f.title)})`);
			assert.ok(len(f.tagline) <= 75, `${tag}: tagline ≤ 75 (${len(f.tagline)})`);
			assert.ok(len(f.meta_title) <= 60, `${tag}: meta_title ≤ 60 (${len(f.meta_title)})`);
			assert.ok(len(f.meta_description) >= 120 && len(f.meta_description) <= 160, `${tag}: meta_description 120–160 (${len(f.meta_description)})`);
			assert.ok(Array.isArray(f.tags) && f.tags.length >= 5 && f.tags.length <= 7 && f.tags.every((t) => typeof t === "string" && t.trim()), `${tag}: 5–7 etiquetas`);
			assert.equal(new Set(f.tags.map((t) => t.toLowerCase())).size, f.tags.length, `${tag}: etiquetas sin repetir`);
			const [kwTop, kwMeta] = KEYWORD[slug][lang];
			assert.ok(`${f.title} ${f.tagline}`.toLowerCase().includes(kwTop), `${tag}: «${kwTop}» en el título o la línea`);
			assert.ok(`${f.meta_title} ${f.meta_description}`.toLowerCase().includes(kwMeta), `${tag}: «${kwMeta}» en las metas`);
			assert.ok(!/^YouTube/i.test(f.title) && !/claude/i.test(name), `${tag}: sin «YouTube» al inicio ni «Claude» en el nombre`);
		}
		assert.ok(r.title !== p.title && r.tagline !== p.tagline, `${slug}: título y línea cambian`);
	}
	// Honestidad: Anuncios escribe prompts y textos (no publica ni genera imágenes); Edit Pro y Anuncios avisan del español.
	const an13 = v13["anuncios-infinitos"];
	const anText = [an13.title, an13.tagline, an13.meta_title, an13.meta_description, an13.tags, an13.i18n].join(" ");
	assert.ok(!/\bpublica|genera (imágenes|videos)|automatiza tus (ads|anuncios)|publishes|generates (images|videos)/i.test(anText), "Anuncios: no promete publicar ni generar imágenes");
	for (const s of ["anuncios-infinitos", "cutpilot"]) {
		const en = JSON.parse(v13[s].i18n).en;
		assert.ok(/Spanish/.test(en.title) && /Spanish/.test(en.tagline) && /Spanish/.test(en.meta_title) && /Spanish/.test(en.meta_description), `${s}: en inglés avisa que es en español`);
	}
	const ep13 = v13.cutpilot;
	assert.ok(/español/.test(ep13.title) && /español/.test(ep13.tagline) && /español/.test(ep13.meta_title) && /español/.test(ep13.meta_description), "Edit Pro: solo videos en español, a la vista");
	assert.ok(/Spanish/.test(JSON.parse(v13["motor-creativo-claude-code"].i18n).en.meta_description), "Creative Factory: agentes en español");
	assert.ok(!/garantiza|\b100\b/i.test(v13["pagespeed-forensics"].title + v13["pagespeed-forensics"].tagline + v13["pagespeed-forensics"].meta_description), "PageSpeed: no promete 100");
	const enAll = Object.values(v13).map((r) => JSON.parse(r.i18n).en);
	for (const en of enAll) assert.ok(!/\b(para|con|que|los|las|una|del)\b/.test([en.title, en.tagline, en.meta_title, en.meta_description, ...en.tags].join(" ")), `${en.title}: sin español en el inglés`);

	// Lo que el dueño editó a mano no se pisa (campo por campo); lo demás sí se actualiza.
	const dbOwn13 = base13();
	dbOwn13.exec(`
		UPDATE products SET title = 'Anuncios Automáticos: título del dueño' WHERE slug = 'anuncios-infinitos';
		UPDATE products SET tagline = 'Línea del dueño.' WHERE slug = 'specreel';
		UPDATE products SET tags = '["etiqueta del dueño"]' WHERE slug = 'cutpilot';
		UPDATE products SET i18n = json_set(i18n, '$.en.title', 'Creative Factory: owner title') WHERE slug = 'motor-creativo-claude-code';
		UPDATE products SET i18n = json_set(i18n, '$.en.tags', json('["owner tag"]')) WHERE slug = 'specreel-stick';
		UPDATE products SET meta_description = 'Meta descripción propia del dueño.' WHERE slug = 'pagespeed-forensics';
	`);
	// Mismas etiquetas que en producción pero guardadas con otro formato (espacios): se reconocen y se actualizan.
	const anTagsPre = JSON.parse(pre13["anuncios-infinitos"].tags);
	dbOwn13.prepare("UPDATE products SET tags = ? WHERE slug = 'anuncios-infinitos'").run(JSON.stringify(anTagsPre, null, 2));
	dbOwn13.exec(sql("0013_titulos_keywords.sql"));
	const o13 = rowsOf(dbOwn13);
	assert.equal(o13["anuncios-infinitos"].title, "Anuncios Automáticos: título del dueño");
	assert.equal(o13["anuncios-infinitos"].tagline, EXPECT["anuncios-infinitos"].es[1], "el resto de la ficha sí se actualiza");
	assert.deepEqual(JSON.parse(o13["anuncios-infinitos"].tags), JSON.parse(v13["anuncios-infinitos"].tags), "etiquetas iguales con otro formato: se actualizan");
	assert.equal(o13.specreel.tagline, "Línea del dueño.");
	assert.equal(o13.specreel.title, EXPECT.specreel.es[0]);
	assert.equal(o13.cutpilot.tags, '["etiqueta del dueño"]');
	assert.equal(o13.cutpilot.title, EXPECT.cutpilot.es[0]);
	assert.equal(o13["pagespeed-forensics"].meta_description, "Meta descripción propia del dueño.");
	const cfOwn = JSON.parse(o13["motor-creativo-claude-code"].i18n).en;
	assert.equal(cfOwn.title, "Creative Factory: owner title");
	assert.equal(cfOwn.tagline, EXPECT["motor-creativo-claude-code"].en[1]);
	const stOwn = JSON.parse(o13["specreel-stick"].i18n).en;
	assert.deepEqual(stOwn.tags, ["owner tag"]);
	assert.equal(stOwn.title, EXPECT["specreel-stick"].en[0]);
	// Sin inglés (i18n vacío, o texto inválido): no falla ni inventa un JSON.
	const dbNo = base13();
	dbNo.exec("UPDATE products SET i18n = '{}' WHERE slug = 'specreel'; UPDATE products SET i18n = 'roto' WHERE slug = 'cutpilot';");
	dbNo.exec(sql("0013_titulos_keywords.sql"));
	assert.equal(dbNo.prepare("SELECT i18n FROM products WHERE slug = 'specreel'").get().i18n, "{}");
	assert.equal(dbNo.prepare("SELECT i18n FROM products WHERE slug = 'cutpilot'").get().i18n, "roto");
	console.log("✓ migración 0013 segura (palabras clave: longitudes, idempotente, ES + i18n.en, no pisa lo editado a mano)");
}

// ── 0015: rebranding SpecReel Stick → Stick Sketch (slug nuevo, USD 36.90 fijo, mismo ZIP; el viejo se retira) ──
{
	// Las migraciones intermedias que existan (p. ej. una 0014 que llegue en paralelo) se aplican igual que en producción.
	const between = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql") && f > "0013_titulos_keywords.sql" && f < "0015").sort();
	const ZIP = { key: "products/specreel-stick/edb6bb36287071a7/specreel-stick-1.0.zip", name: "specreel-stick-1.0.zip", size: 2635491 };
	const base15 = () => {
		const d = prodDb();
		for (const f of ["0009_contenido_v5.sql", "0010_nombres_v6.sql", "0011_ingles.sql", "0012_edit_pro_desde_cero.sql", "0013_titulos_keywords.sql", ...between]) d.exec(sql(f));
		// Producción hoy: SpecReel Stick a la venta con su ZIP real (provision/manifest.json) y una lista de espera.
		d.prepare("UPDATE products SET file_key = ?, file_name = ?, file_size = ?, availability = 'available', active = 1 WHERE slug = 'specreel-stick'").run(ZIP.key, ZIP.name, ZIP.size);
		d.prepare("INSERT INTO waitlist (id, product_id, email, created_at) VALUES ('w-stick', (SELECT id FROM products WHERE slug = 'specreel-stick'), 'espera@x.y', 1)").run();
		return d;
	};
	const all = (d) => Object.fromEntries(d.prepare("SELECT * FROM products").all().map((r) => [r.slug, { ...r }]));
	const len = (s) => [...s].length;

	const db15 = base15();
	const pre15 = all(db15);
	assert.ok(!pre15["stick-sketch"], "antes de la 0015 no existe stick-sketch");
	db15.exec(sql("0015_stick_sketch.sql"));
	const v15 = all(db15);
	db15.exec(sql("0015_stick_sketch.sql"));
	assert.deepEqual(all(db15), v15, "0015 es idempotente");

	const ss = v15["stick-sketch"];
	const old = v15["specreel-stick"];
	assert.ok(ss, "crea stick-sketch");
	// El viejo: retirado, no borrado; solo cambian active y updated_at. Los demás productos no se tocan.
	assert.equal(old.active, 0, "specreel-stick queda retirado");
	for (const k of Object.keys(old)) if (!["active", "updated_at"].includes(k)) assert.equal(old[k], pre15["specreel-stick"][k], `specreel-stick: 0015 no toca ${k}`);
	for (const [slug, r] of Object.entries(v15)) if (!["stick-sketch", "specreel-stick"].includes(slug)) assert.deepEqual(r, pre15[slug], `${slug}: sin cambios`);
	assert.equal(db15.prepare("SELECT COUNT(*) AS n FROM waitlist WHERE product_id = ?").get(old.id).n, 1, "la lista de espera del viejo se conserva");
	assert.equal(db15.prepare("SELECT COUNT(*) AS n FROM reviews WHERE product_id = ?").get(ss.id).n, 0, "sin reseñas copiadas");

	// Precio: USD 36.90 fijo, sin precio anterior (nunca se cobró) ni ventas de fuera.
	assert.deepEqual(
		[ss.price_cents, ss.price_mode, ss.kind, ss.currency, ss.compare_at_cents, ss.sales_offset, ss.min_price_cents, ss.max_price_cents, ss.active],
		[3690, "fixed", "paid", "usd", null, 0, 0, null, 1],
	);
	// Archivo: el mismo ZIP del viejo (no se vuelve a subir) → a la venta desde el primer momento.
	assert.deepEqual([ss.file_key, ss.file_name, ss.file_size, ss.availability], [ZIP.key, ZIP.name, ZIP.size, "available"]);
	const manifest = JSON.parse(readFileSync(join(root, "provision", "manifest.json"), "utf8")).files;
	const entry = manifest.find((f) => f.slug === "stick-sketch");
	assert.ok(entry && entry.fileName === ZIP.name && entry.size === ZIP.size && ZIP.key.includes(`/${entry.sha256.slice(0, 16)}/`), "manifiesto: mismo ZIP y mismo SHA-256");
	assert.ok(!manifest.some((f) => f.slug === "specreel-stick"), "el slug retirado sale del manifiesto");
	assert.equal(ss.compat, old.compat, "mismos logos «Funciona con»");
	assert.deepEqual(JSON.parse(ss.compat).works, ["claude-code", "codex", "python", "node", "ffmpeg", "windows", "macos", "linux"]);
	assert.equal(ss.sort_order, old.sort_order, "mismo lugar en el catálogo");
	assert.equal(ss.download_limit, old.download_limit);
	assert.equal(ss.category, "video");

	// Ficha en español e inglés.
	const en = JSON.parse(ss.i18n).en;
	assert.equal(db15.prepare("SELECT json_valid(i18n) AS ok FROM products WHERE slug = 'stick-sketch'").get().ok, 1);
	assert.deepEqual(Object.keys(en).sort(), [...EN_KEYS].sort(), "i18n.en con todas las claves");
	const esF = { ...ss, highlights: JSON.parse(ss.highlights), specs: JSON.parse(ss.specs), faq: JSON.parse(ss.faq), tags: JSON.parse(ss.tags) };
	const images = JSON.parse(ss.images);
	for (const [lang, f] of [["es", esF], ["en", en]]) {
		const tag = `stick-sketch (${lang})`;
		assert.ok(f.title.startsWith("Stick Sketch: "), `${tag}: el nombre nuevo encabeza el título`);
		assert.ok(len(f.title) <= 70, `${tag}: title ≤ 70 (${len(f.title)})`);
		assert.ok(len(f.tagline) <= 75, `${tag}: tagline ≤ 75 (${len(f.tagline)})`);
		assert.ok(len(f.summary) <= 220, `${tag}: summary ≤ 220`);
		assert.ok(len(f.meta_title) <= 60, `${tag}: meta_title ≤ 60 (${len(f.meta_title)})`);
		assert.ok(len(f.meta_description) >= 120 && len(f.meta_description) <= 160, `${tag}: meta_description 120–160 (${len(f.meta_description)})`);
		assert.ok(f.highlights.length >= 4 && f.highlights.length <= 6, `${tag}: 4–6 beneficios`);
		assert.ok(f.faq.length >= 3 && f.faq.every((x) => x.q.endsWith("?") && x.a), `${tag}: FAQ`);
		assert.ok(f.tags.length >= 5 && f.tags.length <= 7 && new Set(f.tags.map((t) => t.toLowerCase())).size === f.tags.length, `${tag}: 5–7 etiquetas sin repetir`);
		assert.ok(!/\$\s?\d|36[.,]90|USD/.test(f.description), `${tag}: sin precios en la descripción`);
		assert.ok(!/SpecReel Stick/.test([f.title, f.tagline, f.meta_title, f.meta_description, ...f.tags].join(" ")), `${tag}: el nombre viejo no aparece como nombre del producto`);
		assert.ok(!/^YouTube/i.test(f.title) && !/claude|codex/i.test(f.title.split(":")[0]), `${tag}: sin marcas ajenas en el nombre`);
	}
	assert.ok(ss.title.toLowerCase().includes("videos de muñequitos de palo con ia"), "ES: palabra clave en el título");
	assert.ok(ss.meta_title.toLowerCase().includes("videos de muñequitos de palo con ia") && ss.meta_description.toLowerCase().includes("muñequitos de palo con ia"));
	assert.ok(esF.tags.includes("videos de palitos animados"), "ES: conserva la palabra clave de la 0013");
	assert.ok(en.title.toLowerCase().includes("ai stick figure animation") && en.meta_title.toLowerCase().includes("ai stick figure animation"), "EN: palabra clave");
	assert.equal(en.specs.length, esF.specs.length, "mismas filas en la ficha técnica");
	assert.deepEqual(esF.specs.map((s) => s.label), ["Versión", "Formato", "Funciona con", "Requisitos", "Sistemas", "Salida", "Idioma", "Licencia"]);
	assert.equal(en.image_alts.length, images.length, "un ALT en inglés por imagen");
	// El nombre interno (dentro del ZIP) se dice con naturalidad, una vez en la descripción y en la FAQ.
	assert.equal(count(ss.description, "En el ZIP la skill se llama SpecReel Stick"), 1);
	assert.equal(count(en.description, "Inside the ZIP the skill is called SpecReel Stick"), 1);
	assert.ok(esF.faq.some((f) => f.q === "¿Por qué el ZIP dice SpecReel Stick?") && en.faq.some((f) => f.q === "Why does the ZIP say SpecReel Stick?"));
	assert.ok(esF.faq.some((f) => f.q === "¿Necesito tener Motion 3D Video?"), "la FAQ nombra a Motion 3D Video por su nombre actual");
	for (const h of ["## El problema que resuelve", "## Cómo funciona, en 3 pasos", "## Qué recibes", "## Para quién es", "## Requisitos", "## Importante"])
		assert.equal(count(ss.description, h), 1, `ES: sección «${h}»`);
	// Sin restos en español en lo que ve el comprador en inglés (los nombres y rutas citados sí).
	const visibleEn = [en.title, en.tagline, en.meta_title, en.meta_description, en.description, ...en.highlights, ...en.faq.flatMap((f) => [f.q, f.a]), ...en.tags].join("\n");
	assert.ok(!/\b(para|con|que|los|las|una|del)\b/.test(visibleEn.replace(/«[^»]*»|"[^"]*"/g, "")), "EN: sin frases en español");
	// Imágenes: portada + 2 pantallas del slug nuevo, todas en disco (y las de la tarjeta, el inglés y Merchant).
	assert.deepEqual(images.map((i) => i.src), ["cover", "screen-1", "screen-2"].map((f) => `/market/static/products/stick-sketch/${f}.webp`));
	assert.ok(images.every((i) => i.alt.length > 20));
	const pub = join(root, "public", "market", "static", "products", "stick-sketch");
	for (const f of ["cover.webp", "cover-800.webp", "cover-animada.webp", "cover-animada-800.webp", "screen-1.webp", "screen-2.webp", "en/cover.webp", "en/cover-800.webp", "en/cover-animada.webp", "en/cover-animada-800.webp", "merchant.jpg", "merchant-2.jpg"])
		assert.ok(existsSync(join(pub, f)), `falta public/…/stick-sketch/${f}`);

	// Guardas. a) stick-sketch ya existe (p. ej. creada a mano en el admin): no se pisa y, como no tiene el mismo archivo,
	// el viejo sigue a la venta.
	const dbOwn = base15();
	dbOwn.prepare("INSERT INTO products (id, slug, title, price_cents, currency, kind, active, created_at, updated_at) VALUES ('own', 'stick-sketch', 'Del dueño', 4200, 'usd', 'paid', 1, 1, 1)").run();
	dbOwn.exec(sql("0015_stick_sketch.sql"));
	const o15 = all(dbOwn);
	assert.deepEqual([o15["stick-sketch"].title, o15["stick-sketch"].price_cents], ["Del dueño", 4200]);
	assert.equal(o15["specreel-stick"].active, 1, "sin el mismo archivo en el nuevo, el viejo no se retira");
	// b) Base sin el ZIP (local, pruebas): el nuevo entra como «Próximamente» y sin archivo.
	const dbNoFile = base15();
	dbNoFile.exec("UPDATE products SET file_key = NULL, file_name = NULL, file_size = NULL, availability = 'coming_soon' WHERE slug = 'specreel-stick'");
	dbNoFile.exec(sql("0015_stick_sketch.sql"));
	const n15 = all(dbNoFile);
	assert.deepEqual([n15["stick-sketch"].availability, n15["stick-sketch"].file_key, n15["stick-sketch"].active], ["coming_soon", null, 1]);
	// c) Sin specreel-stick en la base: crea el nuevo con los logos de hoy y no falla.
	const dbNone = base15();
	dbNone.exec("DELETE FROM waitlist; DELETE FROM products WHERE slug = 'specreel-stick'");
	dbNone.exec(sql("0015_stick_sketch.sql"));
	const z15 = all(dbNone)["stick-sketch"];
	assert.deepEqual([z15.availability, z15.file_key, z15.sort_order, z15.download_limit], ["coming_soon", null, 8, 5]);
	assert.deepEqual(JSON.parse(z15.compat).works, JSON.parse(ss.compat).works);
	console.log("✓ migración 0015 segura (Stick Sketch: USD 36.90 sin tachado, mismo ZIP, viejo retirado sin borrar, ES + EN, idempotente, guardas)");
}

// ── 0017: producto nuevo Reel 4K Studio (USD 47 fijo por excepción del dueño, «Próximamente» hasta subir el ZIP) ──
{
	const slug = "reel-4k-studio";
	const prev = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql") && f >= "0009" && f < "0017").sort();
	const base17 = () => {
		const d = prodDb();
		for (const f of prev) d.exec(sql(f));
		return d;
	};
	const all = (d) => Object.fromEntries(d.prepare("SELECT * FROM products").all().map((r) => [r.slug, { ...r }]));
	const len = (s) => [...s].length;

	const db17 = base17();
	const pre17 = all(db17);
	assert.ok(!pre17[slug], "antes de la 0017 no existe reel-4k-studio");
	db17.exec(sql("0017_reel_4k_studio.sql"));
	const v17 = all(db17);
	db17.exec(sql("0017_reel_4k_studio.sql"));
	assert.deepEqual(all(db17), v17, "0017 es idempotente");
	for (const [s, r] of Object.entries(v17)) if (s !== slug) assert.deepEqual(r, pre17[s], `${s}: sin cambios`);

	const p = v17[slug];
	// Precio: USD 47 fijo (excepción del dueño a la regla de > USD 77), sin tachado ni ventas de fuera; sin archivo.
	assert.deepEqual(
		[p.price_cents, p.price_mode, p.kind, p.currency, p.compare_at_cents, p.sales_offset, p.min_price_cents, p.max_price_cents, p.active],
		[4700, "fixed", "paid", "usd", null, 0, 0, null, 1],
	);
	assert.deepEqual([p.file_key, p.file_name, p.file_size, p.availability], [null, null, null, "coming_soon"]);
	assert.deepEqual([p.category, p.badge, p.download_limit, p.video_id], ["video", "Versión 3", 5, ""]);
	const compat = JSON.parse(p.compat);
	assert.deepEqual(compat.works, ["claude-code", "node", "python", "ffmpeg", "windows", "macos", "linux"]);
	assert.deepEqual(compat.includes, ["title-sequence", "editorial-collage-explainer", "parallax-landscape-animation", "character-explainer-animation", "action-scene-3d", "product-spot", "video-director"].map((s) => `agent|${s}`));

	// Ficha en español e inglés.
	const en = JSON.parse(p.i18n).en;
	assert.deepEqual(Object.keys(en).sort(), [...EN_KEYS].sort(), "i18n.en con todas las claves");
	const esF = { ...p, highlights: JSON.parse(p.highlights), specs: JSON.parse(p.specs), faq: JSON.parse(p.faq), tags: JSON.parse(p.tags) };
	const images = JSON.parse(p.images);
	assert.ok(!/opus|fable|youtube/i.test(p.images + (p.i18n ?? "")), "alt de imágenes sin «Opus», «Fable» ni «YouTube»");
	for (const [lang, f] of [["es", esF], ["en", en]]) {
		const tag = `${slug} (${lang})`;
		assert.ok(f.title.startsWith("Reel 4K Studio: "), `${tag}: el nombre encabeza el título`);
		assert.ok(!/opus|fable|youtube/i.test(JSON.stringify(f)), `${tag}: sin «Opus», «Fable» ni «YouTube» (marcas ajenas; el PDF no habla de YouTube)`);
		assert.ok(len(f.title) <= 70, `${tag}: title ≤ 70 (${len(f.title)})`);
		assert.ok(len(f.tagline) <= 75, `${tag}: tagline ≤ 75 (${len(f.tagline)})`);
		assert.ok(len(f.summary) <= 220, `${tag}: summary ≤ 220`);
		assert.ok(len(f.meta_title) <= 60, `${tag}: meta_title ≤ 60 (${len(f.meta_title)})`);
		assert.ok(len(f.meta_description) >= 120 && len(f.meta_description) <= 160, `${tag}: meta_description 120–160 (${len(f.meta_description)})`);
		assert.ok(f.highlights.length >= 4 && f.highlights.length <= 6, `${tag}: 4–6 beneficios`);
		assert.ok(f.faq.length >= 3 && f.faq.every((x) => x.q.endsWith("?") && x.a), `${tag}: FAQ`);
		assert.ok(f.tags.length >= 5 && f.tags.length <= 7 && new Set(f.tags.map((t) => t.toLowerCase())).size === f.tags.length, `${tag}: 5–7 etiquetas sin repetir`);
		assert.ok(!/\$\s?\d|\b47\b|USD/.test(f.description), `${tag}: sin precios en la descripción`);
		assert.ok(!/Code Video Studio/.test([f.title, f.tagline, f.meta_title, f.meta_description, ...f.tags].join(" ")), `${tag}: el nombre interno no aparece como nombre del producto`);
		assert.ok(!/anthropic/i.test([f.title, f.tagline, f.meta_title, f.meta_description, ...f.tags].join(" ")), `${tag}: Anthropic no aparece como si fuera la marca`);
		// Cifras de la guía LEEME-PRIMERO (no inventadas): formato, tiempos, tokens, memoria y volumen.
		for (const n of ["30 fps", "4K", "2K", "2,5 GB|2\\.5 GB", "150[.,]000", "400[.,]000", "−14 LUFS"]) assert.ok(new RegExp(n).test(f.description), `${tag}: la descripción cita «${n}» de la guía`);
	}
	assert.equal(count(p.description, "En el ZIP el paquete se llama Code Video Studio V3"), 1);
	assert.equal(count(en.description, "Inside the ZIP the pack is called Code Video Studio V3"), 1);
	assert.ok(esF.faq.some((f) => f.q === "¿Por qué el ZIP dice Code Video Studio V3?") && en.faq.some((f) => f.q === "Why does the ZIP say Code Video Studio V3?"));
	// Producto independiente: la ficha lo dice en la descripción y en la FAQ, en los dos idiomas.
	assert.equal(count(p.description, "no es un producto oficial de Anthropic ni está respaldado por Anthropic"), 1);
	assert.equal(count(en.description, "it is not an official Anthropic product and it is not endorsed by Anthropic"), 1);
	assert.ok(esF.faq[0].q === "¿Es un producto oficial de Anthropic?" && esF.faq[0].a.startsWith("No."));
	assert.ok(en.faq[0].q === "Is this an official Anthropic product?" && en.faq[0].a.startsWith("No."));
	assert.ok(p.title.toLowerCase().includes("videos animados con claude") && p.meta_title.toLowerCase().includes("videos animados con claude") && p.meta_description.toLowerCase().includes("videos animados con claude"), "ES: palabra clave");
	assert.ok(en.meta_title.toLowerCase().includes("animated videos with claude") && en.meta_description.toLowerCase().includes("animated videos with claude"), "EN: palabra clave");
	assert.deepEqual(esF.specs.map((s) => s.label), ["Versión", "Formato", "Funciona con", "Requisitos", "Sistemas", "Salida", "Idioma", "Licencia"]);
	assert.equal(en.specs.length, esF.specs.length, "mismas filas en la ficha técnica");
	assert.equal(en.faq.length, esF.faq.length);
	assert.equal(en.image_alts.length, images.length, "un ALT en inglés por imagen");
	for (const h of ["## El problema que resuelve", "## Las 7 skills", "## Cómo funciona, en 5 pasos", "## Qué recibes", "## Para quién es", "## Requisitos", "## Importante"])
		assert.equal(count(p.description, h), 1, `ES: sección «${h}»`);
	const visibleEn = [en.title, en.tagline, en.meta_title, en.meta_description, en.description, ...en.highlights, ...en.faq.flatMap((f) => [f.q, f.a]), ...en.tags].join("\n");
	assert.ok(!/\b(para|con|que|los|las|una|del)\b/.test(visibleEn.replace(/«[^»]*»|"[^"]*"/g, "")), "EN: sin frases en español");
	// Imágenes: portada + 2 pantallas, todas en disco (y las de la tarjeta, el inglés y Merchant).
	assert.deepEqual(images.map((i) => i.src), ["cover", "screen-1", "screen-2"].map((f) => `/market/static/products/${slug}/${f}.webp`));
	assert.ok(images.every((i) => i.alt.length > 20));
	// Las imágenes en disco y el manifiesto de provisión se comprueban en el bloque de la 0020 (slug nuevo).

	// Guarda: si el slug ya existe (p. ej. creado a mano en el admin), no se pisa.
	const dbOwn = base17();
	dbOwn.prepare("INSERT INTO products (id, slug, title, price_cents, currency, kind, active, created_at, updated_at) VALUES ('own', ?, 'Del dueño', 9900, 'usd', 'paid', 1, 1, 1)").run(slug);
	dbOwn.exec(sql("0017_reel_4k_studio.sql"));
	assert.deepEqual([all(dbOwn)[slug].title, all(dbOwn)[slug].price_cents], ["Del dueño", 9900]);
	console.log("✓ migración 0017 segura (Reel 4K Studio: USD 47 sin tachado, Próximamente, ES + EN, aviso de independencia, idempotente, guarda)");
}

// ── 0018: precio fijo → USD 47 sin tachado; el USD 1.10 de Black Friday va por cupón (pedido del dueño, 2026-11-17) ──
{
	const prev = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql") && f >= "0009" && f < "0018").sort();
	const all = (d) => Object.fromEntries(d.prepare("SELECT * FROM products").all().map((r) => [r.slug, { ...r }]));
	const price = (r) => [r.price_mode, r.price_cents, r.compare_at_cents, r.min_price_cents];
	const M = "0018_precio_47_black_friday.sql";
	const db18 = prodDb();
	for (const f of prev) db18.exec(sql(f));
	// Precios de producción del 2026-11-17 (/market/estado.json).
	const set = db18.prepare("UPDATE products SET price_mode = ?, price_cents = ?, compare_at_cents = ?, min_price_cents = ? WHERE slug = ?");
	const prod = {
		"anuncios-infinitos": ["fixed", 3333, 7690, 0],
		specreel: ["fixed", 1200, 3690, 0],
		"stick-sketch": ["fixed", 3690, null, 0],
		"pagespeed-forensics": ["pwyw", 900, null, 0],
		cutpilot: ["pwyw", 1200, null, 0],
		"motor-creativo-claude-code": ["pwyw", 1900, null, 0],
	};
	for (const [slug, p] of Object.entries(prod)) set.run(...p, slug);
	const pre18 = all(db18);
	db18.exec(sql(M));
	const v18 = all(db18);
	db18.exec(sql(M));
	assert.deepEqual(all(db18), v18, "0018 es idempotente");
	const changed = ["anuncios-infinitos", "specreel", "stick-sketch"];
	for (const s of changed) assert.deepEqual(price(v18[s]), ["fixed", 4700, null, 0], `${s}: USD 47 sin tachado`);
	assert.deepEqual(price(v18["reel-4k-studio"]), ["fixed", 4700, null, 0], "reel-4k-studio sigue en USD 47");
	for (const [s, r] of Object.entries(v18))
		if (!changed.includes(s)) assert.deepEqual(r, pre18[s], `${s}: fila sin cambios`);
		else for (const k of Object.keys(r)) if (!["price_cents", "compare_at_cents", "updated_at"].includes(k)) assert.deepEqual(r[k], pre18[s][k], `${s}.${k} sin cambios`);
	// Ningún producto de pago y precio fijo queda con tachado (la oferta es el cupón, no un «antes»).
	assert.ok(Object.values(v18).every((r) => r.compare_at_cents === null || r.price_mode !== "fixed" || !r.active), "sin tachados");
	// Guarda: un producto en pago libre o que el dueño ya puso en USD 47 o más no se toca.
	const dbG = prodDb();
	for (const f of prev) dbG.exec(sql(f));
	dbG.prepare("UPDATE products SET price_mode = 'pwyw', price_cents = 500, compare_at_cents = NULL WHERE slug = 'specreel'").run();
	dbG.prepare("UPDATE products SET price_mode = 'fixed', price_cents = 9900, compare_at_cents = NULL WHERE slug = 'stick-sketch'").run();
	const preG = all(dbG);
	dbG.exec(sql(M));
	const g = all(dbG);
	assert.deepEqual([g.specreel, g["stick-sketch"]], [preG.specreel, preG["stick-sketch"]], "0018 no toca pago libre ni precios ≥ USD 47");
	console.log("✓ migración 0018 segura (precio fijo a USD 47 sin tachado; pago libre sin cambios; idempotente, guardas)");
}

// ── 0019: Anuncios Automáticos vuelve a USD 33.33 con 76.90 tachado (corrección del dueño, 2026-11-17) ──
{
	const prev = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql") && f >= "0009" && f < "0019").sort();
	const all = (d) => Object.fromEntries(d.prepare("SELECT * FROM products").all().map((r) => [r.slug, { ...r }]));
	const M = "0019_anuncios_33.sql";
	const db19 = prodDb();
	for (const f of prev) db19.exec(sql(f));
	// Estado de producción después de la 0018: precio fijo a USD 47 sin tachado.
	db19.exec("UPDATE products SET price_mode = 'fixed', price_cents = 4700, compare_at_cents = NULL WHERE slug IN ('anuncios-infinitos', 'specreel', 'stick-sketch')");
	const pre = all(db19);
	db19.exec(sql(M));
	const v = all(db19);
	db19.exec(sql(M));
	assert.deepEqual(all(db19), v, "0019 es idempotente");
	const a = v["anuncios-infinitos"];
	assert.deepEqual([a.price_mode, a.price_cents, a.compare_at_cents], ["fixed", 3333, 7690], "anuncios-infinitos: 33.33 con 76.90 tachado");
	for (const [s, r] of Object.entries(v)) if (s !== "anuncios-infinitos") assert.deepEqual(r, pre[s], `${s}: sin cambios`);
	// Guarda: si el dueño ya le cambió el precio en el admin, no se toca.
	const dbG = prodDb();
	for (const f of prev) dbG.exec(sql(f));
	dbG.exec("UPDATE products SET price_mode = 'fixed', price_cents = 2900, compare_at_cents = NULL WHERE slug = 'anuncios-infinitos'");
	const preG = all(dbG);
	dbG.exec(sql(M));
	assert.deepEqual(all(dbG), preG, "0019 no pisa un precio puesto a mano");
	console.log("✓ migración 0019 segura (Anuncios Automáticos: 33.33 con 76.90 tachado; resto sin cambios; idempotente, guarda)");
}

// ── 0020: «Reel 4K Studio» pasa a llamarse «Video 4K» (slug video-4k-con-claude; pedido del dueño, 2026-11-17) ──
{
	const OLD = "reel-4k-studio";
	const slug = "video-4k-con-claude";
	const prev = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql") && f >= "0009" && f < "0020").sort();
	const base = () => {
		const d = prodDb();
		for (const f of prev) d.exec(sql(f));
		// Estado de producción: el ZIP ya está subido y el producto, a la venta.
		d.prepare("UPDATE products SET file_key = 'products/reel-4k-studio/9402976db8841055/reel-4k-studio-3.0.zip', file_name = 'reel-4k-studio-3.0.zip', file_size = 10613935, availability = 'available' WHERE slug = ?").run(OLD);
		return d;
	};
	const all = (d) => Object.fromEntries(d.prepare("SELECT * FROM products").all().map((r) => [r.slug, { ...r }]));
	const len = (s) => [...s].length;
	const M = "0020_video_4k_con_claude.sql";

	const db = base();
	const pre = all(db);
	db.exec(sql(M));
	const v = all(db);
	db.exec(sql(M));
	assert.deepEqual(all(db), v, "0020 es idempotente");
	assert.ok(!v[OLD] && v[slug], "la fila cambió de slug");
	for (const [s, r] of Object.entries(v)) if (s !== slug) assert.deepEqual(r, pre[s], `${s}: sin cambios`);

	const a = pre[OLD];
	const p = v[slug];
	// Misma fila: id, precio, archivo, disponibilidad, compat, orden, ventas y fecha de creación intactos.
	for (const k of ["id", "price_cents", "compare_at_cents", "price_mode", "kind", "currency", "file_key", "file_name", "file_size", "availability", "active", "compat", "sort_order", "sales_offset", "created_at", "category", "badge", "accent", "video_id", "download_limit"])
		assert.deepEqual(p[k], a[k], `0020 no cambia ${k}`);

	const en = JSON.parse(p.i18n).en;
	assert.deepEqual(Object.keys(en).sort(), [...EN_KEYS].sort(), "i18n.en con todas las claves");
	const esF = { ...p, highlights: JSON.parse(p.highlights), specs: JSON.parse(p.specs), faq: JSON.parse(p.faq), tags: JSON.parse(p.tags) };
	assert.ok(!/Reel 4K Studio/.test(JSON.stringify(p)) && !/reel-4k-studio/.test(p.images), "sin rastros del nombre viejo (el archivo sí conserva su nombre)");
	for (const [lang, f] of [["es", esF], ["en", en]]) {
		const tag = `${slug} (${lang})`;
		assert.ok(f.title.startsWith("Video 4K: "), `${tag}: el nombre encabeza el título`);
		assert.ok(!/por Claude|by Claude/i.test(JSON.stringify(f)), `${tag}: nunca «por Claude» (daría a entender que lo hace Anthropic)`);
		assert.ok(!/anthropic|claude/i.test(f.title.split(":")[0]), `${tag}: ni Claude ni Anthropic en el nombre`);
		assert.ok(len(f.title) <= 70 && len(f.tagline) <= 75 && len(f.summary) <= 220 && len(f.meta_title) <= 60, `${tag}: largos`);
		assert.ok(len(f.meta_description) >= 120 && len(f.meta_description) <= 160, `${tag}: meta_description 120–160`);
		assert.ok(f.highlights.length >= 4 && f.highlights.length <= 6, `${tag}: 4–6 beneficios`);
		assert.ok(f.tags.length >= 5 && f.tags.length <= 7 && new Set(f.tags.map((t) => t.toLowerCase())).size === f.tags.length, `${tag}: 5–7 etiquetas sin repetir`);
		assert.ok(f.faq.length === 9 && f.faq.every((x) => x.q.endsWith("?") && x.a), `${tag}: FAQ con la pregunta de redes al final`);
		for (const red of ["YouTube", "TikTok", "Instagram", "Facebook"]) assert.ok(f.description.includes(red) && f.highlights.some((h) => h.includes(red)), `${tag}: menciona ${red} (formato para redes)`);
		assert.ok(/16:9/.test(f.faq.at(-1).a) && /9:16/.test(f.faq.at(-1).a), `${tag}: la FAQ de redes habla de formato`);
	}
	// Subtítulo: los estilos de las 7 herramientas.
	for (const e of ["Intros", "collage editorial", "paisajes", "personajes", "acción 3D", "anuncios"]) assert.ok(p.tagline.includes(e), `ES: el subtítulo cita «${e}»`);
	for (const e of ["Intros", "editorial collage", "landscapes", "characters", "3D action", "ads"]) assert.ok(en.tagline.includes(e), `EN: el subtítulo cita «${e}»`);
	// Se mantienen el aviso de producto independiente y el nombre interno del ZIP.
	assert.equal(count(p.description, "Video 4K es un producto independiente de Tony Ciencia: funciona con Claude, pero no es un producto oficial de Anthropic ni está respaldado por Anthropic."), 1);
	assert.equal(count(en.description, "Video 4K is an independent product by Tony Ciencia: it works with Claude, but it is not an official Anthropic product and it is not endorsed by Anthropic."), 1);
	assert.ok(esF.faq[0].q === "¿Es un producto oficial de Anthropic?" && esF.faq[0].a.startsWith("No. Video 4K es un producto independiente"));
	assert.ok(en.faq[0].q === "Is this an official Anthropic product?" && en.faq[0].a.startsWith("No. Video 4K is an independent product"));
	assert.equal(count(p.description, "En el ZIP el paquete se llama Code Video Studio V3"), 1);
	assert.equal(count(en.description, "Inside the ZIP the pack is called Code Video Studio V3"), 1);
	assert.ok(p.meta_title.toLowerCase().includes("videos animados con claude") && p.meta_description.toLowerCase().includes("videos animados con claude"), "ES: palabra clave");
	assert.ok(en.meta_title.toLowerCase().includes("animated videos with claude") && en.meta_description.toLowerCase().includes("animated videos with claude"), "EN: palabra clave");
	const visibleEn = [en.title, en.tagline, en.meta_title, en.meta_description, en.description, ...en.highlights, ...en.faq.flatMap((f) => [f.q, f.a]), ...en.tags].join("\n");
	assert.ok(!/\b(para|con|que|los|las|una|del)\b/.test(visibleEn.replace(/«[^»]*»|"[^"]*"/g, "")), "EN: sin frases en español");
	// Imágenes con la ruta nueva, todas en disco (también las de la tarjeta, el inglés y Merchant).
	const images = JSON.parse(p.images);
	assert.deepEqual(images.map((i) => i.src), ["cover", "screen-1", "screen-2"].map((f) => `/market/static/products/${slug}/${f}.webp`));
	assert.equal(en.image_alts.length, images.length);
	const pub = join(root, "public", "market", "static", "products", slug);
	for (const f of ["cover.webp", "cover-800.webp", "cover-animada.webp", "cover-animada-800.webp", "screen-1.webp", "screen-2.webp", "en/cover.webp", "en/cover-800.webp", "en/cover-animada.webp", "en/cover-animada-800.webp", "merchant.jpg"])
		assert.ok(existsSync(join(pub, f)), `falta public/…/${slug}/${f}`);
	assert.ok(!existsSync(join(root, "public", "market", "static", "products", OLD)), "la carpeta vieja ya no existe");
	// Provisión: la entrada pasa al slug nuevo con el MISMO ZIP (mismo nombre de archivo y SHA-256).
	const manifest = JSON.parse(readFileSync(join(root, "provision", "manifest.json"), "utf8")).files;
	assert.ok(manifest.some((f) => f.slug === slug && f.fileName === "reel-4k-studio-3.0.zip" && f.sha256.startsWith("9402976db8841055")), "manifiesto: mismo ZIP con el slug nuevo");
	assert.ok(!manifest.some((f) => f.slug === OLD), "manifiesto: sin el slug viejo");

	// Guarda: si alguien ya creó video-4k-con-claude a mano, no se toca nada.
	const dbG = base();
	dbG.prepare("INSERT INTO products (id, slug, title, price_cents, currency, kind, active, created_at, updated_at) VALUES ('own', ?, 'Del dueño', 9900, 'usd', 'paid', 1, 1, 1)").run(slug);
	const preG = all(dbG);
	dbG.exec(sql(M));
	assert.deepEqual(all(dbG), preG, "0020 no pisa un video-4k-con-claude creado a mano");
	console.log("✓ migración 0020 segura (Reel 4K Studio → Video 4K: misma fila con slug nuevo, redes, estilos, aviso de independencia, idempotente, guarda)");
}

// ── 0021: precio fijo → USD 1.10 con USD 47 tachado, salvo Anuncios Automáticos y los gratis (dueño, 2026-11-17) ──
{
	const prev = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql") && f >= "0009" && f < "0021").sort();
	const all = (d) => Object.fromEntries(d.prepare("SELECT * FROM products").all().map((r) => [r.slug, { ...r }]));
	const M = "0021_todos_a_1_10.sql";
	const SLUGS = ["specreel", "stick-sketch", "video-4k-con-claude"];
	const base = () => {
		const d = prodDb();
		for (const f of prev) d.exec(sql(f));
		// Estado de producción después de la 0020.
		d.exec("UPDATE products SET price_mode = 'fixed', price_cents = 4700, compare_at_cents = NULL WHERE slug IN ('specreel', 'stick-sketch', 'video-4k-con-claude')");
		return d;
	};
	const db = base();
	const pre = all(db);
	db.exec(sql(M));
	const v = all(db);
	db.exec(sql(M));
	assert.deepEqual(all(db), v, "0021 es idempotente");
	for (const s of SLUGS) {
		assert.deepEqual([v[s].price_mode, v[s].price_cents, v[s].compare_at_cents], ["fixed", 110, 4700], `${s}: USD 1.10 con 47 tachado`);
		assert.ok(v[s].price_cents * 0.9 >= 50, `${s}: el cupón de bienvenida no baja del mínimo de Stripe`);
	}
	for (const [s, r] of Object.entries(v)) if (!SLUGS.includes(s)) assert.deepEqual(r, pre[s], `${s}: sin cambios`);
	assert.deepEqual([v["anuncios-infinitos"].price_cents, v["anuncios-infinitos"].compare_at_cents], [3333, 7690], "anuncios-infinitos sigue en 33.33 con 76.90 tachado");
	// Guarda: un precio puesto a mano en el admin no se toca.
	const dbG = base();
	dbG.exec("UPDATE products SET price_cents = 2900 WHERE slug = 'stick-sketch'");
	const preG = all(dbG);
	dbG.exec(sql(M));
	assert.deepEqual(all(dbG)["stick-sketch"], preG["stick-sketch"], "0021 no pisa un precio puesto a mano");
	console.log("✓ migración 0021 segura (precio fijo a USD 1.10 con 47 tachado; Anuncios y gratis sin cambios; idempotente, guarda)");
}

// ── 0022 (columnas) y 0023: Membresía Dorada + subida de USD 1 por venta con tope en USD 47 (dueño, 2026-11-17) ──
{
	const slug = "membresia-dorada";
	const prev = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql") && f >= "0009" && f < "0022").sort();
	const all = (d) => Object.fromEntries(d.prepare("SELECT * FROM products").all().map((r) => [r.slug, { ...r }]));
	const len = (s) => [...s].length;
	const M = "0023_membresia_dorada.sql";
	const RAISE = ["specreel", "stick-sketch", "video-4k-con-claude"];
	const base = () => {
		const d = prodDb();
		for (const f of prev) d.exec(sql(f));
		// Estado de producción después de la 0021.
		d.exec("UPDATE products SET price_mode = 'fixed', price_cents = 110, compare_at_cents = 4700 WHERE slug IN ('specreel', 'stick-sketch', 'video-4k-con-claude')");
		d.exec(sql("0022_membresia_y_subida.sql"));
		return d;
	};

	// 0022: columnas nuevas con valores por defecto que no cambian nada.
	const db = base();
	const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
	for (const c of ["raise_per_sale_cents", "raise_cap_cents", "grants_all"]) assert.ok(cols("products").includes(c), `products.${c}`);
	assert.ok(cols("orders").includes("membership_order_id"), "orders.membership_order_id");
	assert.ok(db.prepare("SELECT * FROM products").all().every((r) => r.grants_all === 0 && r.raise_per_sale_cents === 0 && r.raise_cap_cents === null), "0022 no activa nada por sí sola");

	const pre = all(db);
	assert.ok(!pre[slug], "antes de la 0023 no existe la membresía");
	db.exec(sql(M));
	const v = all(db);
	db.exec(sql(M));
	assert.deepEqual(all(db), v, "0023 es idempotente");

	// Subida por venta: solo los tres de USD 1.10, tope en el precio tachado (47). El resto, sin cambios.
	for (const s of RAISE) {
		assert.deepEqual([v[s].raise_per_sale_cents, v[s].raise_cap_cents, v[s].price_cents, v[s].compare_at_cents], [100, 4700, 110, 4700], `${s}: +USD 1 por venta hasta 47`);
		const { updated_at, raise_per_sale_cents, raise_cap_cents, ...rest } = v[s];
		const { updated_at: u0, raise_per_sale_cents: r0, raise_cap_cents: c0, ...rest0 } = pre[s];
		assert.deepEqual(rest, rest0, `${s}: solo cambia la configuración de subida`);
	}
	for (const [s, r] of Object.entries(v)) if (s !== slug && !RAISE.includes(s)) assert.deepEqual(r, pre[s], `${s}: sin cambios`);
	assert.deepEqual([v["anuncios-infinitos"].price_cents, v["anuncios-infinitos"].compare_at_cents, v["anuncios-infinitos"].raise_per_sale_cents], [3333, 7690, 0], "Anuncios Automáticos: 33.33 con 76.90 tachado y sin subida");

	// La membresía: USD 100 fijo sin tachado, sin archivo, da acceso a todo, primera del catálogo.
	const p = v[slug];
	assert.deepEqual(
		[p.price_cents, p.price_mode, p.kind, p.currency, p.compare_at_cents, p.sales_offset, p.active, p.availability, p.grants_all, p.raise_per_sale_cents, p.sort_order],
		[10000, "fixed", "paid", "usd", null, 0, 1, "available", 1, 0, -1],
	);
	assert.deepEqual([p.file_key, p.file_name, p.file_size], [null, null, null], "sin archivo propio");
	const en = JSON.parse(p.i18n).en;
	assert.deepEqual(Object.keys(en).sort(), [...EN_KEYS].sort(), "i18n.en con todas las claves");
	const esF = { ...p, highlights: JSON.parse(p.highlights), specs: JSON.parse(p.specs), faq: JSON.parse(p.faq), tags: JSON.parse(p.tags) };
	for (const [lang, f] of [["es", esF], ["en", en]]) {
		const tag = `${slug} (${lang})`;
		assert.ok(len(f.title) <= 70, `${tag}: title ≤ 70 (${len(f.title)})`);
		assert.ok(len(f.tagline) <= 75, `${tag}: tagline ≤ 75 (${len(f.tagline)})`);
		assert.ok(len(f.summary) <= 220, `${tag}: summary ≤ 220`);
		assert.ok(len(f.meta_title) <= 60, `${tag}: meta_title ≤ 60 (${len(f.meta_title)})`);
		assert.ok(len(f.meta_description) >= 120 && len(f.meta_description) <= 160, `${tag}: meta_description 120–160 (${len(f.meta_description)})`);
		assert.ok(f.highlights.length >= 4 && f.highlights.length <= 6, `${tag}: 4–6 beneficios`);
		assert.ok(f.faq.length >= 3 && f.faq.every((x) => x.q.endsWith("?") && x.a), `${tag}: FAQ`);
		assert.ok(f.tags.length >= 5 && f.tags.length <= 7 && new Set(f.tags.map((t) => t.toLowerCase())).size === f.tags.length, `${tag}: 5–7 etiquetas sin repetir`);
		// Diseño genérico de boleto dorado: nada de la película ni de sus personajes (marca ajena).
		assert.ok(!/wonka|willy|charlie|chocola|oompa/i.test(JSON.stringify(f) + p.images), `${tag}: sin referencias a la película`);
	}
	assert.equal(en.faq.length, esF.faq.length);
	assert.equal(en.specs.length, esF.specs.length);
	const images = JSON.parse(p.images);
	assert.equal(en.image_alts.length, images.length, "un ALT en inglés por imagen");
	// Imágenes en disco: portada, pantallas, versiones de 800 px y animadas, inglés y Merchant.
	const dir = join(root, "public", "market", "static", "products", slug);
	for (const i of images) assert.ok(existsSync(join(root, "public", i.src.replace(/^\//, ""))), `existe ${i.src}`);
	for (const f of ["cover-800.webp", "cover-animada.webp", "cover-animada-800.webp", "merchant.jpg", "en/cover.webp", "en/cover-800.webp", "en/cover-animada.webp", "en/cover-animada-800.webp"])
		assert.ok(existsSync(join(dir, f)), `existe ${slug}/${f}`);

	// Guardas: un slug creado a mano no se pisa, y una subida ya configurada (o un precio en pago libre) tampoco.
	const dbG = base();
	dbG.prepare("INSERT INTO products (id, slug, title, price_cents, currency, kind, active, created_at, updated_at) VALUES ('own', ?, 'Del dueño', 9900, 'usd', 'paid', 1, 1, 1)").run(slug);
	dbG.exec("UPDATE products SET raise_per_sale_cents = 50, raise_cap_cents = NULL WHERE slug = 'specreel'");
	dbG.exec("UPDATE products SET price_mode = 'pwyw' WHERE slug = 'stick-sketch'");
	dbG.exec(sql(M));
	const g = all(dbG);
	assert.deepEqual([g[slug].title, g[slug].price_cents, g[slug].grants_all], ["Del dueño", 9900, 0], "no pisa un membresia-dorada creado a mano");
	assert.deepEqual([g.specreel.raise_per_sale_cents, g.specreel.raise_cap_cents], [50, null], "no pisa una subida configurada a mano");
	assert.equal(g["stick-sketch"].raise_per_sale_cents, 0, "un producto pasado a pago libre no sube");
	console.log("✓ migraciones 0022 y 0023 seguras (columnas, Membresía Dorada USD 100 ES + EN, subida +1 hasta 47 solo en los tres de 1.10, idempotente, guardas)");
}

// ── 0024: fin de la subida por venta; specreel, stick-sketch y video 4K a USD 7 con 47 tachado (dueño, 2026-11-19) ──
{
	const prev = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql") && f >= "0009" && f < "0024").sort();
	const all = (d) => Object.fromEntries(d.prepare("SELECT * FROM products").all().map((r) => [r.slug, { ...r }]));
	const M = "0024_precio_7_sin_subida.sql";
	const SLUGS = ["specreel", "stick-sketch", "video-4k-con-claude"];
	const base = () => {
		const d = prodDb();
		for (const f of prev.filter((f) => f < "0021")) d.exec(sql(f));
		// Estado de producción después de la 0020 → 0021 → 0022/0023.
		d.exec("UPDATE products SET price_mode = 'fixed', price_cents = 4700, compare_at_cents = NULL WHERE slug IN ('specreel', 'stick-sketch', 'video-4k-con-claude')");
		for (const f of prev.filter((f) => f >= "0021")) d.exec(sql(f));
		return d;
	};
	const db = base();
	db.exec("UPDATE products SET price_cents = 310 WHERE slug = 'video-4k-con-claude'"); // ya subió dos veces
	const pre = all(db);
	for (const s of SLUGS) assert.equal(pre[s].raise_per_sale_cents, 100, `${s}: antes de la 0024 está en el plan de subida`);
	db.exec(sql(M));
	const v = all(db);
	db.exec(sql(M));
	assert.deepEqual(all(db), v, "0024 es idempotente");
	for (const s of SLUGS) {
		assert.deepEqual([v[s].price_mode, v[s].price_cents, v[s].compare_at_cents], ["fixed", 700, 4700], `${s}: USD 7 con 47 tachado`);
		const { updated_at, price_cents, raise_per_sale_cents, raise_cap_cents, ...rest } = v[s];
		const { updated_at: u0, price_cents: p0, raise_per_sale_cents: r0, raise_cap_cents: c0, ...rest0 } = pre[s];
		assert.deepEqual(rest, rest0, `${s}: solo cambia el precio y la subida`);
	}
	assert.ok(Object.values(v).every((r) => r.raise_per_sale_cents === 0 && r.raise_cap_cents === null), "nadie sube de precio por venta");
	for (const [s, r] of Object.entries(v)) if (!SLUGS.includes(s)) assert.deepEqual(r, pre[s], `${s}: sin cambios`);
	assert.deepEqual([v["anuncios-infinitos"].price_cents, v["anuncios-infinitos"].compare_at_cents], [3333, 7690], "Anuncios Automáticos sigue en 33.33 con 76.90 tachado");
	assert.equal(v["membresia-dorada"].price_cents, 10000, "la Membresía Dorada sigue en USD 100");
	// Guarda: un precio puesto a mano fuera del plan de subida no se toca.
	const dbG = base();
	dbG.exec("UPDATE products SET price_cents = 2900, raise_per_sale_cents = 0 WHERE slug = 'stick-sketch'");
	dbG.exec(sql(M));
	assert.equal(all(dbG)["stick-sketch"].price_cents, 2900, "0024 no pisa un precio puesto a mano");
	console.log("✓ migración 0024 segura (USD 7 con 47 tachado en los tres; subida apagada; Anuncios, gratis y membresía sin cambios; idempotente, guarda)");
}
