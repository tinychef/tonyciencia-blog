// Copia los tokens de diseño y los logos del sitio (fuente de verdad: el blog Astro) al market,
// para que /market se vea igual que tonyciencia.com sin duplicar a mano.
// Destino: public/market/static/site/ (generado, ignorado por git).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, "../../..");
const out = resolve(here, "../public/market/static/site");
mkdirSync(out, { recursive: true });

const files = [
	["src/styles/theme.css", "theme.css"],
	["public/assets/logo-tc-blanco-72.webp", "logo-blanco.webp"],
	["public/assets/logo-tc-negro-72.webp", "logo-negro.webp"],
	["public/favicon.ico", "favicon.ico"],
	["public/favicon-32x32.png", "favicon-32x32.png"],
	["public/apple-touch-icon.png", "apple-touch-icon.png"],
];
for (const [from, to] of files) copyFileSync(resolve(site, from), resolve(out, to));
console.log(`sync-theme: ${files.length} archivos copiados a ${out}`);
