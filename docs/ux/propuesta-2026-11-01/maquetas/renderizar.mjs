// Renderiza maquetas → PNG/JPEG livianos en docs/ux/propuesta-2026-11-01/png/
// Uso: node docs/ux/propuesta-2026-11-01/maquetas/renderizar.mjs [coversA|coversB|pages|all]  (requiere red para Google Fonts)
import { chromium, devices } from "../../../../workers/market/node_modules/playwright/index.mjs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { statSync, renameSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DIR = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const M = `${DIR}/maquetas`, OUT = `${DIR}/png`;
const what = process.argv[2] ?? "all";
const b = await chromium.launch();
const LIMIT = 600 * 1024;

// PNG; si pasa de 600 KB, lo reduce con pngquant-like (Pillow paleta) o pasa a JPEG.
function lighten(png) {
	if (statSync(png).size <= LIMIT) return png;
	execFileSync("python3", ["-I", "-c", "import sys;from PIL import Image;im=Image.open(sys.argv[1]).convert('RGB');im.quantize(colors=256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).save(sys.argv[1],optimize=True)", png]);
	if (statSync(png).size <= LIMIT) return png;
	const jpg = png.replace(/\.png$/, ".jpg");
	execFileSync("python3", ["-I", "-c", "import sys;from PIL import Image;Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2],quality=82,optimize=True,progressive=True)", png, jpg]);
	rmSync(png);
	return jpg;
}
const report = (f) => console.log(`${(statSync(f).size / 1024).toFixed(0).padStart(4)} KB  ${f.replace(OUT + "/", "")}`);

async function covers(file) {
	const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
	await p.goto(pathToFileURL(`${M}/${file}`).href, { waitUntil: "networkidle" });
	await p.evaluate(() => document.fonts.ready);
	for (const fr of await p.$$("section.frame[data-out]")) {
		const name = await fr.getAttribute("data-out");
		const png = `${OUT}/${name}.png`;
		await fr.screenshot({ path: png });
		// La versión que se publicaría (WebP q86, como render-covers.mjs) solo para medir el peso.
		execFileSync("python3", ["-I", "-c", "import sys,os;from PIL import Image;Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2],'WEBP',quality=86,method=6);print(os.path.getsize(sys.argv[2])//1024,'KB webp')", png, `${tmpdir()}/${name}.webp`], { stdio: "inherit" });
		report(lighten(png));
	}
	await p.close();
}

async function mobile(file, out, { full = true, fold = false } = {}) {
	const c = await b.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
	const p = await c.newPage();
	await p.goto(pathToFileURL(`${M}/${file}`).href, { waitUntil: "networkidle" });
	await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
	await p.waitForTimeout(300);
	const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, first: (() => { const e = document.querySelector(".card, .cardB"); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; })() }));
	console.log(out, JSON.stringify(m));
	if (fold) { const f = `${OUT}/${out}-pliegue.png`; await p.screenshot({ path: f }); report(lighten(f)); }
	if (fold && file.includes("ficha")) {
		await p.evaluate(() => { document.body.classList.add("show-sticky"); scrollTo(0, 1250); });
		await p.waitForTimeout(200);
		const f = `${OUT}/${out}-desplazada.png`; await p.screenshot({ path: f }); report(lighten(f));
		await p.evaluate(() => { document.body.classList.remove("show-sticky"); scrollTo(0, 0); });
	}
	if (full) { const f = `${OUT}/${out}.png`; await p.screenshot({ path: f, fullPage: true }); report(lighten(f)); }
	await c.close();
}

async function desktop(file, out) {
	const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
	await p.goto(pathToFileURL(`${M}/${file}`).href, { waitUntil: "networkidle" });
	await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
	const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
	console.log(out, JSON.stringify(m));
	const f = `${OUT}/${out}.png`; await p.screenshot({ path: f, fullPage: true }); report(lighten(f));
	await p.close();
}

async function cards(file, sel, prefix, names) {
	const c = await b.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
	const p = await c.newPage();
	await p.goto(pathToFileURL(`${M}/${file}`).href, { waitUntil: "networkidle" });
	await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
	for (const [id, name] of names) {
		const el = await p.$(`${sel}${id}`);
		const box = await el.boundingBox();
		const f = `${OUT}/${prefix}-${name}-390.png`;
		// Recorte de 390 px de ancho (pantalla completa) con 12 px de aire arriba y abajo.
		await p.screenshot({ path: f, fullPage: true, clip: { x: 0, y: Math.max(0, box.y - 12), width: 390, height: box.height + 24 } });
		report(lighten(f));
	}
	await c.close();
}

if (what === "all" || what === "coversA") await covers("A-portadas.html");
if (what === "all" || what === "coversB") await covers("B-portadas.html");
if (what === "all" || what === "pages") {
	await cards("A-tarjetas.html", "#card-", "A-tarjeta", [["anuncios", "anuncios"], ["specreel", "specreel"], ["stick", "specreel-stick"], ["pagespeed", "pagespeed"], ["pagespeed-v1", "pagespeed-v1-ejemplo"], ["cutpilot", "cutpilot"], ["motor", "motor-creativo"]]);
	await cards("B-tarjetas.html", "#row-", "B-tarjetas", [["0", "anuncios-specreel"], ["2", "stick-pagespeed"], ["4", "cutpilot-motor"]]);
	await mobile("A-catalogo.html", "A-catalogo-movil", { fold: true });
	await desktop("A-catalogo.html", "A-catalogo-escritorio");
	await mobile("B-catalogo.html", "B-catalogo-movil", { fold: true });
	await desktop("B-catalogo.html", "B-catalogo-escritorio");
	await mobile("A-ficha-pagespeed.html", "A-ficha-pagespeed-movil", { fold: true });
	await mobile("A-ficha-anuncios.html", "A-ficha-anuncios-movil", { fold: true, full: false });
}
await b.close();
