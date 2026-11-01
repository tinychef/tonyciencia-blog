// Imágenes para Google Merchant Center (fichas gratuitas de Google Shopping), 1500×1500, sin texto promocional,
// sin precios, sin «funciona con», sin logos de terceros encima y sin texto en un idioma (sirven en ES y EN).
// Política: https://support.google.com/merchants/answer/6324350 — categoría Software > Computer Software: se muestra
// el producto (lo que produce o una ilustración de su informe/interfaz). Detalle y razones: ../portadas-finales.md.
//
// Uso (desde la raíz del repo):
//   node docs/ux/propuesta-2026-11-01/maquetas/merchant.mjs          → workers/market/design/merchant/<slug>.html
//   cd workers/market && node scripts/render-merchant.mjs             → public/market/static/products/<slug>/merchant*.jpg
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../../../../workers/market/design/merchant/", import.meta.url);
mkdirSync(OUT, { recursive: true });

// Íconos de interfaz (trazos estilo Lucide, ISC). Ninguno es un logo de marca.
const I = {
	users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
	heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
	award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
	bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
	swap: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
	check: '<path d="M20 6 9 17l-5-5"/>',
	arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
	film: '<rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>',
	wave: '<path d="M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3"/>',
	cc: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10.5 10.2a2 2 0 1 0 0 3.6M17 10.2a2 2 0 1 0 0 3.6"/>',
	shapes: '<path d="M8.3 10a.7.7 0 0 1-.63-1.02l3.7-6.5a.7.7 0 0 1 1.26 0l3.7 6.5A.7.7 0 0 1 15.7 10z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
	scissors: '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
	list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
	zoom: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
	type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
	snow: '<path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>',
};
const ic = (k, s = 24, c = "currentColor", w = 2) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

const BASE = `
:root { --bg: #0d0d0f; --p1: #141417; --p2: #1b1b1f; --p3: #26262b; --line: #2e2e33; --fg: #f5f5f7; --mut: #8e8e96; --dim: #4a4a52; --g: #30d158; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #333; font-family: "Inter Tight", system-ui, sans-serif; }
.m { width: 1500px; height: 1500px; position: relative; overflow: hidden; background: var(--bg); color: var(--fg); margin-bottom: 40px; }
.dots { position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.06) 1.6px, transparent 1.6px); background-size: 32px 32px; }
.win { position: absolute; left: 70px; top: 90px; width: 1360px; height: 1320px; border: 3px solid var(--line); border-radius: 30px; background: var(--p1); overflow: hidden; box-shadow: 0 40px 90px rgba(0,0,0,.55); }
.bar { height: 66px; border-bottom: 3px solid var(--line); display: flex; align-items: center; gap: 14px; padding: 0 26px; background: var(--p2); }
.bar i { width: 18px; height: 18px; border-radius: 50%; background: var(--dim); }
.ln { display: block; height: 16px; border-radius: 8px; background: var(--p3); }
`;
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">`;
const page = (title, css, sections) => `<!doctype html>
<html lang="und">
<head>
<meta charset="utf-8">
<title>${title}</title>
${FONTS}
<style>${BASE}${css}</style>
</head>
<body>
${sections}
</body>
</html>
`;

// Barras deterministas (semilla fija) para líneas de texto ilustradas.
const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

