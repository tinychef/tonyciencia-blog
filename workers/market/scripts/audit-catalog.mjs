#!/usr/bin/env node
// Auditoría del catálogo de Market Tony: fichas, SEO, datos estructurados, feed de Google Merchant y sitemap.
// La usa el agente E-commerce Manager (.claude/agents/ecommerce-manager.md) antes y después de cada cambio.
//
//   node scripts/audit-catalog.mjs [origen]            → https://tonyciencia.com por defecto
//   node scripts/audit-catalog.mjs http://localhost:8787 --json
//
// Sale con código 1 si hay errores (bloquean la publicación). Las advertencias son mejoras sugeridas.
const args = process.argv.slice(2);
const origin = (args.find((a) => /^https?:\/\//.test(a)) ?? "https://tonyciencia.com").replace(/\/$/, "");
const asJson = args.includes("--json");
const issues = [];
const add = (level, where, msg) => issues.push({ level, where, msg });
const err = (w, m) => add("error", w, m);
const warn = (w, m) => add("warn", w, m);

async function get(path, { head = false } = {}) {
	const url = path.startsWith("http") ? path : `${origin}${path}`;
	const res = await fetch(url, {
		method: head ? "HEAD" : "GET",
		redirect: "manual",
		headers: { "user-agent": "Mozilla/5.0 (compatible; MarketTony-Audit/1.0; +https://tonyciencia.com/market)", accept: "text/html,application/json,*/*" },
	});
	return { url, status: res.status, headers: res.headers, text: head ? "" : await res.text() };
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&apos;/g, "'");
const meta = (html, attr, name) => {
	const m = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`));
	return m ? decode(m[1]) : null;
};
const jsonLd = (html) =>
	[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => {
		try {
			const v = JSON.parse(m[1]);
			return Array.isArray(v) ? v : [v];
		} catch {
			return [];
		}
	});
const cents = (s) => Math.round(Number(String(s).replace(/[^0-9.]/g, "")) * 100);

const status = await get("/market/estado.json");
if (status.status === 403 || status.status === 503) {
	// Cloudflare (protección contra bots) bloquea muchas IPs de datacenter, p. ej. los runners de GitHub Actions.
	// No es un error del market: Googlebot y Google-Merchant son bots verificados y sí pasan.
	const msg = `Cloudflare bloqueó esta auditoría (${status.status}) desde esta red. Córrela desde otra red (o por el agente E-commerce Manager).`;
	if (asJson) console.log(JSON.stringify({ origin, blocked: true, report: [], issues: [{ level: "warn", where: "red", msg }] }));
	else console.error(msg);
	process.exit(3);
}
if (status.status !== 200) {
	console.error(`No se pudo leer ${status.url} (${status.status}). ¿Está desplegado el market v3?`);
	process.exit(2);
}
const state = JSON.parse(status.text);
const [feedRes, sitemapRes] = await Promise.all([get("/market/feed.xml"), get("/market/sitemap.xml")]);
const feedItems = Object.fromEntries(
	[...feedRes.text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => [m[1].match(/<g:id>([^<]+)<\/g:id>/)?.[1], m[1]]),
);
if (feedRes.status !== 200) err("feed.xml", `HTTP ${feedRes.status}`);
if (sitemapRes.status !== 200) err("sitemap.xml", `HTTP ${sitemapRes.status}`);

const report = [];
for (const p of state.products) {
	const w = p.slug;
	const page = await get(`/market/producto/${p.slug}`);
	if (page.status !== 200) {
		err(w, `la ficha responde ${page.status}`);
		continue;
	}
	const html = page.text;
	const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
	const h1 = decode(html.match(/<h1>([^<]*)<\/h1>/)?.[1] ?? "");
	const desc = meta(html, "name", "description") ?? "";
	const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? "";
	const robots = meta(html, "name", "robots") ?? "";
	const ogImage = meta(html, "property", "og:image");
	const ld = jsonLd(html);
	const product = ld.find((d) => d["@type"] === "Product");
	const imgs = [...html.matchAll(/<img src="(\/market\/static\/products\/[^"]+|\/market\/media\/images\/[^"]+)" alt="([^"]*)"[^>]*data-slide/g)].map((m) => ({ src: m[1], alt: decode(m[2]) }));
	const highlights = (html.match(/<ul class="mk-highlights">([\s\S]*?)<\/ul>/)?.[1].match(/<li>/g) ?? []).length;
	const specs = (html.match(/<dl>([\s\S]*?)<\/dl>/)?.[1].match(/<dt>/g) ?? []).length;
	const faqs = (html.match(/id="preguntas"[\s\S]*?<\/section>/)?.[0].match(/<details>/g) ?? []).length;
	const descText = (html.match(/id="descripcion"[\s\S]*?<\/section>/)?.[0] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

	if (!h1) err(w, "sin H1");
	if (h1.length > 90) warn(w, `H1 largo (${h1.length} caracteres)`);
	const shortTitle = title.replace(/ \| Market Tony$/, "");
	if (shortTitle.length > 60) warn(w, `meta título de ${shortTitle.length} caracteres (ideal ≤ 60)`);
	if (desc.length < 110 || desc.length > 165) warn(w, `meta descripción de ${desc.length} caracteres (ideal 120–160)`);
	if (!canonical.endsWith(`/market/producto/${p.slug}`)) err(w, `canonical incorrecto: ${canonical}`);
	if (state.mode === "live" && !/index/.test(robots)) err(w, `robots: ${robots}`);
	if (!ogImage) err(w, "sin og:image");
	if (!product) err(w, "sin JSON-LD Product");
	else {
		const offer = product.offers ?? {};
		if (!offer.price || !offer.priceCurrency) err(w, "Offer sin price/priceCurrency");
		if (!product.image?.length) err(w, "Product sin image");
		if (p.compareAtCents && p.priceMode === "fixed" && p.availability === "available") {
			const strike = (offer.priceSpecification ?? []).find?.((s) => /StrikethroughPrice/.test(s.priceType ?? ""));
			if (!strike) err(w, "oferta sin StrikethroughPrice en JSON-LD");
			else if (cents(strike.price) !== p.compareAtCents) err(w, `precio tachado JSON-LD ${strike.price} ≠ ${p.compareAtCents / 100}`);
			if (!offer.priceValidUntil) warn(w, "oferta sin priceValidUntil");
		}
		if (p.priceMode === "fixed" && cents(offer.price) !== p.priceCents && p.availability === "available") err(w, `precio JSON-LD ${offer.price} ≠ ${p.priceCents / 100}`);
	}
	if (imgs.length < 3) warn(w, `${imgs.length} imágenes en la galería (ideal ≥ 3: portada + 2)`);
	for (const i of imgs) {
		if (!i.alt || i.alt.length < 15) warn(w, `imagen sin ALT descriptivo: ${i.src}`);
		const r = await get(i.src, { head: true });
		if (r.status !== 200) err(w, `imagen ${i.src} responde ${r.status}`);
	}
	if (highlights < 4) warn(w, `${highlights} beneficios destacados (ideal 4–6)`);
	if (specs < 6) warn(w, `ficha técnica corta (${specs} filas)`);
	if (faqs < 3) warn(w, `${faqs} preguntas frecuentes (ideal ≥ 3)`);
	if (descText.length < 800) warn(w, `descripción corta (${descText.length} caracteres)`);
	if (/\[dato\b|REEMPLAZAR_|lorem ipsum/i.test(html) || /\bTODO\b|\bFIXME\b/.test(html)) err(w, "marcador sin completar en la ficha");

	// Feed de Merchant: productos de pago disponibles con precio > 0.
	const minCents = p.priceMode === "pwyw" ? p.minPriceCents ?? 0 : p.priceCents;
	const shouldBeInFeed = p.availability === "available" && p.priceMode !== "free" && minCents >= 50;
	const item = feedItems[p.slug];
	if (shouldBeInFeed && !item) err(w, "falta en el feed de Merchant Center");
	if (!shouldBeInFeed && item) err(w, "está en el feed y no debería (próximamente, gratis o desde $0)");
	if (item) {
		for (const tag of ["title", "description", "link", "g:image_link", "g:availability", "g:price", "g:condition", "g:brand", "g:identifier_exists", "g:shipping"]) {
			if (!new RegExp(`<${tag}>`).test(item)) err(w, `feed: falta <${tag}>`);
		}
		const price = cents(item.match(/<g:price>([^<]+)</)?.[1] ?? "0");
		const sale = item.match(/<g:sale_price>([^<]+)</)?.[1];
		if (p.compareAtCents && p.priceMode === "fixed") {
			if (price !== p.compareAtCents || !sale || cents(sale) !== p.priceCents) err(w, `feed: price/sale_price no coinciden con la ficha`);
		} else if (price !== minCents) err(w, `feed: precio ${price / 100} ≠ ${minCents / 100}`);
		const ft = item.match(/<title>([^<]+)</)?.[1] ?? "";
		if (ft.length > 150) err(w, "feed: título > 150 caracteres");
	}
	if (!sitemapRes.text.includes(`/market/producto/${p.slug}</loc>`)) err(w, "falta en sitemap.xml");
	report.push({ slug: p.slug, availability: p.availability, priceMode: p.priceMode, images: imgs.length, highlights, specs, faqs, descChars: descText.length, inFeed: !!item });
}

const robotsTxt = await get("/robots.txt");
if (robotsTxt.status === 200 && !robotsTxt.text.includes("/market/sitemap.xml")) warn("robots.txt", "no declara /market/sitemap.xml");
if (state.mode === "live" && !state.welcomeCoupon) warn("cupón", "el cupón de bienvenida no está activo en el proveedor de pagos (el popup no aparece)");

if (asJson) console.log(JSON.stringify({ origin, report, issues }, null, 2));
else {
	console.log(`Auditoría de ${origin}/market — ${state.products.length} productos (${state.mode})\n`);
	console.table(report);
	for (const lvl of ["error", "warn"]) {
		const list = issues.filter((i) => i.level === lvl);
		console.log(`\n${lvl === "error" ? "✘ Errores" : "⚠ Advertencias"} (${list.length})`);
		for (const i of list) console.log(`  [${i.where}] ${i.msg}`);
	}
}
process.exit(issues.some((i) => i.level === "error") ? 1 : 0);
