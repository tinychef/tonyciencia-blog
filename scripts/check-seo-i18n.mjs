import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const root = (...segments) => path.join(cwd, ...segments);

const localesSource = fs.readFileSync(root("src", "i18n", "locales.ts"), "utf8");
const llmsSource = fs.readFileSync(root("public", "llms.txt"), "utf8");

const requiredLocaleMappings = [
	'["/servicios", "/en/services"]',
	'["/contacto", "/en/contact"]',
	'["/recursos-ia", "/en/resources"]',
	'["/automatizacion", "/en/automation"]',
	'["/legal/privacidad", "/en/legal/privacy"]',
	'["/legal/terminos", "/en/legal/terms"]',
];

for (const snippet of requiredLocaleMappings) {
	if (!localesSource.includes(snippet)) {
		throw new Error(`Falta mapping i18n requerido: ${snippet}`);
	}
}

const requiredLlmsLines = [
	"https://tonyciencia.com/en/resources",
	"https://tonyciencia.com/en/automation",
];

for (const line of requiredLlmsLines) {
	if (!llmsSource.includes(line)) {
		throw new Error(`Falta ruta requerida en llms.txt: ${line}`);
	}
}

const forbiddenLlmsLines = [
	"https://tonyciencia.com/en/automatizacion",
];

for (const line of forbiddenLlmsLines) {
	if (llmsSource.includes(line)) {
		throw new Error(`Ruta obsoleta detectada en llms.txt: ${line}`);
	}
}

console.log("checks SEO/i18n OK");
