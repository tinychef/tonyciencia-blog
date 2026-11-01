// Portadas finales de Market Tony — ronda 2 (2026-11-01): las 6 con versión animada.
// Estilo aprobado: Dirección A (grafito, Inter Tight, verde #30d158, dolor → solución) + logos arriba (Dirección B).
// Reemplaza SOLO las secciones de portada de workers/market/design/<slug>.html (screen-1/screen-2 quedan intactas):
//   data-out="cover"          → imagen fija (el mejor cuadro de la animación)
//   data-out="cover-animada"  → WebP animado (render-covers.mjs graba cuadro a cuadro con window.__frame(i))
// Cada cuadro es función pura del tiempo: update(root, t). Textos, cifras y logos: ../portadas-finales.md.
//
// Uso (desde la raíz del repo):
//   node docs/ux/propuesta-2026-11-01/maquetas/portadas-finales.mjs
//   cd workers/market && for s in anuncios-infinitos specreel specreel-stick pagespeed-forensics cutpilot motor-creativo-claude-code; do
//     node scripts/render-covers.mjs $s --solo=cover,cover-animada; done
import { readFileSync, writeFileSync } from "node:fs";

const DESIGN = new URL("../../../../workers/market/design/", import.meta.url);
const brandsSrc = readFileSync(new URL("../src/lib/brands.ts", DESIGN), "utf8");
const PATH = {};
for (const m of brandsSrc.matchAll(/^\t"([a-z0-9-]+)": "([^"]+)",/gm)) PATH[m[1]] = m[2];
const si = (k, size, color = "#f5f5f7") => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" aria-hidden="true"><path d="${PATH[k]}"/></svg>`;
const img = (src, size) => `<img src="${src}" width="${size}" height="${size}" alt="">`;
// Logo de OpenAI/ChatGPT (lobe-icons, MIT): monocromo con fill="currentColor"; se dibuja en el blanco del texto.
const chatgpt = (size) => readFileSync(new URL("assets/logos/chatgpt.svg", DESIGN), "utf8")
	.replace(/height="1em"/, `height="${size}"`).replace(/width="1em"/, `width="${size}"`)
	.replace(/style="[^"]*"/, 'style="color: #f5f5f7; display: block;"').replace(/<title>[^<]*<\/title>/, "");
const L = 80; // tamaño de los logos de herramientas (antes 64)
const CLAUDE = img("assets/logos/claude.svg", L), ANTIGRAVITY = img("assets/logos/antigravity.svg", L);
const SEP = `<span class="pf-sep"></span>`;
const T = (s) => `<span class="pf-t">${s}</span>`;

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">`;

