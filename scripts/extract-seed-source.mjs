import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const root = (...segments) => path.join(cwd, ...segments);

const sourceSeedPath = root("seed", "seed.json");
const sourceSeed = JSON.parse(fs.readFileSync(sourceSeedPath, "utf8"));

const outDirs = [
	root("seed", "base"),
	root("content", "posts", "es"),
	root("content", "posts", "en"),
];

for (const dir of outDirs) {
	fs.mkdirSync(dir, { recursive: true });
}

const {
	content = {},
	...site
} = sourceSeed;

const pages = content.pages ?? [];
const legalPages = content.legal_pages ?? [];
const posts = content.posts ?? [];

fs.writeFileSync(root("seed", "base", "site.json"), `${JSON.stringify(site, null, 2)}\n`, "utf8");
fs.writeFileSync(root("seed", "base", "pages.json"), `${JSON.stringify(pages, null, 2)}\n`, "utf8");
fs.writeFileSync(
	root("seed", "base", "legal-pages.json"),
	`${JSON.stringify(legalPages, null, 2)}\n`,
	"utf8",
);

for (const post of posts) {
	const locale = post.locale === "en" ? "en" : "es";
	const filePath = root("content", "posts", locale, `${post.slug}.json`);
	fs.writeFileSync(filePath, `${JSON.stringify(post, null, 2)}\n`, "utf8");
}

console.log("fuentes extraídas desde seed/seed.json");
