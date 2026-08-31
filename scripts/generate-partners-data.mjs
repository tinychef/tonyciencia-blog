import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const root = (...segments) => path.join(cwd, ...segments);

const sourcePath = process.argv[2] ?? process.env.PARTNERS_SOURCE;
const outPath = root("src", "data", "partners.generated.ts");

if (!sourcePath) {
	console.error(
		"Falta la fuente. Uso:\n" +
			"  node scripts/generate-partners-data.mjs <ruta-al-json>\n" +
			"  o PARTNERS_SOURCE=<ruta> node scripts/generate-partners-data.mjs",
	);
	process.exit(1);
}

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizePartner(entry, category) {
	return {
		name: entry.name,
		category,
		affiliateLink: entry.affiliate_link,
		website: entry.website,
		logoUrl: entry.logo_url,
		platform: entry.platform,
	};
}

function buildPartners(bySource) {
	const partners = [];

	for (const [category, entries] of Object.entries(bySource)) {
		for (const entry of entries) {
			if (entry.status !== "active") continue;
			partners.push(normalizePartner(entry, category));
		}
	}

	return partners.toSorted((a, b) => {
		if (a.category !== b.category) return a.category.localeCompare(b.category, "es");
		return a.name.localeCompare(b.name, "es");
	});
}

function writeOutput(partners, generatedAt) {
	const header = `// Generado automáticamente — NO EDITAR A MANO.
// Re-ejecutar: node scripts/generate-partners-data.mjs <ruta-al-json-de-PartnerStack>
// Fuente: ${sourcePath}
// Generado: ${generatedAt}

export interface Partner {
	name: string;
	category: string;
	affiliateLink: string;
	website: string;
	logoUrl: string;
	platform: string;
}

export const partners: Partner[] = ${JSON.stringify(partners, null, "\t")};
`;

	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	fs.writeFileSync(outPath, header, "utf8");
}

const source = readJson(sourcePath);
const partners = buildPartners(source);
writeOutput(partners, process.env.PARTNERS_GENERATED_AT ?? new Date().toISOString());

const categoryCount = new Set(partners.map((p) => p.category)).size;
console.log(`partners generados: ${partners.length} activos en ${categoryCount} categorías → ${path.relative(cwd, outPath)}`);