const CSS = `
.frame.pf { background: #0d0d0f; color: #f5f5f7; font-family: "Inter Tight", system-ui, sans-serif; }
.pf * { box-sizing: border-box; margin: 0; padding: 0; }
.pf .pf-dots { position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.075) 1.6px, transparent 1.6px); background-size: 32px 32px; -webkit-mask: linear-gradient(90deg, transparent 28%, #000 72%); mask: linear-gradient(90deg, transparent 28%, #000 72%); }
.pf .pf-glow { position: absolute; border-radius: 50%; background: radial-gradient(closest-side, rgba(48,209,88,.20), rgba(48,209,88,0)); pointer-events: none; }
.pf .pf-top { position: absolute; left: 88px; right: 88px; top: 48px; height: 112px; display: flex; align-items: center; justify-content: space-between; }
.pf .pf-name { display: flex; align-items: center; gap: 22px; font-size: 62px; line-height: 1; font-weight: 800; letter-spacing: -0.025em; }
.pf .pf-name u { text-decoration: underline; text-decoration-color: #30d158; text-decoration-thickness: 9px; text-underline-offset: 12px; text-decoration-skip-ink: none; }
.pf .pf-logos { display: flex; align-items: center; gap: 14px; height: 112px; padding: 0 30px; border: 3px solid #2e2e33; border-radius: 24px; background: #17171a; }
.pf .pf-logos img, .pf .pf-logos svg { display: block; width: ${L}px; height: ${L}px; flex: none; }
.pf .pf-t { font-size: 50px; font-weight: 800; letter-spacing: -0.015em; white-space: nowrap; }
.pf .pf-sep { width: 3px; height: 58px; background: #3a3a40; margin: 0 12px; }
.pf .pf-pain { position: absolute; left: 88px; font-size: 48px; line-height: 1.1; font-weight: 600; letter-spacing: -0.015em; color: #8e8e96; }
.pf .pf-pain s { text-decoration-thickness: 6px; text-decoration-color: rgba(245,245,247,.55); }
.pf .pf-h { position: absolute; left: 88px; font-size: 136px; line-height: 0.94; font-weight: 800; letter-spacing: -0.045em; }
.pf .pf-h b { font-weight: 800; color: #30d158; }
.pf .pf-sub { position: absolute; left: 88px; font-size: 38px; line-height: 1.2; font-weight: 600; color: #c7c7cc; letter-spacing: -0.01em; }
.pf .pf-note { position: absolute; right: 88px; bottom: 22px; font: 500 17px/1.3 "JetBrains Mono", monospace; color: #6e6e76; text-align: right; }
.pf .pf-chip { display: inline-flex; align-items: center; gap: 18px; font-size: 64px; font-weight: 800; letter-spacing: -0.02em; border: 4px solid #30d158; border-radius: 20px; padding: 10px 30px 14px; background: #13281a; }
/* Tarjetas de video (SpecReel, Stick) */
.pf .pf-tile { position: absolute; overflow: hidden; border: 4px solid #2e2e33; border-radius: 26px; background: #000; box-shadow: 0 30px 70px rgba(0,0,0,.6); }
.pf .pf-tile img { display: block; width: 100%; height: 100%; object-fit: cover; }
.pf .pf-sprite { width: 100%; height: 100%; background-repeat: no-repeat; background-size: 700% 500%; }
.pf .pf-cap { position: absolute; left: 16px; bottom: 16px; font: 700 22px "JetBrains Mono", monospace; background: rgba(13,13,15,.84); color: #f5f5f7; border: 2px solid #3a3a40; border-radius: 8px; padding: 4px 10px; }
.pf .pf-cap.r { left: auto; right: 16px; }
.pf .pf-cap.tr { left: auto; right: 14px; bottom: auto; top: 14px; }
/* Anuncios: cola de anuncios */
.pf .pf-q { position: absolute; left: 872px; top: 192px; width: 640px; height: 566px; overflow: hidden; }
.pf .pf-adc { position: absolute; left: 0; right: 0; top: 0; height: 178px; border: 3px solid #2e2e33; border-radius: 20px; background: #17171a; padding: 16px 22px; }
.pf .pf-adc.ok { border-color: #30d158; }
.pf .pf-adh { display: flex; align-items: center; gap: 14px; height: 48px; }
.pf .pf-adh svg { width: 42px; height: 42px; flex: none; }
.pf .pf-adh b { font-size: 34px; font-weight: 800; letter-spacing: -0.02em; }
.pf .pf-st { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; font: 700 21px "JetBrains Mono", monospace; color: #8e8e96; }
.pf .pf-st svg { width: 26px; height: 26px; }
.pf .pf-adc.ok .pf-st { color: #30d158; }
.pf .pf-adr { display: flex; align-items: center; gap: 14px; height: 30px; margin-top: 4px; }
.pf .pf-adr span { width: 250px; font-size: 22px; font-weight: 600; color: #a1a1a8; }
.pf .pf-adr i { position: relative; flex: 1; height: 14px; border-radius: 7px; background: #26262b; overflow: hidden; }
.pf .pf-adr em { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 7px; background: #f5f5f7; }
.pf .pf-adc.ok .pf-adr em { background: #30d158; }
.pf .pf-plat { position: absolute; left: 872px; width: 640px; top: 786px; display: flex; align-items: center; justify-content: space-between; }
.pf .pf-plat .pf-t { font-size: 58px; color: #f5f5f7; }
/* PageSpeed */
.pf .pf-ps { position: absolute; left: 808px; width: 704px; }
.pf .pf-row { display: flex; justify-content: space-between; }
.pf .pf-col { width: 160px; display: flex; flex-direction: column; align-items: center; }
.pf .pf-g { position: relative; }
.pf .pf-g svg { display: block; }
.pf .pf-g b { position: absolute; inset: 0; display: grid; place-items: center; font-weight: 800; letter-spacing: -0.04em; }
.pf .pf-glbl { margin-top: 12px; font-size: 30px; font-weight: 800; letter-spacing: -0.01em; }
.pf .pf-lbl { font: 700 28px "JetBrains Mono", monospace; letter-spacing: .1em; color: #a1a1a8; margin-bottom: 14px; }
.pf .pf-seal { display: inline-flex; align-items: center; gap: 12px; font: 800 44px "Inter Tight", sans-serif; letter-spacing: -0.01em; padding: 8px 22px 10px; border-radius: 14px; background: #f5f5f7; color: #0d0d0f; white-space: nowrap; }
.pf .pf-seal svg { width: 36px; height: 36px; }
.pf .pf-tag { display: inline-block; font: 800 46px "Inter Tight", sans-serif; padding: 6px 22px 8px; border-radius: 12px; background: #f5f5f7; color: #0d0d0f; }
/* CutPilot */
.pf .pf-tl { position: absolute; left: 88px; right: 88px; top: 568px; height: 376px; border: 3px solid #2e2e33; border-radius: 24px; background: #121215; overflow: hidden; }
.pf .pf-hd { position: absolute; left: 0; top: 0; bottom: 0; width: 200px; border-right: 3px solid #2e2e33; background: #17171a; z-index: 3; }
.pf .pf-hd div { position: absolute; left: 24px; right: 10px; height: 72px; display: flex; align-items: center; font-size: 28px; font-weight: 800; color: #d7d7dc; }
.pf .pf-ruler { position: absolute; left: 200px; right: 0; top: 0; height: 44px; border-bottom: 2px solid #2e2e33; font: 600 17px "JetBrains Mono", monospace; color: #6e6e76; }
.pf .pf-ruler span { position: absolute; top: 12px; }
.pf .pf-trk { position: absolute; left: 200px; right: 0; top: 0; bottom: 0; }
.pf .pf-clip { position: absolute; border-radius: 10px; }
.pf .pf-clip.v { top: 53px; height: 54px; background: #2a2a30; border: 2px solid #3a3a42; }
.pf .pf-clip.v::after { content: ""; position: absolute; left: 10px; top: 9px; width: 38px; height: 30px; border-radius: 6px; background: #3f3f47; }
.pf .pf-clip.a { top: 125px; height: 62px; background: #1b2a20; border: 2px solid #2a4a33; overflow: hidden; }
.pf .pf-clip.a svg { position: absolute; left: 6px; top: 4px; width: calc(100% - 12px); height: calc(100% - 8px); }
.pf .pf-cut { position: absolute; top: 44px; height: 158px; overflow: hidden; border-left: 3px dashed #6a6a72; border-right: 3px dashed #6a6a72; background: repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 10px, transparent 10px 20px); }
.pf .pf-cut span { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font: 700 22px "JetBrains Mono", monospace; color: #c7c7cc; white-space: nowrap; text-decoration: line-through; text-decoration-thickness: 3px; background: #121215; padding: 2px 8px; border-radius: 6px; }
.pf .pf-w { position: absolute; top: 216px; height: 44px; display: grid; place-items: center; padding: 0 11px; border-radius: 8px; background: #1d1d21; font-size: 24px; font-weight: 700; color: #6e6e76; white-space: nowrap; }
.pf .pf-w.done { background: #2e2e33; color: #f5f5f7; }
.pf .pf-w.on { background: #30d158; color: #0d0d0f; }
.pf .pf-gfx { position: absolute; top: 294px; height: 48px; display: flex; align-items: center; padding: 0 16px; border-radius: 10px; border: 3px solid #30d158; background: #13281a; font-size: 24px; font-weight: 800; color: #f5f5f7; white-space: nowrap; }
.pf .pf-ph { position: absolute; top: 30px; bottom: 0; width: 4px; background: #30d158; z-index: 2; }
.pf .pf-ph::before { content: ""; position: absolute; left: -10px; top: -2px; width: 24px; height: 18px; border-radius: 4px; background: #30d158; }
.pf .pf-fmts { position: absolute; right: 88px; top: 250px; display: flex; align-items: flex-end; gap: 22px; }
.pf .pf-fm { border: 4px solid #4a4a52; border-radius: 14px; display: grid; place-items: end start; padding: 10px 12px; font: 700 26px "JetBrains Mono", monospace; background: #17171a; color: #d7d7dc; }
.pf .pf-fm.on { border-color: #30d158; }
/* Motor */
.pf .pf-apps { position: absolute; left: 842px; top: 318px; width: 670px; display: flex; flex-wrap: wrap; justify-content: center; gap: 28px 18px; }
.pf .pf-app { width: 118px; text-align: center; }
.pf .pf-app img { display: block; width: 118px; height: 118px; border-radius: 26px; }
.pf .pf-app span { display: block; margin-top: 8px; font-size: 18px; font-weight: 700; color: #a1a1a8; }
`;

