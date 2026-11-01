#!/usr/bin/env node
// Convierte un artículo en Markdown (con frontmatter) al JSON exacto de content/posts/<locale>/<slug>.json.
//
// Uso:
//   pnpm post:new <articulo.md> [--out <ruta.json>] [--force] [--dry-run] [--no-check] [--pillar]
//
// Frontmatter admitido (YAML simple: escalares, listas "- x", listas en línea [a, b],
// mapas anidados con 2 espacios, listas de mapas y bloques > / |):
//   title, slug, excerpt, locale (es|en), status (draft|published), published_at,
//   category: [..], tag: [..], keywords: [..], key_entities (texto o lista),
//   featured_image: { url, alt, filename }, image_prompt, schema_type,
//   faq: [{ q, a }], faq_in_content (true por defecto), translation_of (obligatorio en en),
//   external_id, source, id, byline
//
// Cuerpo Markdown admitido: ## H2, ### H3, párrafos, listas "-"/"*" y "1." (anidadas con 2+ espacios),
// > cita, **negrita**, *cursiva*/_cursiva_, `código`, [texto](url). Los comentarios <!-- --> se ignoran,
// salvo una línea "<!-- faq -->", que marca dónde va la sección visible "Preguntas frecuentes" (por defecto, al final).
// No admitido (falla con mensaje): # H1 (el título ya es el H1), imágenes ![](), tablas, HTML.
import fs from "node:fs";
import path from "node:path";
import {
	DISCLOSURE_LINK,
	DISCLOSURE_RE,
	DISCLOSURE_TEXT,
	POSTS_DIR,
	blockText,
	loadAffiliates,
	looksLikeAffiliate,
	matchAffiliate,
	relativeToRepo,
	slugify,
} from "./lib.mjs";
import { printReport, validatePost } from "./validate-post.mjs";

// ---------------------------------------------------------------------------
// Frontmatter (subconjunto de YAML suficiente para el artículo)
// ---------------------------------------------------------------------------

function parseScalar(raw) {
	const value = raw.trim();
	if (value === "") return "";
	if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
		const inner = value.slice(1, -1);
		return value.startsWith('"') ? inner.replace(/\\"/g, '"').replace(/\\n/g, "\n") : inner.replace(/''/g, "'");
	}
	if (value.startsWith("[") && value.endsWith("]")) {
		return splitInlineList(value.slice(1, -1)).map(parseScalar);
	}
	if (value === "true") return true;
	if (value === "false") return false;
	if (value === "null" || value === "~") return null;
	if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
	return value;
}

function splitInlineList(text) {
	const items = [];
	let current = "";
	let quote = null;
	for (const ch of text) {
		if (quote) {
			current += ch;
			if (ch === quote) quote = null;
		} else if (ch === '"' || ch === "'") {
			quote = ch;
			current += ch;
		} else if (ch === ",") {
			items.push(current);
			current = "";
		} else {
			current += ch;
		}
	}
	if (current.trim()) items.push(current);
	return items.map((s) => s.trim()).filter(Boolean);
}

function indentOf(line) {
	return line.match(/^ */)[0].length;
}

/** Quita comentarios " # ..." fuera de comillas. */
function stripComment(line) {
	let quote = null;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (quote) {
			if (ch === quote) quote = null;
		} else if (ch === '"' || ch === "'") {
			quote = ch;
		} else if (ch === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
			return line.slice(0, i).replace(/\s+$/, "");
		}
	}
	return line;
}

