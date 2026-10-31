#!/usr/bin/env node
// Aplica las migraciones pendientes de D1 en un entorno remoto (lo usa el deploy automático).
// Guarda de seguridad: si 0001_init aparece como pendiente en un entorno que ya tiene tienda, NO se aplica
// nada (fallaría a mitad de camino); hay que registrar 0001 en d1_migrations a mano (ver HANDOFF.md).
//
// Uso: node scripts/ci-migrate.mjs production
import { wrangler } from "./wrangler.mjs";

const envName = process.argv[2];
if (!["preview", "staging", "production"].includes(envName ?? "")) {
	console.error("Uso: node scripts/ci-migrate.mjs preview|staging|production");
	process.exit(1);
}

const list = wrangler(["d1", "migrations", "list", "MARKET_DB", "--remote", "--env", envName], { capture: true });
console.log(list);
if (/0001_init/.test(list)) {
	const tables = wrangler(
		["d1", "execute", "MARKET_DB", "--remote", "--env", envName, "--json", "--command", "SELECT name FROM sqlite_master WHERE type='table' AND name='products'"],
		{ capture: true },
	);
	if (tables.includes('"products"')) {
		console.error(
			"✘ 0001_init figura como pendiente pero la tabla products ya existe: la base se creó sin `migrations apply`.\n" +
				"  No se aplica nada. Registra 0001 en d1_migrations y vuelve a correr el deploy (HANDOFF.md, «Deploy automático»).",
		);
		process.exit(1);
	}
}
if (/No migrations to apply/i.test(list)) {
	console.log("Sin migraciones pendientes.");
	process.exit(0);
}
wrangler(["d1", "migrations", "apply", "MARKET_DB", "--remote", "--env", envName]);
console.log("Migraciones aplicadas.");
