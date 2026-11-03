#!/usr/bin/env node
// Valida un post JSON de content/posts/<locale>/<slug>.json antes de abrir el PR.
//
// Uso:
//   pnpm post:check <archivo.json> [más archivos…] [--pillar] [--online] [--json]
//
//   --pillar   artículo pilar: < 1200 palabras es error (si no, solo aviso)
//   --online   además comprueba con HEAD/GET que cada enlace externo responda (lento)
//   --json     imprime el informe en JSON
//
// Sale con código 1 si hay errores. Los avisos no bloquean.
import fs from "node:fs";
import path from "node:path";
import {
	DISCLOSURE_RE,
	REPO_ROOT,
	blockText,
	collectLinks,
	contentWordCount,
	fold,
	internalPath,
	isInternalHref,
	loadAffiliates,
	loadAllPosts,
	loadTaxonomies,
	looksLikeAffiliate,
	matchAffiliate,
	parseUrl,
	partnerForWebsite,
	relativeToRepo,
	root,
} from "./lib.mjs";

export const LIMITS = {
	titleMin: 20,
	titleTarget: 60,
	titleMax: 70,
	excerptMin: 120,
	excerptTargetMin: 140,
	excerptTargetMax: 160,
	excerptMax: 200,
	h2Min: 3,
	h2Recommended: 5,
	wordsHardMin: 300,
	wordsPillar: 1200,
	wordsPerAffiliateLink: 250,
	maxLinksPerPartner: 2,
	internalLinksMin: 2,
	externalSourcesMin: 2,
	faqRecommended: 3,
	disclosureWithinBlocks: 3,
};

const SCHEMA_TYPES = new Set(["BlogPosting", "Article", "HowTo", "NewsArticle", "TechArticle", "Review"]);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

/** Rutas estáticas del sitio (src/pages) para comprobar enlaces internos. */
function staticRoutes() {
	const routes = new Set(["/", "/en", "/posts", "/en/posts", "/market"]);
	const pagesDir = root("src", "pages");
	const walk = (dir, prefix) => {
		if (!fs.existsSync(dir)) return;
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (entry.isDirectory()) walk(path.join(dir, entry.name), `${prefix}/${entry.name}`);
			else if (/\.(astro|ts|md)$/.test(entry.name) && !entry.name.includes("[")) {
				const name = entry.name.replace(/\.(astro|ts|md)$/, "");
				routes.add(name === "index" ? prefix || "/" : `${prefix}/${name}`);
			}
		}
	};
	walk(pagesDir, "");
	return routes;
}

function legalSlugs() {
	try {
		const legal = JSON.parse(fs.readFileSync(root("seed", "base", "legal-pages.json"), "utf8"));
		return new Map(legal.map((p) => [p.slug, p.locale]));
	} catch {
		return new Map();
	}
}

function checkInternalLink(href, ctx) {
	const p = internalPath(href).replace(/\/+$/, "") || "/";
	const postMatch = p.match(/^(\/en)?\/posts\/([^/]+)$/);
	if (postMatch) {
		const locale = postMatch[1] ? "en" : "es";
		const exists = ctx.posts.some(({ post }) => post?.locale === locale && post?.slug === postMatch[2] && post?.status === "published");
		return exists ? null : `enlace interno a un post que no existe (o no está publicado) en content/posts/${locale}: ${href}`;
	}
	const legalMatch = p.match(/^(\/en)?\/legal\/([^/]+)$/);
	if (legalMatch) return ctx.legal.has(legalMatch[2]) ? null : `enlace legal desconocido: ${href}`;
	if (p.startsWith("/market")) return null; // Worker separado (workers/market): no se puede comprobar aquí
	if (/^(\/en)?\/(category|tag|pages)\//.test(p)) return null;
	return ctx.routes.has(p) ? null : `ruta interna no encontrada en src/pages: ${href}`;
}

async function checkOnline(url) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 15000);
	try {
		// GET sin seguir redirecciones: los enlaces de afiliado responden 30x hacia el sitio del anunciante, y
		// varias redes (PartnerStack) devuelven 404 a HEAD aunque el enlace funcione.
		const res = await fetch(url, {
			method: "GET",
			redirect: "manual",
			signal: controller.signal,
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
				accept: "text/html,application/xhtml+xml",
			},
		});
		res.body?.cancel().catch(() => {});
		return res.status;
	} catch (error) {
		return `sin respuesta (${error.name})`;
	} finally {
		clearTimeout(timer);
	}
}

