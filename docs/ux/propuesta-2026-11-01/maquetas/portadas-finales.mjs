// Portadas finales aprobadas (2026-11-01): estilo de la Dirección A (grafito, Inter Tight, verde #30d158,
// dolor → solución) + fila de logos arriba como la Dirección B, con más drama.
// Reemplaza SOLO la sección data-out="cover" de workers/market/design/<slug>.html (las pantallas screen-1/screen-2
// quedan intactas) y agrega la portada animada de specreel-stick (data-out="cover-animada").
// Textos, cifras y logos: docs/ux/propuesta-2026-11-01/portadas-finales.md.
//
// Uso (desde la raíz del repo):
//   node docs/ux/propuesta-2026-11-01/maquetas/portadas-finales.mjs
//   cd workers/market && node scripts/render-covers.mjs --solo=cover,cover-animada
import { readFileSync, writeFileSync } from "node:fs";

const DESIGN = new URL("../../../../workers/market/design/", import.meta.url);
const brandsSrc = readFileSync(new URL("../src/lib/brands.ts", DESIGN), "utf8");
const PATH = {};
for (const m of brandsSrc.matchAll(/^\t"([a-z0-9-]+)": "([^"]+)",/gm)) PATH[m[1]] = m[2];
const si = (k, size, color = "#f5f5f7") => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" aria-hidden="true"><path d="${PATH[k]}"/></svg>`;
const img = (src, size) => `<img src="${src}" width="${size}" height="${size}" alt="">`;
const CLAUDE = img("assets/logos/claude.svg", 64);
const ANTIGRAVITY = img("assets/logos/antigravity.svg", 64);

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">`;

