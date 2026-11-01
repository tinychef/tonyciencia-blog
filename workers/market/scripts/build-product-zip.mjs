#!/usr/bin/env node
// Arma el ZIP vendible de un producto desde su repositorio y fija su SHA-256 en provision/manifest.json.
//
//   node scripts/build-product-zip.mjs <slug> [--out <carpeta>]
//
// - Usa `git archive` sobre el commit indicado en provision/packages.json: sin .git, sin archivos ignorados y
//   con bytes reproducibles (mismo commit → mismo hash).
// - `exclude` deja fuera rutas (pathspec de git) que no deben venderse.
// - Después se sube con:  curl -X PUT --data-binary @<zip> -H 'content-type: application/zip' https://tonyciencia.com/market/provision/<slug>
//   (el Worker solo acepta ese archivo exacto; ver src/routes/provision.ts y provision/README.md).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
const outIdx = process.argv.indexOf("--out");
const outDir = resolve(outIdx > 0 ? process.argv[outIdx + 1] : join(root, ".wrangler/products"));
const pkgs = JSON.parse(readFileSync(join(root, "provision/packages.json"), "utf8")).packages;
const pkg = pkgs.find((p) => p.slug === slug);
if (!pkg) {
	console.error(`Uso: node scripts/build-product-zip.mjs <${pkgs.map((p) => p.slug).join("|")}>`);
	process.exit(1);
}
const repo = resolve(root, pkg.localPath);
const commit = execFileSync("git", ["-C", repo, "rev-parse", pkg.ref], { encoding: "utf8" }).trim();
mkdirSync(outDir, { recursive: true });
const out = join(outDir, pkg.fileName);
const spec = pkg.exclude.map((e) => `:(exclude)${e}`);
execFileSync("git", ["-C", repo, "archive", "--format=zip", `--prefix=${pkg.prefix}`, "-o", out, commit, "--", ".", ...spec]);
const buf = readFileSync(out);
const sha256 = createHash("sha256").update(buf).digest("hex");
const size = statSync(out).size;

const manifestPath = join(root, "provision/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const entry = { slug, sha256, size, fileName: pkg.fileName, contentType: "application/zip", activate: pkg.activate, repo: pkg.repo, commit };
manifest.files = [...(manifest.files ?? []).filter((f) => f.slug !== slug), entry].sort((a, b) => a.slug.localeCompare(b.slug));
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`✓ ${out}\n  ${size} bytes · sha256 ${sha256}\n  ${pkg.repo}@${commit.slice(0, 12)} → provision/manifest.json`);
