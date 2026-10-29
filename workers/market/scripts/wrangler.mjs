// Ejecuta wrangler SIEMPRE con -c wrangler.jsonc explícito.
// Motivo: el build del blog (Astro) deja ../../.wrangler/deploy/config.json y, sin -c, wrangler
// se confunde con ese archivo ajeno y se niega a correr.
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function wrangler(args, opts = {}) {
	return execFileSync("pnpm", ["exec", "wrangler", ...args, "-c", resolve(root, "wrangler.jsonc")], {
		cwd: root,
		stdio: opts.capture ? ["ignore", "pipe", "inherit"] : "inherit",
		encoding: "utf8",
	});
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		wrangler(process.argv.slice(2));
	} catch (err) {
		process.exit(typeof err.status === "number" ? err.status : 1);
	}
}
