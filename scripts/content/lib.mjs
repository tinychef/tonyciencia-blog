// Utilidades compartidas por los scripts de contenido (new-post, validate-post, affiliates).
// Node 22, sin dependencias externas.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "..", "..");
export const root = (...segments) => path.join(REPO_ROOT, ...segments);

export const SITE_ORIGIN = "https://tonyciencia.com";
export const PARTNERS_TS = root("src", "data", "partners.generated.ts");
export const EXTRA_AFFILIATES = root("content", "affiliates", "extra.json");
export const POSTS_DIR = root("content", "posts");
export const SITE_SEED = root("seed", "base", "site.json");

export function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/** Quita tildes y pasa a minúsculas, para búsquedas tolerantes. */
export function fold(text) {
	return String(text ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase();
}

// ---------------------------------------------------------------------------
// Base de afiliados
// ---------------------------------------------------------------------------

/**
 * Lee src/data/partners.generated.ts como texto: el array exportado es JSON puro
 * (lo escribe scripts/generate-partners-data.mjs con JSON.stringify).
 */
export function loadGeneratedPartners() {
	const source = fs.readFileSync(PARTNERS_TS, "utf8");
	const marker = source.indexOf("export const partners");
	if (marker === -1) throw new Error(`No encuentro "export const partners" en ${PARTNERS_TS}`);
	const start = source.indexOf("[", source.indexOf("=", marker));
	const end = source.lastIndexOf("]");
	if (start === -1 || end === -1 || end < start) throw new Error(`No pude aislar el array de partners en ${PARTNERS_TS}`);
	const partners = JSON.parse(source.slice(start, end + 1));
	return partners.map((p) => ({ ...p, origin: "partners.generated.ts" }));
}

export function loadExtraAffiliates() {
	if (!fs.existsSync(EXTRA_AFFILIATES)) return [];
	const data = readJson(EXTRA_AFFILIATES);
	const list = Array.isArray(data) ? data : data.affiliates;
	if (!Array.isArray(list)) {
		throw new Error(`${EXTRA_AFFILIATES} debe ser un array (o un objeto con "affiliates": [])`);
	}
	return list.map((p, i) => {
		const required = p?.disabled ? ["name"] : ["name", "category", "affiliateLink"];
		for (const field of required) {
			if (typeof p[field] !== "string" || !p[field].trim()) {
				throw new Error(`content/affiliates/extra.json[${i}]: falta "${field}"`);
			}
		}
		return { platform: "Directo", website: "", ...p, origin: "extra.json" };
	});
}

/**
 * Base completa: partners generados + extra.json.
 * Una entrada de extra.json con el mismo "name" que un partner generado lo reemplaza;
 * con "disabled": true lo retira (p. ej. un programa que se cerró).
 */
export function loadAffiliates() {
	const byName = new Map();
	for (const p of loadGeneratedPartners()) byName.set(fold(p.name), p);
	for (const p of loadExtraAffiliates()) {
		const key = fold(p.name);
		if (p.disabled) {
			byName.delete(key);
			continue;
		}
		byName.set(key, p);
	}
	return [...byName.values()];
}

function stripWww(host) {
	return host.replace(/^www\./, "");
}

export function parseUrl(href) {
	try {
		return new URL(href);
	} catch {
		return null;
	}
}

function normalizePath(pathname) {
	const p = pathname.replace(/\/+$/, "");
	return p === "" ? "/" : p;
}

/**
 * ¿El enlace corresponde a un afiliado de la base?
 * Coincide si el host y la ruta son los del affiliateLink y conserva todos sus
 * parámetros de seguimiento (se permiten parámetros extra, p. ej. ?u= de Impact
 * para deep links o subId).
 */
export function matchAffiliate(href, affiliates) {
	const url = parseUrl(href);
	if (!url) return null;
	for (const aff of affiliates) {
		const ref = parseUrl(aff.affiliateLink);
		if (!ref) continue;
		if (stripWww(url.hostname.toLowerCase()) !== stripWww(ref.hostname.toLowerCase())) continue;
		if (normalizePath(url.pathname) !== normalizePath(ref.pathname)) continue;
		let paramsOk = true;
		for (const [key, value] of ref.searchParams) {
			if (url.searchParams.get(key) !== value) {
				paramsOk = false;
				break;
			}
		}
		if (paramsOk) return aff;
	}
	return null;
}

const AFFILIATE_NETWORK_HOSTS = [
	/(^|\.)pxf\.io$/,
	/(^|\.)sjv\.io$/,
	/(^|\.)partnerlinks\.io$/,
	/(^|\.)awin1\.com$/,
	/(^|\.)shareasale\.com$/,
	/(^|\.)linksynergy\.com$/,
	/(^|\.)prf\.hn$/,
	/(^|\.)go2cloud\.org$/,
	/(^|\.)hop\.clickbank\.net$/,
	/(^|\.)(anrdoezrs\.net|dpbolvw\.net|jdoqocy\.com|kqzyfj\.com|tkqlhce\.com)$/,
	/(^|\.)amzn\.to$/,
	/(^|\.)partnerstack\.com$/,
	/(^|\.)impact\.com$/,
	/(^|\.)fiverr\.com$/,
];

const AFFILIATE_PARAMS = ["fpr", "fp_ref", "via", "aff", "affid", "aff_id", "affiliate", "affiliate_id", "irclickid", "ref_id", "refid", "partner_id", "pid", "ref"];
const VANITY_SUBDOMAINS = /^(try|get|join|go|refer|partner|partners|affiliate|affiliates|ps|psjoin|grow|start|invite|use|free-trial)\./;

/**
 * Heurística: ¿parece un enlace de afiliado (aunque no esté en la base)?
 * Se usa para impedir que se cuelen enlaces inventados o de otra cuenta.
 */
export function looksLikeAffiliate(href, affiliates) {
	const url = parseUrl(href);
	if (!url || !/^https?:$/.test(url.protocol)) return false;
	const host = stripWww(url.hostname.toLowerCase());
	if (host === "tonyciencia.com" || host.endsWith(".tonyciencia.com")) return false;
	if (AFFILIATE_NETWORK_HOSTS.some((re) => re.test(host))) return true;
	// Mismo host que algún enlace de afiliado de la base (try.activecampaign.com, get.descript.com…)
	for (const aff of affiliates) {
		const ref = parseUrl(aff.affiliateLink);
		if (ref && stripWww(ref.hostname.toLowerCase()) === host) {
			// Si el host también es el sitio oficial (p. ej. fish.audio), solo cuenta si lleva parámetros de seguimiento.
			const refHasParams = [...ref.searchParams.keys()].length > 0;
			if (!refHasParams) return true;
			if ([...ref.searchParams.keys()].some((k) => url.searchParams.has(k))) return true;
		}
	}
	if ([...url.searchParams.keys()].some((k) => AFFILIATE_PARAMS.includes(k.toLowerCase()))) {
		// "ref" es común en enlaces normales (GitHub, Product Hunt): solo cuenta si parece un código.
		const ref = url.searchParams.get("ref");
		const others = [...url.searchParams.keys()].filter((k) => AFFILIATE_PARAMS.includes(k.toLowerCase()) && k.toLowerCase() !== "ref");
		if (others.length > 0) return true;
		if (ref && /\d/.test(ref) && ref.length >= 5) return true;
	}
	// Patrón PartnerStack: subdominio "de campaña" + un token aleatorio con dígitos (try.x.com/ab12cd34ef)
	if (VANITY_SUBDOMAINS.test(url.hostname.toLowerCase())) {
		const p = url.pathname.replace(/\/+$/, "");
		if (/^\/[a-z0-9]{6,}(-[a-z0-9]{4,})?$/i.test(p) && /\d/.test(p)) return true;
	}
	return false;
}

/** Partner cuyo sitio oficial coincide con el host del enlace (para avisos). */
export function partnerForWebsite(href, affiliates) {
	const url = parseUrl(href);
	if (!url) return null;
	const host = stripWww(url.hostname.toLowerCase());
	return (
		affiliates.find((aff) => {
			const site = parseUrl(aff.website);
			return site && stripWww(site.hostname.toLowerCase()) === host;
		}) ?? null
	);
}

// ---------------------------------------------------------------------------
// Taxonomías y posts existentes
// ---------------------------------------------------------------------------

export function loadTaxonomies() {
	const site = readJson(SITE_SEED);
	return new Map(
		(site.taxonomies ?? []).map((taxonomy) => [
			taxonomy.name,
			new Map((taxonomy.terms ?? []).map((term) => [term.slug, term.label ?? term.slug])),
		]),
	);
}

export function loadAllPosts() {
	const posts = [];
	for (const locale of ["es", "en"]) {
		const dir = path.join(POSTS_DIR, locale);
		if (!fs.existsSync(dir)) continue;
		for (const entry of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
			const file = path.join(dir, entry);
			try {
				posts.push({ file, post: readJson(file) });
			} catch (error) {
				posts.push({ file, post: null, error });
			}
		}
	}
	return posts;
}

// ---------------------------------------------------------------------------
// Portable Text
// ---------------------------------------------------------------------------

export function blockText(block) {
	return (block?.children ?? []).map((child) => child?.text ?? "").join("");
}

export function countWords(text) {
	const words = String(text).match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu);
	return words ? words.length : 0;
}