// ───────── 1. Anuncios Automáticos: tarjetas de anuncio que escribe el agente (gancho, cuerpo, CTA y prompt) ─────────
{
	const r = rng(7);
	const cats = ["users", "heart", "award", "bolt", "swap", "users"];
	const card = (k, i) => {
		const w = () => Math.min(94, 55 + Math.round(r() * 38));
		const done = i < 4;
		return `<div class="ad${i === 0 ? " on" : ""}">
			<div class="adh"><span class="cat">${ic(k, 34)}</span>${done ? `<span class="ok">${ic("check", 26, "#0d0d0f", 3.2)}</span>` : ""}</div>
			<span class="ln hook" style="width: ${w() + 10}%;"></span><span class="ln hook" style="width: ${w() - 15}%;"></span>
			<span class="ln" style="width: ${Math.min(96, w() + 10)}%;"></span><span class="ln" style="width: ${w()}%;"></span>
			<span class="cta"><span class="ln" style="width: 92px; background: #0d0d0f; height: 14px;"></span>${ic("arrow", 26, "#0d0d0f", 3)}</span>
			<div class="pr">${[0, 1].map(() => `<span class="ln" style="width: ${w()}%;"></span>`).join("")}</div>
		</div>`;
	};
	const bubble = (me, n) => `<div class="b${me ? " me" : ""}">${me ? "" : '<span class="av"></span>'}<div class="bt">${Array.from({ length: n }, () => `<span class="ln" style="width: ${50 + Math.round(r() * 50)}%;"></span>`).join("")}</div></div>`;
	const css = `
.side { position: absolute; left: 0; top: 66px; bottom: 0; width: 380px; border-right: 3px solid var(--line); padding: 30px 24px; display: flex; flex-direction: column; gap: 22px; background: #111114; }
.b { display: flex; gap: 12px; align-items: flex-start; }
.b.me { justify-content: flex-end; }
.av { width: 40px; height: 40px; border-radius: 50%; background: var(--g); flex: none; }
.bt { width: 250px; padding: 18px; border-radius: 18px; background: var(--p2); display: flex; flex-direction: column; gap: 12px; }
.b.me .bt { background: #13281a; width: 230px; }
.b.me .ln { background: #2a4a33; }
.grid { position: absolute; left: 410px; top: 96px; right: 30px; bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, 1fr); gap: 26px; }
.ad { border: 3px solid var(--line); border-radius: 22px; background: var(--p2); padding: 20px 24px; display: flex; flex-direction: column; gap: 11px; overflow: hidden; }
.ad.on { border-color: var(--g); }
.adh { display: flex; justify-content: space-between; align-items: center; color: var(--mut); margin-bottom: 4px; }
.ad.on .adh { color: var(--g); }
.ok { width: 40px; height: 40px; border-radius: 50%; background: var(--g); display: grid; place-items: center; }
.ln.hook { height: 22px; background: #e8e8ec; }
.ad .ln { flex: none; }
.cta { display: inline-flex; align-items: center; gap: 12px; align-self: flex-start; padding: 10px 18px; border-radius: 12px; background: var(--g); margin-top: 4px; }
.pr { margin-top: auto; border-radius: 12px; background: #0f0f12; border: 2px dashed var(--dim); padding: 14px; display: flex; flex-direction: column; gap: 9px; }
.pr .ln { height: 10px; background: #3a3a42; }
`;
	const html = `<section class="m" data-out="merchant"><div class="dots"></div>
	<div class="win"><div class="bar"><i></i><i></i><i></i></div>
		<div class="side">${bubble(false, 3)}${bubble(true, 2)}${bubble(false, 4)}${bubble(true, 1)}${bubble(false, 3)}${bubble(false, 2)}</div>
		<div class="grid">${cats.map(card).join("")}</div>
	</div></section>`;
	writeFileSync(new URL("anuncios-infinitos.html", OUT), page("Merchant · Anuncios Automáticos", css, html));
}

// ───────── 2. Motion 3D Video: cuadros reales de sus videos 3D (sin la botella ni los subtítulos) ─────────
{
	const css = `
.t { position: absolute; overflow: hidden; border-radius: 30px; border: 3px solid var(--line); box-shadow: 0 30px 70px rgba(0,0,0,.6); background: #000; }
.t img { display: block; width: 100%; height: 100%; object-fit: cover; }
`;
	const html = `<section class="m" data-out="merchant"><div class="dots"></div>
	<div class="t" style="left: 50px; top: 285px; width: 930px; height: 930px;"><img src="../assets/merchant/specreel-mitocondria.jpg" alt=""></div>
	<div class="t" style="left: 1010px; top: 285px; width: 440px; height: 440px;"><img src="../assets/merchant/specreel-celula.jpg" alt=""></div>
	<div class="t" style="left: 1010px; top: 775px; width: 440px; height: 440px;"><img src="../assets/merchant/specreel-microneedling.jpg" alt=""></div>
	</section>`;
	writeFileSync(new URL("specreel.html", OUT), page("Merchant · Motion 3D Video", css, html));
}