const top = (name, logos = "") => `<div class="pf-top"><div class="pf-name">${name}</div>${logos ? `<div class="pf-logos">${logos}</div>` : ""}</div>`;
const spritePos = (k) => `${((k % 7) / 6) * 100}% ${(Math.floor(k / 7) / 4) * 100}%`;
const GLOBE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
const CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

// Funciones de cuadro: se copian tal cual a la página (sin cierres sobre variables del generador).
const ease = { io: "const io = (x) => (x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2), oc = (x) => 1 - (1 - x) ** 3, cl = (x) => Math.min(1, Math.max(0, x));" };

const P = {};
// Idioma de la portada que se está generando: es (tienda en español) o en (/market/en/).
let LANG = "es";
const tr = (es, en) => (LANG === "en" ? en : es);

// ───────────── 1. Anuncios Automáticos ─────────────
P["anuncios-infinitos"] = {
	fps: 10, frames: 40, best: 0.8, quality: 70,
	html: () => {
		const cards = [["meta", "Meta Ads"], ["googleads", "Google Ads"], ["tiktok", "TikTok"], [null, "LinkedIn"]];
		return `
	<div class="pf-dots"></div>
	<div class="pf-glow" style="left: 840px; top: 140px; width: 760px; height: 760px;"></div>
	<div class="pf-top"><div class="pf-name" style="font-size: 56px; line-height: 1.02; display: block;">${tr("Anuncios<br><u>Automáticos</u>", "Automatic<br><u>Ads</u>")}</div><div class="pf-logos" style="gap: 10px; padding: 0 24px;">${CLAUDE}<span class="pf-t" style="font-size: 38px;">Claude Code</span>${SEP}${chatgpt(L)}<span class="pf-t" style="font-size: 38px;">Codex</span>${SEP}${ANTIGRAVITY}<span class="pf-t" style="font-size: 38px;">Antigravity</span></div></div>
	${tr(`<p class="pf-h" style="top: 200px; font-size: 120px;">Anuncios<br>automáticos<br><b>mientras<br>descansas.</b></p>`, `<p class="pf-h" style="top: 214px; font-size: 128px;">Automatic<br>ads while<br><b>you rest.</b></p>`)}
	<p class="pf-sub" style="top: 672px;">${tr("Tu agente investiga y escribe;<br>tú revisas y publicas.", "Your agent researches and writes;<br>you review and publish.")}</p>
	<div style="position: absolute; left: 88px; top: 808px; display: flex; align-items: center; gap: 22px;"><span class="pf-chip">${tr("App + Agente", "App + Agent")}</span>${tr("", `<span class="pf-seal">${GLOBE}In Spanish</span>`)}</div>
	<div class="pf-q">${cards.map(([k, n], j) => `<div class="pf-adc" data-j="${j}"><div class="pf-adh">${k ? si(k, 42) : ""}<b>${n}</b><span class="pf-st"></span></div>${tr(["Gancho", "Cuerpo", "Llamado a la acción"], ["Hook", "Body", "Call to action"]).map((r) => `<div class="pf-adr"><span>${r}</span><i><em></em></i></div>`).join("")}</div>`).join("")}</div>
	<div class="pf-plat">${si("meta", 92)}${si("googleads", 82)}${si("tiktok", 82)}<span class="pf-t">LinkedIn</span></div>
	<p class="pf-note">${tr("Ilustración del flujo: el agente escribe gancho, cuerpo y llamado a la acción de cada anuncio.<br>Las marcas son de sus titulares; solo indican compatibilidad.", "Flow illustration: the agent writes the hook, body and call to action of each ad. The agent works in Spanish.<br>Brands belong to their owners and are shown only to indicate compatibility.")}</p>`;
	},
	update: function (root, t) {
		const io = (x) => (x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2), cl = (x) => Math.min(1, Math.max(0, x));
		const n = Math.floor(t), f = t - n, s = n + (f < 0.35 ? io(f / 0.35) : 1);
		root.querySelectorAll(".pf-adc").forEach((c) => {
			const j = +c.dataset.j, p = (((j - s + 1) % 4) + 4) % 4 - 1, u = (((t - j + 3) % 4) + 4) % 4;
			const fill = cl((u - 0.4) / 1.8);
			c.style.transform = `translateY(${p * 194}px)`;
			c.querySelectorAll(".pf-adr em").forEach((e, k) => { e.style.width = `${cl(fill * 3 - k) * 100}%`; });
			const done = fill >= 1;
			c.classList.toggle("pf-ok", done);
			const en = root.dataset.lang === "en";
			c.querySelector(".pf-st").innerHTML = done ? `${c.dataset.check}${en ? "Ready to review" : "Para revisar"}` : u < 0.4 ? (en ? "Queued" : "En cola") : (en ? "Writing" : "Escribiendo");
		});
	},
	init: `root.querySelectorAll(".pf-adc").forEach((c) => { c.dataset.check = ${JSON.stringify(CHECK)}; });`,
};

