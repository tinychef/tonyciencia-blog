import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { isProductionHostname, loadConfig, mockInProductionError } from "../src/config";
import type { Env } from "../src/env";
import { call } from "./helpers";

const liveSecrets = {
	SESSION_SECRET: "s".repeat(40),
	GOOGLE_CLIENT_ID: "cliente.apps.googleusercontent.com",
	GOOGLE_CLIENT_SECRET: "secreto-google",
	STRIPE_SECRET_KEY: "sk_test_falsa",
	STRIPE_WEBHOOK_SECRET: "whsec_falso",
	ADMIN_EMAIL: "dueno@example.com",
	ADMIN_COPY_EMAIL: "copias@example.com",
	EMAIL_PROVIDER: "cloudflare",
	EMAIL: { send: async () => ({ messageId: "x" }) } as unknown as SendEmail,
};

describe("MODE=mock se niega a arrancar en producción", () => {
	it("detecta los dominios de producción", () => {
		for (const h of ["tonyciencia.com", "www.tonyciencia.com", "TONYCIENCIA.COM", "adsinfinitos.tonyciencia.com", "tonyciencia.com."]) {
			expect(isProductionHostname(h), h).toBe(true);
		}
		for (const h of ["localhost", "tonyciencia-market-preview.cuenta.workers.dev", "tonyciencia.com.evil.example", "nottonyciencia.com"]) {
			expect(isProductionHostname(h), h).toBe(false);
		}
	});

	it("el arranque (sin petición) falla con SITE_URL de producción", () => {
		expect(mockInProductionError({ MODE: "mock", SITE_URL: "https://tonyciencia.com" })).toMatch(/no arranca/);
		expect(mockInProductionError({ MODE: "mock", SITE_URL: "https://www.tonyciencia.com/market" })).toMatch(/no arranca/);
		expect(mockInProductionError({ MODE: "mock", SITE_URL: "https://tienda.example", PRODUCTION_HOSTNAMES: "tienda.example" })).toMatch(/no arranca/);
		expect(mockInProductionError({ MODE: "mock", SITE_URL: "http://localhost:8787" })).toBeNull();
		expect(mockInProductionError({ MODE: "live", SITE_URL: "https://tonyciencia.com" })).toBeNull();
	});

	it("loadConfig rechaza mock + SITE_URL de producción", () => {
		const r = loadConfig({ ...env, MODE: "mock", SITE_URL: "https://tonyciencia.com" } as Env);
		expect(r.ok).toBe(false);
	});

	it("una petición con Host de producción en mock recibe 503 aunque SITE_URL sea local", async () => {
		const res = await call("/market", {}, env, "https://tonyciencia.com");
		expect(res.status).toBe(503);
		expect(await res.text()).toMatch(/se niega a arrancar/);
		const www = await call("/market/auth/dev?state=abcdefghijklmnop", {}, env, "https://www.tonyciencia.com");
		expect(www.status).toBe(503);
	});

	it("con configuración insegura no se sirve NINGUNA ruta (ni el login falso ni el pago simulado)", async () => {
		const bad = { ...env, MODE: "mock", SITE_URL: "https://tonyciencia.com" } as Env;
		for (const path of ["/market", "/market/auth/dev?state=abcdefghijklmnop", "/market/maqueta/pago/cs_mock_x", "/dev/correos"]) {
			const res = await call(path, {}, bad, "https://tonyciencia.com");
			expect(res.status, path).toBe(503);
		}
	});

	it("MODE inválido o ausente no arranca", async () => {
		expect(loadConfig({ ...env, MODE: "produccion" } as Env).ok).toBe(false);
		expect(loadConfig({ ...env, MODE: undefined } as Env).ok).toBe(false);
		const res = await call("/market", {}, { ...env, MODE: "" } as Env);
		expect(res.status).toBe(503);
	});
});

describe("live falla cerrado", () => {
	const base = { ...env, MODE: "live", SITE_URL: "https://staging.example.workers.dev", ...liveSecrets } as Env;

	it("arranca con todo configurado", () => {
		const r = loadConfig(base);
		expect(r.ok, JSON.stringify(r)).toBe(true);
	});

	it("faltan claves → no arranca", () => {
		for (const k of ["SESSION_SECRET", "GOOGLE_CLIENT_ID", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "ADMIN_EMAIL", "ADMIN_COPY_EMAIL", "EMAIL", "MARKET_FILES"] as const) {
			const r = loadConfig({ ...base, [k]: undefined } as Env);
			expect(r.ok, k).toBe(false);
		}
	});

	it("EMAIL_PROVIDER=mock no se permite en live", () => {
		expect(loadConfig({ ...base, EMAIL_PROVIDER: "mock" } as Env).ok).toBe(false);
	});

	it("una clave sk_live_ exige ALLOW_LIVE_PAYMENTS=true (evita cobros reales por accidente)", () => {
		const r = loadConfig({ ...base, STRIPE_SECRET_KEY: "sk_live_falsa" } as Env);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors.join(" ")).toMatch(/ALLOW_LIVE_PAYMENTS/);
		expect(loadConfig({ ...base, STRIPE_SECRET_KEY: "sk_live_falsa", ALLOW_LIVE_PAYMENTS: "true" } as Env).ok).toBe(true);
	});

	it("en live las herramientas de maqueta no existen (404)", async () => {
		const host = "https://staging.example.workers.dev";
		for (const path of ["/dev/correos", "/market/auth/dev?state=abcdefghijklmnop", "/market/maqueta/pago/cs_mock_x"]) {
			const res = await call(path, {}, base, host);
			expect(res.status, path).toBe(404);
		}
	});
});
