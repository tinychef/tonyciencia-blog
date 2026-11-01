// Genera las maquetas HTML autocontenidas de la propuesta 2026-11-01 (direcciones A y B).
// Textos y cifras: fichas de producción (2026-11-01) y repos de cada producto. Ver propuesta.md → «Fuentes».
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// Uso (desde la raíz del repo): node docs/ux/propuesta-2026-11-01/maquetas/generar.mjs

const OUT = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");
const brandsSrc = readFileSync(new URL("../../../../workers/market/src/lib/brands.ts", import.meta.url), "utf8");
const PATH = {};
for (const m of brandsSrc.matchAll(/^\t"([a-z0-9-]+)": "([^"]+)",/gm)) PATH[m[1]] = m[2];
const logo = (k, size = 20, color = "currentColor") =>
	`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" aria-hidden="true"><path d="${PATH[k]}"/></svg>`;

const IC = {
	arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
	search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
	menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
	check: '<path d="M20 6 9 17l-5-5"/>',
	lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
	download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
	refund: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
	chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
	down: '<path d="m6 9 6 6 6-6"/>',
	left: '<path d="m15 18-6-6 6-6"/>',
	sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
	gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
	sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
	x: '<path d="M18 6 6 18M6 6l12 12"/>',
};
const icon = (n, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

// ───────────────────────── Datos de los 6 productos (de sus fichas) ─────────────────────────
const P = [
	{
		slug: "anuncios-infinitos", name: "Anuncios Infinitos", kind: "Agente de IA · Publicidad",
		line: "Investiga tu negocio y te entrega 250+ prompts de anuncios, cada uno con su razón.",
		price: { now: "$33.33", was: "$76.90", off: "−57 %" }, badge: "Oferta −57 %", cta: "Ver oferta",
		includes: "Agente + app local", cat: "Anuncios",
		compat: [["claude", "Claude Code"], ["meta", "Meta Ads"], ["googleads", "Google Ads"], ["tiktok", "TikTok"]], more: "+5",
	},
	{
		slug: "specreel", name: "SpecReel", kind: "Skill · Video 3D",
		line: "Pide un video a tu agente y recibe un MP4 3D narrado, con subtítulos, música y cámara de cine.",
		price: { now: "$12", was: "$36.90", off: "−67 %" }, badge: "Oferta −67 %", cta: "Ver oferta", cat: "Video",
		compat: [["claude", "Claude Code"], [null, "Codex"], ["apple", "macOS"], ["linux", "Linux"]], more: "+2",
	},
	{
		slug: "specreel-stick", name: "SpecReel Stick", kind: "Skill · Video animado",
		line: "Le cuentas la idea a tu agente y te devuelve un sketch de muñequitos de palo en MP4.",
		price: { now: "$12" }, cta: "Ver", cat: "Video",
		compat: [["claude", "Claude Code"], [null, "Codex"], ["apple", "macOS"], ["linux", "Linux"]], more: "+4",
	},
	{
		slug: "pagespeed-forensics", name: "PageSpeed Forensics", kind: "Skill · SEO web",
		line: "Descubre con evidencia por qué tu web saca 85 en PageSpeed móvil y 100 en tu PC.",
		price: { pwyw: true, sug: "$9" }, badge: "Paga lo que quieras", cta: "Elegir precio", cat: "SEO",
		compat: [["pagespeed", "PageSpeed Insights"], ["lighthouse", "Lighthouse"], ["claude", "Claude Code"], ["node", "Node.js"]], more: "+1",
	},
	{
		slug: "cutpilot", name: "CutPilot", kind: "Editor de video · En tu PC",
		line: "Dejas tu grabación en una carpeta y recibes el video limpio, subtitulado y con gráficos.",
		price: { now: "$12" }, cta: "Ver", includes: "Editor + panel de Chrome", cat: "Video",
		compat: [["claude", "Claude Code"], ["ffmpeg", "FFmpeg"], ["python", "Python"], [null, "Windows"]],
	},
	{
		slug: "motor-creativo-claude-code", short: "motor", name: "Motor creativo", kind: "13 agentes de IA",
		line: "Pide en español la pieza que necesitas y un agente la produce con apps open source en tu PC.",
		price: { pwyw: true, sug: "$19" }, badge: "Paga lo que quieras", cta: "Elegir precio", cat: "Agentes",
		compat: [["claude", "Claude Code"], ["python", "Python"], [null, "Windows"]],
	},
];
const short = (p) => p.short ?? p.slug.replace("-forensics", "").replace("anuncios-infinitos", "anuncios").replace("specreel-stick", "stick");

// ───────────────────────── Portadas A: «Dolor → solución» (1600×1000) ─────────────────────────
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">`;

const ring = (value, size, stroke, color, track) => {
	const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - value / 100);
	return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
};