export function parseFrontmatter(text) {
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	let i = 0;

	function parseBlockScalar(style, parentIndent) {
		const collected = [];
		let blockIndent = null;
		while (i < lines.length) {
			const line = lines[i];
			if (line.trim() === "") {
				collected.push("");
				i++;
				continue;
			}
			const ind = indentOf(line);
			if (ind <= parentIndent) break;
			if (blockIndent === null) blockIndent = ind;
			collected.push(line.slice(blockIndent));
			i++;
		}
		while (collected.length && collected.at(-1) === "") collected.pop();
		if (style === "|") return collected.join("\n");
		// folded: une líneas, respeta párrafos vacíos
		return collected
			.join("\n")
			.split(/\n{2,}/)
			.map((p) => p.replace(/\n/g, " ").trim())
			.join("\n");
	}

	function parseValueAfterKey(rest, keyIndent) {
		const value = stripComment(rest).trim();
		if (value === ">" || value === "|" || value === ">-" || value === "|-") {
			i++;
			return parseBlockScalar(value[0], keyIndent);
		}
		if (value !== "") {
			i++;
			return parseScalar(value);
		}
		// valor anidado en las líneas siguientes
		i++;
		while (i < lines.length && lines[i].trim() === "") i++;
		if (i >= lines.length) return null;
		const nextIndent = indentOf(lines[i]);
		if (nextIndent < keyIndent) return null;
		if (lines[i].trim().startsWith("- ") || lines[i].trim() === "-") {
			if (nextIndent < keyIndent) return null;
			return parseList(nextIndent);
		}
		if (nextIndent === keyIndent) return null;
		return parseMap(nextIndent);
	}

	function parseMap(mapIndent) {
		const obj = {};
		while (i < lines.length) {
			const line = lines[i];
			if (line.trim() === "" || line.trim().startsWith("#")) {
				i++;
				continue;
			}
			const ind = indentOf(line);
			if (ind < mapIndent) break;
			if (ind > mapIndent) throw new Error(`Frontmatter: indentación inesperada en la línea ${i + 1}: "${line}"`);
			const match = line.slice(ind).match(/^([A-Za-z0-9_$-]+)\s*:(.*)$/);
			if (!match) throw new Error(`Frontmatter: no entiendo la línea ${i + 1}: "${line}"`);
			obj[match[1]] = parseValueAfterKey(match[2], ind);
		}
		return obj;
	}

	function parseList(listIndent) {
		const arr = [];
		while (i < lines.length) {
			const line = lines[i];
			if (line.trim() === "") {
				i++;
				continue;
			}
			const ind = indentOf(line);
			const trimmed = line.trim();
			if (ind < listIndent || !(trimmed.startsWith("- ") || trimmed === "-")) break;
			if (ind > listIndent) throw new Error(`Frontmatter: indentación inesperada en la línea ${i + 1}`);
			const itemText = trimmed === "-" ? "" : trimmed.slice(2);
			const itemIndent = ind + 2;
			const kv = itemText.match(/^([A-Za-z0-9_$-]+)\s*:(.*)$/);
			if (kv && !/^["']/.test(itemText)) {
				// lista de mapas: "- q: ..." seguido de "  a: ..."
				const obj = {};
				obj[kv[1]] = parseValueAfterKey(kv[2], itemIndent);
				while (i < lines.length) {
					const next = lines[i];
					if (next.trim() === "") {
						i++;
						continue;
					}
					const nInd = indentOf(next);
					if (nInd !== itemIndent || next.trim().startsWith("- ")) break;
					const m = next.slice(nInd).match(/^([A-Za-z0-9_$-]+)\s*:(.*)$/);
					if (!m) throw new Error(`Frontmatter: no entiendo la línea ${i + 1}: "${next}"`);
					obj[m[1]] = parseValueAfterKey(m[2], itemIndent);
				}
				arr.push(obj);
			} else if (itemText === "") {
				i++;
				arr.push(parseMap(itemIndent));
			} else {
				arr.push(parseScalar(stripComment(itemText)));
				i++;
			}
		}
		return arr;
	}

	return parseMap(0);
}

export function splitFrontmatter(source) {
	const text = source.replace(/^﻿/, "").replace(/\r\n/g, "\n");
	const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) throw new Error("El archivo debe empezar con un bloque de frontmatter entre líneas ---");
	return { meta: parseFrontmatter(match[1]), body: match[2] };
}

// ---------------------------------------------------------------------------
// Markdown → Portable Text
// ---------------------------------------------------------------------------

class LinkRegistry {
	constructor() {
		this.defs = [];
	}
	add(href) {
		const key = `l${this.defs.length}`;
		this.defs.push({ _key: key, _type: "link", href });
		return key;
	}
}

