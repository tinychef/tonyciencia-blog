#!/usr/bin/env node
// CLI de administración (alternativa al panel /market/admin), pensada para staging/production.
// Usa wrangler con TUS credenciales de Cloudflare: no necesita ninguna clave en el repo.
//
//   pnpm admin list                         --env staging|production
//   pnpm admin orders                       --env staging|production
//   pnpm admin upload  <slug> <archivo>     --env staging|production   (sube a R2 y lo asigna al producto)
//   pnpm admin text    <slug> <archivo.md>  --env …  [--title "…"] [--summary "…"]
//   pnpm admin price   <slug> <usd>         --env …   (ej. 77 o 77.50)
//   pnpm admin activate|deactivate <slug>   --env …
//
// Formato de la descripción (archivo .md/.txt): párrafos separados por línea en blanco,
// "## " al inicio = subtítulo, líneas que empiezan con "- " = lista.
import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { wrangler } from "./wrangler.mjs";

const BUCKETS = { staging: "tonyciencia-market-files-staging", production: "tonyciencia-market-files" };
const argv = process.argv.slice(2);
const flag = (name) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : undefined;
};
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
const [cmd, ...rest] = positional;
const env = flag("env");

function fail(msg) {
	console.error(`✘ ${msg}`);
	process.exit(1);
}
if (!cmd) fail("Falta el comando. Ver la cabecera de scripts/admin-cli.mjs.");
if (!["staging", "production"].includes(env ?? "")) fail("Indica --env staging o --env production (en maqueta usa el panel /market/admin).");

const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const needSlug = (s) => (SLUG_RE.test(s ?? "") ? s : fail(`Slug inválido: ${s}`));

function sql(command, { json = false } = {}) {
	const out = wrangler(["d1", "execute", "MARKET_DB", "--remote", "--env", env, "--command", command, ...(json ? ["--json"] : [])], { capture: json });
	return json ? JSON.parse(out)[0]?.results ?? [] : null;
}

function safeName(n) {
	return (
		n
			.normalize("NFKD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/[^A-Za-z0-9._-]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 120) || "archivo.bin"
	);
}

const now = Date.now();
switch (cmd) {
	case "list":
		console.table(sql("SELECT slug, title, kind, price_cents, active, file_key, download_limit FROM products ORDER BY sort_order", { json: true }));
		break;
	case "orders":
		console.table(
			sql(
				"SELECT o.created_at, o.customer_email, p.slug, o.status, o.amount_cents, o.provider_session_id FROM orders o JOIN products p ON p.id = o.product_id ORDER BY o.created_at DESC LIMIT 50",
				{ json: true },
			).map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() })),
		);
		break;
	case "upload": {
		const slug = needSlug(rest[0]);
		const file = rest[1] ?? fail("Falta la ruta del archivo.");
		const size = statSync(file).size;
		const name = safeName(basename(file));
		const key = `products/${slug}/${now}-${name}`;
		const type = name.endsWith(".zip") ? "application/zip" : name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
		console.log(`Subiendo ${file} (${(size / 1024 / 1024).toFixed(2)} MB) a R2 ${BUCKETS[env]}/${key}…`);
		wrangler(["r2", "object", "put", `${BUCKETS[env]}/${key}`, "--file", file, "--content-type", type, "--remote"]);
		sql(`UPDATE products SET file_key = ${q(key)}, file_name = ${q(name)}, file_size = ${size}, updated_at = ${now} WHERE slug = ${q(slug)}`);
		console.log(`✔ Archivo asignado a «${slug}». Actívalo con: pnpm admin activate ${slug} --env ${env}`);
		break;
	}
	case "text": {
		const slug = needSlug(rest[0]);
		const file = rest[1] ?? fail("Falta el archivo con la descripción.");
		const description = readFileSync(file, "utf8").replace(/\r\n?/g, "\n").trim();
		if (description.length > 20000) fail("La descripción supera 20000 caracteres.");
		const sets = [`description = ${q(description)}`, `updated_at = ${now}`];
		const title = flag("title");
		const summary = flag("summary");
		if (title) sets.push(`title = ${q(title.slice(0, 140))}`);
		if (summary) sets.push(`summary = ${q(summary.slice(0, 300))}`);
		sql(`UPDATE products SET ${sets.join(", ")} WHERE slug = ${q(slug)}`);
		console.log(`✔ Texto actualizado en «${slug}».`);
		break;
	}
	case "price": {
		const slug = needSlug(rest[0]);
		const m = /^(\d{1,5})(?:\.(\d{1,2}))?$/.exec(rest[1] ?? "");
		if (!m) fail("Precio inválido (ej. 77 o 77.50).");
		const cents = Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
		if (cents < 50) fail("Mínimo 0.50 USD.");
		sql(`UPDATE products SET price_cents = ${cents}, updated_at = ${now} WHERE slug = ${q(slug)} AND kind = 'paid'`);
		console.log(`✔ Precio de «${slug}»: ${cents} centavos.`);
		break;
	}
	case "activate":
	case "deactivate": {
		const slug = needSlug(rest[0]);
		if (cmd === "activate") {
			const [row] = sql(`SELECT file_key FROM products WHERE slug = ${q(slug)}`, { json: true });
			if (!row) fail(`No existe «${slug}».`);
			if (!row.file_key) fail("No se puede activar sin archivo entregable. Primero: pnpm admin upload …");
		}
		sql(`UPDATE products SET active = ${cmd === "activate" ? 1 : 0}, updated_at = ${now} WHERE slug = ${q(slug)}`);
		console.log(`✔ «${slug}» ${cmd === "activate" ? "activado" : "desactivado"}.`);
		break;
	}
	default:
		fail(`Comando desconocido: ${cmd}`);
}
