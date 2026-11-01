#!/usr/bin/env node
// Busca en la base de afiliados (src/data/partners.generated.ts + content/affiliates/extra.json).
//
// Uso:
//   pnpm aff:find <texto>                 busca en nombre, categoría, sitio y notas
//   pnpm aff:find --category <categoría>  lista una categoría (coincidencia parcial, sin tildes)
//   pnpm aff:find --list-categories       categorías con su número de partners
//   pnpm aff:find --all                   toda la base
//   pnpm aff:find <texto> --json          salida JSON (para que la lea el agente)
//   pnpm aff:find --check <url>           ¿esta URL es un enlace de afiliado válido de la base?
import { fold, loadAffiliates, looksLikeAffiliate, matchAffiliate } from "./lib.mjs";

function parseArgs(argv) {
	const args = { query: [], category: null, listCategories: false, all: false, json: false, check: null };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--category" || a === "-c") args.category = argv[++i] ?? "";
		else if (a === "--list-categories" || a === "-l") args.listCategories = true;
		else if (a === "--all") args.all = true;
		else if (a === "--json") args.json = true;
		else if (a === "--check") args.check = argv[++i] ?? "";
		else if (a === "-h" || a === "--help") args.help = true;
		else args.query.push(a);
	}
	return args;
}

function print(partners, asJson) {
	if (asJson) {
		console.log(JSON.stringify(partners.map(({ logoUrl, ...rest }) => rest), null, 2));
		return;
	}
	if (partners.length === 0) {
		console.log("Sin resultados. Prueba con otra palabra o con --list-categories.");
		return;
	}
	for (const p of partners) {
		const extras = [
			p.priority !== undefined ? `prioridad ${p.priority}` : null,
			p.commission ? `comisión ${p.commission}` : null,
			p.cookieDays ? `cookie ${p.cookieDays} días` : null,
			p.origin === "extra.json" ? "extra.json" : null,
		].filter(Boolean);
		console.log(`${p.name}`);
		console.log(`  categoría: ${p.category} · plataforma: ${p.platform || "—"}${extras.length ? ` · ${extras.join(" · ")}` : ""}`);
		console.log(`  enlace:    ${p.affiliateLink}`);
		if (p.website) console.log(`  sitio:     ${p.website}`);
		if (p.notes) console.log(`  notas:     ${p.notes}`);
		if (p.disallowedTopics?.length) console.log(`  vetado en: ${p.disallowedTopics.join(", ")}`);
	}
	console.log(`\n${partners.length} resultado(s)`);
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const affiliates = loadAffiliates().toSorted((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.category.localeCompare(b.category, "es") || a.name.localeCompare(b.name, "es"));

	if (args.help || (!args.query.length && !args.category && !args.listCategories && !args.all && args.check === null)) {
		console.log(
			"Uso: pnpm aff:find <texto> | --category <cat> | --list-categories | --all | --check <url> [--json]\n" +
				`Base: ${affiliates.length} partners (src/data/partners.generated.ts + content/affiliates/extra.json)`,
		);
		process.exit(args.help ? 0 : 1);
	}

	if (args.check !== null) {
		const match = matchAffiliate(args.check, affiliates);
		if (match) {
			console.log(`OK: ${args.check}\n  → ${match.name} (${match.category}, ${match.platform})`);
			process.exit(0);
		}
		const suspicious = looksLikeAffiliate(args.check, affiliates);
		console.log(suspicious ? `NO está en la base y parece de afiliado: ${args.check}` : `No es un enlace de afiliado de la base: ${args.check}`);
		process.exit(1);
	}

	if (args.listCategories) {
		const counts = new Map();
		for (const p of affiliates) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
		const rows = [...counts].sort((a, b) => a[0].localeCompare(b[0], "es"));
		if (args.json) console.log(JSON.stringify(Object.fromEntries(rows), null, 2));
		else {
			for (const [category, count] of rows) console.log(`${String(count).padStart(3)}  ${category}`);
			console.log(`\n${affiliates.length} partners en ${rows.length} categorías`);
		}
		return;
	}

	let result = affiliates;
	if (args.category) {
		const needle = fold(args.category);
		result = result.filter((p) => fold(p.category).includes(needle));
	}
	if (args.query.length) {
		const terms = args.query.map(fold);
		result = result.filter((p) => {
			const haystack = fold([p.name, p.category, p.website, p.affiliateLink, p.notes, p.platform].join(" "));
			return terms.every((t) => haystack.includes(t));
		});
	}
	print(result, args.json);
}

main();
