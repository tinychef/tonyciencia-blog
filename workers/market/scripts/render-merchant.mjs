#!/usr/bin/env node
// Renderiza las imágenes para Google Merchant Center desde design/merchant/<slug>.html.
// Cada <section class="m" data-out="merchant"> (1500×1500) se guarda como
// public/market/static/products/<slug>/<data-out>.jpg en JPEG calidad 88 (Merchant: cuadrada, < 1 MB, sin bordes).
//
// Uso:  node scripts/render-merchant.mjs            → todas
//       node scripts/render-merchant.mjs specreel   → solo ese producto
//
// Usa Chromium sin GPU (capturas estables) y Python 3 con Pillow. Las fuentes vienen de Google Fonts (necesita red).
import { execFileSync } from "node:child_process";
import { readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const designDir = join(root, "design", "merchant");
const outRoot = join(root, "public/market/static/products");
const only = process.argv[2];
const files = readdirSync(designDir).filter((f) => f.endsWith(".html") && (!only || f === `${only}.html`));
if (!files.length) { console.error(only ? `No existe design/merchant/${only}.html` : "No hay archivos en design/merchant/"); process.exit(1); }

const toJpeg = `import sys; from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
assert im.size == (1500, 1500), im.size
lo, hi = im.convert('L').getextrema()
assert hi - lo > 40, 'imagen casi de un solo color'
im.save(sys.argv[2], 'JPEG', quality=88, optimize=True, progressive=True, subsampling=0)`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1500 }, deviceScaleFactor: 1 });
for (const file of files) {
	const slug = file.replace(/\.html$/, "");
	await page.goto(pathToFileURL(join(designDir, file)).href, { waitUntil: "networkidle" });
	await page.evaluate(() => document.fonts.ready);
	const names = await page.$$eval("section[data-out]", (a) => a.map((s) => s.dataset.out));
	for (const name of names) {
		// La sección se fija arriba a la izquierda y se captura la ventana (sin desplazar la página).
		await page.$$eval("section[data-out]", (all, n) => all.forEach((s) => {
			const on = s.dataset.out === n;
			Object.assign(s.style, on ? { position: "fixed", left: "0", top: "0", zIndex: "2147483647", margin: "0" } : { position: "", left: "", top: "", zIndex: "", margin: "" });
		}), name);
		await page.evaluate(() => scrollTo(0, 0));
		await page.waitForTimeout(150);
		const png = join(tmpdir(), `merchant-${slug}-${name}.png`);
		await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 1500, height: 1500 } });
		const jpg = join(outRoot, slug, `${name}.jpg`);
		execFileSync("python3", ["-I", "-c", toJpeg, png, jpg]);
		rmSync(png);
		const kb = statSync(jpg).size / 1024;
		if (kb >= 1024) throw new Error(`${slug}/${name}.jpg pesa ${kb.toFixed(0)} KB (Merchant pide < 1 MB)`);
		console.log(`✓ ${slug}/${name}.jpg  ${kb.toFixed(0)} KB`);
	}
}
await browser.close();