// ───────────── 2. Motion 3D Video (SpecReel) ─────────────
const SR_TILES = [
	// [sprite, cuadro fijo, caja, rotación, rótulo, clase del rótulo]
	["anim-celula.webp", 30, "left: 690px; top: 262px; width: 316px; height: 562px;", -5, ["Célula", "Cell"], ""],
	["anim-showreel.webp", 34, "left: 1196px; top: 262px; width: 316px; height: 562px;", 5, "Showreel", "r"],
	["anim-micro.webp", 1, "left: 938px; top: 186px; width: 380px; height: 676px; border-color: #30d158;", 0, "Microneedling", ""],
];
P.specreel = {
	fps: 8, frames: 28, best: 0, quality: 42,
	html: (anim) => `
	<div class="pf-dots"></div>
	<div class="pf-glow" style="left: 700px; top: 120px; width: 900px; height: 900px;"></div>
	${top(`Motion <u>3D</u> Video`)}
	<p class="pf-pain" style="top: 214px;">${tr("<s>Línea de tiempo.</s><br><s>Créditos por minuto.</s>", "<s>Timeline editing.</s><br><s>Per-minute credits.</s>")}</p>
	<p class="pf-h" style="top: 384px; font-size: 138px;">${tr("Video 3D<br>con tu<br><b>agente.</b>", "3D video<br>by your<br><b>agent.</b>")}</p>
	${SR_TILES.map(([sp, k, box, rot, cap0, cc], _, __, cap = Array.isArray(cap0) ? tr(...cap0) : cap0) => `<div class="pf-tile" style="${box} transform: rotate(${rot}deg);"><div class="pf-sprite" style="background-image: url(assets/specreel/${sp}); background-position: ${spritePos(k)};"></div><span class="pf-cap ${cc}">${cap}</span></div>`).join("")}
	<p class="pf-note">${tr("Clips reales de 3 de los 4 ejemplos incluidos (sin la botella).", "Real renders (Spanish examples): 3 of the 4 included example videos.")}</p>`,
	update: function (root, t) {
		const k = Math.floor(t * 10 + 1e-6) % 35;
		root.querySelectorAll(".pf-sprite").forEach((el) => { el.style.backgroundPosition = `${((k % 7) / 6) * 100}% ${(Math.floor(k / 7) / 4) * 100}%`; });
	},
	staticFixed: true, // la portada fija usa el cuadro elegido de cada clip (no un mismo t)
};