const A_CSS = `
:root { --bg: #0d0d0f; --panel: #17171a; --panel2: #1f1f23; --line: #2e2e33; --fg: #f5f5f7; --mut: #a1a1a8; --dim: #6e6e76; --green: #30d158; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #444; font-family: "Inter Tight", system-ui, sans-serif; }
.frame { width: 1600px; height: 1000px; position: relative; overflow: hidden; background: var(--bg); color: var(--fg); margin: 0 0 40px; }
.frame::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.07) 1.5px, transparent 1.5px); background-size: 32px 32px; mask: linear-gradient(90deg, transparent 35%, #000 70%); -webkit-mask: linear-gradient(90deg, transparent 35%, #000 70%); }
.copy { position: absolute; left: 96px; top: 96px; bottom: 96px; width: 800px; display: flex; flex-direction: column; }
.pain { font-size: 58px; line-height: 1.12; font-weight: 600; color: var(--mut); letter-spacing: -0.015em; max-width: 760px; }
.pain s { text-decoration-thickness: 5px; text-decoration-color: rgba(255,255,255,.45); }
h1 { margin-top: 34px; font-size: 136px; line-height: 1.0; font-weight: 800; letter-spacing: -0.035em; }
h1 em { font-style: normal; color: var(--green); }
.logos { margin-top: auto; display: flex; flex-wrap: wrap; align-items: center; gap: 24px 30px; color: #d7d7dc; }
.logos .t { font-size: 46px; font-weight: 700; letter-spacing: -0.01em; color: #d7d7dc; }
.logos .sep { width: 2px; height: 56px; background: var(--line); }
.inc { display: inline-flex; align-items: center; gap: 14px; font-size: 40px; font-weight: 700; border: 3px solid var(--line); border-radius: 14px; padding: 10px 22px; color: var(--fg); background: var(--panel); }
.inc i { width: 16px; height: 16px; border-radius: 4px; background: var(--green); }
.vis { position: absolute; right: 80px; top: 80px; bottom: 80px; width: 600px; display: flex; flex-direction: column; justify-content: center; }
.note { position: absolute; right: 80px; bottom: 34px; width: 760px; font-size: 19px; color: var(--dim); text-align: right; font-family: "JetBrains Mono", monospace; }
.tag { display: inline-block; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 30px; letter-spacing: .08em; padding: 8px 16px; border-radius: 10px; background: var(--fg); color: #0d0d0f; }
/* PageSpeed */
.gauges { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.gauge { position: relative; width: 250px; text-align: center; }
.gauge b { position: absolute; left: 0; right: 0; top: 0; height: 250px; display: grid; place-items: center; font-size: 100px; font-weight: 800; letter-spacing: -0.04em; }
.gauge p { margin-top: 22px; font-size: 38px; font-weight: 700; line-height: 1.1; display: flex; align-items: center; justify-content: center; gap: 12px; }
.gauge small { display: block; margin-top: 6px; font-size: 26px; color: var(--mut); font-weight: 600; }
.vs { align-self: center; margin-top: -90px; font-size: 80px; font-weight: 800; color: var(--mut); }
/* Anuncios */
.adgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.ad { background: var(--panel); border: 3px solid var(--line); border-radius: 22px; padding: 26px 26px 22px; height: 222px; display: flex; flex-direction: column; }
.ad h4 { font-size: 46px; line-height: 1; font-weight: 800; letter-spacing: -0.02em; }
.ad .n { margin-top: auto; display: flex; align-items: baseline; gap: 10px; }
.ad .n b { font-size: 64px; font-weight: 800; color: var(--green); letter-spacing: -0.03em; }
.ad .n span { font-size: 28px; color: var(--mut); font-weight: 600; }
.ad .pl { position: absolute; }
.adfoot { margin-top: 22px; display: flex; justify-content: space-between; align-items: center; font-size: 30px; color: var(--mut); font-weight: 600; }
.adfoot .lg { display: flex; gap: 18px; color: #d7d7dc; }
/* SpecReel */
.flow { display: flex; align-items: center; gap: 26px; }
.ask { width: 230px; background: var(--panel); border: 3px solid var(--line); border-radius: 22px; padding: 24px; font-size: 34px; font-weight: 700; line-height: 1.1; }
.ask small { display: block; font-size: 22px; color: var(--mut); font-family: "JetBrains Mono", monospace; margin-bottom: 12px; font-weight: 500; }
.arrow { color: var(--green); flex: none; }
.shot { position: relative; border-radius: 26px; overflow: hidden; border: 3px solid var(--line); background: #000; }
.shot img { display: block; }
.shot .lbl { position: absolute; left: 16px; right: 16px; bottom: 16px; display: flex; gap: 10px; flex-wrap: wrap; }
.shot .lbl span { font-family: "JetBrains Mono", monospace; font-size: 22px; font-weight: 700; background: rgba(0,0,0,.75); border: 2px solid #3a3a40; border-radius: 8px; padding: 4px 10px; }
/* CutPilot */
.tr { background: var(--panel); border: 3px solid var(--line); border-radius: 22px; padding: 30px 32px; font-size: 40px; line-height: 1.45; font-weight: 600; }
.tr s { color: var(--dim); text-decoration-thickness: 4px; }
.tr .k { color: var(--fg); }
.fmts { margin-top: 28px; display: flex; align-items: flex-end; gap: 22px; }
.fm { border: 3px solid #4a4a52; border-radius: 14px; display: grid; place-items: end start; padding: 12px; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 26px; background: var(--panel); position: relative; }
.fm::after { content: ""; position: absolute; left: 50%; top: 30%; width: 34%; aspect-ratio: 1; border-radius: 50%; background: #3a3a42; transform: translateX(-50%); }
.fm.on { border-color: var(--green); }
/* Motor */
.prompt { background: var(--panel); border: 3px solid var(--line); border-radius: 22px; padding: 26px 28px; font-size: 36px; font-weight: 700; line-height: 1.15; }
.prompt small { display: block; font-family: "JetBrains Mono", monospace; font-size: 22px; color: var(--mut); margin-bottom: 10px; font-weight: 500; }
.tiles { margin-top: 22px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.tile { background: var(--panel); border: 2px solid var(--line); border-radius: 14px; height: 92px; padding: 12px 10px; font-size: 18.5px; overflow: hidden; letter-spacing: -0.01em; font-weight: 700; display: flex; align-items: flex-end; color: #cfcfd4; }
.tile.on { border: 3px solid var(--green); color: var(--fg); background: #13281a; }
`;