const CSS = `
.frame.pf { background: #0d0d0f; color: #f5f5f7; font-family: "Inter Tight", system-ui, sans-serif; }
.pf * { box-sizing: border-box; margin: 0; padding: 0; }
.pf .pf-dots { position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.075) 1.6px, transparent 1.6px); background-size: 32px 32px; -webkit-mask: linear-gradient(90deg, transparent 28%, #000 72%); mask: linear-gradient(90deg, transparent 28%, #000 72%); }
.pf .pf-glow { position: absolute; border-radius: 50%; background: radial-gradient(closest-side, rgba(48,209,88,.20), rgba(48,209,88,0)); pointer-events: none; }
.pf .pf-top { position: absolute; left: 88px; right: 88px; top: 56px; height: 96px; display: flex; align-items: center; justify-content: space-between; }
.pf .pf-name { display: flex; align-items: center; gap: 16px; font-size: 40px; font-weight: 800; letter-spacing: -0.01em; }
.pf .pf-name i { width: 22px; height: 22px; border-radius: 6px; background: #30d158; }
.pf .pf-logos { display: flex; align-items: center; gap: 20px; height: 96px; padding: 0 30px; border: 3px solid #2e2e33; border-radius: 22px; background: #17171a; }
.pf .pf-logos img, .pf .pf-logos svg { display: block; width: 64px; height: 64px; }
.pf .pf-logos .t { font-size: 46px; font-weight: 800; letter-spacing: -0.015em; white-space: nowrap; }
.pf .pf-logos .sep { width: 3px; height: 50px; background: #3a3a40; }
.pf .pf-pain { position: absolute; left: 88px; font-size: 50px; line-height: 1.1; font-weight: 600; letter-spacing: -0.015em; color: #8e8e96; }
.pf .pf-pain s { text-decoration-thickness: 6px; text-decoration-color: rgba(245,245,247,.55); }
.pf .pf-h { position: absolute; left: 88px; font-size: 136px; line-height: 0.94; font-weight: 800; letter-spacing: -0.045em; }
.pf .pf-h b { font-weight: 800; color: #30d158; }
.pf .pf-note { position: absolute; right: 88px; bottom: 26px; font: 500 18px/1.3 "JetBrains Mono", monospace; color: #6e6e76; text-align: right; }
.pf .pf-chip { display: inline-flex; align-items: center; gap: 14px; font-size: 38px; font-weight: 700; border: 3px solid #2e2e33; border-radius: 14px; padding: 10px 22px; background: #17171a; }
.pf .pf-chip i { width: 16px; height: 16px; border-radius: 4px; background: #30d158; }
.pf .pf-mono { font-family: "JetBrains Mono", monospace; }
/* Anuncios */
.pf .ad-grid { position: absolute; left: 892px; top: 196px; width: 620px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.pf .ad { height: 166px; border: 3px solid #2e2e33; border-radius: 20px; background: #17171a; padding: 20px 24px; display: flex; flex-direction: column; justify-content: space-between; }
.pf .ad h4 { font-size: 34px; line-height: 0.98; font-weight: 800; letter-spacing: -0.02em; }
.pf .ad p { display: flex; align-items: baseline; gap: 10px; }
.pf .ad p b { font-size: 62px; line-height: 0.9; font-weight: 800; color: #30d158; letter-spacing: -0.03em; }
.pf .ad p span { font-size: 26px; font-weight: 600; color: #a1a1a8; }
.pf .ad.sum { background: #30d158; border-color: #30d158; color: #0d0d0f; }
.pf .ad.sum h4 { font-size: 30px; }
.pf .ad.sum p b { color: #0d0d0f; font-size: 76px; }
.pf .ad.sum p span { color: #0d0d0f; }
.pf .plat { position: absolute; left: 892px; width: 620px; top: 774px; display: flex; align-items: center; justify-content: space-between; color: #d7d7dc; }
.pf .plat .lg { display: flex; align-items: center; gap: 26px; }
.pf .plat .t { font-size: 40px; font-weight: 800; }
.pf .plat small { font-size: 28px; font-weight: 600; color: #a1a1a8; }
/* Tiles de video (SpecReel / Stick) */
.pf .tile { position: absolute; overflow: hidden; border: 4px solid #2e2e33; border-radius: 26px; background: #000; box-shadow: 0 30px 60px rgba(0,0,0,.55); }
.pf .tile img { display: block; width: 100%; height: 100%; object-fit: cover; }
.pf .tile .cap { position: absolute; left: 14px; bottom: 14px; font: 700 20px "JetBrains Mono", monospace; background: rgba(13,13,15,.82); color: #f5f5f7; border: 2px solid #3a3a40; border-radius: 8px; padding: 4px 10px; }
.pf .tile.sq .cap { left: auto; right: 14px; bottom: auto; top: 14px; }
.pf .sprite { width: 100%; height: 100%; background-repeat: no-repeat; background-size: 700% 500%; }
/* PageSpeed */
.pf .ps { position: absolute; left: 812px; width: 700px; }
.pf .ps-row { display: flex; justify-content: space-between; }
.pf .g { position: relative; width: 154px; text-align: center; }
.pf .g b { position: absolute; left: 0; right: 0; top: 0; height: 154px; display: grid; place-items: center; font-size: 60px; font-weight: 800; letter-spacing: -0.04em; }
.pf .g p { margin-top: 10px; font-size: 21px; line-height: 1.15; font-weight: 600; color: #a1a1a8; }
.pf .ps-lbl { font: 700 28px "JetBrains Mono", monospace; letter-spacing: .1em; margin-bottom: 16px; color: #a1a1a8; }
.pf .tag { display: inline-block; font: 800 46px "Inter Tight", sans-serif; letter-spacing: .01em; padding: 6px 22px 8px; border-radius: 12px; background: #f5f5f7; color: #0d0d0f; }
/* CutPilot */
.pf .tl { position: absolute; left: 88px; right: 88px; top: 568px; height: 376px; border: 3px solid #2e2e33; border-radius: 24px; background: #121215; overflow: hidden; }
.pf .tl .hd { position: absolute; left: 0; top: 0; bottom: 0; width: 200px; border-right: 3px solid #2e2e33; background: #17171a; }
.pf .tl .hd div, .pf .tl .row { position: absolute; height: 72px; }
.pf .tl .hd div { left: 24px; right: 10px; display: flex; align-items: center; font-size: 28px; font-weight: 800; color: #d7d7dc; }
.pf .tl .ruler { position: absolute; left: 200px; right: 0; top: 0; height: 44px; border-bottom: 2px solid #2e2e33; font: 600 17px "JetBrains Mono", monospace; color: #6e6e76; }
.pf .tl .ruler span { position: absolute; top: 12px; }
.pf .tl .row { left: 200px; right: 0; }
.pf .clip { position: absolute; top: 9px; bottom: 9px; border-radius: 10px; }
.pf .clip.v { background: #2a2a30; border: 2px solid #3a3a42; }
.pf .clip.v::after { content: ""; position: absolute; left: 10px; top: 9px; width: 38px; height: 30px; border-radius: 6px; background: #3f3f47; }
.pf .clip.a { background: #1b2a20; border: 2px solid #2a4a33; overflow: hidden; }
.pf .clip.a svg { position: absolute; inset: 4px 6px; width: calc(100% - 12px); height: calc(100% - 8px); }
.pf .cut { position: absolute; top: 44px; height: 158px; border-left: 3px dashed #4a4a52; border-right: 3px dashed #4a4a52; background: repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 10px, transparent 10px 20px); }
.pf .cut span { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font: 700 22px "JetBrains Mono", monospace; color: #a1a1a8; white-space: nowrap; text-decoration: line-through; text-decoration-thickness: 3px; background: #121215; padding: 2px 8px; border-radius: 6px; }
.pf .w { position: absolute; top: 14px; bottom: 14px; display: grid; place-items: center; padding: 0 12px; border-radius: 8px; background: #26262b; font-size: 24px; font-weight: 700; color: #d7d7dc; }
.pf .w.on { background: #30d158; color: #0d0d0f; }
.pf .gfx { position: absolute; top: 12px; bottom: 12px; display: flex; align-items: center; padding: 0 16px; border-radius: 10px; border: 3px solid #30d158; background: #13281a; font-size: 24px; font-weight: 800; color: #f5f5f7; white-space: nowrap; }
.pf .ph { position: absolute; top: 30px; bottom: 0; width: 4px; background: #30d158; }
.pf .ph::before { content: ""; position: absolute; left: -10px; top: -2px; width: 24px; height: 18px; border-radius: 4px; background: #30d158; }
.pf .fmts { position: absolute; right: 88px; top: 236px; display: flex; align-items: flex-end; gap: 22px; }
.pf .fm { border: 4px solid #4a4a52; border-radius: 14px; display: grid; place-items: end start; padding: 10px 12px; font: 700 26px "JetBrains Mono", monospace; background: #17171a; color: #d7d7dc; }
.pf .fm.on { border-color: #30d158; }
/* Motor */
.pf .apps { position: absolute; left: 842px; top: 222px; width: 670px; display: flex; flex-wrap: wrap; justify-content: center; gap: 28px 18px; }
.pf .app { width: 118px; text-align: center; }
.pf .app img { display: block; width: 118px; height: 118px; border-radius: 26px; }
.pf .app span { display: block; margin-top: 8px; font-size: 18px; font-weight: 700; color: #a1a1a8; letter-spacing: -0.01em; }
`;

