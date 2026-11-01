#!/usr/bin/env node
// Genera migrations/0005_catalogo_v3.sql desde seed/catalog-v3.json (archivo generado y versionado; no editar a mano).
// Volver a correrlo solo sirve ANTES de aplicar la migración en producción: las migraciones aplicadas no se repiten.
//
// Seguro sobre datos reales:
//  - productos nuevos: INSERT … ON CONFLICT(slug) DO NOTHING (si ya existen, no se tocan). Entran "Próximamente" y
//    sin archivo: pasan a "Disponible" solos cuando su ZIP llega por PUT /market/provision/<slug> (ver provision/).
//  - actualizaciones de ficha: solo mientras el producto siga "Próximamente" (nunca se reescribe uno ya lanzado).
//  - títulos: solo si el título actual es exactamente el anterior (no pisa un cambio hecho a mano en el admin).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cat = JSON.parse(readFileSync(join(root, "seed/catalog-v3.json"), "utf8"));
const now = Date.UTC(2026, 10, 1, 12, 0, 0);
const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => q(JSON.stringify(v));

export function insertSql(p, ts = now, opts = {}) {
	const availability = opts.availability ?? p.availability_before_file ?? "coming_soon";
	const cols = {
		id: q(p.id), slug: q(p.slug), title: q(p.title), summary: q(p.summary), description: q(p.description),
		price_cents: q(p.price_cents), currency: q("usd"), kind: q(p.kind), images: j(p.images),
		file_key: q(opts.fileKey ?? null), file_name: q(opts.fileName ?? null), download_limit: q(p.download_limit ?? 5),
		active: q(1), sort_order: q(p.sort_order ?? 0), created_at: q(ts), updated_at: q(ts),
		tagline: q(p.tagline), category: q(p.category), tags: j(p.tags), badge: q(p.badge ?? ""), accent: q(p.accent ?? ""),
		meta_title: q(p.meta_title), meta_description: q(p.meta_description), highlights: j(p.highlights), specs: j(p.specs), faq: j(p.faq),
		availability: q(availability), price_mode: q(p.price_mode ?? "fixed"), min_price_cents: q(p.min_price_cents ?? 0), max_price_cents: q(p.max_price_cents ?? null),
	};
	return `INSERT INTO products (${Object.keys(cols).join(", ")})\nVALUES (${Object.values(cols).join(", ")})\nON CONFLICT(slug) DO NOTHING;`;
}

export function comingSoonUpdateSql(u) {
	const sets = ["title", "summary", "tagline", "category", "meta_title", "meta_description", "description"]
		.filter((k) => u[k] !== undefined)
		.map((k) => `${k} = ${q(u[k])}`);
	for (const k of ["tags", "highlights", "specs", "faq", "images"]) if (u[k] !== undefined) sets.push(`${k} = ${j(u[k])}`);
	sets.push(`updated_at = ${q(now)}`);
	return `UPDATE products SET ${sets.join(",\n  ")}\nWHERE slug = ${q(u.slug)} AND availability = 'coming_soon' AND file_key IS NULL;`;
}

export const titleFixSql = (t) => `UPDATE products SET title = ${q(t.title)}, updated_at = ${q(now)} WHERE slug = ${q(t.slug)} AND title = ${q(t.title_from)};`;

export const metaFixSql = (m) =>
	`UPDATE products SET meta_description = ${q(m.meta_description)}, updated_at = ${q(now)} WHERE slug = ${q(m.slug)} AND meta_description = ${q(m.meta_description_from)};`;

/** Reemplazo exacto dentro de la descripción (p. ej. un precio escrito a mano que quedó viejo). Si no aparece, no hace nada. */
export const textFixSql = (t) =>
	`UPDATE products SET description = replace(description, ${q(t.from)}, ${q(t.to)}), updated_at = ${q(now)} WHERE slug = ${q(t.slug)} AND instr(description, ${q(t.from)}) > 0;`;

export const CATALOG_V3 = cat;

if (import.meta.url === `file://${process.argv[1]}`) {
	const parts = [
		"-- Market Tony v3 — productos nuevos (repos publicados), ficha de CutPilot con el motor real y título en español de SpecReel.",
		"-- GENERADO por scripts/gen-catalog-v3-migration.mjs desde seed/catalog-v3.json. No editar a mano.",
		"-- Seguro sobre datos reales: inserta con ON CONFLICT(slug) DO NOTHING, reescribe solo fichas «Próximamente» sin archivo",
		"-- y cambia títulos solo si siguen siendo exactamente los anteriores. No toca precios de productos existentes ni archivos.",
		"",
		...cat.new.map((p) => insertSql(p)),
		"",
		...cat.updates.map(comingSoonUpdateSql),
		"",
		...cat.titleFixes.map(titleFixSql),
		"",
		"-- Meta descripciones ≤ 160 caracteres (Google corta las más largas). Solo si siguen siendo las anteriores.",
		...(cat.metaFixes ?? []).map(metaFixSql),
		"",
		"-- Precios escritos a mano dentro de descripciones (quedarían viejos con la oferta): el precio vigente se ve en la ficha.",
		...(cat.textFixes ?? []).map(textFixSql),
		"",
	];
	const file = join(root, "migrations/0005_catalogo_v3.sql");
	writeFileSync(file, parts.join("\n"));
	console.log(`Escrito ${file}`);
}
