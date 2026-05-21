import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const root = (...segments) => path.join(cwd, ...segments);

const sitePath = root("seed", "base", "site.json");
const pagesPath = root("seed", "base", "pages.json");
const legalPagesPath = root("seed", "base", "legal-pages.json");
const postsEsDir = root("content", "posts", "es");
const postsEnDir = root("content", "posts", "en");
const outPath = root("seed", "seed.json");

const requiredPostFields = [
	"id",
	"slug",
	"status",
	"locale",
	"data",
	"published_at",
];

const requiredDataFields = [
	"title",
	"excerpt",
	"content",
	"featured_image",
	"external_id",
	"source",
];

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readDirJson(dirPath) {
	if (!fs.existsSync(dirPath)) return [];

	return fs
		.readdirSync(dirPath)
		.filter((entry) => entry.endsWith(".json"))
		.sort((a, b) => a.localeCompare(b))
		.map((entry) => readJson(path.join(dirPath, entry)));
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function validatePost(post, taxonomiesByName, spanishSlugs) {
	for (const field of requiredPostFields) {
		assert(post[field] !== undefined, `Post ${post.slug ?? "<sin-slug>"}: falta "${field}"`);
	}

	assert(post.locale === "es" || post.locale === "en", `Post ${post.slug}: locale inválido "${post.locale}"`);
	for (const field of requiredDataFields) {
		assert(post.data?.[field] !== undefined, `Post ${post.slug}: falta data.${field}`);
	}

	assert(typeof post.data.title === "string" && post.data.title.trim(), `Post ${post.slug}: title requerido`);
	assert(typeof post.data.excerpt === "string" && post.data.excerpt.trim(), `Post ${post.slug}: excerpt requerido`);
	assert(Array.isArray(post.data.content), `Post ${post.slug}: content debe ser un array PortableText`);
	assert(typeof post.data.external_id === "string" && post.data.external_id.trim(), `Post ${post.slug}: external_id requerido`);
	assert(typeof post.data.source === "string" && post.data.source.trim(), `Post ${post.slug}: source requerido`);
	assert(
		typeof post.data.featured_image === "object" && post.data.featured_image !== null,
		`Post ${post.slug}: featured_image requerido`,
	);

	if (post.locale === "en") {
		assert(
			typeof post.data.translation_of === "string" && post.data.translation_of.trim(),
			`Post ${post.slug}: translation_of requerido para locale en`,
		);
		assert(
			spanishSlugs.has(post.data.translation_of),
			`Post ${post.slug}: translation_of "${post.data.translation_of}" no existe en ES`,
		);
	}

	if (post.taxonomies) {
		for (const [taxonomyName, termSlugs] of Object.entries(post.taxonomies)) {
			const termSet = taxonomiesByName.get(taxonomyName);
			assert(termSet, `Post ${post.slug}: taxonomía desconocida "${taxonomyName}"`);
			assert(Array.isArray(termSlugs), `Post ${post.slug}: taxonomía "${taxonomyName}" debe ser array`);

			for (const termSlug of termSlugs) {
				assert(
					termSet.has(termSlug),
					`Post ${post.slug}: término "${termSlug}" no existe en taxonomía "${taxonomyName}"`,
				);
			}
		}
	}
}

function sortPosts(posts) {
	return posts.toSorted((a, b) => {
		if (a.locale !== b.locale) return a.locale.localeCompare(b.locale);
		return a.slug.localeCompare(b.slug);
	});
}

function buildSeed() {
	const site = readJson(sitePath);
	const pages = readJson(pagesPath);
	const legalPages = readJson(legalPagesPath);
	const posts = sortPosts([...readDirJson(postsEsDir), ...readDirJson(postsEnDir)]);
	const seenSlugs = new Set();
	const seenExternalIds = new Set();

	const taxonomiesByName = new Map(
		(site.taxonomies ?? []).map((taxonomy) => [
			taxonomy.name,
			new Set((taxonomy.terms ?? []).map((term) => term.slug)),
		]),
	);

	const spanishSlugs = new Set(posts.filter((post) => post.locale === "es").map((post) => post.slug));

	for (const post of posts) {
		validatePost(post, taxonomiesByName, spanishSlugs);
		assert(!seenSlugs.has(post.slug), `Slug duplicado: "${post.slug}"`);
		seenSlugs.add(post.slug);
		assert(!seenExternalIds.has(post.data.external_id), `external_id duplicado: "${post.data.external_id}"`);
		seenExternalIds.add(post.data.external_id);
	}

	return {
		...site,
		content: {
			pages,
			posts,
			legal_pages: legalPages,
		},
	};
}

function writeSeed(seed) {
	const output = `${JSON.stringify(seed, null, 2)}\n`;
	fs.writeFileSync(outPath, output, "utf8");
}

const seed = buildSeed();
writeSeed(seed);
console.log(`seed generado: ${path.relative(cwd, outPath)}`);
