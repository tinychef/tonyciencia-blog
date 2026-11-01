#!/usr/bin/env node
// Auditoría del catálogo de Market Tony: fichas, SEO, datos estructurados, feed de Google Merchant y sitemap,
// en español (/market/…) y en inglés (/market/en/…): canonical = hreflang propio, reciprocidad es↔en, x-default,
// lastmod no futuro, textos en español en las páginas en inglés y enlaces a /market/auth/ sin nofollow.
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
const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? "";
const hreflangOf = (html) => Object.fromEntries([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));
const absUrl = (path) => new URL(path, origin).toString();

/**
 * hreflang de una página con versión en el otro idioma: el canonical es su propia URL, el hreflang de su idioma
 * coincide con el canonical, apunta a la otra versión y x-default va a la española. Devuelve el mapa para
 * comprobar la reciprocidad.
 */
function checkHreflang(where, html, lang, selfPath, pair) {
	const canonical = canonicalOf(html);
	const alt = hreflangOf(html);
	if (canonical !== absUrl(selfPath)) err(where, `canonical ${canonical || "(falta)"} ≠ ${absUrl(selfPath)}`);
	if (alt[lang] !== canonical) err(where, `hreflang ${lang} (${alt[lang] ?? "falta"}) ≠ canonical (${canonical})`);
	if (alt.es !== absUrl(pair.es)) err(where, `hreflang es ${alt.es ?? "(falta)"} ≠ ${absUrl(pair.es)}`);
	if (alt.en !== absUrl(pair.en)) err(where, `hreflang en ${alt.en ?? "(falta)"} ≠ ${absUrl(pair.en)}`);
	if (alt["x-default"] !== absUrl(pair.es)) err(where, `hreflang x-default ${alt["x-default"] ?? "(falta)"} ≠ ${absUrl(pair.es)}`);
	return alt;
}

/** Enlaces rastreables al inicio de sesión: deben llevar rel="nofollow" (y robots.txt los bloquea). */
function checkAuthLinks(where, html) {
	const bad = [...html.matchAll(/<a\b[^>]*href="\/market\/auth\/[^"]*"[^>]*>/g)].filter((m) => !/rel="[^"]*nofollow/.test(m[0]));
	if (bad.length) err(where, `${bad.length} enlace(s) a /market/auth/ sin rel="nofollow"`);
}

// Palabras vacías del español que no existen en inglés: si aparecen muchas en una página EN, hay texto sin traducir.
const ES_STOPWORDS = new Set("de la el los las que del por para con una uno unos unas su sus tu tus al lo como más pero sin sobre desde hasta también este esta estos estas ese esa muy ya cuando porque donde quieras compra compras precio".split(" "));
function checkEnglishText(where, html) {
	const text = decode(html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")).toLowerCase();
	const hits = (text.match(/[a-záéíóúñü]+/g) ?? []).filter((w) => ES_STOPWORDS.has(w));
	if (hits.length > 12) warn(where, `${hits.length} palabras en español en la página en inglés (p. ej. ${[...new Set(hits)].slice(0, 6).join(", ")})`);
}

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

// Sitemap: lastmod nunca en el futuro y cada entrada con alternates declara también x-default.
const today = new Date().toISOString().slice(0, 10);
const sitemapEntries = [...sitemapRes.text.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
const sitemapAlt = (loc) => {
	const entry = sitemapEntries.find((e) => e.includes(`<loc>${loc}</loc>`));
	return entry ? Object.fromEntries([...entry.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]])) : null;
};
for (const e of sitemapEntries) {
	const loc = e.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? "?";
	const lastmod = e.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
	if (lastmod && lastmod > today) err("sitemap.xml", `lastmod futuro (${lastmod}) en ${loc}`);
	if (/hreflang="es"/.test(e) && !/hreflang="x-default"/.test(e)) warn("sitemap.xml", `sin x-default en ${loc}`);
}

// Catálogo en los dos idiomas: canonical = hreflang propio, reciprocidad y mismas URL en el sitemap.
const CAT = { es: "/market/", en: "/market/en/" };
for (const lang of ["es", "en"]) {
	const where = `catálogo ${lang}`;
	const page = await get(CAT[lang]);
	if (page.status !== 200) {
		err(where, `${CAT[lang]} responde ${page.status}`);
		continue;
	}
	checkHreflang(where, page.text, lang, CAT[lang], CAT);
	checkAuthLinks(where, page.text);
	if (lang === "en") {
		checkEnglishText(where, page.text);
		if (/href="\/market(#[^"]*)?"/.test(page.text)) warn(where, "enlaza a /market (catálogo en español) en vez de /market/en/");
	}
	const sm = sitemapAlt(absUrl(CAT[lang]));
	if (!sm) err("sitemap.xml", `falta ${absUrl(CAT[lang])}`);
	else if (sm.es !== absUrl(CAT.es) || sm.en !== absUrl(CAT.en)) err("sitemap.xml", `hreflang del catálogo distinto al del HTML (${JSON.stringify(sm)})`);
}
for (const [from, to] of [["/market/en", "/market/en/"]]) {
	const r = await get(from, { head: true });
	if (r.status !== 301 || !(r.headers.get("location") ?? "").endsWith(to)) warn("redirecciones", `${from} responde ${r.status} (se espera 301 → ${to})`);
}

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
	// El H1 puede traer el nombre y el subtítulo en <span>: se compara el texto plano.
	const h1 = decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
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
	checkAuthLinks(w, html);
	// Versión en inglés: si existe, hreflang recíproco en las dos páginas y en el sitemap.
	const pair = { es: `/market/producto/${p.slug}`, en: `/market/en/product/${p.slug}` };
	const enPage = await get(pair.en);
	if (enPage.status === 200) {
		const we = `${p.slug} (en)`;
		checkHreflang(w, html, "es", pair.es, pair);
		checkHreflang(we, enPage.text, "en", pair.en, pair);
		checkAuthLinks(we, enPage.text);
		checkEnglishText(we, enPage.text);
		if (!/<html lang="en"/.test(enPage.text)) err(we, "<html lang> no es en");
		const enLd = jsonLd(enPage.text).find((d) => d["@type"] === "Product");
		if (enLd && enLd.offers?.url !== absUrl(pair.en)) err(we, `Offer.url ${enLd.offers?.url} ≠ ${absUrl(pair.en)}`);
		for (const loc of [pair.es, pair.en]) {
			const sm = sitemapAlt(absUrl(loc));
			if (!sm) err(w, `falta ${loc} en sitemap.xml`);
			else if (sm.es !== absUrl(pair.es) || sm.en !== absUrl(pair.en)) err(w, `hreflang de ${loc} en el sitemap no coincide con el HTML`);
		}
	} else if (enPage.status !== 302) err(`${p.slug} (en)`, `${pair.en} responde ${enPage.status}`);
	if (product && !product.url) warn(w, "Product sin url en JSON-LD");
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
if (robotsTxt.status === 200 && !robotsTxt.text.includes("Disallow: /market/auth/")) warn("robots.txt", "no bloquea /market/auth/ (inicio de sesión: 302 a Google y límite por IP)");
const css = await get("/market/static/market.css", { head: true });
if (css.status === 200 && !/max-age=[1-9]/.test(css.headers.get("cache-control") ?? "")) warn("caché", `market.css sin caché de navegador (${css.headers.get("cache-control")}); ver public/_headers`);
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