const coverA = {
	"pagespeed": () => `
	<div class="copy">
		<p class="pain">¿100 en tu PC y 85 en PageSpeed móvil?</p>
		<h1>Encuentra los puntos que <em>faltan.</em></h1>
		<div class="logos">${logo("pagespeed", 64)}${logo("lighthouse", 64)}<span class="sep"></span>${logo("claude", 60)}<span class="t">Claude Code</span></div>
	</div>
	<div class="vis">
		<div class="gauges">
			<div class="gauge">${ring(85, 250, 24, "#8e8e96", "#26262b")}<b>85</b><p>${logo("pagespeed", 40)}PageSpeed</p><small>móvil</small></div>
			<span class="vs">≠</span>
			<div class="gauge">${ring(100, 250, 24, "#30d158", "#26262b")}<b>100</b><p>${logo("lighthouse", 40)}Tu PC</p><small>Lighthouse local</small></div>
		</div>
	</div>
	<p class="note">Escenario de la ficha y del README. Sin afiliación con Google.</p>`,
	"pagespeed-v1": () => `
	<div class="copy">
		<p class="pain">Ya comprimiste imágenes y sigues cerca de 85.</p>
		<h1>Encuentra los puntos que <em>faltan.</em></h1>
		<div class="logos">${logo("pagespeed", 64)}${logo("lighthouse", 64)}<span class="sep"></span>${logo("claude", 60)}<span class="t">Claude Code</span></div>
	</div>
	<div class="vis">
		<div style="margin-bottom: 36px; display: flex; align-items: center; gap: 18px;"><span class="tag">EJEMPLO</span><span style="font-size: 30px; color: var(--mut); font-weight: 600;">no es un caso medido</span></div>
		<div class="gauges">
			<div class="gauge">${ring(85, 250, 24, "#8e8e96", "#26262b")}<b>85</b><p>Antes</p></div>
			<span class="vs" style="color: var(--green);">→</span>
			<div class="gauge">${ring(100, 250, 24, "#30d158", "#26262b")}<b>100</b><p>Meta</p></div>
		</div>
		<p style="margin-top: 26px; display: flex; align-items: center; gap: 14px; justify-content: center; font-size: 32px; font-weight: 700;">${logo("pagespeed", 40)}PageSpeed Insights · móvil</p>
	</div>
	<p class="note">Cifras del README («de casi 90 a 100») y de la ficha («cerca de 85»). Sin afiliación con Google.</p>`,
	"anuncios": () => `
	<div class="copy">
		<p class="pain">Deja de armar anuncios de uno en uno.</p>
		<h1>250+ prompts <em>en una sesión.</em></h1>
		<div class="logos"><span class="inc"><i></i>Agente + app local</span></div>
	</div>
	<div class="vis">
		<div class="adgrid">
			<div class="ad"><h4>Prueba social</h4><div class="n"><b>50</b><span>prompts</span></div></div>
			<div class="ad"><h4>Dolor y alivio</h4><div class="n"><b>50</b><span>prompts</span></div></div>
			<div class="ad"><h4>Autoridad</h4><div class="n"><b>50</b><span>prompts</span></div></div>
			<div class="ad"><h4>Urgencia</h4><div class="n"><b>50</b><span>prompts</span></div></div>
		</div>
		<div class="adfoot"><span>mín. 5 categorías × 50</span><span class="lg">${logo("meta", 46)}${logo("googleads", 46)}${logo("tiktok", 46)}</span></div>
	</div>`,
	"specreel": () => `
	<div class="copy">
		<p class="pain">Sin línea de tiempo. Sin créditos por minuto.</p>
		<h1>Una instrucción. <em>Un video 3D.</em></h1>
		<div class="logos">${logo("claude", 60)}<span class="t">Claude Code</span><span class="sep"></span><span class="t">Codex</span></div>
	</div>
	<div class="vis" style="align-items: center;">
		<div class="shot" style="width: 400px; height: 636px;"><img src="assets/specreel-render.jpg" width="400" height="636" style="width: 100%; height: 100%; object-fit: cover;" alt=""><div class="lbl"><span>MP4 narrado</span><span>subtítulos</span><span>.srt</span></div></div>
	</div>
	<p class="note">Fotograma de la portada actual de SpecReel.</p>`,
	"stick": () => `
	<div class="copy">
		<p class="pain">Tú apruebas el guion. Tu agente anima.</p>
		<h1>Tu idea, en <em>muñequitos de palo.</em></h1>
		<div class="logos">${logo("claude", 60)}<span class="t">Claude Code</span><span class="sep"></span><span class="t">Codex</span></div>
	</div>
	<div class="vis" style="align-items: center;">
		<div class="shot" style="width: 430px; height: 764px; border-radius: 44px; border-width: 10px; border-color: #2a2a30;"><img src="assets/stick-beat-4.jpg" width="410" height="729" style="width: 100%; height: 100%; object-fit: cover;" alt=""><div class="lbl"><span>MP4 · 9:16</span><span>.srt</span></div></div>
	</div>
	<p class="note">Fotograma real del sketch de ejemplo incluido.</p>`,
	"cutpilot": () => `
	<div class="copy">
		<p class="pain">Sin «eh», silencios ni retomas.</p>
		<h1 style="font-size: 118px;">Tu grabación cruda, <em>editada en tu PC.</em></h1>
		<div class="logos">${logo("claude", 60)}${logo("ffmpeg", 60)}<span class="t">Windows</span></div>
	</div>
	<div class="vis">
		<div class="tr"><span class="k">Hoy les voy a mostrar</span> <s>eh…</s> <span class="k">cómo organizo mi trabajo.</span> <s>[silencio]</s> <s>Hoy les voy</s> <span class="k">Tiene tres pasos.</span></div>
		<div class="fmts"><div class="fm on" style="width: 300px; height: 169px;">16:9</div><div class="fm" style="width: 130px; height: 231px;">9:16</div><div class="fm" style="width: 160px; height: 160px;">1:1</div></div>
		<p style="margin-top: 28px;"><span class="inc" style="font-size: 34px;"><i></i>Editor + panel de Chrome</span></p>
	</div>
	<p class="note">Ilustración, no una captura.</p>`,
	"motor": () => `
	<div class="copy">
		<p class="pain">Pide en español la pieza que necesitas.</p>
		<h1>Un agente <em>la produce.</em></h1>
		<div class="logos">${logo("claude", 60)}<span class="t">Claude Code</span><span class="sep"></span><span class="t">Windows</span></div>
	</div>
	<div class="vis">
		<div class="prompt"><small>tu pedido</small>«Diseña una presentación de ventas y anima el logo»</div>
		<div class="tiles">${["Imagen", "Foto", "Vector", "Video", "Animación", "Maquetación", "PDF", "Interfaz", "Audio", "Presentaciones", "Documentos", "Planillas", "CAD"].map((t) => `<div class="tile ${t === "Animación" || t === "Presentaciones" ? "on" : ""}">${t}</div>`).join("")}</div>
	</div>
	<p class="note">Ejemplo de pedido de las pruebas del router incluido.</p>`,
};

const coversA = Object.entries(coverA).map(([k, f]) => `<section class="frame" data-out="A-portada-${k}">${f()}</section>`).join("\n");
writeFileSync(`${OUT}/A-portadas.html`, `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Dirección A · portadas</title>${FONTS}<style>${A_CSS}</style></head><body>\n${coversA}\n</body></html>`);