// ───────── 3. SpecReel Stick: cuadros reales a 1500 px (motor incluido, sin rótulos de texto) ─────────
{
	const html = `<section class="m" data-out="merchant"><img src="../assets/merchant/stick-1.jpg" width="1500" height="1500" alt="" style="display: block;"></section>
<section class="m" data-out="merchant-2"><img src="../assets/merchant/stick-2.jpg" width="1500" height="1500" alt="" style="display: block;"></section>`;
	writeFileSync(new URL("specreel-stick.html", OUT), page("Merchant · SpecReel Stick", "", html));
}

// ───────── 4. PageSpeed Forensics: ilustración del informe (tira de cuadros, tandas TCP, hilo principal, medianas) ─────────
{
	const r = rng(11);
	// Tira de cuadros: 3 en blanco (congelamiento del primer cuadro), luego la página aparece.
	const shot = (k) => {
		const blank = k < 3;
		const parts = k === 3 ? ["hdr", "hero"] : k === 4 ? ["hdr", "hero", "txt", "txt"] : k >= 5 ? ["hdr", "hero", "txt", "txt", "btn", "txt"] : [];
		return `<div class="ph${blank ? " blank" : ""}">${parts.map((p) => `<span class="w ${p}"></span>`).join("")}</div>`;
	};
	// Tandas TCP: 10 paquetes, luego 20, luego 40 (arranque lento: el doble por ida y vuelta).
	const flight = (n, x) => `<div class="fl" style="left: ${x}px;">${Array.from({ length: n }, () => "<i></i>").join("")}</div>`;
	// Trabajo del hilo principal por segundo (barras apiladas).
	const sec = Array.from({ length: 9 }, (_, i) => {
		const idle = i < 2 ? 1 : 0;
		const a = idle ? 4 : 30 + Math.round(r() * 60), b = idle ? 0 : 20 + Math.round(r() * 80), c = idle ? 0 : 10 + Math.round(r() * 40);
		return `<div class="sb"><i style="height: ${a}px; background: #ffa400;"></i><i style="height: ${b}px; background: #8e8e96;"></i><i style="height: ${c}px; background: #30d158;"></i></div>`;
	}).join("");
	// Medianas de 5 corridas por variante (antes / después de un arreglo), menor es mejor.
	const runs = (xs, med, col) => `<div class="rw">${xs.map((x) => `<i style="left: ${x}px; background: ${col};"></i>`).join("")}<b style="left: ${med}px; background: ${col};"></b></div>`;
	const css = `
.sec { position: absolute; left: 40px; right: 40px; border: 3px solid var(--line); border-radius: 22px; background: var(--p2); }
.strip { display: flex; gap: 18px; position: absolute; left: 30px; top: 30px; }
.ph { width: 186px; height: 330px; border-radius: 16px; background: #f2f2f4; border: 3px solid #3a3a42; padding: 14px 12px; display: flex; flex-direction: column; gap: 10px; }
.ph.blank { background: #f2f2f4; }
.w { display: block; border-radius: 6px; background: #c9c9cf; }
.w.hdr { height: 24px; background: #1d1d21; }
.w.hero { height: 110px; background: #30d158; opacity: .85; }
.w.txt { height: 12px; }
.w.btn { height: 30px; width: 60%; background: #1d1d21; }
.frz { position: absolute; left: 24px; top: 380px; width: 610px; height: 22px; border: 4px solid #ffa400; border-top: 0; border-radius: 0 0 10px 10px; }
.frz-i { position: absolute; left: 305px; top: 396px; color: #ffa400; }
.axis { position: absolute; left: 30px; right: 30px; top: 470px; height: 3px; background: var(--dim); }
.mk { position: absolute; top: 372px; height: 104px; width: 4px; background: var(--g); }
.mk span { position: absolute; top: 108px; left: -22px; font: 700 26px "JetBrains Mono", monospace; color: var(--g); }
.fl { position: absolute; bottom: 30px; width: 168px; display: flex; flex-wrap: wrap-reverse; gap: 4px; }
.fl i { width: 24px; height: 24px; border-radius: 4px; background: #8e8e96; }
.fl.g i { background: var(--g); }
.head { position: absolute; top: 24px; bottom: 24px; width: 0; border-left: 4px dashed #ffa400; }
.head span { position: absolute; left: 12px; top: 0; font: 700 26px "JetBrains Mono", monospace; color: #ffa400; white-space: nowrap; }
.sbs { position: absolute; left: 30px; bottom: 30px; display: flex; align-items: flex-end; gap: 14px; }
.sb { width: 44px; display: flex; flex-direction: column-reverse; gap: 3px; }
.sb i { display: block; border-radius: 4px; }
.rws { position: absolute; left: 30px; right: 30px; top: 40px; display: flex; flex-direction: column; gap: 46px; }
.rw { position: relative; height: 30px; border-bottom: 3px solid var(--dim); }
.rw i { position: absolute; top: 2px; width: 26px; height: 26px; border-radius: 50%; opacity: .55; }
.rw b { position: absolute; top: -14px; width: 6px; height: 58px; border-radius: 3px; }
`;
	const html = `<section class="m" data-out="merchant"><div class="dots"></div>
	<div class="win"><div class="bar"><i></i><i></i><i></i></div>
		<div class="sec" style="top: 96px; height: 520px;">
			<div class="strip">${[0, 1, 2, 3, 4, 5].map(shot).join("")}</div>
			<div class="frz"></div><div class="frz-i">${ic("snow", 44, "#ffa400", 2.6)}</div>
			<div class="axis"></div>
			<div class="mk" style="left: 668px;"><span>FCP</span></div><div class="mk" style="left: 1080px;"><span>LCP</span></div>
		</div>
		<div class="sec" style="top: 646px; height: 330px; width: 610px;">
			<div class="fl g" style="left: 34px;">${Array.from({ length: 10 }, () => "<i></i>").join("")}</div>${flight(20, 222)}${flight(40, 410)}
			<div class="head" style="left: 300px;"><span>&lt;/head&gt;</span></div>
		</div>
		<div class="sec" style="top: 646px; height: 330px; left: 680px;">
			<div class="sbs">${sec}</div>
		</div>
		<div class="sec" style="top: 1006px; height: 270px;">
			<div class="rws">${runs([150, 214, 260, 300, 372], 260, "#8e8e96")}${runs([520, 566, 602, 640, 690], 602, "#30d158")}${runs([880, 930, 962, 1000, 1060], 962, "#30d158")}</div>
		</div>
	</div></section>`;
	writeFileSync(new URL("pagespeed-forensics.html", OUT), page("Merchant · PageSpeed Forensics", css, html));
}