function checkPortableText(blocks, label, errors) {
	blocks.forEach((block, index) => {
		const where = `${label}[${index}]`;
		if (block?._type !== "block") {
			errors.push(`${where}: _type "${block?._type}" no soportado (solo "block")`);
			return;
		}
		if (!["normal", "h2", "h3", "blockquote"].includes(block.style)) errors.push(`${where}: style "${block.style}" no soportado`);
		if (block.listItem && !["bullet", "number"].includes(block.listItem)) errors.push(`${where}: listItem "${block.listItem}" no soportado`);
		if (!Array.isArray(block.children) || block.children.length === 0) {
			errors.push(`${where}: sin children`);
			return;
		}
		const defKeys = new Set((block.markDefs ?? []).map((d) => d._key));
		for (const def of block.markDefs ?? []) {
			if (def._type !== "link" || typeof def.href !== "string" || !def.href.trim()) errors.push(`${where}: markDef inválido ${JSON.stringify(def)}`);
		}
		for (const child of block.children) {
			if (child._type !== "span" || typeof child.text !== "string") errors.push(`${where}: child inválido`);
			for (const mark of child.marks ?? []) {
				if (!["strong", "em", "code", "underline", "strike-through"].includes(mark) && !defKeys.has(mark)) {
					errors.push(`${where}: mark "${mark}" sin markDef`);
				}
			}
		}
		const text = blockText(block);
		if (/\*\*|\]\(|^#{1,6}\s|^\s*[-*]\s/.test(text)) errors.push(`${where}: restos de Markdown sin convertir: "${text.slice(0, 60)}"`);
	});
}

/**
 * Valida un archivo de post. Devuelve { file, errors, warnings, info, stats }.
 */
export function validatePost(file, options = {}) {
	const errors = [];
	const warnings = [];
	const info = [];
	const stats = {};
	const report = { file: relativeToRepo(file), errors, warnings, info, stats };

	let post;
	try {
		post = JSON.parse(fs.readFileSync(file, "utf8"));
	} catch (error) {
		errors.push(`JSON inválido: ${error.message}`);
		return report;
	}

	const affiliates = options.affiliates ?? loadAffiliates();
	const taxonomies = options.taxonomies ?? loadTaxonomies();
	const allPosts = options.posts ?? loadAllPosts();
	const others = allPosts.filter((p) => path.resolve(p.file) !== path.resolve(file) && p.post);
	const data = post.data ?? {};

	// --- Campos obligatorios (mismo contrato que scripts/build-seed.mjs) ---
	for (const field of ["id", "slug", "status", "locale", "data", "published_at", "bylines", "taxonomies"]) {
		if (post[field] === undefined) errors.push(`falta "${field}"`);
	}
	for (const field of ["title", "excerpt", "content", "featured_image", "external_id", "source"]) {
		if (data[field] === undefined) errors.push(`falta data.${field}`);
	}
	if (!["es", "en"].includes(post.locale)) errors.push(`locale inválido "${post.locale}"`);
	if (!["draft", "published"].includes(post.status)) errors.push(`status inválido "${post.status}" (draft|published)`);
	if (post.status === "draft") warnings.push(`status "draft": tras el merge NO se verá en el sitio (el fallback estático solo muestra "published")`);
	if (typeof post.published_at !== "string" || !DATE_RE.test(post.published_at)) {
		errors.push(`published_at "${post.published_at}" no tiene formato YYYY-MM-DDTHH:MM:SS`);
	} else if (new Date(post.published_at) > new Date(Date.now() + 36 * 3600 * 1000)) {
		warnings.push(`published_at está en el futuro (${post.published_at}): el sitio no programa publicaciones, se mostraría ya`);
	}
	if (!Array.isArray(post.bylines) || !post.bylines.every((b) => typeof b?.byline === "string")) errors.push(`bylines debe ser [{ "byline": "byline-tony" }]`);

	// --- Slug ---
	const slug = post.slug;
	if (typeof slug !== "string" || !SLUG_RE.test(slug)) errors.push(`slug "${slug}" inválido (minúsculas, números y guiones)`);
	else {
		if (slug.length > 75) warnings.push(`slug largo (${slug.length} caracteres); ideal ≤ 60`);
		const base = path.basename(file, ".json");
		if (base !== slug) errors.push(`el archivo se llama "${base}.json" pero el slug es "${slug}"`);
		const dirLocale = path.basename(path.dirname(path.resolve(file)));
		if (["es", "en"].includes(dirLocale) && dirLocale !== post.locale) errors.push(`está en content/posts/${dirLocale}/ pero locale es "${post.locale}"`);
	}
	for (const { file: otherFile, post: other } of others) {
		if (other.slug === slug) errors.push(`slug duplicado con ${relativeToRepo(otherFile)}`);
		if (other.id === post.id) errors.push(`id duplicado con ${relativeToRepo(otherFile)}`);
		if (data.external_id && other.data?.external_id === data.external_id) errors.push(`external_id duplicado con ${relativeToRepo(otherFile)}`);
		if (other.locale === post.locale && fold(other.data?.title) === fold(data.title)) errors.push(`título idéntico a ${relativeToRepo(otherFile)}`);
	}

	// --- Traducción ---
	if (post.locale === "en") {
		if (!data.translation_of) errors.push("posts en inglés necesitan data.translation_of (slug del post en español)");
		else if (!others.some(({ post: o }) => o.locale === "es" && o.slug === data.translation_of)) {
			errors.push(`translation_of "${data.translation_of}" no existe en content/posts/es`);
		}
	}

	// --- Título y excerpt ---
	const title = String(data.title ?? "").trim();
	stats.titleLength = title.length;
	if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) {
		errors.push(`título de ${title.length} caracteres (permitido ${LIMITS.titleMin}–${LIMITS.titleMax}, ideal ≤ ${LIMITS.titleTarget})`);
	} else if (title.length > LIMITS.titleTarget) {
		warnings.push(`título de ${title.length} caracteres: Google suele cortar sobre ${LIMITS.titleTarget}`);
	}
	const excerpt = String(data.excerpt ?? "").trim();
	stats.excerptLength = excerpt.length;
	if (excerpt.length < LIMITS.excerptMin || excerpt.length > LIMITS.excerptMax) {
		errors.push(`excerpt de ${excerpt.length} caracteres (permitido ${LIMITS.excerptMin}–${LIMITS.excerptMax}, ideal ${LIMITS.excerptTargetMin}–${LIMITS.excerptTargetMax})`);
	} else if (excerpt.length < LIMITS.excerptTargetMin || excerpt.length > LIMITS.excerptTargetMax) {
		warnings.push(`excerpt de ${excerpt.length} caracteres (ideal ${LIMITS.excerptTargetMin}–${LIMITS.excerptTargetMax}; es la meta description)`);
	}

	// --- Imagen destacada ---
	const media = data.featured_image?.$media ?? data.featured_image;
	if (!media?.url && !media?.src) errors.push("featured_image sin url");
	else {
		const url = media.url ?? media.src;
		if (!media.alt || !String(media.alt).trim()) errors.push("featured_image sin texto alternativo (alt)");
		const parsed = parseUrl(url);
		if (parsed && /(^|\.)tonyciencia\.com$/.test(parsed.hostname)) {
			const local = root("public", decodeURIComponent(parsed.pathname));
			if (!fs.existsSync(local)) errors.push(`featured_image apunta a ${parsed.pathname}, que no existe en public/`);
		} else if (!parsed) errors.push(`featured_image.url inválida: ${url}`);
		else info.push(`featured_image externa (no comprobada sin --online): ${url}`);
	}

	// --- Taxonomías ---
	const tax = post.taxonomies ?? {};
	if (!Array.isArray(tax.category) || tax.category.length === 0) errors.push("taxonomies.category necesita al menos un término");
	for (const [name, terms] of Object.entries(tax)) {
		const valid = taxonomies.get(name);
		if (!valid) {
			errors.push(`taxonomía desconocida "${name}" (válidas: ${[...taxonomies.keys()].join(", ")})`);
			continue;
		}
		if (!Array.isArray(terms)) {
			errors.push(`taxonomies.${name} debe ser un array`);
			continue;
		}
		for (const term of terms) {
			if (!valid.has(term)) errors.push(`término "${term}" no existe en "${name}" (válidos: ${[...valid.keys()].join(", ")})`);
		}
	}

	// --- Contenido ---
	const content = Array.isArray(data.content) ? data.content : [];
	if (!Array.isArray(data.content)) errors.push("data.content debe ser un array Portable Text");
	checkPortableText(content, "content", errors);
	const words = contentWordCount(content);
	stats.words = words;
	if (words < LIMITS.wordsHardMin) errors.push(`solo ${words} palabras`);
	else if (words < LIMITS.wordsPillar) {
		(options.pillar ? errors : warnings).push(`${words} palabras (un artículo pilar necesita ≥ ${LIMITS.wordsPillar})`);
	}
	const h2 = content.filter((b) => b.style === "h2");
	stats.h2 = h2.length;
	stats.h3 = content.filter((b) => b.style === "h3").length;
	if (h2.length < LIMITS.h2Min) errors.push(`solo ${h2.length} H2 (mínimo ${LIMITS.h2Min})`);
	else if (h2.length < LIMITS.h2Recommended) warnings.push(`${h2.length} H2 (recomendado ≥ ${LIMITS.h2Recommended} en artículos largos)`);
	if (content[0]?.style === "h2") warnings.push("el contenido empieza con un H2: abre con un párrafo gancho");
	const h2Texts = h2.map((b) => fold(blockText(b)));
	if (new Set(h2Texts).size !== h2Texts.length) warnings.push("hay H2 repetidos");
	const longParagraphs = content.filter((b) => b.style === "normal" && !b.listItem && blockText(b).split(/\s+/).length > 120).length;
	if (longParagraphs) warnings.push(`${longParagraphs} párrafo(s) de más de 120 palabras: divídelos para lectura en móvil`);

	// --- Enlaces ---
	const links = collectLinks(content);
	const ctx = { posts: allPosts, routes: staticRoutes(), legal: legalSlugs() };
	const affiliateLinks = [];
	const internalLinks = [];
	const externalSources = [];
	for (const link of links) {
		const href = link.href;
		const parsed = href.startsWith("/") ? null : parseUrl(href);
		if (!href.startsWith("/") && (!parsed || !/^https?:$/.test(parsed.protocol))) {
			if (!/^mailto:/.test(href)) errors.push(`enlace con esquema no permitido: ${href}`);
			continue;
		}
		if (parsed && parsed.protocol === "http:" && !isInternalHref(href)) warnings.push(`enlace sin https: ${href}`);
		if (isInternalHref(href)) {
			internalLinks.push(link);
			const problem = checkInternalLink(href, ctx);
			if (problem) errors.push(problem);
			continue;
		}
		const partner = matchAffiliate(href, affiliates);
		if (partner) {
			affiliateLinks.push({ ...link, partner });
			continue;
		}
		if (looksLikeAffiliate(href, affiliates)) {
			errors.push(`enlace con pinta de afiliado que NO está en la base (partners.generated.ts / content/affiliates/extra.json): ${href}`);
			continue;
		}
		externalSources.push(link);
		const site = partnerForWebsite(href, affiliates);
		if (site) info.push(`enlace directo al sitio de ${site.name} (${href}): bien como fuente; para recomendar usa su enlace de afiliado`);
	}
	stats.affiliateLinks = affiliateLinks.length;
	stats.internalLinks = internalLinks.length;
	stats.externalSources = externalSources.length;
	stats.partners = [...new Set(affiliateLinks.map((l) => l.partner.name))];

	if (internalLinks.length < LIMITS.internalLinksMin) errors.push(`${internalLinks.length} enlaces internos (mínimo ${LIMITS.internalLinksMin}: posts, landings o /market)`);
	if (externalSources.length < LIMITS.externalSourcesMin) warnings.push(`${externalSources.length} fuentes externas no afiliadas (recomendado ≥ ${LIMITS.externalSourcesMin} fuentes oficiales)`);

	if (affiliateLinks.length) {
		const maxLinks = Math.max(1, Math.floor(words / LIMITS.wordsPerAffiliateLink));
		stats.maxAffiliateLinks = maxLinks;
		if (affiliateLinks.length > maxLinks) {
			errors.push(`densidad de afiliados: ${affiliateLinks.length} enlaces en ${words} palabras (máximo ${maxLinks}: 1 cada ${LIMITS.wordsPerAffiliateLink})`);
		}
		const perPartner = new Map();
		for (const l of affiliateLinks) perPartner.set(l.partner.name, (perPartner.get(l.partner.name) ?? 0) + 1);
		for (const [name, count] of perPartner) {
			if (count > LIMITS.maxLinksPerPartner) errors.push(`${name} enlazado ${count} veces (máximo ${LIMITS.maxLinksPerPartner} por partner)`);
		}
		const bareAnchors = affiliateLinks.filter((l) => /^(aqu[ií]|click|clic|here|link|enlace)$/i.test(l.text.trim()));
		if (bareAnchors.length) warnings.push(`anclas poco descriptivas en enlaces de afiliado: ${bareAnchors.map((l) => `"${l.text}"`).join(", ")}`);
		const headings = new Set(content.map((b, i) => (b.style === "h2" || b.style === "h3" ? i : -1)).filter((i) => i >= 0));
		if (affiliateLinks.some((l) => headings.has(l.blockIndex))) errors.push("enlace de afiliado dentro de un encabezado");

		// Aviso de afiliados (FTC): arriba, antes del primer enlace de afiliado.
		const re = DISCLOSURE_RE[post.locale] ?? DISCLOSURE_RE.es;
		const disclosureIndex = content.findIndex((b) => re.test(blockText(b)));
		const firstAffiliate = Math.min(...affiliateLinks.map((l) => l.blockIndex));
		if (disclosureIndex === -1) errors.push("hay enlaces de afiliado pero no hay aviso de afiliados en el texto");
		else {
			if (disclosureIndex >= LIMITS.disclosureWithinBlocks) errors.push(`el aviso de afiliados está en el bloque ${disclosureIndex}; debe ir en los primeros ${LIMITS.disclosureWithinBlocks}`);
			if (disclosureIndex > firstAffiliate) errors.push("el primer enlace de afiliado aparece antes del aviso de afiliados");
		}

		// Temas vetados por el anunciante (extra.json → disallowedTopics)
		const haystack = fold([title, excerpt, ...(data.keywords ?? []), data.key_entities ?? ""].join(" "));
		for (const l of affiliateLinks) {
			for (const topic of l.partner.disallowedTopics ?? []) {
				if (haystack.includes(fold(topic))) errors.push(`${l.partner.name} no permite promocionarse en artículos sobre "${topic}"`);
			}
		}
	}

	// --- FAQ ---
	const faq = data.faq_items;
	if (faq !== undefined && !Array.isArray(faq)) errors.push("faq_items debe ser un array Portable Text");
	else if (Array.isArray(faq)) {
		checkPortableText(faq, "faq_items", errors);
		let pairs = 0;
		for (let k = 0; k < faq.length; k++) {
			const block = faq[k];
			if (block.style === "h3") {
				const at = k;
				if (!blockText(block).trim().endsWith("?")) warnings.push(`faq_items[${at}]: la pregunta no termina en "?"`);
				const next = faq[k + 1];
				if (!next || next.style !== "normal" || !blockText(next).trim()) errors.push(`faq_items[${at}]: la pregunta "${blockText(block)}" no tiene respuesta (bloque normal) a continuación`);
				else {
					pairs++;
					k++;
				}
			} else {
				errors.push(`faq_items[${k}]: se esperaba un h3 (pregunta) y llegó "${block.style}"`);
			}
		}
		if (faq.some((b) => (b.markDefs ?? []).length)) warnings.push("faq_items con enlaces: el JSON-LD solo usa el texto");
		stats.faq = pairs;
		if (pairs < LIMITS.faqRecommended) warnings.push(`${pairs} preguntas en faq_items (recomendado ≥ ${LIMITS.faqRecommended})`);
		// La página del post ya muestra faq_items como sección visible: repetirlo en el cuerpo lo duplica.
		const duplicated = content.some((b) => b.style === "h2" && /preguntas frecuentes|faq|frequently asked/i.test(blockText(b)));
		if (pairs > 0 && duplicated) warnings.push("el cuerpo repite el FAQ: la plantilla ya muestra faq_items; quita esa sección del contenido");
	}

	// --- SEO auxiliar ---
	if (data.schema_type && !SCHEMA_TYPES.has(data.schema_type)) warnings.push(`schema_type "${data.schema_type}" poco común (usa ${[...SCHEMA_TYPES].join(", ")})`);
	if (!data.schema_type) warnings.push("sin schema_type (BlogPosting por defecto)");
	if (!data.key_entities || !String(data.key_entities).trim()) warnings.push("key_entities vacío");
	if (!Array.isArray(data.keywords) || data.keywords.length === 0) warnings.push("keywords vacío (keyword principal + secundarias)");
	else {
		const main = fold(data.keywords[0]);
		const firstWords = fold(content.slice(0, 4).map(blockText).join(" "));
		const mainTokens = main.split(/\s+/).filter((t) => t.length > 3);
		if (mainTokens.length && !mainTokens.every((t) => fold(title).includes(t) || fold(excerpt).includes(t))) {
			warnings.push(`la keyword principal "${data.keywords[0]}" no aparece completa en título ni excerpt`);
		}
		if (mainTokens.length && !mainTokens.some((t) => firstWords.includes(t))) warnings.push(`la keyword principal no aparece en la introducción`);
	}

	report.errors = [...new Set(errors)];
	report.warnings = [...new Set(warnings)];
	report.info = [...new Set(info)];
	return report;
}

