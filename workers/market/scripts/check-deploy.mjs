#!/usr/bin/env node
// Chequeo previo a cada deploy (lo llaman pnpm deploy:preview|staging|production).
// Se niega a desplegar si la configuración del entorno es insegura o está incompleta.
import { resolve } from "node:path";
import { readJsonc } from "./jsonc.mjs";
import { root } from "./wrangler.mjs";

const target = process.argv[2];
if (!["preview", "staging", "production"].includes(target)) {
	console.error("Uso: node scripts/check-deploy.mjs preview|staging|production");
	process.exit(1);
}
const cfg = readJsonc(resolve(root, "wrangler.jsonc"));
const env = cfg.env?.[target];
const errors = [];
if (!env) errors.push(`No existe env.${target} en wrangler.jsonc`);
const vars = env?.vars ?? {};
const isProdHost = (h) => h === "tonyciencia.com" || h.endsWith(".tonyciencia.com");
let host = "";
try {
	host = new URL(vars.SITE_URL).hostname;
} catch {
	errors.push(`SITE_URL inválida en env.${target}`);
}

const expectedMode = target === "preview" ? "mock" : "live";
if (vars.MODE !== expectedMode) errors.push(`env.${target} debe tener MODE="${expectedMode}" (tiene "${vars.MODE}")`);
if (vars.MODE === "mock" && isProdHost(host)) errors.push("MODE=mock con SITE_URL de producción: PROHIBIDO");
if (target === "production" && vars.SITE_URL !== "https://tonyciencia.com") errors.push('production debe usar SITE_URL="https://tonyciencia.com"');
if (target !== "production" && isProdHost(host)) errors.push(`${target} no puede usar un dominio de producción`);
if (JSON.stringify(env ?? {}).includes("REEMPLAZAR_")) errors.push(`env.${target} todavía tiene valores REEMPLAZAR_… (IDs de D1 o subdominio). Ver HANDOFF.md paso 2.`);
for (const r of env?.routes ?? []) {
	const pattern = typeof r === "string" ? r : r.pattern;
	if (/market\*$/.test(pattern)) errors.push(`Ruta peligrosa "${pattern}": captura también /marketing-digital. Usa "tonyciencia.com/market" y "tonyciencia.com/market/*".`);
}
if (vars.MODE === "live" && !env?.r2_buckets?.some((b) => b.binding === "MARKET_FILES")) errors.push("live requiere el binding R2 MARKET_FILES");
if (vars.MODE === "live" && vars.EMAIL_PROVIDER === "cloudflare" && !env?.send_email?.some((b) => b.name === "EMAIL")) errors.push("EMAIL_PROVIDER=cloudflare requiere send_email EMAIL");
if (target !== "production" && vars.ALLOW_LIVE_PAYMENTS === "true") errors.push(`${target} no debe permitir cobros reales (ALLOW_LIVE_PAYMENTS)`);

if (errors.length) {
	console.error(`✘ Deploy de "${target}" bloqueado:\n- ${errors.join("\n- ")}`);
	process.exit(1);
}
console.log(`✔ Configuración de "${target}" OK (MODE=${vars.MODE}, SITE_URL=${vars.SITE_URL}).`);
if (vars.MODE === "live") console.log("  Recuerda: los secretos se cargan con `pnpm exec wrangler secret put NOMBRE --env " + target + " -c wrangler.jsonc` (HANDOFF.md).");