const top = (name, logos) => `<div class="pf-top"><div class="pf-name"><i></i>${name}</div><div class="pf-logos">${logos}</div></div>`;
const SEP = `<span class="sep"></span>`;
const ring = (value, size, stroke, color, opacity = 1) => {
	const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - value / 100), h = size / 2;
	return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="opacity:${opacity}"><circle cx="${h}" cy="${h}" r="${r}" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-opacity=".22" stroke-width="${stroke}"/><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${h} ${h})"/></svg>`;
};
// Colores de PageSpeed Insights / Lighthouse: 0–49 rojo, 50–89 naranja, 90–100 verde.
const psColor = (v) => (v < 50 ? "#ff4e42" : v < 90 ? "#ffa400" : "#0cce6b");
const gauge = (v, label, dim = false) => `<div class="g" style="opacity:${dim ? 0.5 : 1}">${ring(v, 154, 14, psColor(v))}<b style="color:${psColor(v)}">${v}</b><p>${label}</p></div>`;
const CATS = ["Rendimiento", "Accesibilidad", "Prácticas recomendadas", "SEO"];

// Onda determinista para la pista de audio de CutPilot.
const wave = (seed, n) => {
	let s = seed >>> 0; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
	let bars = "";
	for (let k = 0; k < n; k++) { const env = 0.3 + 0.7 * Math.sin(Math.PI * (k + 0.5) / n) ** 0.5; const h = Math.max(0.15, env * (0.3 + 0.7 * r())); bars += `<rect x="${k * 5 + 1}" y="${(1 - h) * 10}" width="3" height="${h * 20}" rx="1.5"/>`; }
	return `<svg viewBox="0 0 ${n * 5} 20" preserveAspectRatio="none" fill="#30d158" opacity=".8">${bars}</svg>`;
};