export async function onlineChecks(report, file) {
	const post = JSON.parse(fs.readFileSync(file, "utf8"));
	const hrefs = [...new Set(collectLinks(post.data?.content ?? []).map((l) => l.href))];
	const media = post.data?.featured_image?.$media?.url;
	if (media) hrefs.push(media);
	for (const href of hrefs) {
		const url = href.startsWith("/") ? `https://tonyciencia.com${href}` : href;
		const status = await checkOnline(url);
		if (status === 403 || status === 429) report.info.push(`el sitio bloquea peticiones automáticas (${status}); revísalo en el navegador: ${url}`);
		else if (typeof status !== "number" || status >= 400) report.warnings.push(`enlace no responde bien (${status}): ${url}`);
	}
}

export function printReport(report) {
	const s = report.stats;
	console.log(`\n${report.file}`);
	if (s.words !== undefined) {
		console.log(
			`  palabras ${s.words} · H2 ${s.h2} · H3 ${s.h3} · título ${s.titleLength} car. · excerpt ${s.excerptLength} car. · ` +
				`enlaces internos ${s.internalLinks} · fuentes ${s.externalSources} · afiliados ${s.affiliateLinks}` +
				(s.maxAffiliateLinks ? `/${s.maxAffiliateLinks}` : "") +
				(s.faq !== undefined ? ` · FAQ ${s.faq}` : ""),
		);
		if (s.partners?.length) console.log(`  partners: ${s.partners.join(", ")}`);
	}
	for (const e of report.errors) console.log(`  ✗ ${e}`);
	for (const w of report.warnings) console.log(`  ! ${w}`);
	for (const i of report.info) console.log(`  · ${i}`);
	console.log(report.errors.length ? `  → ${report.errors.length} error(es)` : "  → OK");
}

