#!/usr/bin/env node
// Genera migrations/0011_ingles.sql desde seed/i18n-en.mjs (archivo generado y versionado; no editar a mano).
// Volver a correrlo solo sirve ANTES de aplicar la migración en producción: las migraciones aplicadas no se repiten.
// Para cambiar un texto en inglés después: admin, o una migración nueva con guarda sobre el valor actual.
//
// Seguro sobre datos reales: agrega la columna `i18n` (JSON {"en": {...}}, por defecto '{}') y la llena solo si sigue
// vacía (`i18n = '{}'`). No toca ninguna otra columna salvo updated_at de las filas que llena.
// Comprueba antes de escribir: meta_title ≤ 60, meta_description 120–160, title ≤ 70 y que no haya claves desconocidas.
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { EN } from "../seed/i18n-en.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ts = Date.UTC(2026, 10, 2, 12, 0, 0);
const KEYS = ["title", "tagline", "summary", "meta_title", "meta_description", "description", "highlights", "specs", "faq", "tags", "image_alts"];
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const errors = [];
for (const [slug, t] of Object.entries(EN)) {
	for (const k of Object.keys(t)) if (!KEYS.includes(k)) errors.push(`${slug}: clave desconocida «${k}»`);
	if (t.title.length > 70) errors.push(`${slug}: title de ${t.title.length} (máx. 70)`);
	if (t.meta_title.length > 60) errors.push(`${slug}: meta_title de ${t.meta_title.length} (máx. 60)`);
	if (t.meta_description.length < 120 || t.meta_description.length > 160) errors.push(`${slug}: meta_description de ${t.meta_description.length} (120–160)`);
	if (/\r/.test(t.description) || t.description !== t.description.trim()) errors.push(`${slug}: description con \\r o espacios al borde`);
}
if (errors.length) {
	console.error(errors.join("\n"));
	process.exit(1);
}

const lines = [
	"-- Market Tony — fichas en inglés (pedido del dueño, 2026-11-01). Columna i18n = JSON {\"en\": {...}}: title, tagline,",
	"-- summary, meta_title, meta_description, description, highlights, specs (mismo orden que en español), faq, tags e",
	"-- image_alts (uno por imagen, mismo orden que images). La clave que falte cae al español.",
	"-- GENERADO por scripts/gen-i18n-migration.mjs desde seed/i18n-en.mjs. No editar a mano.",
	"-- Guarda: solo se llena si i18n sigue vacío ('{}'): no pisa lo que se edite después. Sin LIKE (límite de D1).",
	"ALTER TABLE products ADD COLUMN i18n TEXT NOT NULL DEFAULT '{}';",
	"",
];
for (const [slug, t] of Object.entries(EN)) {
	lines.push(`-- ${slug} → ${t.title.split(":")[0]}`);
	lines.push(`UPDATE products SET i18n = json(${q(JSON.stringify({ en: t }))}), updated_at = ${ts} WHERE slug = ${q(slug)} AND i18n = '{}';`);
}
writeFileSync(join(root, "migrations", "0011_ingles.sql"), lines.join("\n") + "\n");
console.log(`✓ migrations/0011_ingles.sql (${Object.keys(EN).length} productos)`);