const STICK_TILES = [
	["escena-1.jpg", "anim-1.webp", "1 % mejor cada día"],
	["escena-2.jpg", "anim-2.webp", "Uno ahorra, otro gasta"],
	["escena-3.jpg", "anim-3.webp", "El que empieza vs. el que espera"],
];
const stick = (animated) => `
	<div class="pf-glow" style="left: 300px; top: 420px; width: 1000px; height: 700px;"></div>
	${top("SpecReel Stick", `${CLAUDE}<span class="t">Claude Code</span>${SEP}<span class="t">Codex</span>`)}
	<p class="pf-pain" style="top: 176px;"><s>Grabarte en cámara.</s> Tu agente anima.</p>
	<p class="pf-h" style="top: 250px; font-size: 128px;">Tu idea en <b>muñequitos<br>de palo.</b></p>
	${STICK_TILES.map(([still, sprite, cap], i) => `<div class="tile sq" style="left: ${88 + i * 492}px; top: 512px; width: 440px; height: 440px; border-radius: 22px;">${animated ? `<div class="sprite" style="background-image: url(assets/specreel-stick/${sprite});"></div>` : `<img src="assets/specreel-stick/${still}" width="440" height="440" alt="">`}<span class="cap">${cap}</span></div>`).join("")}
	<p class="pf-note" style="bottom: 18px; font-size: 16px;">Renders reales del motor incluido: el sketch de ejemplo y 2 guiones nuevos (bloque SKIT).</p>`;