// ───────────────────────── Portadas B: «Vitrina cuadrada» (1080×1080, clara) ─────────────────────────
const B_CSS = `
:root { --bg: #f2f2ef; --card: #ffffff; --ink: #111113; --mut: #5f5f66; --line: #d9d9d4; --green: #1a7f37; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #888; font-family: "Inter Tight", system-ui, sans-serif; }
.frame { width: 1080px; height: 1080px; position: relative; overflow: hidden; background: var(--bg); color: var(--ink); margin: 0 0 40px; }
.stage { position: absolute; left: 0; right: 0; top: 0; height: 690px; display: grid; place-items: center; }
h1 { position: absolute; left: 64px; right: 64px; bottom: 62px; font-size: 132px; line-height: 0.93; font-weight: 900; letter-spacing: -0.045em; }
h1 em { font-style: normal; color: var(--green); }
.corner { position: absolute; top: 48px; right: 56px; display: flex; gap: 20px; align-items: center; color: var(--ink); }
.corner .t { font-size: 40px; font-weight: 800; }
.note { position: absolute; left: 64px; top: 52px; font-family: "JetBrains Mono", monospace; font-size: 22px; font-weight: 700; color: var(--mut); letter-spacing: .04em; }
.gauge { position: relative; width: 340px; text-align: center; }
.gauge b { position: absolute; left: 0; right: 0; top: 0; height: 340px; display: grid; place-items: center; font-size: 122px; font-weight: 900; letter-spacing: -0.05em; }
.gauge p { margin-top: 14px; font-size: 44px; font-weight: 800; }
.cardstack { position: relative; width: 780px; height: 540px; margin-top: 90px; margin-left: -40px; }
.pc { position: absolute; width: 420px; height: 230px; background: var(--card); border: 5px solid var(--ink); border-radius: 28px; padding: 32px; box-shadow: 14px 14px 0 var(--ink); }
.pc h4 { white-space: nowrap; font-size: 46px; line-height: 1; font-weight: 900; letter-spacing: -0.03em; }
.pc b { position: absolute; left: 32px; bottom: 26px; font-size: 76px; font-weight: 900; color: var(--green); }
.pc span { position: absolute; right: 30px; bottom: 42px; font-size: 32px; font-weight: 700; color: var(--mut); }
.shot { border-radius: 30px; overflow: hidden; border: 5px solid var(--ink); box-shadow: 14px 14px 0 var(--ink); background: #000; }
.shot img { display: block; width: 100%; height: 100%; object-fit: cover; }
.wave { display: flex; align-items: center; gap: 8px; height: 260px; }
.wave i { width: 16px; border-radius: 8px; background: var(--ink); }
.wave i.cut { background: transparent; border: 3px dashed #b3b3ad; }
.tiles { display: grid; grid-template-columns: repeat(5, 150px); gap: 16px; }
.tiles div { height: 110px; border-radius: 20px; background: var(--card); border: 4px solid var(--ink); display: grid; place-items: center; font-size: 26px; font-weight: 800; }
.tiles div.on { background: var(--green); color: #fff; border-color: var(--green); }
`;
const wave = () => {
	const h = [80, 140, 200, 120, 60, 0, 0, 180, 230, 150, 90, 160, 0, 0, 0, 110, 200, 240, 170, 100, 0, 130, 210, 150, 90, 60, 120, 190, 140, 80, 50];
	return `<div class="wave">${h.map((v) => (v === 0 ? `<i class="cut" style="height: 120px;"></i>` : `<i style="height: ${v}px;"></i>`)).join("")}</div>`;
};
const coverB = {
	"pagespeed": () => `<div class="stage"><div style="display: flex; gap: 70px; align-items: flex-start; margin-top: 40px;">
		<div class="gauge">${ring(85, 340, 30, "#8a8a90", "#dcdcd6")}<b>85</b><p>PageSpeed</p></div>
		<div class="gauge">${ring(100, 340, 30, "#1a7f37", "#dcdcd6")}<b>100</b><p>Tu PC</p></div></div></div>
		<div class="corner">${logo("pagespeed", 64)}${logo("lighthouse", 64)}</div>
		<h1>Los puntos que <em>faltan</em></h1>`,
	"anuncios": () => `<div class="stage"><div class="cardstack">
		<div class="pc" style="left: 0; top: 30px; transform: rotate(-5deg);"><h4>Prueba social</h4><b>50</b><span>prompts</span></div>
		<div class="pc" style="left: 350px; top: 20px; transform: rotate(4deg);"><h4>Dolor y alivio</h4><b>50</b><span>prompts</span></div>
		<div class="pc" style="left: 170px; top: 290px; transform: rotate(-1deg);"><h4>Urgencia</h4><b>50</b><span>prompts</span></div></div></div>
		<div class="corner">${logo("meta", 56)}${logo("googleads", 56)}${logo("tiktok", 56)}</div>
		<h1>250+ prompts <em>de anuncios</em></h1>`,
	"specreel": () => `<div class="stage"><div class="shot" style="width: 360px; height: 560px; margin-top: 30px;"><img src="assets/specreel-render.jpg" alt=""></div></div>
		<div class="corner">${logo("claude", 56)}<span class="t">Codex</span></div>
		<h1>Videos 3D con <em>tu agente</em></h1>`,
	"stick": () => `<div class="stage"><div class="shot" style="width: 330px; height: 586px; margin-top: 40px; border-radius: 44px;"><img src="assets/stick-beat-4.jpg" alt=""></div></div>
		<div class="corner">${logo("claude", 56)}<span class="t">Codex</span></div>
		<h1>Tu idea en <em>muñequitos</em></h1>`,
	"cutpilot": () => `<div class="stage">${wave()}</div>
		<p class="note">ILUSTRACIÓN · los huecos son cortes</p>
		<div class="corner">${logo("claude", 56)}${logo("ffmpeg", 56)}</div>
		<h1>Tu video, <em>ya editado</em></h1>`,
	"motor": () => `<div class="stage"><div class="tiles" style="margin-top: 40px;">${["Imagen", "Foto", "Vector", "Video", "Animación", "Maquetac.", "PDF", "Interfaz", "Audio", "Diapos", "Docs", "Planillas", "CAD"].map((t) => `<div class="${t === "Animación" || t === "Diapos" ? "on" : ""}">${t}</div>`).join("")}</div></div>
		<div class="corner">${logo("claude", 56)}</div>
		<h1>13 agentes <em>creativos</em></h1>`,
};
const coversB = Object.entries(coverB).map(([k, f]) => `<section class="frame" data-out="B-portada-${k}">${f()}</section>`).join("\n");
writeFileSync(`${OUT}/B-portadas.html`, `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Dirección B · portadas</title>${FONTS}<style>${B_CSS}</style></head><body>\n${coversB}\n</body></html>`);

