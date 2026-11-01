#!/usr/bin/env node
// Versiones livianas de las portadas: products/<slug>/cover-800.webp (y en/cover-800.webp).
// Las usan las tarjetas del catálogo (srcset) y la portada del blog, que las toma directo del market para que nunca
// muestre portadas viejas. Correr después de `pnpm render:covers`:
//
//   node scripts/make-cover-variants.mjs
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "market", "static", "products");
const py = `
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
w, h = im.size
im = im.resize((800, round(h * 800 / w)), Image.LANCZOS)
im.save(out, "WEBP", quality=80, method=6)
`;
let n = 0;
for (const slug of readdirSync(root)) {
	for (const sub of ["", "en"]) {
		const src = join(root, slug, sub, "cover.webp");
		if (!existsSync(src)) continue;
		const out = join(root, slug, sub, "cover-800.webp");
		execFileSync("python3", ["-I", "-c", py, src, out]);
		n++;
		console.log(`✓ ${join(slug, sub, "cover-800.webp")}`);
	}
}
console.log(`${n} portadas livianas generadas.`);