async function main() {
	const argv = process.argv.slice(2);
	const flags = new Set(argv.filter((a) => a.startsWith("--")));
	const files = argv.filter((a) => !a.startsWith("--"));
	if (files.length === 0 || flags.has("--help")) {
		console.log("Uso: pnpm post:check <content/posts/es/slug.json> [más…] [--pillar] [--online] [--json]");
		process.exit(files.length === 0 && !flags.has("--help") ? 1 : 0);
	}
	const shared = { affiliates: loadAffiliates(), taxonomies: loadTaxonomies(), posts: loadAllPosts() };
	const reports = [];
	for (const file of files) {
		const resolved = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
		const report = fs.existsSync(resolved)
			? validatePost(resolved, { ...shared, pillar: flags.has("--pillar") })
			: { file, errors: ["no existe"], warnings: [], info: [], stats: {} };
		if (flags.has("--online") && fs.existsSync(resolved)) await onlineChecks(report, resolved);
		reports.push(report);
	}
	if (flags.has("--json")) console.log(JSON.stringify(reports, null, 2));
	else reports.forEach(printReport);
	process.exit(reports.some((r) => r.errors.length) ? 1 : 0);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
	main().catch((error) => {
		console.error(`error: ${error.message}`);
		process.exit(1);
	});
}

export { REPO_ROOT };
