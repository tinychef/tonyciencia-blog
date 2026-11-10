import { env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudflareTurnstileVerifier } from "../src/adapters/turnstile/cloudflare";
import { loadConfig } from "../src/config";
import type { Env } from "../src/env";
import { call, count, uid } from "./helpers";

/** Turnstile en modo LIVE con siteverify interceptado (fetch). No prueba la cuenta real de Cloudflare. */
const HOST = "https://market-staging.example.workers.dev";

function liveEnv(extra: Partial<Env> = {}): Env {
	return {
		...env,
		MODE: "live",
		SITE_URL: HOST,
		SESSION_SECRET: "secreto-de-sesion-de-prueba-con-mas-de-32-caracteres",
		GOOGLE_CLIENT_ID: "cliente-prueba.apps.googleusercontent.com",
		GOOGLE_CLIENT_SECRET: "secreto-google",
		STRIPE_SECRET_KEY: "sk_test_falsa",
		STRIPE_WEBHOOK_SECRET: "whsec_prueba_live",
		ADMIN_EMAIL: "dueno@example.com",
		ADMIN_COPY_EMAIL: "copias@example.com",
		EMAIL_PROVIDER: "cloudflare",
		EMAIL: { send: async () => ({ messageId: "cf_1" }) } as unknown as SendEmail,
		...extra,
	} as Env;
}

/** Intercepta siteverify; cualquier otro fetch falla la prueba. Devuelve los cuerpos enviados. */
function siteverify(reply: Record<string, unknown> | Error, status = 200) {
	vi.restoreAllMocks();
	const calls: URLSearchParams[] = [];
	vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
		const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
		if (!url.startsWith("https://challenges.cloudflare.com/turnstile/v0/siteverify")) throw new Error(`fetch inesperado: ${url}`);
		calls.push(new URLSearchParams(String(init?.body)));
		if (reply instanceof Error) throw reply;
		return new Response(JSON.stringify(reply), { status, headers: { "content-type": "application/json" } });
	});
	return calls;
}

afterEach(() => vi.restoreAllMocks());

describe("verificador real de Turnstile (siteverify)", () => {
	const v = new CloudflareTurnstileVerifier("secreto-turnstile", new Set(["tonyciencia.com"]));
	const good = { success: true, action: "contact", hostname: "tonyciencia.com" };

	it("acepta solo éxito + acción + host esperados, y manda secreto, token e IP", async () => {
		const calls = siteverify(good);
		expect(await v.verify("tok", "contact", "1.2.3.4")).toEqual({ ok: true });
		expect(calls[0]?.get("secret")).toBe("secreto-turnstile");
		expect(calls[0]?.get("response")).toBe("tok");
		expect(calls[0]?.get("remoteip")).toBe("1.2.3.4");
	});

	it("falla cerrado: otra acción, otro host, success=false, HTTP malo o red caída", async () => {
		siteverify({ ...good, action: "newsletter" });
		expect(await v.verify("tok", "contact", null)).toEqual({ ok: false, reason: "action-mismatch" });
		siteverify({ ...good, hostname: "localhost" });
		expect(await v.verify("tok", "contact", null)).toEqual({ ok: false, reason: "hostname-mismatch" });
		siteverify({ success: false, "error-codes": ["timeout-or-duplicate"] });
		expect(await v.verify("tok", "contact", null)).toEqual({ ok: false, reason: "timeout-or-duplicate" });
		siteverify(good, 500);
		expect((await v.verify("tok", "contact", null)).ok).toBe(false);
		siteverify(new Error("sin red"));
		expect(await v.verify("tok", "contact", null)).toEqual({ ok: false, reason: "siteverify-unreachable" });
	});

	it("sin token (o demasiado largo) ni siquiera llama a Cloudflare", async () => {
		const calls = siteverify(good);
		expect((await v.verify(undefined, "contact", null)).ok).toBe(false);
		expect((await v.verify("", "contact", null)).ok).toBe(false);
		expect((await v.verify("x".repeat(2049), "contact", null)).ok).toBe(false);
		expect(calls).toHaveLength(0);
	});
});

describe("configuración de Turnstile en live", () => {
	it("por defecto acepta el host de SITE_URL y nunca localhost", () => {
		const a = loadConfig(liveEnv({ TURNSTILE_SECRET: "s" }));
		expect(a.ok && a.config.turnstileHostnames).toEqual(["market-staging.example.workers.dev"]);
		const b = loadConfig(liveEnv({ TURNSTILE_SECRET: "s", TURNSTILE_HOSTNAMES: "tonyciencia.com, localhost,127.0.0.1" }));
		expect(b.ok && b.config.turnstileHostnames).toEqual(["tonyciencia.com"]);
		const c = loadConfig(liveEnv());
		expect(c.ok && c.config.turnstileSecret).toBeNull();
	});

	it("el formulario de contacto en live exige un token que siteverify acepte", async () => {
		const e = liveEnv({ TURNSTILE_SECRET: "secreto-turnstile" });
		const marca = uid();
		const post = (token: string) =>
			call(
				"/market/contacto",
				{
					method: "POST",
					headers: { origin: HOST, "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "10.5.0.9" },
					body: new URLSearchParams({ name: "Ana", email: "ana@example.com", message: `hola ${marca}`, elapsed: "8000", "cf-turnstile-response": token }),
				},
				e,
				HOST,
			);
		siteverify({ success: false, "error-codes": ["invalid-input-response"] });
		expect((await post("falso")).headers.get("location")).toBe("/contacto?verificacion=1#formulario");
		siteverify({ success: true, action: "contact", hostname: "market-staging.example.workers.dev" });
		expect((await post("bueno")).headers.get("location")).toBe("/contacto?enviado=1#formulario");
		expect(await count("SELECT COUNT(*) AS n FROM email_outbox WHERE kind = 'contact' AND instr(text, ?1) > 0", marca)).toBe(1);
	});
});