// ───────── 5. Edit Pro para YouTube: el video editado y su línea de tiempo (ilustración, sin palabras) ─────────
{
	const r = rng(23);
	const wave = (seed, n) => {
		const q = rng(seed); let bars = "";
		for (let k = 0; k < n; k++) { const env = 0.3 + 0.7 * Math.sin(Math.PI * (k + 0.5) / n) ** 0.5; const h = Math.max(0.15, env * (0.3 + 0.7 * q())); bars += `<rect x="${k * 5 + 1}" y="${(1 - h) * 10}" width="3" height="${h * 20}" rx="1.5"/>`; }
		return `<svg viewBox="0 0 ${n * 5} 20" preserveAspectRatio="none" fill="#30d158" opacity=".85">${bars}</svg>`;
	};
	const keep = [[0, 250], [300, 250], [600, 230], [880, 210]];
	const cuts = [[250, 50], [550, 50], [830, 50]];
	const chips = [[6, 70], [84, 52], [144, 96], [306, 110], [424, 64], [606, 120, "on"], [734, 80], [886, 90], [984, 74]];
	const gfx = [[4, 240, "type"], [304, 240, "list"], [604, 220, "zoom"], [884, 200, "shapes"]];
	const css = `
.mon { position: absolute; left: 40px; top: 110px; width: 940px; height: 529px; border-radius: 20px; overflow: hidden; background: #2a2a30; border: 3px solid var(--line); }
.mon .bg { position: absolute; inset: 0; background: #34343c; }
.mon svg.p { position: absolute; left: 140px; bottom: 0; width: 380px; height: 470px; }
.card { position: absolute; right: 40px; top: 50px; width: 300px; padding: 22px; border-radius: 18px; background: rgba(13,13,15,.92); border: 3px solid var(--g); display: flex; flex-direction: column; gap: 14px; }
.card b { font: 800 84px/1 "Inter Tight", sans-serif; color: var(--g); }
.card .row { display: flex; align-items: center; gap: 12px; }
.card .row i { width: 16px; height: 16px; border-radius: 50%; background: var(--g); flex: none; }
.capt { position: absolute; left: 50%; transform: translateX(-50%); bottom: 34px; display: flex; gap: 12px; }
.capt span { display: block; height: 40px; border-radius: 8px; background: rgba(245,245,247,.92); }
.capt span.on { background: var(--g); }
.fmts { position: absolute; left: 1020px; top: 110px; display: flex; flex-direction: column; gap: 22px; align-items: flex-start; }
.fm { border: 4px solid #4a4a52; border-radius: 14px; display: grid; place-items: end start; padding: 10px 12px; font: 700 26px "JetBrains Mono", monospace; background: var(--p2); color: #d7d7dc; }
.fm.on { border-color: var(--g); }
.tl { position: absolute; left: 40px; right: 40px; top: 690px; height: 690px; border: 3px solid var(--line); border-radius: 22px; background: #121215; overflow: hidden; }
.hd { position: absolute; left: 0; top: 0; bottom: 0; width: 110px; border-right: 3px solid var(--line); background: var(--p2); }
.hd div { position: absolute; left: 0; right: 0; height: 120px; display: grid; place-items: center; color: #c7c7cc; }
.trk { position: absolute; left: 140px; right: 20px; top: 0; bottom: 0; }
.ruler { position: absolute; left: 140px; right: 0; top: 0; height: 54px; border-bottom: 2px solid var(--line); font: 600 20px "JetBrains Mono", monospace; color: #6e6e76; }
.ruler span { position: absolute; top: 16px; }
.c { position: absolute; border-radius: 12px; }
.c.v { top: 76px; height: 120px; background: #2a2a30; border: 2px solid #3a3a42; }
.c.v::after { content: ""; position: absolute; left: 12px; top: 14px; width: 92px; height: 60px; border-radius: 8px; background: #3f3f47; }
.c.a { top: 220px; height: 120px; background: #1b2a20; border: 2px solid #2a4a33; overflow: hidden; }
.c.a svg { position: absolute; left: 8px; top: 8px; width: calc(100% - 16px); height: calc(100% - 16px); }
.cut { position: absolute; top: 66px; height: 284px; border-left: 3px dashed #6a6a72; border-right: 3px dashed #6a6a72; background: repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 10px, transparent 10px 20px); display: grid; place-items: center; color: #c7c7cc; }
.ch { position: absolute; top: 386px; height: 70px; border-radius: 10px; background: #2e2e33; }
.ch.on { background: var(--g); }
.gx { position: absolute; top: 500px; height: 100px; border-radius: 12px; border: 3px solid var(--g); background: #13281a; display: flex; align-items: center; padding: 0 20px; color: var(--fg); }
.phd { position: absolute; top: 40px; bottom: 0; width: 5px; background: var(--g); }
.phd::before { content: ""; position: absolute; left: -12px; top: -4px; width: 29px; height: 22px; border-radius: 5px; background: var(--g); }
`;
	const person = `<svg class="p" viewBox="0 0 200 260" aria-hidden="true"><path d="M84 104 h32 v34 h-32 z" fill="#4a4a51"/><ellipse cx="100" cy="74" rx="33" ry="39" fill="#5c5c64"/><path d="M20 260 C 22 176, 58 138, 100 138 C 142 138, 178 176, 180 260 Z" fill="#5c5c64"/></svg>`;
	const html = `<section class="m" data-out="merchant"><div class="dots"></div>
	<div class="mon"><div class="bg"></div>${person}
		<div class="card"><b>3</b>${[70, 85, 60].map((w) => `<div class="row"><i></i><span class="ln" style="width: ${w}%; background: #3a3a42;"></span></div>`).join("")}</div>
		<div class="capt"><span style="width: 120px;"></span><span class="on" style="width: 170px;"></span><span style="width: 100px;"></span></div>
	</div>
	<div class="fmts"><div class="fm on" style="width: 300px; height: 169px;">16:9</div><div style="display: flex; gap: 22px; align-items: flex-end;"><div class="fm" style="width: 140px; height: 249px;">9:16</div><div class="fm" style="width: 180px; height: 180px;">1:1</div></div></div>
	<div class="tl">
		<div class="hd"><div style="top: 76px;">${ic("film", 48)}</div><div style="top: 220px;">${ic("wave", 48)}</div><div style="top: 361px;">${ic("cc", 48)}</div><div style="top: 490px;">${ic("shapes", 48)}</div></div>
		<div class="ruler">${[0, 1, 2, 3, 4, 5].map((k) => `<span style="left: ${20 + k * 210}px;">00:${String(k * 2).padStart(2, "0")}</span>`).join("")}</div>
		<div class="trk">
			${keep.map(([x, w]) => `<div class="c v" style="left: ${x}px; width: ${w}px;"></div>`).join("")}
			${keep.map(([x, w], i) => `<div class="c a" style="left: ${x}px; width: ${w}px;">${wave(31 + i * 17, Math.round(w / 7))}</div>`).join("")}
			${cuts.map(([x, w]) => `<div class="cut" style="left: ${x}px; width: ${w}px;">${ic("scissors", 34, "#c7c7cc", 2.4)}</div>`).join("")}
			${chips.map(([x, w, on]) => `<div class="ch${on ? " on" : ""}" style="left: ${x}px; width: ${w}px;"></div>`).join("")}
			${gfx.map(([x, w, k]) => `<div class="gx" style="left: ${x}px; width: ${w}px;">${ic(k, 40)}</div>`).join("")}
			<div class="phd" style="left: 700px;"></div>
		</div>
	</div></section>`;
	void r;
	writeFileSync(new URL("cutpilot.html", OUT), page("Merchant · Edit Pro para YouTube", css, html));
}

