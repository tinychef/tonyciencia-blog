#!/usr/bin/env node
// Renderiza las portadas y pantallas de los productos desde design/<slug>.html.
// Cada archivo HTML trae uno o más <section class="frame" data-out="cover"> de 1600×1000;
// cada uno se guarda como public/market/static/products/<slug>/<data-out>.webp.
//
// Uso:  node scripts/render-covers.mjs              → todos
//       node scripts/render-covers.mjs specreel     → solo ese producto
//
// Requiere Playwright (ya está en devDependencies) y Python 3 con Pillow para convertir a WebP.
// Las fuentes se cargan de Google Fonts, así que necesita red.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const designDir = join(root, "design");
const outRoot = join(root, "public/market/static/products");
const only = process.argv[2];

const files = readdirSync(designDir).filter((f) => f.endsWith(".html") && (!only || f === `${only}.html`));
if (files.length === 0) {
	console.error(only ? `No existe design/${only}.html` : "No hay archivos en design/");
	process.exit(1);
}

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
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
		const png = join(outDir, `${name}.png`);
		await frame.screenshot({ path: png });
		const webp = join(outDir, `${name}.webp`);
		execFileSync("python3", ["-I", "-c", "import sys; from PIL import Image; Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2], 'WEBP', quality=86, method=6)", png, webp]);
		rmSync(png);
		console.log(`✓ ${slug}/${name}.webp`);
	}
}
await browser.close();