// ───────────────────────── Interfaz de la tienda (catálogo y ficha) ─────────────────────────
const UI_CSS = `
:root { --bg: #0b0b0c; --surface: #151517; --surface2: #1d1d20; --line: #2a2a2e; --text: #f5f5f7; --muted: #a8a8ae; --green: #30d158; --on-green: #062b12; --radius: 16px; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body { background: var(--bg); color: var(--text); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
a { color: inherit; text-decoration: none; }
ul { list-style: none; }
.wrap { width: 100%; max-width: 1120px; margin: 0 auto; padding: 0 16px; }
.promo { height: 36px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; color: var(--muted); border-bottom: 1px solid var(--line); white-space: nowrap; }
.promo b { color: var(--text); font-family: ui-monospace, Menlo, monospace; letter-spacing: .04em; }
.hdr { position: sticky; top: 0; z-index: 5; background: rgba(11,11,12,.96); border-bottom: 1px solid var(--line); }
.hdr .wrap { height: 60px; display: flex; align-items: center; gap: 10px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; letter-spacing: .06em; font-size: 13px; }
.brand img { width: 30px; height: 30px; }
.brand span { border: 1.5px solid var(--text); border-radius: 8px; padding: 3px 8px; }
.nav { display: none; gap: 26px; margin-left: 36px; font-size: 15px; color: var(--muted); }
.nav a[aria-current] { color: var(--text); font-weight: 600; }
.sp { flex: 1; }
.ibtn { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 12px; border: 1px solid var(--line); background: transparent; color: var(--text); }
.btn { height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 16px; border-radius: 12px; font-weight: 650; font-size: 15px; background: var(--text); color: #0b0b0c; border: 0; }
.btn--ghost { background: transparent; color: var(--text); border: 1px solid var(--line); }
.btn--block { width: 100%; height: 52px; font-size: 17px; }
.searchbox { display: none; }
.intro { padding: 18px 0 14px; }
.intro h1 { font-size: 26px; line-height: 1.15; letter-spacing: -0.02em; font-weight: 800; }
.intro p { margin-top: 6px; font-size: 15px; color: var(--muted); }
.chips { display: flex; gap: 8px; overflow-x: auto; padding: 2px 16px 14px; margin: 0 -16px; scrollbar-width: none; }
.chip { flex: none; height: 40px; display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--line); font-size: 15px; color: var(--muted); white-space: nowrap; }
.chip[aria-pressed="true"] { background: var(--text); color: #0b0b0c; border-color: var(--text); font-weight: 650; }
.chip small { font-size: 13px; opacity: .75; }
.grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
/* Tarjeta A */
.card { position: relative; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.card .cv { display: block; aspect-ratio: 16 / 10; background: #000; }
.card .cv img { width: 100%; height: 100%; display: block; object-fit: cover; }
.card .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 28px; }
.card .bdg { flex: none; height: 26px; display: inline-flex; align-items: center; padding: 0 10px; border-radius: 8px; font-size: 13px; font-weight: 700; background: var(--text); color: #0b0b0c; }
.card .bdg.sale { background: var(--green); color: var(--on-green); }
.card .bd { padding: 14px 16px 16px; }
.kind { font-size: 13px; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
.card h3 { margin-top: 2px; font-size: 21px; line-height: 1.2; font-weight: 750; letter-spacing: -0.01em; }
.card h3 a::after { content: ""; position: absolute; inset: 0; }
.card .ln { margin-top: 6px; font-size: 16px; line-height: 1.45; color: #cfcfd4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.compat { margin-top: 12px; display: flex; align-items: center; gap: 12px; color: var(--muted); font-size: 13px; font-weight: 600; flex-wrap: wrap; }
.compat .tx { border: 1px solid var(--line); border-radius: 6px; padding: 1px 6px; }
.incl { margin-top: 10px; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 650; padding: 4px 10px; border-radius: 8px; background: var(--surface2); border: 1px solid var(--line); }
.incl i { width: 8px; height: 8px; border-radius: 2px; background: var(--green); }
.buy { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.price { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.price b { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
.price s { color: var(--muted); font-size: 15px; }
.price .off { font-size: 13px; font-weight: 750; color: var(--green); }
.price .pw { font-size: 15px; color: var(--muted); }
.price .pw b { font-size: 22px; color: var(--text); }
.go { height: 44px; display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; border-radius: 12px; background: var(--surface2); border: 1px solid var(--line); font-weight: 650; font-size: 15px; white-space: nowrap; }
/* Tarjeta B */
.gridB { display: grid; gap: 20px 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.cardB { position: relative; }
.cardB .cv { display: block; aspect-ratio: 1; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); }
.cardB .cv img { width: 100%; height: 100%; display: block; }
.cardB .bdg { position: absolute; top: 8px; left: 8px; height: 26px; display: inline-flex; align-items: center; padding: 0 8px; border-radius: 7px; font-size: 12.5px; font-weight: 750; background: #111; color: #fff; }
.cardB .bdg.sale { background: #1a7f37; }
.cardB h3 { margin-top: 10px; font-size: 16px; line-height: 1.3; font-weight: 700; }
.cardB h3 a::after { content: ""; position: absolute; inset: 0; }
.cardB .k { font-size: 13px; color: var(--muted); margin-top: 2px; }
.cardB .pt { margin-top: 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tagp { position: relative; height: 28px; display: inline-flex; align-items: center; padding: 0 12px 0 10px; background: var(--text); color: #0b0b0c; font-weight: 800; font-size: 15px; border-radius: 6px 0 0 6px; margin-right: 12px; }
.tagp::after { content: ""; position: absolute; right: -12px; top: 0; border: 14px solid transparent; border-left: 12px solid var(--text); border-right: 0; }
.cardB .pt s { font-size: 13px; color: var(--muted); }
.cardB .pt .pw { font-size: 13px; color: var(--muted); }
/* Secciones de abajo */
.sec { margin-top: 40px; }
.sec h2 { font-size: 22px; letter-spacing: -0.01em; margin-bottom: 14px; }
.trust { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.trust li { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px; font-size: 15px; font-weight: 650; display: flex; flex-direction: column; gap: 6px; }
.trust li span { font-size: 14px; font-weight: 400; color: var(--muted); line-height: 1.4; }
.trust li svg { color: var(--green); }
.svc { margin-top: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.svc p { color: var(--muted); font-size: 15px; }
.faq li { border-bottom: 1px solid var(--line); min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 16px; font-weight: 600; padding: 12px 0; }
.foot { margin-top: 48px; border-top: 1px solid var(--line); padding: 28px 0 40px; color: var(--muted); font-size: 14px; }
.foot .cols { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.foot b { color: var(--text); display: block; margin-bottom: 6px; }
.anno { position: absolute; z-index: 9; background: #ffd60a; color: #111; font: 700 12px/1.3 system-ui; padding: 4px 8px; border-radius: 6px; }
@media (min-width: 900px) {
	.wrap { padding: 0 24px; }
	.promo { font-size: 14px; }
	.nav { display: flex; }
	.hdr .wrap { height: 68px; }
	.ibtn.m { display: none; }
	.searchbox { display: flex; align-items: center; gap: 8px; width: 300px; height: 44px; border: 1px solid var(--line); border-radius: 12px; padding: 0 14px; color: var(--muted); font-size: 15px; }
	.intro { padding: 56px 0 22px; text-align: center; }
	.intro h1 { font-size: 46px; }
	.intro p { font-size: 18px; }
	.chips { justify-content: center; margin: 0; padding: 4px 0 30px; }
	.grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
	.gridB { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px 24px; }
	.cardB h3 { font-size: 18px; }
	.trust { grid-template-columns: repeat(4, minmax(0, 1fr)); }
	.sec { margin-top: 64px; }
	.sec h2 { text-align: center; font-size: 28px; margin-bottom: 22px; }
	.svc { flex-direction: row; align-items: center; justify-content: space-between; padding: 24px 28px; }
	.faq { max-width: 760px; margin: 0 auto; }
	.foot .cols { grid-template-columns: 2fr 1fr 1fr 1fr; }
}
`;