// ───────── 6. Creative Factory: los íconos de las 13 apps de escritorio que opera ─────────
{
	const apps = [["photocraft", "PhotoCraft"], ["lightcraft", "LightCraft"], ["vectorcraft", "VectorCraft"], ["filmcraft", "FilmCraft"], ["effectcraft", "EffectCraft"], ["designcraft", "DesignCraft"], ["pdfcraft", "PdfCraft"], ["figcraft", "FigCraft"], ["soundcraft", "SoundCraft"], ["deckcraft", "DeckCraft"], ["wordcraft", "WordCraft"], ["gridcraft", "GridCraft"], ["cadcraft", "CADCraft"]];
	const css = `
.apps { position: absolute; left: 60px; right: 60px; top: 50%; transform: translateY(-50%); display: flex; flex-wrap: wrap; justify-content: center; gap: 46px 36px; }
.app { width: 236px; text-align: center; }
.app img { display: block; width: 236px; height: 236px; border-radius: 52px; box-shadow: 0 24px 50px rgba(0,0,0,.5); }
.app span { display: block; margin-top: 16px; font-size: 30px; font-weight: 700; color: #c7c7cc; letter-spacing: -0.01em; }
`;
	// Filas 4 · 5 · 4 (13 íconos).
	const row = (xs) => `<div style="display: flex; justify-content: center; gap: 36px; width: 100%;">${xs.map(([k, n]) => `<div class="app"><img src="../assets/crafts/${k}-240.webp" width="236" height="236" alt=""><span>${n}</span></div>`).join("")}</div>`;
	const html = `<section class="m" data-out="merchant"><div class="dots"></div>
	<div class="apps">${row(apps.slice(0, 4))}${row(apps.slice(4, 9))}${row(apps.slice(9))}</div></section>`;
	writeFileSync(new URL("motor-creativo-claude-code.html", OUT), page("Merchant · Creative Factory", css, html));
}
console.log("✓ design/merchant/*.html");