// ───────────── 3. SpecReel Stick ─────────────
const STICK = [["escena-1.jpg", "anim-1.webp", ["1 % mejor cada día", "1% better every day"]], ["escena-2.jpg", "anim-2.webp", ["Uno ahorra, otro gasta", "One saves, one spends"]], ["escena-3.jpg", "anim-3.webp", ["El que empieza vs. el que espera", "One starts, one waits"]]];
P["specreel-stick"] = {
	fps: 10, frames: 35, best: 0, quality: 50,
	html: (anim) => `
	<div class="pf-glow" style="left: 300px; top: 420px; width: 1000px; height: 700px;"></div>
	${top(`SpecReel <u>Stick</u>`, `${CLAUDE}${T("Claude Code")}${SEP}${chatgpt(L)}${T("Codex")}`)}
	<p class="pf-pain" style="top: 186px; font-size: 34px;">${tr("<s>Grabarte en cámara.</s> Tu agente anima.", "<s>Filming yourself.</s> Your agent animates.")}</p>
	<p class="pf-h" style="top: 238px; font-size: 120px;">${tr("Tu idea en <b>muñequitos<br>de palo.</b>", "Your idea, in <b>stick<br>figures.</b>")}</p>
	${STICK.map(([still, sprite, cap], i) => `<div class="pf-tile" style="left: ${56 + i * 504}px; top: 470px; width: 480px; height: 480px; border-radius: 24px;">${anim ? `<div class="pf-sprite" style="background-image: url(assets/specreel-stick/${sprite});"></div>` : `<img src="assets/specreel-stick/${still}" width="480" height="480" alt="">`}<span class="pf-cap tr">${tr(...cap)}</span></div>`).join("")}
	<p class="pf-note" style="bottom: 16px; font-size: 15px;">${tr("Renders reales del motor incluido: el sketch de ejemplo y 2 guiones nuevos (bloque SKIT).", "Real renders (Spanish examples) from the included engine: the sample skit and 2 new scripts (SKIT block).")}</p>`,
	update: P.specreel.update,
	staticFixed: true,
};

