#!/usr/bin/env node
// Auditoría de TODO el sitio (blog + market): rastrea enlaces internos desde la home, /en/, /market y los sitemaps,
// comprueba cada página y cada recurso interno (img, css, js, íconos) y lista los que no responden 200, con las
// páginas que los enlazan. Sale con código 1 si hay errores.
//
//   node scripts/audit-site.mjs [origen] [máx. URLs]     → https://tonyciencia.com, 2500
//
// Nota: Cloudflare puede bloquear con 403 a redes de datacenter (p. ej. GitHub Actions); córrelo desde otra red.
const ORIGIN = (process.argv.find((a) => /^https?:\/\//.test(a)) ?? "https://tonyciencia.com").replace(/\/$/, "");
const MAX = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 2500);
const seen = new Map(); // url -> {status, from:Set, kind}
const queue = [];
const add = (url, from, kind) => {
	let u;
	try { u = new URL(url, from || ORIGIN); } catch { return; }
	if (u.origin !== ORIGIN) return;
	if (/^\/(cdn-cgi|_emdash)\//.test(u.pathname)) return;
	u.hash = "";
	const key = u.toString();
	if (!seen.has(key)) {
		if (seen.size >= MAX) return;
		seen.set(key, { status: null, from: new Set(), kind });
		queue.push(key);
	}
	if (from) seen.get(key).from.add(from);
};
const UA = { "user-agent": "Mozilla/5.0 (compatible; TonyCiencia-SiteAudit/1.0)" };
async function fetchSitemap(path) {
	const r = await fetch(ORIGIN + path, { headers: UA });
	const t = await r.text();
	for (const m of t.matchAll(/<loc>([^<]+)<\/loc>/g)) {
		if (m[1].endsWith(".xml")) await fetchSitemap(new URL(m[1]).pathname);
		else add(m[1], `${ORIGIN}${path}`, "page");
	}
}
for (const s of ["/", "/en/", "/market", "/posts", "/en/posts"]) add(s, null, "page");
for (const sm of ["/sitemap-index.xml", "/market/sitemap.xml"]) await fetchSitemap(sm).catch(() => {});
async function work() {
	while (queue.length) {
		const url = queue.shift();
		const rec = seen.get(url);
		try {
			const res = await fetch(url, { headers: UA, redirect: "manual" });
			rec.status = res.status;
			if (res.status >= 300 && res.status < 400) {
				rec.location = res.headers.get("location");
				add(rec.location, url, rec.kind);
				continue;
			}
			const ct = res.headers.get("content-type") || "";
			if (rec.kind === "page" && ct.includes("text/html") && res.status === 200) {
				const html = await res.text();
				for (const m of html.matchAll(/<a\b[^>]*\shref="([^"#][^"]*)"/g)) {
					const h = m[1].replace(/&amp;/g, "&");
					if (/^(mailto|tel|javascript):/.test(h)) continue;
					add(h, url, "page");
				}
				for (const m of html.matchAll(/<(?:img|script|source)\b[^>]*\s(?:src|srcset)="([^"]+)"/g)) add(m[1].split(/[ ,]/)[0].replace(/&amp;/g, "&"), url, "asset");
				for (const m of html.matchAll(/<link\b[^>]*rel="(?:stylesheet|icon|apple-touch-icon|preload|manifest)"[^>]*href="([^"]+)"/g)) add(m[1].replace(/&amp;/g, "&"), url, "asset");
			} else await res.arrayBuffer().catch(() => {});
		} catch (e) {
			rec.status = "ERR " + e.message;
		}
	}
}
await Promise.all(Array.from({ length: 8 }, work));
const bad = [...seen.entries()].filter(([, r]) => r.status !== 200 && !(typeof r.status === "number" && r.status >= 300 && r.status < 400));
const redirects = [...seen.entries()].filter(([, r]) => typeof r.status === "number" && r.status >= 300 && r.status < 400);
console.log(`Revisadas ${seen.size} URLs internas. Con error: ${bad.length}. Redirecciones: ${redirects.length}.`);
for (const [u, r] of bad.sort()) console.log(`${r.status}\t${u}\t← ${[...r.from].slice(0, 3).join(" | ")}${r.from.size > 3 ? ` (+${r.from.size - 3})` : ""}`);
console.log("--- redirecciones (sin las de inicio de sesión)");
for (const [u, r] of redirects.filter(([x]) => !x.includes("/market/auth/")).slice(0, 40)) console.log(`${r.status}\t${u} → ${r.location}`);
process.exit(bad.length ? 1 : 0);
