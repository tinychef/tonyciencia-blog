#!/usr/bin/env node
// Renderiza las portadas y pantallas de los productos desde design/<slug>.html.
// Cada archivo HTML trae uno o más <section class="frame" data-out="cover"> de 1600×1000;
// cada uno se guarda como public/market/static/products/<slug>/<data-out>.webp.
//
// Uso:  node scripts/render-covers.mjs                          → todos
//       node scripts/render-covers.mjs specreel                 → solo ese producto
//       node scripts/render-covers.mjs specreel --solo=cover    → solo esas salidas (separadas por coma)
//       node scripts/render-covers.mjs --solo=cover,cover-animada  → solo las portadas de todos
//
// Portadas animadas: una sección con data-anim="<n.º de cuadros>" (y opcionales data-fps, data-width,
// data-quality) se graba cuadro a cuadro llamando a window.__frame(i) (async, determinista) y se guarda
// como WebP animado en bucle. Ver design/specreel-stick.html.
//
// Requiere Playwright (ya está en devDependencies) y Python 3 con Pillow para convertir a WebP.
// Las fuentes se cargan de Google Fonts, así que necesita red.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const designDir = join(root, "design");
const outRoot = join(root, "public/market/static/products");
const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith("--"));
const solo = args.find((a) => a.startsWith("--solo="))?.slice(7).split(",").filter(Boolean) ?? null;
const QUALITY = 82; // portadas ≤ 160 KB (docs/ux/propuesta-2026-11-01/portadas-finales.md)

const files = readdirSync(designDir).filter((f) => f.endsWith(".html") && (!only || f === `${only}.html`));
if (files.length === 0) {
	console.error(only ? `No existe design/${only}.html` : "No hay archivos en design/");
	process.exit(1);
}

const toWebp = `import sys; from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w = int(sys.argv[4])
if w and w != im.width: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
im.save(sys.argv[2], 'WEBP', quality=int(sys.argv[3]), method=6)`;

// Cuadros PNG → WebP animado en bucle (el codificador de libwebp guarda solo lo que cambia entre cuadros).
const toAnimWebp = `import sys, glob; from PIL import Image
fs = sorted(glob.glob(sys.argv[1] + '/f_*.png')); w = int(sys.argv[5])
ims = [Image.open(f).convert('RGB') for f in fs]
if w and w != ims[0].width: ims = [i.resize((w, round(i.height * w / i.width)), Image.LANCZOS) for i in ims]
ims[0].save(sys.argv[2], 'WEBP', save_all=True, append_images=ims[1:], duration=int(sys.argv[3]), loop=0,
            quality=int(sys.argv[4]), method=6, minimize_size=True, allow_mixed=False)`;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
let cpu = null; // Chromium sin GPU, solo para las portadas animadas
for (const file of files) {
	const slug = file.replace(/\.html$/, "");
	const outDir = join(outRoot, slug);
	mkdirSync(outDir, { recursive: true });
	await page.goto(pathToFileURL(join(designDir, file)).href, { waitUntil: "networkidle" });
	await page.evaluate(() => document.fonts.ready);
	// Las escenas 3D avisan con window.__ready = true cuando terminaron de dibujar.
	await page.waitForFunction(() => (window.__ready ?? true) === true, null, { timeout: 30_000 });
	const frames = await page.$$("section.frame[data-out]");
	for (const frame of frames) {
		const name = await frame.getAttribute("data-out");
		if (solo && !solo.includes(name)) continue;
		const webp = join(outDir, `${name}.webp`);
		const quality = Number((await frame.getAttribute("data-quality")) ?? QUALITY);
		const width = Number((await frame.getAttribute("data-width")) ?? 0);
		const anim = Number((await frame.getAttribute("data-anim")) ?? 0);
		if (anim > 0) {
			const fps = Number((await frame.getAttribute("data-fps")) ?? 10);
			const tmp = join(tmpdir(), `cover-anim-${slug}-${name}`);
			rmSync(tmp, { recursive: true, force: true });
			mkdirSync(tmp, { recursive: true });
			// Las portadas animadas se graban en un Chromium sin raster por GPU: con swiftshader, capturas seguidas
			// de la misma escena salen con mosaicos mezclados de otras secciones (cuadros distintos → WebP enorme).
			cpu ??= await chromium.launch();
			const cp = await cpu.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
			await cp.goto(pathToFileURL(join(designDir, file)).href, { waitUntil: "networkidle" });
			await cp.evaluate(() => document.fonts.ready);
			await cp.waitForFunction(() => (window.__ready ?? true) === true, null, { timeout: 10_000 }).catch(() => {});
			// La sección se fija arriba a la izquierda (sin desplazar la página) y se captura la ventana.
			await cp.$eval(`section.frame[data-out="${name}"]`, (el) => { scrollTo(0, 0); Object.assign(el.style, { position: "fixed", left: "0", top: "0", zIndex: "2147483647", margin: "0" }); });
			await cp.evaluate(() => window.__frame(0));
			await cp.waitForTimeout(200);
			const clip = { x: 0, y: 0, width: 1600, height: 1000 };
			for (let i = 0; i < anim; i++) {
				await cp.evaluate((k) => window.__frame(k), i);
				await cp.screenshot({ path: join(tmp, `f_${String(i).padStart(4, "0")}.png`), clip });
			}
			await cp.close();
			execFileSync("python3", ["-I", "-c", toAnimWebp, tmp, webp, String(Math.round(1000 / fps)), String(quality), String(width)]);
			rmSync(tmp, { recursive: true, force: true });
		} else {
			const png = join(outDir, `${name}.png`);
			await frame.screenshot({ path: png });
			execFileSync("python3", ["-I", "-c", toWebp, png, webp, String(quality), String(width)]);
			rmSync(png);
		}
		console.log(`✓ ${slug}/${name}.webp  ${(statSync(webp).size / 1024).toFixed(0)} KB${anim ? `  (${anim} cuadros)` : ""}`);
	}
}
await browser.close();
await cpu?.close();
