#!/usr/bin/env node
// Versiones livianas de las portadas (y en/ para las de inglés):
//   products/<slug>/cover-800.webp           ← cover.webp (fija)
//   products/<slug>/cover-animada-800.webp   ← cover-animada.webp (animada: mismos cuadros, duraciones y bucle)
// Las fijas las usan las tarjetas del catálogo y la ficha (srcset) y la portada del blog, que las toma directo del
// market para que nunca muestre portadas viejas. Las animadas de 800 las usan las tarjetas (data-anim): los huecos
// miden ≤ 360 px CSS, así que 800 px cubre pantallas DPR 2 con una cuarta parte de los píxeles de la de 1600.
// Correr después de `pnpm render:covers`:
//
//   node scripts/make-cover-variants.mjs
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "market", "static", "products");
const still = `
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
w, h = im.size
im = im.resize((800, round(h * 800 / w)), Image.LANCZOS)
im.save(out, "WEBP", quality=80, method=6)
`;
// Animada: cada cuadro se redimensiona ya compuesto (PIL entrega cuadros completos), con su duración y el bucle
// del original. Comprueba al final que la salida tenga los mismos cuadros.
const animated = `
import sys
from PIL import Image, ImageSequence
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src)
w, h = im.size
size = (800, round(h * 800 / w))
frames, durations = [], []
for f in ImageSequence.Iterator(im):
    durations.append(f.info.get("duration", im.info.get("duration", 100)))
    frames.append(f.convert("RGBA").resize(size, Image.LANCZOS))
loop = im.info.get("loop", 0)
frames[0].save(out, "WEBP", save_all=True, append_images=frames[1:], duration=durations, loop=loop, quality=78, method=6, minimize_size=True)
check = Image.open(out)
assert check.n_frames == len(frames), (check.n_frames, len(frames))
print(len(frames), sum(durations), loop)
`;
const kb = (p) => `${Math.round(statSync(p).size / 1024)} KB`;
let n = 0;
for (const slug of readdirSync(root)) {
	for (const sub of ["", "en"]) {
		const src = join(root, slug, sub, "cover.webp");
		if (existsSync(src)) {
			const out = join(root, slug, sub, "cover-800.webp");
			execFileSync("python3", ["-I", "-c", still, src, out]);
			n++;
			console.log(`✓ ${join(slug, sub, "cover-800.webp")} (${kb(out)})`);
		}
		const anim = join(root, slug, sub, "cover-animada.webp");
		if (existsSync(anim)) {
			const out = join(root, slug, sub, "cover-animada-800.webp");
			const [frames, ms, loop] = execFileSync("python3", ["-I", "-c", animated, anim, out]).toString().trim().split(" ");
			n++;
			console.log(`✓ ${join(slug, sub, "cover-animada-800.webp")} (${kb(anim)} → ${kb(out)}, ${frames} cuadros, ${ms} ms, loop=${loop})`);
		}
	}
}
console.log(`${n} portadas livianas generadas.`);
