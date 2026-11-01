#!/usr/bin/env node
// Genera migrations/0006_lanzamiento_cutpilot_motor.sql desde seed/catalog-v4.json (generado y versionado; no editar a mano).
// Fichas finales de CutPilot (repo estudio-video) y del Motor creativo (repo artcraft-studio-engine).
// Guarda: solo reescribe mientras el producto siga «Próximamente» y sin archivo; el producto pasa a «Disponible»
// cuando su ZIP llega por PUT /market/provision/<slug> (ver provision/).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { comingSoonUpdateSql } from "./gen-catalog-v3-migration.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cat = JSON.parse(readFileSync(join(root, "seed/catalog-v4.json"), "utf8"));
const parts = [
	"-- Market Tony v4 — lanzamiento de CutPilot y del Motor creativo (sin inyección de metadatos de Adobe ni borrado de marcas de IA).",
	"-- GENERADO por scripts/gen-catalog-v4-migration.mjs desde seed/catalog-v4.json. No editar a mano.",
	"-- Solo reescribe fichas que siguen «Próximamente» y sin archivo: nunca pisa un producto ya lanzado.",
	"",
	...cat.launch.map(comingSoonUpdateSql),
	"",
];
const file = join(root, "migrations/0006_lanzamiento_cutpilot_motor.sql");
writeFileSync(file, parts.join("\n"));
console.log(`Escrito ${file}`);
