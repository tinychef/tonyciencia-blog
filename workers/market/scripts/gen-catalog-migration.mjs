#!/usr/bin/env node
// Genera migrations/0003_catalogo_v2.sql desde seed/catalog.mjs (se corrió una vez; el archivo queda versionado).
// Volver a correrlo solo tiene sentido ANTES de aplicar la migración en producción: las migraciones aplicadas no se repiten.
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COMING_SOON, COVERS, MERCH, comingSoonInsertSql, merchUpdateSql, prependImagesSql } from "../seed/catalog.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Fecha fija: el archivo generado no cambia entre corridas.
const now = Date.UTC(2026, 9, 31, 12, 0, 0);

const parts = [
	"-- Market Tony v2 — catálogo: vitrina de los productos existentes, portadas nuevas y productos próximos.",
	"-- GENERADO por scripts/gen-catalog-migration.mjs desde seed/catalog.mjs. No editar a mano.",
	"-- Seguro sobre datos reales: solo rellena columnas vacías, antepone portadas (conserva las subidas por el dueño)",
	"-- e inserta productos nuevos con ON CONFLICT(slug) DO NOTHING. No toca precios, títulos, descripciones ni archivos.",
	"",
	...Object.entries(MERCH).map(([slug, m]) => merchUpdateSql(slug, m)),
	"",
	...Object.entries(COVERS).map(([slug, images]) => prependImagesSql(slug, images)),
	"",
	...COMING_SOON.map((p) => comingSoonInsertSql(p, now)),
	"",
];
const file = join(root, "migrations/0003_catalogo_v2.sql");
writeFileSync(file, parts.join("\n"));
console.log(`Escrito ${file}`);