function findClosing(text, token, from) {
	for (let j = from; j < text.length; j++) {
		if (text[j] === "\\") {
			j++;
			continue;
		}
		if (text.startsWith(token, j)) return j;
	}
	return -1;
}

/** Busca el "]" que cierra un "[" (admite corchetes anidados). */
function findLinkEnd(text, from) {
	let depth = 0;
	for (let j = from; j < text.length; j++) {
		const ch = text[j];
		if (ch === "\\") {
			j++;
			continue;
		}
		if (ch === "[") depth++;
		else if (ch === "]") {
			if (depth === 0) return j;
			depth--;
		}
	}
	return -1;
}

function parseInline(text, marks, links, out) {
	let buffer = "";
	const flush = () => {
		if (buffer) out.push({ text: buffer, marks: [...marks] });
		buffer = "";
	};
	let j = 0;
	while (j < text.length) {
		const ch = text[j];
		if (ch === "\\" && j + 1 < text.length && /[\\`*_[\]()#>!-]/.test(text[j + 1])) {
			buffer += text[j + 1];
			j += 2;
			continue;
		}
		if (ch === "`") {
			const end = findClosing(text, "`", j + 1);
			if (end > j) {
				flush();
				out.push({ text: text.slice(j + 1, end), marks: [...marks, "code"] });
				j = end + 1;
				continue;
			}
		}
		if (ch === "!" && text[j + 1] === "[") {
			throw new Error(`Imágenes en el cuerpo no soportadas ("${text.slice(j, j + 40)}…"): usa featured_image o descríbelo en texto.`);
		}
		if (ch === "[") {
			const close = findLinkEnd(text, j + 1);
			if (close > j && text[close + 1] === "(") {
				const parenEnd = findClosing(text, ")", close + 2);
				if (parenEnd > close) {
					let href = text.slice(close + 2, parenEnd).trim();
					href = href.replace(/\s+"[^"]*"$/, "").replace(/^<|>$/g, "");
					if (!href) throw new Error(`Enlace sin URL: "${text.slice(j, parenEnd + 1)}"`);
					flush();
					const key = links.add(href);
					parseInline(text.slice(j + 1, close), [...marks, key], links, out);
					j = parenEnd + 1;
					continue;
				}
			}
		}
		if (text.startsWith("**", j) || text.startsWith("__", j)) {
			const token = text.slice(j, j + 2);
			const end = findClosing(text, token, j + 2);
			if (end > j + 2) {
				flush();
				parseInline(text.slice(j + 2, end), [...marks, "strong"], links, out);
				j = end + 2;
				continue;
			}
		}
		if (ch === "*" || ch === "_") {
			const prev = text[j - 1] ?? " ";
			const next = text[j + 1] ?? " ";
			const opens = !/\s/.test(next) && (ch === "*" || !/[\p{L}\p{N}]/u.test(prev));
			if (opens) {
				let end = findClosing(text, ch, j + 1);
				while (end > -1 && ch === "_" && /[\p{L}\p{N}]/u.test(text[end + 1] ?? " ")) {
					end = findClosing(text, ch, end + 1);
				}
				if (end > j + 1 && !/\s/.test(text[end - 1])) {
					flush();
					parseInline(text.slice(j + 1, end), [...marks, "em"], links, out);
					j = end + 1;
					continue;
				}
			}
		}
		buffer += ch;
		j++;
	}
	flush();
}

function inlineToChildren(text, links) {
	const raw = [];
	parseInline(text, [], links, raw);
	const merged = [];
	for (const span of raw) {
		const prev = merged.at(-1);
		if (prev && prev.marks.join("|") === span.marks.join("|")) prev.text += span.text;
		else merged.push({ ...span });
	}
	return merged
		.filter((s) => s.text !== "")
		.map((s) => ({ _type: "span", text: s.text, marks: s.marks }));
}

function makeBlock(style, text, extra = {}) {
	const links = new LinkRegistry();
	const children = inlineToChildren(text.replace(/\s+/g, " ").trim(), links);
	if (children.length === 0) return null;
	return {
		_type: "block",
		style,
		markDefs: links.defs,
		children,
		...extra,
	};
}

export function markdownToPortableText(markdown) {
	const source = markdown.replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
	const lines = source.split("\n");
	const blocks = [];
	let paragraph = [];
	let quote = [];
	let listItem = null; // { type, level, text }

	const flushParagraph = () => {
		if (paragraph.length) {
			const block = makeBlock("normal", paragraph.join(" "));
			if (block) blocks.push(block);
		}
		paragraph = [];
	};
	const flushQuote = () => {
		if (quote.length) {
			const block = makeBlock("blockquote", quote.join(" "));
			if (block) blocks.push(block);
		}
		quote = [];
	};
	const flushList = () => {
		if (listItem) {
			const block = makeBlock("normal", listItem.text, { listItem: listItem.type, level: listItem.level });
			if (block) blocks.push(block);
		}
		listItem = null;
	};
	const flushAll = () => {
		flushParagraph();
		flushQuote();
		flushList();
	};

	lines.forEach((line, index) => {
		const lineNo = index + 1;
		const trimmed = line.trim();
		if (trimmed === "") {
			flushAll();
			return;
		}
		if (/^```/.test(trimmed)) throw new Error(`Línea ${lineNo}: bloques de código no soportados en artículos.`);
		if (/^\|.*\|$/.test(trimmed)) throw new Error(`Línea ${lineNo}: tablas Markdown no soportadas; usa una lista con negritas.`);
		if (/^<\/?[a-z][^>]*>/i.test(trimmed)) throw new Error(`Línea ${lineNo}: HTML no soportado: "${trimmed.slice(0, 40)}"`);
		if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
			flushAll();
			return; // separador horizontal: se omite
		}
		const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
		if (heading) {
			flushAll();
			const level = heading[1].length;
			if (level === 1) throw new Error(`Línea ${lineNo}: no uses "# H1" en el cuerpo; el título del frontmatter ya es el H1.`);
			if (level > 3) throw new Error(`Línea ${lineNo}: solo se admiten ## (h2) y ### (h3).`);
			const block = makeBlock(level === 2 ? "h2" : "h3", heading[2].replace(/\s+#+\s*$/, ""));
			if (block) blocks.push(block);
			return;
		}
		const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
		const numbered = line.match(/^(\s*)\d+[.)]\s+(.*)$/);
		if (bullet || numbered) {
			flushParagraph();
			flushQuote();
			flushList();
			const m = bullet ?? numbered;
			const level = Math.min(1 + Math.floor(m[1].replace(/\t/g, "  ").length / 2), 3);
			listItem = { type: bullet ? "bullet" : "number", level, text: m[2] };
			return;
		}
		if (trimmed.startsWith(">")) {
			flushParagraph();
			flushList();
			quote.push(trimmed.replace(/^>\s?/, ""));
			return;
		}
		if (listItem && /^\s{2,}/.test(line)) {
			listItem.text += ` ${trimmed}`; // continuación del ítem
			return;
		}
		flushList();
		flushQuote();
		paragraph.push(trimmed);
	});
	flushAll();
	return blocks;
}

// ---------------------------------------------------------------------------
// Ensamblado del post
// ---------------------------------------------------------------------------

function asList(value) {
	if (value === undefined || value === null || value === "") return [];
	if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
	return String(value)
		.split(",")
		.map((v) => v.trim())
		.filter(Boolean);
}

function localTimestamp(date = new Date()) {
	const pad = (n) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function normalizePublishedAt(value) {
	if (!value) return localTimestamp();
	const text = String(value).trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T09:00:00`;
	if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(text)) {
		const [d, t] = text.split(/[T ]/);
		return `${d}T${t.length === 5 ? `${t}:00` : t}`;
	}
	return text; // el validador avisará si el formato no es el esperado
}

function faqToBlocks(faq) {
	const blocks = [];
	for (const [index, item] of (faq ?? []).entries()) {
		const q = String(item?.q ?? item?.question ?? "").trim();
		const a = String(item?.a ?? item?.answer ?? "").trim();
		if (!q || !a) throw new Error(`faq[${index}] necesita "q" y "a"`);
		if (/\]\(|\*\*/.test(q + a)) throw new Error(`faq[${index}]: sin Markdown ni enlaces (el FAQ va al JSON-LD como texto plano)`);
		blocks.push({ _type: "block", style: "h3", markDefs: [], children: [{ _type: "span", text: q, marks: [] }] });
		blocks.push({ _type: "block", style: "normal", markDefs: [], children: [{ _type: "span", text: a, marks: [] }] });
	}
	return blocks;
}

const FAQ_HEADING = { es: "Preguntas frecuentes", en: "Frequently asked questions" };

function disclosureBlock(locale) {
	const link = DISCLOSURE_LINK[locale];
	return {
		_type: "block",
		style: "normal",
		markDefs: [{ _key: "l0", _type: "link", href: link.href }],
		children: [
			{ _type: "span", text: `${DISCLOSURE_TEXT[locale]} `, marks: ["em"] },
			{ _type: "span", text: link.text, marks: ["em", "l0"] },
			{ _type: "span", text: ".", marks: ["em"] },
		],
	};
}

export function buildPost(meta, body, { affiliates = loadAffiliates() } = {}) {
	const notes = [];
	const locale = String(meta.locale ?? "es").trim();
	if (!["es", "en"].includes(locale)) throw new Error(`locale debe ser "es" o "en" (recibí "${locale}")`);
	const title = String(meta.title ?? "").trim();
	if (!title) throw new Error("Falta title en el frontmatter");
	const slug = String(meta.slug ?? "").trim() || slugify(title);
	if (!meta.slug) notes.push(`slug generado desde el título: ${slug}`);
	const excerpt = String(meta.excerpt ?? meta.description ?? "").trim();
	if (!excerpt) throw new Error("Falta excerpt en el frontmatter (140–160 caracteres)");

	// "<!-- faq -->" en una línea sola marca dónde va la sección visible de preguntas frecuentes (por defecto, al final).
	const FAQ_MARKER = /^[ \t]*<!--\s*faq\s*-->[ \t]*$/im;
	const [beforeFaq, afterFaq = ""] = body.split(FAQ_MARKER);
	const hasFaqMarker = FAQ_MARKER.test(body);
	let content = markdownToPortableText(beforeFaq);
	const tail = markdownToPortableText(afterFaq);

	// Aviso de afiliados: si hay enlaces de afiliado y el texto no lo trae arriba, se antepone el estándar.
	const hasAffiliateLinks = [...content, ...tail].some((block) =>
		(block.markDefs ?? []).some((d) => matchAffiliate(d.href, affiliates) || looksLikeAffiliate(d.href, affiliates)),
	);
	if (hasAffiliateLinks) {
		const headIndex = content.findIndex((block, i) => i < 3 && DISCLOSURE_RE[locale].test(blockText(block)));
		if (headIndex === -1) {
			content = [disclosureBlock(locale), ...content];
			notes.push("se antepuso el aviso estándar de afiliados (no había uno en los 3 primeros bloques)");
		}
	}

	const faqItems = faqToBlocks(meta.faq);
	const faqInContent = meta.faq_in_content !== false;
	const alreadyHasFaq = [...content, ...tail].some(
		(block) => block.style === "h2" && /preguntas frecuentes|faq|frequently asked/i.test(blockText(block)),
	);
	if (faqItems.length && faqInContent && !alreadyHasFaq) {
		// Google exige que el FAQ marcado en JSON-LD también sea visible en la página.
		content.push({ _type: "block", style: "h2", markDefs: [], children: [{ _type: "span", text: FAQ_HEADING[locale], marks: [] }] });
		content.push(...structuredClone(faqItems));
		notes.push(`FAQ visible añadido ${hasFaqMarker ? "en <!-- faq -->" : "al final del contenido"} (${faqItems.length / 2} preguntas)`);
	}
	content.push(...tail);

	const image = meta.featured_image ?? {};
	const imageUrl = String(image.url ?? "").trim() || "https://tonyciencia.com/assets/og-default.webp";
	if (!image.url) notes.push("featured_image no definido: se usa /assets/og-default.webp (imagen genérica existente)");
	const extension = (imageUrl.split("?")[0].match(/\.(\w{3,4})$/) ?? [, "webp"])[1];

	const keyEntities = Array.isArray(meta.key_entities) ? meta.key_entities.join(", ") : String(meta.key_entities ?? "").trim();
	const data = {
		title,
		excerpt,
		featured_image: {
			$media: {
				url: imageUrl,
				alt: String(image.alt ?? "").trim() || title,
				filename: String(image.filename ?? "").trim() || `${slug}.${extension}`,
			},
		},
		content,
	};
	if (locale === "en" || meta.translation_of) data.translation_of = String(meta.translation_of ?? "").trim();
	data.schema_type = String(meta.schema_type ?? "BlogPosting").trim();
	data.key_entities = keyEntities;
	data.keywords = asList(meta.keywords);
	if (meta.image_prompt) data.image_prompt = String(meta.image_prompt).trim();
	data.faq_items = faqItems;
	data.external_id = String(meta.external_id ?? "").trim() || `content-agent:${locale}:${slug}`;
	data.source = String(meta.source ?? "").trim() || "claude-content-affiliate-manager";

	const post = {
		id: String(meta.id ?? "").trim() || `post-${slug}`,
		slug,
		status: String(meta.status ?? "draft").trim(),
		bylines: [{ byline: String(meta.byline ?? "byline-tony").trim() }],
		taxonomies: {
			category: asList(meta.category ?? meta.categories),
			tag: asList(meta.tag ?? meta.tags),
		},
		data,
		published_at: normalizePublishedAt(meta.published_at),
		locale,
	};
	if (post.taxonomies.tag.length === 0) delete post.taxonomies.tag;
	if (post.status !== "published") notes.push(`status "${post.status}": el post NO aparecerá en el sitio tras el merge hasta que sea "published"`);
	return { post, notes };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
	const args = { input: null, out: null, force: false, dryRun: false, check: true, pillar: false };
	for (let k = 0; k < argv.length; k++) {
		const a = argv[k];
		if (a === "--out") args.out = argv[++k];
		else if (a === "--force") args.force = true;
		else if (a === "--dry-run") args.dryRun = true;
		else if (a === "--no-check") args.check = false;
		else if (a === "--pillar") args.pillar = true;
		else if (a === "-h" || a === "--help") args.help = true;
		else if (!args.input) args.input = a;
		else throw new Error(`Argumento desconocido: ${a}`);
	}
	return args;
}

const USAGE = `Uso: pnpm post:new <articulo.md> [--out <ruta.json>] [--force] [--dry-run] [--no-check] [--pillar]
  Escribe content/posts/<locale>/<slug>.json y lo valida (pnpm post:check).
  --dry-run   imprime el JSON sin escribir
  --force     sobrescribe si el archivo ya existe
  --pillar    exige ≥ 1200 palabras al validar`;

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help || !args.input) {
		console.log(USAGE);
		process.exit(args.help ? 0 : 1);
	}
	const source = fs.readFileSync(args.input, "utf8");
	const { meta, body } = splitFrontmatter(source);
	const { post, notes } = buildPost(meta, body);
	const json = `${JSON.stringify(post, null, 2)}\n`;

	if (args.dryRun) {
		process.stdout.write(json);
	} else {
		const outPath = args.out ?? path.join(POSTS_DIR, post.locale, `${post.slug}.json`);
		if (fs.existsSync(outPath) && !args.force) {
			console.error(`Ya existe ${relativeToRepo(outPath)}. Usa --force para sobrescribir.`);
			process.exit(1);
		}
		fs.mkdirSync(path.dirname(outPath), { recursive: true });
		fs.writeFileSync(outPath, json, "utf8");
		console.log(`escrito: ${relativeToRepo(outPath)}`);
		for (const note of notes) console.log(`  nota: ${note}`);
		if (args.check) {
			const report = validatePost(outPath, { pillar: args.pillar });
			printReport(report);
			if (report.errors.length) process.exit(1);
		}
	}
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
	main().catch((error) => {
		console.error(`error: ${error.message}`);
		process.exit(1);
	});
}
