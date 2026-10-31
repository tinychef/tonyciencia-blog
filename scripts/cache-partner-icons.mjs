#!/usr/bin/env node
// Descarga los logos de partners (src/data/partners.generated.ts → logoUrl) a public/assets/partners/icons/
// como WebP de 64×64 y escribe src/data/partner-icons.generated.ts (logoUrl → ruta local).
// Así la home y /herramientas no hacen ~100–270 peticiones a google.com/s2 (cada una con una redirección).
//
// Uso: node scripts/cache-partner-icons.mjs   (re-ejecutar después de generate:partners)
// Requiere Python 3 con Pillow para convertir a WebP.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/assets/partners/icons");
mkdirSync(outDir, { recursive: true });

const source = readFileSync(join(root, "src/data/partners.generated.ts"), "utf8");
const urls = [...new Set([...source.matchAll(/"logoUrl": "([^"]+)"/g)].map((m) => m[1]))];

// Google s2 a 128 px se mostraba a 20 px: con 64 alcanza para pantallas 2x/3x.
const bigger = (u) => u.replace(/([?&]sz=)\d+/, "$164");

const map = {};
let ok = 0;
for (const url of urls) {
	const name = createHash("sha1").update(url).digest("hex").slice(0, 12);
	const tmp = join(outDir, `${name}.tmp`);
	const dest = join(outDir, `${name}.webp`);
	try {
		const res = await fetch(bigger(url), { redirect: "follow", signal: AbortSignal.timeout(10_000) });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
		execFileSync("python3", [
			"-I",
			"-c",
			"import sys; from PIL import Image; im=Image.open(sys.argv[1]).convert('RGBA'); im.thumbnail((64,64)); im.save(sys.argv[2],'WEBP',quality=88,method=6)",
			tmp,
			dest,
		]);
		map[url] = `/assets/partners/icons/${name}.webp`;
		ok++;
	} catch (err) {
		console.warn(`✗ ${url}: ${err.message}`);
	} finally {
		rmSync(tmp, { force: true });
	}
}

writeFileSync(
	join(root, "src/data/partner-icons.generated.ts"),
	`// Generado automáticamente — NO EDITAR A MANO. Re-ejecutar: node scripts/cache-partner-icons.mjs
// logoUrl original → copia local en public/assets/partners/icons/ (si falta, se usa la URL original).
export const partnerIcons: Record<string, string> = ${JSON.stringify(map, null, "\t")};

export const partnerIcon = (logoUrl: string): string => partnerIcons[logoUrl] ?? logoUrl;
`,
);
console.log(`${ok}/${urls.length} logos guardados en ${outDir}`);