export function contentWordCount(blocks) {
	return (blocks ?? []).reduce((total, block) => total + countWords(blockText(block)), 0);
}

/** Lista de enlaces de un array Portable Text: { href, text, blockIndex }. */
export function collectLinks(blocks) {
	const links = [];
	(blocks ?? []).forEach((block, blockIndex) => {
		const defs = new Map((block.markDefs ?? []).filter((d) => d?._type === "link").map((d) => [d._key, d]));
		if (defs.size === 0) return;
		const textByKey = new Map();
		for (const child of block.children ?? []) {
			for (const mark of child.marks ?? []) {
				if (defs.has(mark)) textByKey.set(mark, (textByKey.get(mark) ?? "") + (child.text ?? ""));
			}
		}
		for (const [key, def] of defs) {
			links.push({ href: def.href, text: textByKey.get(key) ?? "", blockIndex, key });
		}
	});
	return links;
}

export function isInternalHref(href) {
	if (typeof href !== "string") return false;
	if (href.startsWith("/") && !href.startsWith("//")) return true;
	const url = parseUrl(href);
	if (!url) return false;
	const host = stripWww(url.hostname.toLowerCase());
	return host === "tonyciencia.com";
}

export function internalPath(href) {
	if (href.startsWith("/")) return href.split(/[?#]/)[0];
	const url = parseUrl(href);
	return url ? url.pathname : href;
}

export const DISCLOSURE_RE = {
	es: /(enlaces? de afiliad|enlace afiliado|comisi[oó]n)/i,
	en: /(affiliate link|commission|paid link)/i,
};

export const DISCLOSURE_TEXT = {
	es: "Transparencia: este artículo contiene enlaces de afiliado. Si compras o te registras a través de ellos, Tony Ciencia puede recibir una comisión sin costo extra para ti. No cambia nuestra opinión: solo recomendamos herramientas que revisamos con fuentes oficiales.",
	en: "Disclosure: this article contains affiliate links. If you buy or sign up through them, Tony Ciencia may earn a commission at no extra cost to you. It doesn't change our opinion: we only recommend tools we've reviewed against official sources.",
};

export const DISCLOSURE_LINK = {
	es: { text: "Más detalles", href: "/legal/afiliados" },
	en: { text: "More details", href: "/en/legal/affiliate" },
};

export function slugify(text) {
	return fold(text)
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
}

export function relativeToRepo(file) {
	return path.relative(REPO_ROOT, path.resolve(file)) || file;
}