// ───────────── 4. PageSpeed Forensics ─────────────
// Ejemplo (no medido) y coherente con la ponderación de Lighthouse 10+: 0,10·FCP + 0,25·LCP + 0,30·TBT
// (+ 0,10·SI + 0,25·CLS, aquí en 0) = 3,2 + 2,75 + 3,0 ≈ 9.
const PS = [[["Rendimiento", "Performance"], 9], ["FCP", 32], ["LCP", 11], ["TBT", 10]];
const ringSvg = (size, stroke) => {
	const r = (size - stroke) / 2, c = 2 * Math.PI * r, h = size / 2;
	return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="pf-rf" cx="${h}" cy="${h}" r="${r}" fill-opacity=".12" stroke-opacity=".22" stroke-width="${stroke}"/><circle class="pf-ra" cx="${h}" cy="${h}" r="${r}" fill="none" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-c="${c}" transform="rotate(-90 ${h} ${h})"/></svg>`;
};
const gauge = (size, stroke, fs, v0) => `<div class="pf-g" data-v0="${v0}" style="width: ${size}px; height: ${size}px;">${ringSvg(size, stroke)}<b style="font-size: ${fs}px;"></b></div>`;
P["pagespeed-forensics"] = {
	fps: 10, frames: 40, best: 3.9, quality: 72,
	html: () => `
	<div class="pf-dots"></div>
	<div class="pf-glow" style="left: 760px; top: 380px; width: 860px; height: 640px; background: radial-gradient(closest-side, rgba(12,206,107,.16), rgba(12,206,107,0));"></div>
	${top(`${si("pagespeed", 72)}<span>PageSpeed <u>Forensics</u></span>`)}
	<p class="pf-pain" style="top: 214px;">${tr("¿Rendimiento móvil<br>en rojo?", "Mobile Performance<br>in the red?")}</p>
	<p class="pf-h" style="top: 372px; font-size: 128px;">${tr("Encuentra<br>los puntos<br>que <b>faltan.</b>", "Find the<br>missing<br><b>points.</b>")}</p>
	<div class="pf-ps" style="top: 190px; display: flex; align-items: center; justify-content: space-between;"><span class="pf-tag">${tr("Ejemplo", "Example")}</span><span class="pf-lbl" style="margin: 0;">${tr("PAGESPEED · MÓVIL", "PAGESPEED · MOBILE")}</span></div>
	<div class="pf-ps" style="top: 290px;"><p class="pf-lbl">${tr("ANTES", "BEFORE")}</p><div class="pf-row pf-before">${PS.map(([, v]) => `<div class="pf-col">${gauge(104, 10, 42, v)}</div>`).join("")}</div></div>
	<div class="pf-ps" style="top: 480px;"><p class="pf-lbl" style="color: #0cce6b;">${tr("DESPUÉS", "AFTER")}</p><div class="pf-row pf-after">${PS.map(([l, v]) => `<div class="pf-col">${gauge(160, 14, 66, v)}<span class="pf-glbl">${Array.isArray(l) ? tr(...l) : l}</span></div>`).join("")}</div></div>
	<p class="pf-note">${tr("Ejemplo ilustrativo, no un caso medido: Rendimiento y sus métricas de Lighthouse, que es lo que trabaja la skill.<br>No garantiza un puntaje. PageSpeed Insights es marca de Google; sin afiliación.", "Illustrative example, not a measured case: Performance and its Lighthouse metrics, which is what the skill works on.<br>No score is guaranteed. PageSpeed Insights is a Google trademark; not affiliated.")}</p>`,
	update: function (root, t) {
		const oc = (x) => 1 - (1 - x) ** 3, cl = (x) => Math.min(1, Math.max(0, x));
		const col = (v) => (v < 50 ? "#ff4e42" : v < 90 ? "#ffa400" : "#0cce6b");
		const paint = (g, v) => {
			const c = col(v), a = g.querySelector(".pf-ra"), f = g.querySelector(".pf-rf");
			a.setAttribute("stroke", c); a.setAttribute("stroke-dashoffset", +a.dataset.c * (1 - v / 100));
			f.setAttribute("fill", c); f.setAttribute("stroke", c);
			const b = g.querySelector("b"); b.textContent = Math.round(v); b.style.color = c;
		};
		root.querySelectorAll(".pf-before .pf-g").forEach((g) => paint(g, +g.dataset.v0));
		root.querySelectorAll(".pf-after .pf-g").forEach((g, i) => {
			const v0 = +g.dataset.v0, e = oc(cl((t - 0.5 - 0.22 * i) / 1.5));
			paint(g, v0 + (100 - v0) * e);
		});
	},
};

// ───────────── 5. Edit Pro para YouTube (CutPilot) ─────────────
const CUT = {
	// clips que quedan [x, ancho] y cortes [x, ancho, rótulo] en coordenadas de la grabación (pista de 1218 px)
	keep: [[8, 238], [348, 236], [688, 230], [1022, 166]],
	cuts: [[250, 94, "eh…"], [588, 96, ["silencio", "silence"]], [922, 96, ["retoma", "retake"]]],
	words: [[0, "Hoy"], [0, "les"], [0, "muestro"], [1, "mi"], [1, "sistema:"], [2, "tres"], [3, "pasos."]],
	gfx: [[0, ["Título", "Title"]], [1, "Logo"], [2, ["Cifra: 3", "Figure: 3"]], [3, ["Lista", "List"]]],
	v: 450, t0: 0.25, pause: 0.45, len: 1218,
};
const wave = (seed, n) => {
	let s = seed >>> 0; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
	let bars = "";
	for (let k = 0; k < n; k++) { const env = 0.3 + 0.7 * Math.sin(Math.PI * (k + 0.5) / n) ** 0.5; const h = Math.max(0.15, env * (0.3 + 0.7 * r())); bars += `<rect x="${k * 5 + 1}" y="${(1 - h) * 10}" width="3" height="${h * 20}" rx="1.5"/>`; }
	return `<svg viewBox="0 0 ${n * 5} 20" preserveAspectRatio="none" fill="#30d158" opacity=".8">${bars}</svg>`;
};
{
	const dist = CUT.cuts.map(([x], i) => x - CUT.cuts.slice(0, i).reduce((a, c) => a + c[1], 0));
	CUT.T = dist.map((d, i) => CUT.t0 + d / CUT.v + i * CUT.pause);
}
P.cutpilot = {
	fps: 10, frames: 40, best: CUT.T[1] + 0.22, quality: 70,
	html: () => `
	<div class="pf-dots"></div>
	<div class="pf-glow" style="left: 980px; top: 120px; width: 620px; height: 520px;"></div>
	${top(tr("Edit <u>Pro</u> para YouTube", "Edit <u>Pro</u> for YouTube"), `${CLAUDE}${T("Claude Code")}`)}
	<p class="pf-pain" style="top: 204px;">${tr("<s>«eh…», silencios y retomas.</s>", "<s>Filler words, silences, retakes.</s>")}</p>
	${tr(`<p class="pf-h" style="top: 280px; font-size: 140px; line-height: 1.0;">Tu video,<br><b>ya editado.</b></p>`, `<p class="pf-h" style="top: 282px; font-size: 128px; line-height: 1.02;">Your video,<br><b>already edited.</b></p>`)}
	${tr("", `<div style="position: absolute; right: 88px; top: 178px;"><span class="pf-seal">${GLOBE}Spanish-language videos</span></div>`)}
	<div class="pf-fmts"${tr("", ' style="top: 262px;"')}><div class="pf-fm on" style="width: 214px; height: 120px;">16:9</div><div class="pf-fm" style="width: 96px; height: 170px;">9:16</div><div class="pf-fm" style="width: 128px; height: 128px;">1:1</div></div>
	<div class="pf-tl">
		<div class="pf-hd"><div style="top: 44px;">Video</div><div style="top: 120px;">Audio</div><div style="top: 202px;">${tr("Subtítulos", "Captions")}</div><div style="top: 282px;">${tr("Gráficos", "Graphics")}</div></div>
		<div class="pf-ruler">${[0, 1, 2, 3, 4, 5].map((k) => `<span style="left: ${14 + k * 200}px;">00:${String(k * 2).padStart(2, "0")}</span>`).join("")}</div>
		<div class="pf-trk">
			${CUT.keep.map(([x, w]) => `<div class="pf-clip v" data-x="${x}" style="width: ${w}px;"></div>`).join("")}
			${CUT.keep.map(([x, w], i) => `<div class="pf-clip a" data-x="${x}" style="width: ${w}px;">${wave(17 + i * 31, Math.round(w / 7))}</div>`).join("")}
			${CUT.cuts.map(([x, w, l], i) => `<div class="pf-cut" data-i="${i}"><span>${Array.isArray(l) ? tr(...l) : l}</span></div>`).join("")}
			${CUT.words.map(([c, w]) => `<div class="pf-w" data-c="${c}">${w}</div>`).join("")}
			${CUT.gfx.map(([c, l]) => `<div class="pf-gfx" data-x="${CUT.keep[c][0] + 2}" style="width: ${CUT.keep[c][1] - 4}px;">${Array.isArray(l) ? tr(...l) : l}</div>`).join("")}
			<div class="pf-ph"></div>
		</div>
	</div>
	<p class="pf-note" style="bottom: 16px; font-size: 15px;">${tr("Ilustración de la edición (no es una captura): cortes desde la transcripción, subtítulos palabra a palabra y gráficos.", "Editing illustration (not a screenshot): cuts from the transcript, word-by-word captions and graphics. For videos spoken in Spanish.")}</p>`,
	update: function (root, t) {
		const D = root.__cut;
		// palabras en fila dentro de su clip (ancho medido), en coordenadas de la grabación
		const nx = D.keep.map(([x]) => x + 4);
		root.querySelectorAll(".pf-w").forEach((el) => { const ci = +el.dataset.c; el.dataset.x = nx[ci]; nx[ci] += el.offsetWidth + 8; });
		const io = (x) => (x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2), cl = (x) => Math.min(1, Math.max(0, x));
		const c = D.cuts.map((_, i) => io(cl((t - D.T[i]) / D.pause)));
		const shift = (x) => D.cuts.reduce((a, [cx, cw], i) => a + (cx < x ? cw * c[i] : 0), 0);
		const end = D.len - D.cuts.reduce((a, k) => a + k[1], 0);
		let p = D.v * (t - D.t0); D.T.forEach((Ti) => { p -= D.v * cl((t - Ti) / D.pause) * D.pause; });
		p = Math.min(end, Math.max(0, p));
		root.querySelectorAll("[data-x]").forEach((el) => { el.style.left = `${+el.dataset.x - shift(+el.dataset.x)}px`; });
		root.querySelectorAll(".pf-cut").forEach((el) => {
			const i = +el.dataset.i, [cx, cw] = D.cuts[i];
			el.style.left = `${cx - shift(cx) - 3}px`; el.style.width = `${cw * (1 - c[i])}px`;
			el.style.opacity = c[i] >= 1 ? 0 : 1; el.querySelector("span").style.opacity = cl(1 - c[i] * 1.6);
		});
		let last = null;
		root.querySelectorAll(".pf-w").forEach((el) => { const x = +el.dataset.x - shift(+el.dataset.x); el.className = "pf-w"; if (x <= p + 2) { el.classList.add("pf-done"); last = el; } });
		if (last && p < end) last.className = "pf-w pf-on";
		root.querySelectorAll(".pf-gfx").forEach((el) => { el.style.opacity = +el.dataset.x - shift(+el.dataset.x) <= p + 2 ? 1 : 0.35; });
		root.querySelector(".pf-ph").style.left = `${p}px`;
	},
	init: `root.__cut = ${JSON.stringify({ ...CUT, cuts: CUT.cuts.map(([x, w]) => [x, w]) })};`,
};

// ───────────── 6. Creative Factory (Motor creativo) ─────────────
const APPS = [["photocraft", "PhotoCraft"], ["lightcraft", "LightCraft"], ["vectorcraft", "VectorCraft"], ["filmcraft", "FilmCraft"], ["effectcraft", "EffectCraft"], ["designcraft", "DesignCraft"], ["pdfcraft", "PdfCraft"], ["figcraft", "FigCraft"], ["soundcraft", "SoundCraft"], ["deckcraft", "DeckCraft"], ["wordcraft", "WordCraft"], ["gridcraft", "GridCraft"], ["cadcraft", "CADCraft"]];
P["motor-creativo-claude-code"] = {
	fps: 10, frames: 40, best: 3.3, quality: 75,
	html: () => `
	<div class="pf-dots"></div>
	<div class="pf-glow" style="left: 820px; top: 140px; width: 780px; height: 780px;"></div>
	${top(`Creative <u>Factory</u>`, `${CLAUDE}${T("Claude Code")}${SEP}${ANTIGRAVITY}${T("Antigravity")}`)}
	<p class="pf-pain" style="top: 200px; font-size: 76px; font-weight: 800; color: #a1a1a8; letter-spacing: -0.03em;"><s style="text-decoration-thickness: 8px;">Adobe Creative Cloud</s></p>
	<p class="pf-h" style="top: 322px; font-size: 128px;">${tr("13 apps<br>gratis.<br><b>Un agente<br>por app.</b>", "13 free<br>apps.<br><b>One agent<br>per app.</b>")}</p>
	<div class="pf-apps">${APPS.map(([k, n]) => `<div class="pf-app"><img src="assets/crafts/${k}-240.webp" width="118" height="118" alt=""><span>${n}</span></div>`).join("")}</div>
	<p class="pf-note">${tr("Íconos oficiales de las 13 apps open source de storytold (MIT OR Apache-2.0), que se descargan gratis.<br>Adobe Creative Cloud es marca de Adobe. Sin afiliación con Adobe, storytold ni Anthropic.", "Official icons of storytold's 13 open-source apps (MIT OR Apache-2.0), free to download.<br>Adobe Creative Cloud is an Adobe trademark. Not affiliated with Adobe, storytold or Anthropic.")}</p>`,
	update: function (root, t) {
		const oc = (x) => 1 - (1 - x) ** 3, cl = (x) => Math.min(1, Math.max(0, x));
		const back = cl((t - 3.6) / 0.35);
		root.querySelectorAll(".pf-app").forEach((el, i) => {
			const e = oc(cl((t - 0.25 - 0.2 * i) / 0.35)) * (1 - back);
			const im = el.querySelector("img");
			im.style.filter = `grayscale(${1 - e}) brightness(${1.45 - 0.45 * e}) contrast(${0.7 + 0.3 * e})`;
			im.style.opacity = 0.5 + 0.5 * e;
			im.style.transform = `rotate(${(1 - e) * -8}deg) scale(${0.9 + 0.1 * e})`;
			el.querySelector("span").style.color = e > 0.5 ? "#f5f5f7" : "#6e6e76";
		});
	},
};

// ───────────── Ensamblado ─────────────
const KEEP = new Set(["frame", "pf"]);
const pfx = (n) => (KEEP.has(n) || n.startsWith("pf-") ? n : `pf-${n}`);
const prefixHtml = (h) => h.replace(/class="([^"]*)"/g, (_, c) => `class="${c.split(/\s+/).filter(Boolean).map(pfx).join(" ")}"`);
const prefixCss = (c) => c.replace(/\.([a-z][a-z0-9-]*)/g, (_, n) => `.${pfx(n)}`);

const script = (p) => `<script>
(() => {
	// Portadas: cuadro = función pura de t. La fija muestra t = ${p.staticFixed ? "cuadros elegidos" : p.best.toFixed(2) + " s"}; la animada se graba con window.__frame(i).
	const update = ${p.update.toString().replace(/^function\s*\(/, "function (")};
	// Una portada fija y una animada por idioma (cover / cover-animada y en/cover / en/cover-animada).
	const S = [...document.querySelectorAll("section.pf:not([data-anim])")], A = [...document.querySelectorAll("section.pf[data-anim]")];
	for (const root of [...S, ...A]) { ${p.init ?? ""} }
	const first = () => { ${p.staticFixed ? "" : `S.forEach((s) => update(s, ${p.best}));`} A.forEach((a) => update(a, 0)); };
	first(); document.fonts.ready.then(first);
	window.__frame = (i) => { A.forEach((a) => update(a, i / ${p.fps})); return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); };
})();
</script>`;

const START = "<!-- portada-final:inicio -->", END = "<!-- portada-final:fin -->";
for (const [slug, p] of Object.entries(P)) {
	const url = new URL(`${slug}.html`, DESIGN);
	let html = readFileSync(url, "utf8");
	const sections = ["es", "en"].map((lang) => {
		LANG = lang;
		const dir = lang === "en" ? "en/" : "";
		return `<section class="frame pf" data-out="${dir}cover" data-lang="${lang}" data-cpu>${prefixHtml(p.html(false))}
</section>
<section class="frame pf" data-out="${dir}cover-animada" data-lang="${lang}" data-anim="${p.frames}" data-fps="${p.fps}" data-width="1600" data-quality="${p.quality}">${prefixHtml(p.html(true))}
</section>`;
	}).join("\n");
	LANG = "es";
	const section = `${START}
${sections}
${script(p)}
${END}`;
	if (html.includes(START)) html = html.slice(0, html.indexOf(START)) + section + html.slice(html.indexOf(END) + END.length);
	else html = html.replace(/<section class="frame cover" data-out="cover">[\s\S]*?<\/section>/, section);
	html = html.replace(/\n?<style id="portada-final">[\s\S]*?<\/style>/, "").replace(/\n?<link data-portada-final [^>]*>/, "");
	html = html.replace("</head>", `${FONTS.replace("<link ", "<link data-portada-final ")}\n<style id="portada-final">${prefixCss(CSS)}</style>\n</head>`);
	if (slug === "specreel" && !html.includes("if (!el) return;")) html = html.replace(/(function render\(el, \{[^\n]*\n)/, "$1\t\tif (!el) return;\n");
	writeFileSync(url, html);
	console.log(`✓ design/${slug}.html`);
}