const COVERS = {
	"anuncios-infinitos": () => `
	<div class="pf-dots"></div>
	<div class="pf-glow" style="left: 860px; top: 120px; width: 760px; height: 760px;"></div>
	${top("Anuncios Automáticos", `${CLAUDE}<span class="t">Claude Code</span>${SEP}<span class="t">Codex</span>${SEP}${ANTIGRAVITY}<span class="t">Antigravity</span>`).replace('class="pf-logos"', 'class="pf-logos" style="gap: 16px; padding: 0 24px;"').replaceAll('class="t"', 'class="t" style="font-size: 40px;"')}
	<p class="pf-pain" style="top: 200px;"><s>Anuncios de uno en uno.</s></p>
	<p class="pf-h" style="top: 278px;"><b style="font-size: 230px; letter-spacing: -0.05em;">250+</b><br>prompts en<br>una sesión.</p>
	<div style="position: absolute; left: 88px; top: 846px;"><span class="pf-chip"><i></i>Agente + app local</span></div>
	<div class="ad-grid">
		${["Prueba social", "Dolor y alivio", "Autoridad", "Urgencia", "Antes y después"].map((c) => `<div class="ad"><h4>${c}</h4><p><b>50</b><span>prompts</span></p></div>`).join("")}
		<div class="ad sum"><h4>mín. 5 × 50</h4><p><b>250+</b></p></div>
	</div>
	<div class="plat"><span class="lg">${si("meta", 56, "#d7d7dc")}${si("googleads", 52, "#d7d7dc")}${si("tiktok", 52, "#d7d7dc")}<span class="t">LinkedIn</span></span></div>
	<p class="pf-note">Categorías de ejemplo. Las marcas son de sus titulares; solo indican compatibilidad.</p>`,

	specreel: () => `
	<div class="pf-dots"></div>
	<div class="pf-glow" style="left: 760px; top: 140px; width: 900px; height: 900px;"></div>
	${top("SpecReel", `${CLAUDE}<span class="t">Claude Code</span>${SEP}<span class="t">Codex</span>`)}
	<p class="pf-pain" style="top: 196px;"><s>Línea de tiempo.</s><br><s>Créditos por minuto.</s></p>
	<p class="pf-h" style="top: 366px; font-size: 150px;">Video 3D<br>con tu<br><b>agente.</b></p>
	<div class="tile" style="left: 852px; top: 268px; width: 252px; height: 448px; transform: rotate(-6deg);"><img src="assets/specreel/celula.jpg" alt=""><span class="cap">Célula</span></div>
	<div class="tile" style="left: 1278px; top: 268px; width: 252px; height: 448px; transform: rotate(6deg);"><img src="assets/specreel/barras.jpg" alt=""><span class="cap" style="left: auto; right: 14px;">Showreel</span></div>
	<div class="tile" style="left: 1040px; top: 196px; width: 296px; height: 526px; border-color: #30d158;"><img src="assets/specreel/cabeza.jpg" alt=""><span class="cap">Microneedling</span></div>
	<div style="position: absolute; left: 852px; right: 88px; top: 790px; display: flex; justify-content: center; gap: 14px;"><span class="pf-chip" style="font-size: 32px;"><i></i>MP4 3D narrado</span><span class="pf-chip" style="font-size: 32px;">subtítulos + .srt</span></div>
	<p class="pf-note">Cuadros reales de 3 de los 4 ejemplos incluidos.</p>`,

	"specreel-stick": () => stick(false),

	"pagespeed-forensics": () => `
	<div class="pf-dots"></div>
	<div class="pf-glow" style="left: 760px; top: 420px; width: 820px; height: 620px; background: radial-gradient(closest-side, rgba(12,206,107,.18), rgba(12,206,107,0));"></div>
	${top("PageSpeed Forensics", `${si("pagespeed", 64)}<span class="t">PageSpeed</span>${SEP}${CLAUDE}<span class="t">Claude Code</span>`)}
	<p class="pf-pain" style="top: 200px;">¿Todo en 100…<br>menos Rendimiento?</p>
	<p class="pf-h" style="top: 352px; font-size: 128px;">Encuentra<br>los puntos<br>que <b>faltan.</b></p>
	<div class="ps" style="top: 186px;"><span class="tag">Ejemplo</span></div>
	<div class="ps" style="top: 290px;"><p class="ps-lbl">ANTES</p><div class="ps-row">${gauge(50, CATS[0])}${CATS.slice(1).map((c) => gauge(100, c, true)).join("")}</div></div>
	<div class="ps" style="top: 600px;"><p class="ps-lbl" style="color: #0cce6b;">DESPUÉS</p><div class="ps-row">${CATS.map((c) => gauge(100, c)).join("")}</div></div>
	<p class="pf-note">Ejemplo ilustrativo, no un caso medido: la skill trabaja el Rendimiento y no garantiza un puntaje.<br>PageSpeed Insights es marca de Google; sin afiliación.</p>`,

	cutpilot: () => {
		// x en px dentro de la pista (ancho útil 1218 px); los cortes atraviesan video y audio.
		const cuts = [[250, 96, "eh…"], [590, 132, "silencio"], [930, 116, "retoma"]];
		const keep = [[8, 238], [350, 236], [726, 200], [1050, 160]];
		const words = [[10, "Hoy"], [96, "les"], [168, "voy a"], [354, "mostrar"], [500, "mi"], [560, "sistema."], [728, "Tiene", true], [866, "tres"], [1052, "pasos."]];
		const gfx = [[10, 250, "Título"], [354, 214, "Logo"], [728, 190, "Cifra: 3"], [1052, 150, "Lista"]];
		return `
	<div class="pf-dots"></div>
	<div class="pf-glow" style="left: 980px; top: 120px; width: 620px; height: 520px;"></div>
	${top("CutPilot", `${CLAUDE}<span class="t">Claude Code</span>`)}
	<p class="pf-pain" style="top: 196px;"><s>«eh…», silencios y retomas.</s></p>
	<p class="pf-h" style="top: 268px; font-size: 140px; line-height: 1.02;">Tu video,<br><b>ya editado.</b></p>
	<div class="fmts"><div class="fm on" style="width: 214px; height: 120px;">16:9</div><div class="fm" style="width: 96px; height: 170px;">9:16</div><div class="fm" style="width: 128px; height: 128px;">1:1</div></div>
	<div class="tl">
		<div class="hd"><div style="top: 44px;">Video</div><div style="top: 116px;">Audio</div><div style="top: 202px;">Subtítulos</div><div style="top: 282px;">Gráficos</div></div>
		<div class="ruler">${[0, 1, 2, 3, 4, 5].map((k) => `<span style="left: ${14 + k * 200}px;">00:${String(k * 2).padStart(2, "0")}</span>`).join("")}</div>
		<div class="row" style="top: 44px;">${keep.map(([x, w]) => `<div class="clip v" style="left: ${x}px; width: ${w}px;"></div>`).join("")}</div>
		<div class="row" style="top: 116px; height: 80px;">${keep.map(([x, w], i) => `<div class="clip a" style="left: ${x}px; width: ${w}px;">${wave(17 + i * 31, Math.round(w / 7))}</div>`).join("")}</div>
		${cuts.map(([x, w, t]) => `<div class="cut" style="left: ${200 + x - 4}px; width: ${w}px;"><span>${t}</span></div>`).join("")}
		<div class="row" style="top: 202px;">${words.map(([x, t, on]) => `<div class="w${on ? " on" : ""}" style="left: ${x}px;">${t}</div>`).join("")}</div>
		<div class="row" style="top: 282px;">${gfx.map(([x, w, t]) => `<div class="gfx" style="left: ${x}px; width: ${w}px;">${t}</div>`).join("")}</div>
		<div class="ph" style="left: ${200 + 724}px;"></div>
	</div>
	<p class="pf-note" style="bottom: 18px; font-size: 16px;">Ilustración de la edición (no es una captura): cortes desde la transcripción, subtítulos palabra a palabra y gráficos.</p>`;
	},

	"motor-creativo-claude-code": () => {
		const apps = [["photocraft", "PhotoCraft"], ["lightcraft", "LightCraft"], ["vectorcraft", "VectorCraft"], ["filmcraft", "FilmCraft"], ["effectcraft", "EffectCraft"], ["designcraft", "DesignCraft"], ["pdfcraft", "PdfCraft"], ["figcraft", "FigCraft"], ["soundcraft", "SoundCraft"], ["deckcraft", "DeckCraft"], ["wordcraft", "WordCraft"], ["gridcraft", "GridCraft"], ["cadcraft", "CADCraft"]];
		return `
	<div class="pf-dots"></div>
	<div class="pf-glow" style="left: 820px; top: 120px; width: 780px; height: 780px;"></div>
	${top("Motor creativo", `${CLAUDE}<span class="t">Claude Code</span>`)}
	<p class="pf-pain" style="top: 200px;"><s>Todos los MCP a la vez.</s></p>
	<p class="pf-h" style="top: 284px;">13 apps<br>gratis.<br><b>Un agente<br>por app.</b></p>
	<div class="apps">${apps.map(([k, n]) => `<div class="app"><img src="assets/crafts/${k}-240.webp" width="118" height="118" alt=""><span>${n}</span></div>`).join("")}</div>
	<p class="pf-note">Íconos oficiales de las 13 apps open source de storytold (MIT OR Apache-2.0),<br>que se descargan gratis. Sin afiliación con storytold ni con Anthropic.</p>`;
	},
};