const compatHtml = (p) =>
	`<div class="compat" aria-label="Funciona con">${p.compat.map(([k, l]) => (k ? `<span title="${l}" aria-label="${l}">${logo(k, 20)}</span>` : `<span class="tx">${l}</span>`)).join("")}${p.more ? `<span>${p.more}</span>` : ""}</div>`;
const priceHtml = (p) =>
	p.price.pwyw
		? `<span class="price" style="flex-direction: column; gap: 0;"><b>Desde $0</b><span class="pw">sugerido ${p.price.sug}</span></span>`
		: `<span class="price"><b>${p.price.now}</b>${p.price.was ? `<s>${p.price.was}</s><span class="off">${p.price.off}</span>` : `<span class="pw">pago único</span>`}</span>`;

const cardA = (p, i) => `<li class="card" id="card-${short(p)}">
	<a class="cv" href="#" tabindex="-1"><img src="../png/A-portada-${short(p)}.png" width="1600" height="1000" alt="${p.name}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}></a>
	<div class="bd">
		<div class="top"><p class="kind">${p.kind}</p>${p.badge ? `<span class="bdg ${p.price.was ? "sale" : ""}">${p.badge}</span>` : ""}</div>
		<h3><a href="#">${p.name}</a></h3>
		<p class="ln">${p.line}</p>
		${p.includes ? `<span class="incl"><i></i>${p.includes}</span>` : ""}
		${compatHtml(p)}
		<div class="buy">${priceHtml(p)}<span class="go">${p.cta} ${icon("arrow", 16)}</span></div>
	</div>
</li>`;

const priceB = (p) =>
	p.price.pwyw
		? `<span class="tagp">$0+</span><span class="pw">sugerido ${p.price.sug}</span>`
		: `<span class="tagp">${p.price.now}</span>${p.price.was ? `<s>${p.price.was}</s><span style="color: var(--green); font-weight: 750; font-size: 13px;">${p.price.off}</span>` : ""}`;
const cardB = (p, i) => `<li class="cardB" id="cardB-${short(p)}">
	<a class="cv" href="#" tabindex="-1"><img src="../png/B-portada-${short(p)}.png" width="1080" height="1080" alt="${p.name}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}></a>
	<h3><a href="#">${p.name}</a></h3>
	<p class="k">${p.kind}</p>
	<div class="pt">${priceB(p)}</div>
</li>`;

const header = () => `<div class="promo">${icon("gift", 15)} 10 % en tu 1.ª compra con <b>TONYCIENCIA</b></div>
<header class="hdr"><div class="wrap">
	<a class="brand" href="#"><img src="assets/logo-blanco.webp" alt="Tony Ciencia"><span>MARKET</span></a>
	<nav class="nav"><a href="#" aria-current="page">Catálogo</a><a href="#">Ofertas</a><a href="#">Agentes para empresas</a><a href="#">Blog</a></nav>
	<span class="sp"></span>
	<label class="searchbox">${icon("search", 18)} Buscar productos</label>
	<button class="ibtn m" aria-label="Buscar">${icon("search")}</button>
	<a class="btn btn--ghost" href="#">Entrar</a>
	<button class="ibtn m" aria-label="Menú">${icon("menu")}</button>
</div></header>`;

const chips = () => `<div class="chips" role="toolbar" aria-label="Filtrar">
	<a class="chip" aria-pressed="true">Todo <small>6</small></a><a class="chip">Ofertas <small>2</small></a><a class="chip">Desde $0 <small>2</small></a><a class="chip">Video <small>3</small></a><a class="chip">Anuncios <small>1</small></a><a class="chip">SEO <small>1</small></a><a class="chip">Agentes <small>1</small></a><a class="chip">${icon("sliders", 16)} Ordenar</a>
</div>`;

const lower = () => `<section class="sec" aria-labelledby="t-trust"><h2 id="t-trust">Compra sin riesgo</h2><ul class="trust">
	<li>${icon("download")}Descarga inmediata<span>En tu correo y en Mis compras.</span></li>
	<li>${icon("lock")}Pago seguro con Stripe<span>No vemos tu tarjeta.</span></li>
	<li>${icon("refund")}Reembolso en 14 días<span>Si aún no lo descargaste.</span></li>
	<li>${icon("chat")}Soporte en español<span>Te responde una persona.</span></li></ul>
	<div class="svc"><div><b>¿Prefieres que lo construyamos por ti?</b><p>Agentes de IA a medida para tu empresa.</p></div><a class="btn btn--ghost" href="#">Ver el servicio ${icon("arrow", 16)}</a></div>
</section>
<section class="sec" aria-labelledby="t-faq"><h2 id="t-faq">Antes de comprar</h2><ul class="faq">
	${["¿Cómo recibo lo que compro?", "¿Es un pago único?", "¿Qué significa «paga lo que quieras»?", "¿Los precios tachados son reales?", "¿Puedo pedir un reembolso?"].map((q) => `<li>${q}${icon("down", 18)}</li>`).join("")}
</ul></section>
<footer class="foot"><div class="wrap" style="padding: 0;"><div class="brand"><img src="assets/logo-blanco.webp" alt=""><span>MARKET</span></div>
<div class="cols"><div>Herramientas de IA en español. Pago único, descarga inmediata.</div><div><b>Tienda</b>Catálogo<br>Mis compras</div><div><b>Ayuda</b>Soporte<br>Reembolsos</div><div><b>Legal</b>Términos<br>Privacidad</div></div>
<p style="margin-top: 18px; font-size: 13px;">Vendido por Tony Ciencia LLC. Precios en USD.</p></div></footer>`;