const ANIM_SCRIPT = `<script>
	// Portada animada (render-covers.mjs → data-anim): cada cuadro es función pura de i (sprites 7×5, 10 fps).
	window.__frame = (i) => {
		const k = i % 35, x = (k % 7) / 6 * 100, y = Math.floor(k / 7) / 4 * 100;
		document.querySelectorAll(".pf-sprite").forEach((el) => { el.style.backgroundPosition = x + "% " + y + "%"; });
		return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
	};
	window.__frame(0);
</script>`;

// Todas las clases propias llevan el prefijo pf- para no chocar con las de las pantallas del mismo archivo.
const KEEP = new Set(["frame", "pf"]);
const pfx = (n) => (KEEP.has(n) || n.startsWith("pf-") ? n : `pf-${n}`);
const prefixHtml = (h) => h.replace(/class="([^"]*)"/g, (_, c) => `class="${c.split(/\s+/).filter(Boolean).map(pfx).join(" ")}"`);
const prefixCss = (c) => c.replace(/\.([a-z][a-z0-9-]*)/g, (_, n) => `.${pfx(n)}`);

const START = "<!-- portada-final:inicio -->", END = "<!-- portada-final:fin -->";
for (const [slug, make] of Object.entries(COVERS)) {
	const url = new URL(`${slug}.html`, DESIGN);
	let html = readFileSync(url, "utf8");
	let section = `${START}\n<section class="frame pf" data-out="cover">${prefixHtml(make())}\n</section>\n`;
	if (slug === "specreel-stick") section += `<section class="frame pf" data-out="cover-animada" data-anim="35" data-fps="10" data-width="1600" data-quality="62">${prefixHtml(stick(true))}\n</section>\n${ANIM_SCRIPT}\n`;
	section += END;
	if (html.includes(START)) html = html.slice(0, html.indexOf(START)) + section + html.slice(html.indexOf(END) + END.length);
	else html = html.replace(/<section class="frame cover" data-out="cover">[\s\S]*?<\/section>/, section);
	html = html.replace(/\n?<style id="portada-final">[\s\S]*?<\/style>/, "").replace(/\n?<link data-portada-final [^>]*>/, "");
	html = html.replace("</head>", `${FONTS.replace("<link ", "<link data-portada-final ")}\n<style id="portada-final">${prefixCss(CSS)}</style>\n</head>`);
	// SpecReel: el script 3D dibujaba también la portada anterior; sin ella, se salta los lienzos que ya no existen.
	if (slug === "specreel" && !html.includes("if (!el) return;")) html = html.replace("function render(el, {", "function render(el, {").replace(/(function render\(el, \{[^\n]*\n)/, "$1\t\tif (!el) return;\n");
	writeFileSync(url, html);
	console.log(`✓ design/${slug}.html`);
}