const page = (title, body, extraCss = "") => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>${UI_CSS}${extraCss}</style></head><body>${body}</body></html>`;

writeFileSync(`${OUT}/A-catalogo.html`, page("Dirección A · catálogo", `${header()}<main class="wrap">
	<section class="intro"><h1>Herramientas de IA que trabajan por ti</h1><p>En español · pago único · descarga inmediata</p></section>
	${chips()}
	<ul class="grid">${P.map(cardA).join("")}</ul>
	${lower()}</main>`));

writeFileSync(`${OUT}/B-catalogo.html`, page("Dirección B · catálogo", `${header()}<main class="wrap">
	<section class="intro"><h1>Herramientas de IA que trabajan por ti</h1><p>En español · pago único · descarga inmediata</p></section>
	${chips()}
	<ul class="gridB">${P.map(cardB).join("")}</ul>
	${lower()}</main>`));

// Tarjetas sueltas (una por bloque) para renderizarlas a 390 px
writeFileSync(`${OUT}/A-tarjetas.html`, page("Dirección A · tarjetas", `<main class="wrap" style="padding-top: 16px;"><ul class="grid">${P.map(cardA).join("")}
	${cardA({ ...P[3], short: "pagespeed-v1" }, 1)}</ul></main>`));
writeFileSync(`${OUT}/B-tarjetas.html`, page("Dirección B · tarjetas", `<main class="wrap" style="padding-top: 16px;">${[0, 2, 4].map((i) => `<ul class="gridB" id="row-${i}" style="margin-bottom: 24px;">${cardB(P[i], i)}${cardB(P[i + 1], i + 1)}</ul>`).join("")}</main>`));

// ───────────────────────── Ficha en celular (dirección A) ─────────────────────────
const FICHA_CSS = `
.back { height: 44px; display: inline-flex; align-items: center; gap: 4px; color: var(--muted); font-size: 15px; margin-top: 4px; }
.gal { margin-top: 4px; }
.gal .main { aspect-ratio: 16 / 10; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); position: relative; }
.gal .main img { width: 100%; height: 100%; display: block; }
.gal .dots { display: flex; justify-content: center; gap: 6px; margin-top: 10px; }
.gal .dots i { width: 7px; height: 7px; border-radius: 50%; background: #3a3a40; }
.gal .dots i.on { background: var(--text); width: 18px; border-radius: 4px; }
.pt-badges { margin-top: 14px; display: flex; gap: 8px; }
.pt-badges span { height: 28px; display: inline-flex; align-items: center; padding: 0 10px; border-radius: 8px; font-size: 13px; font-weight: 700; border: 1px solid var(--line); }
.pt-badges .g { background: var(--green); color: var(--on-green); border-color: var(--green); }
h1.pn { margin-top: 10px; font-size: 30px; line-height: 1.1; letter-spacing: -0.02em; font-weight: 800; }
.sub { margin-top: 6px; font-size: 17px; line-height: 1.45; color: #cfcfd4; }
.buybox { margin-top: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 16px; }
.buybox .lbl { font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); font-weight: 700; }
.buybox .big { margin-top: 2px; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.buybox .big b { font-size: 34px; letter-spacing: -0.02em; }
.buybox .big s { color: var(--muted); font-size: 18px; }
.buybox .big .off { color: var(--green); font-weight: 750; font-size: 15px; }
.presets { margin-top: 12px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.presets span { height: 44px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 10px; font-weight: 700; }
.presets span.on { border: 2px solid var(--green); }
.buybox .btn--block { margin-top: 12px; }
.buybox .hint { margin-top: 10px; font-size: 14px; color: var(--muted); text-align: center; }
.mini { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; font-size: 14px; color: var(--muted); }
.mini span { display: flex; align-items: center; gap: 6px; }
.mini svg { color: var(--green); flex: none; }
.blk { margin-top: 28px; }
.blk h2 { font-size: 22px; margin-bottom: 12px; letter-spacing: -0.01em; }
.ps { display: grid; gap: 10px; }
.ps div { border-radius: 14px; padding: 14px 16px; border: 1px solid var(--line); background: var(--surface); }
.ps div small { display: block; font-size: 13px; letter-spacing: .05em; text-transform: uppercase; font-weight: 700; color: var(--muted); margin-bottom: 4px; }
.ps div.sol { border-color: var(--green); }
.ps div.sol small { color: var(--green); }
.steps li { display: grid; grid-template-columns: 32px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); }
.steps li b.n { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; background: var(--surface2); border: 1px solid var(--line); font-size: 15px; }
.steps li p { color: var(--muted); font-size: 15px; }
.chk li { display: flex; gap: 10px; padding: 7px 0; }
.chk svg { color: var(--green); flex: none; margin-top: 3px; }
.logos2 { display: flex; flex-wrap: wrap; gap: 8px; }
.logos2 span { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; border: 1px solid var(--line); border-radius: 10px; font-size: 15px; font-weight: 600; }
.warn { border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; color: #cfcfd4; font-size: 15px; background: var(--surface); }
.warn li { padding: 4px 0 4px 16px; position: relative; }
.warn li::before { content: ""; position: absolute; left: 0; top: 13px; width: 6px; height: 6px; border-radius: 50%; background: var(--muted); }
.sticky { display: none; }
.show-sticky .sticky { display: flex; }
.show-sticky .sticky { position: fixed; left: 0; right: 0; bottom: 0; z-index: 10; background: rgba(21,21,23,.98); border-top: 1px solid var(--line); padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); align-items: center; justify-content: space-between; gap: 12px; }
.sticky .p { font-size: 14px; color: var(--muted); line-height: 1.25; }
.sticky .p b { display: block; font-size: 19px; color: var(--text); }
.sticky .btn { height: 48px; padding: 0 20px; font-size: 16px; }
body { padding-bottom: 80px; }
`;
const fichaPagespeed = page("Dirección A · ficha PageSpeed Forensics", `${header()}<main class="wrap">
	<a class="back" href="#">${icon("left", 18)} Catálogo</a>
	<div class="gal"><div class="main"><img src="../png/A-portada-pagespeed.png" width="1600" height="1000" alt="PageSpeed Forensics"></div><div class="dots"><i class="on"></i><i></i><i></i></div></div>
	<div class="pt-badges"><span class="g">Paga lo que quieras</span><span>Skill para Claude Code</span></div>
	<h1 class="pn">PageSpeed Forensics</h1>
	<p class="sub">Descubre con evidencia por qué tu web saca 85 en PageSpeed móvil y 100 en tu PC, y prueba arreglos sin recompilar.</p>
	<div class="buybox">
		<p class="lbl">Tú pones el precio</p>
		<div class="big"><b>$9</b><span style="color: var(--muted);">sugerido · desde $0</span></div>
		<div class="presets"><span>Gratis</span><span class="on">$9</span><span>$18</span><span>$45</span></div>
		<a class="btn btn--block" href="#">Continuar con $9</a>
		<p class="hint">Entras con tu cuenta de Google, sin contraseña.</p>
		<div class="mini"><span>${icon("download", 16)}Descarga inmediata</span><span>${icon("lock", 16)}Pago con Stripe</span><span>${icon("refund", 16)}Reembolso 14 días</span><span>${icon("chat", 16)}Soporte en español</span></div>
	</div>
	<section class="blk"><h2>Qué te resuelve</h2><div class="ps">
		<div><small>El problema</small>Los consejos de siempre (comprimir imágenes, diferir JavaScript) suelen dejar una página cerca de 85. Lighthouse marca 100 en tu PC y PageSpeed, 85.</div>
		<div class="sol"><small>Lo que hace la skill</small>Reproduce PageSpeed móvil en tu computador, encuentra la causa con trazas y mide cada arreglo con medianas de 3 a 5 corridas.</div>
	</div></section>
	<section class="blk"><h2>Cómo funciona</h2><ol class="steps">
		<li><b class="n">1</b><div><b>Lee el informe real</b><p>Guarda puntajes, métricas y auditorías de PageSpeed, sin llave de API.</p></div></li>
		<li><b class="n">2</b><div><b>Reproduce PageSpeed en tu PC</b><p>Un proxy local agrega latencia y entrega el HTML en tandas, como la red real.</p></div></li>
		<li><b class="n">3</b><div><b>Prueba y verifica</b><p>Aplica arreglos sin recompilar y compara capturas antes de tocar tu código.</p></div></li>
	</ol></section>
	<section class="blk"><h2>Qué recibes</h2><ul class="chk">
		<li>${icon("check", 18)}<span>SKILL.md: el método en 6 pasos y una plantilla de informe</span></li>
		<li>${icon("check", 18)}<span>6 guías técnicas</span></li>
		<li>${icon("check", 18)}<span>11 scripts de Node.js sin dependencias (salvo sharp, opcional)</span></li>
		<li>${icon("check", 18)}<span>README en español e inglés</span></li>
	</ul></section>
	<section class="blk"><h2>Funciona con</h2><div class="logos2"><span>${logo("pagespeed", 18)}PageSpeed Insights</span><span>${logo("lighthouse", 18)}Lighthouse</span><span>${logo("claude", 18)}Claude Code</span><span>${logo("chrome", 18)}Chrome</span><span>${logo("node", 18)}Node.js 22+</span></div></section>
	<section class="blk"><h2>Antes de comprar</h2><ul class="warn">
		<li>No garantiza un puntaje: encuentra causas y mide cada cambio.</li>
		<li>La skill, las guías y la salida de los scripts están en inglés.</li>
		<li>Necesitas un build de producción de tu sitio servido en tu computador.</li>
	</ul></section>
	<section class="blk"><h2>Preguntas</h2><ul class="faq">${["¿Necesito una llave de API de Google?", "¿Garantiza 100 en PageSpeed?", "¿Sirve solo para Next.js?", "¿Necesito Claude Code?"].map((q) => `<li>${q}${icon("down", 18)}</li>`).join("")}</ul></section>
	<p style="margin-top: 20px; font-size: 13px; color: var(--muted);">Producto independiente, sin afiliación con Google. PageSpeed Insights, Lighthouse y Chrome son marcas de Google.</p>
</main>
<div class="sticky"><span class="p">Desde $0<b>Sugerido $9</b></span><a class="btn" href="#">Elegir precio</a></div>`, FICHA_CSS);
writeFileSync(`${OUT}/A-ficha-pagespeed.html`, fichaPagespeed);

const fichaAnuncios = page("Dirección A · ficha Anuncios Infinitos", `${header()}<main class="wrap">
	<a class="back" href="#">${icon("left", 18)} Catálogo</a>
	<div class="gal"><div class="main"><img src="../png/A-portada-anuncios.png" width="1600" height="1000" alt="Anuncios Infinitos"></div><div class="dots"><i class="on"></i><i></i><i></i><i></i></div></div>
	<div class="pt-badges"><span class="g">Oferta −57 %</span><span>Agente + app local</span></div>
	<h1 class="pn">Anuncios Infinitos</h1>
	<p class="sub">Tu estratega de publicidad con IA: investiga tu negocio y te entrega 250+ prompts de anuncios, cada uno con su razón.</p>
	<div class="buybox">
		<p class="lbl">Oferta · precio anterior real</p>
		<div class="big"><b>$33.33</b><s>$76.90</s><span class="off">Ahorras $43.57</span></div>
		<p style="margin-top: 4px; font-size: 15px; color: var(--muted);">$30 con <b style="color: var(--text); font-family: ui-monospace, Menlo, monospace;">TONYCIENCIA</b> en tu 1.ª compra</p>
		<a class="btn btn--block" href="#">Comprar</a>
		<p class="hint">Entras con tu cuenta de Google, sin contraseña.</p>
	</div>
	<section class="blk"><h2>Qué incluye</h2><ul class="chk">
		<li>${icon("check", 18)}<span>El agente Tony (22 archivos de skills)</span></li>
		<li>${icon("check", 18)}<span>App local: panel en tu navegador para usarlo sin terminal</span></li>
		<li>${icon("check", 18)}<span>3 guías en PDF</span></li>
	</ul></section>
</main>
<div class="sticky"><span class="p"><s>$76.90</s><b>$33.33</b></span><a class="btn" href="#">Comprar</a></div>`, FICHA_CSS);
writeFileSync(`${OUT}/A-ficha-anuncios.html`, fichaAnuncios);
console.log("maquetas escritas", Object.keys(PATH).length, "logos");
