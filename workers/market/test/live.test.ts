import { env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { identityFromIdToken } from "../src/adapters/auth/google";
import { signStripePayload } from "../src/adapters/payments/stripe-signature";
import { presignUrl } from "../src/adapters/storage/presign";
import type { Env } from "../src/env";
import { base64UrlEncode } from "../src/lib/crypto";
import { call, createProduct, one, uid, withCsrf, type Session } from "./helpers";

/**
 * Integración del modo LIVE con las dependencias externas simuladas a nivel de red:
 * Google (token endpoint) y Stripe (API) vía fetch interceptado; R2 = bucket local de Miniflare;
 * Cloudflare Email Sending = binding falso con la API documentada. Lo que NO prueba: las cuentas reales.
 */
const HOST = "https://market-staging.example.workers.dev";
const CLIENT_ID = "cliente-prueba.apps.googleusercontent.com";

function fakeEmailBinding() {
	const sent: Array<{ to: string; subject: string; text: string }> = [];
	return { sent, binding: { send: async (m: { to: string; subject: string; text: string }) => (sent.push(m), { messageId: `cf_${sent.length}` }) } as unknown as SendEmail };
}

function liveEnv(extra: Partial<Env> = {}) {
	const mail = fakeEmailBinding();
	const e = {
		...env,
		MODE: "live",
		SITE_URL: HOST,
		SESSION_SECRET: "secreto-de-sesion-de-prueba-con-mas-de-32-caracteres",
		GOOGLE_CLIENT_ID: CLIENT_ID,
		GOOGLE_CLIENT_SECRET: "secreto-google",
		STRIPE_SECRET_KEY: "sk_test_falsa",
		STRIPE_WEBHOOK_SECRET: "whsec_prueba_live",
		ADMIN_EMAIL: "dueno@example.com",
		ADMIN_COPY_EMAIL: "copias@example.com",
		EMAIL_PROVIDER: "cloudflare",
		EMAIL: mail.binding,
		...extra,
	} as Env;
	return { e, mail };
}

const jwt = (claims: Record<string, unknown>) =>
	`${base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64UrlEncode(JSON.stringify(claims))}.firma`;

const live = (path: string, init: RequestInit, e: Env) => call(path, init, e, HOST);

function cookie(res: Response, name: string) {
	return res.headers.getSetCookie().map((c) => c.split(";")[0]!).find((c) => c.startsWith(`${name}=`))!;
}

/** Login por el flujo real de Google con el token endpoint interceptado. */
async function googleLogin(e: Env, email: string): Promise<Session> {
	const start = await live("/market/auth/start?next=/market/mis-compras", { headers: { "cf-connecting-ip": `10.9.${Math.floor(Math.random() * 250)}.1` } }, e);
	expect(start.status).toBe(302);
	const google = new URL(start.headers.get("location")!);
	expect(google.origin + google.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
	expect(google.searchParams.get("redirect_uri")).toBe(`${HOST}/market/auth/callback`);
	expect(google.searchParams.get("scope")).toBe("openid email profile");
	expect(google.searchParams.get("code_challenge_method")).toBe("S256");
	const setCookie = start.headers.getSetCookie().find((c) => c.startsWith("tcm_login="))!;
	expect(setCookie).toMatch(/HttpOnly/i);
	expect(setCookie).toMatch(/Secure/i);
	expect(setCookie).toMatch(/SameSite=Lax/i);

	const nonce = google.searchParams.get("nonce")!;
	const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
		const url = String(input instanceof Request ? input.url : input);
		expect(url).toBe("https://oauth2.googleapis.com/token");
		const body = new URLSearchParams(String(init?.body));
		expect(body.get("code")).toBe("codigo-de-google");
		expect(body.get("code_verifier")).toBeTruthy();
		expect(body.get("client_secret")).toBe("secreto-google");
		return Response.json({
			id_token: jwt({ iss: "https://accounts.google.com", aud: CLIENT_ID, exp: Math.floor(Date.now() / 1000) + 600, nonce, email, email_verified: true, name: "Cliente Live", picture: "https://x/foto.png" }),
		});
	});
	const cb = await live(`/market/auth/callback?code=codigo-de-google&state=${google.searchParams.get("state")}`, { headers: { cookie: cookie(start, "tcm_login") } }, e);
	spy.mockRestore();
	expect(cb.status).toBe(303);
	const session = cb.headers.getSetCookie().find((c) => c.startsWith("tcm_session="))!;
	expect(session).toMatch(/HttpOnly/i);
	expect(session).toMatch(/Secure/i);
	expect(session).toMatch(/SameSite=Lax/i);
	return withCsrf(session.split(";")[0]!, email, e, HOST);
}

function form(path: string, s: Session, data: Record<string, string>, e: Env) {
	return live(path, { method: "POST", headers: { origin: HOST, cookie: s.cookie, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrf: s.csrf, ...data }) }, e);
}

afterEach(() => vi.restoreAllMocks());

describe("modo live de punta a punta (externos simulados)", () => {
	it("Google → Stripe Checkout → webhook firmado → correos por Cloudflare → descarga desde R2", async () => {
		const { e, mail } = liveEnv();
		const key = `products/live-${uid()}/anuncios.zip`;
		await env.MARKET_FILES!.put(key, "CONTENIDO DEL ZIP EN R2");
		const p = await createProduct({ priceCents: 7700, fileKey: key });
		const email = `live-${uid()}@example.com`;
		const s = await googleLogin(e, email);
		const user = await one<Record<string, unknown>>("SELECT * FROM users WHERE email = ?1", email);
		expect(user?.name).toBe("Cliente Live");
		expect(JSON.stringify(user)).not.toContain("foto.png"); // solo correo y nombre

		const stripeCalls: URLSearchParams[] = [];
		vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
			expect(String(input)).toBe("https://api.stripe.com/v1/checkout/sessions");
			stripeCalls.push(new URLSearchParams(String(init?.body)));
			return Response.json({ id: `cs_test_${uid()}`, url: "https://checkout.stripe.com/c/pay/cs_test_x" });
		});
		const buy = await form(`/market/producto/${p.slug}/comprar`, s, { price: "1" }, e);
		expect(buy.status).toBe(303);
		expect(buy.headers.get("location")).toBe("https://checkout.stripe.com/c/pay/cs_test_x");
		expect(stripeCalls[0]!.get("line_items[0][price_data][unit_amount]")).toBe("7700");
		expect(stripeCalls[0]!.get("success_url")).toMatch(new RegExp(`^${HOST}/market/pago/exito\\?pedido=`));
		vi.restoreAllMocks();

		const order = (await one<{ id: string; provider_session_id: string }>("SELECT o.* FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email = ?1", email))!;
		const event = JSON.stringify({
			id: `evt_${uid()}`,
			type: "checkout.session.completed",
			data: { object: { id: order.provider_session_id, client_reference_id: order.id, payment_status: "paid", amount_subtotal: 7700, amount_total: 7700, currency: "usd", payment_intent: "pi_live_1", customer_details: { email } } },
		});
		// La firma con el secreto público de la maqueta NO sirve en live.
		const mockSig = await signStripePayload("whsec_maqueta_no_es_un_secreto_real", event);
		expect((await live("/market/webhooks/pagos", { method: "POST", headers: { "stripe-signature": mockSig }, body: event }, e)).status).toBe(400);
		const hook = await live("/market/webhooks/pagos", { method: "POST", headers: { "stripe-signature": await signStripePayload("whsec_prueba_live", event) }, body: event }, e);
		expect(hook.status).toBe(200);
		expect((await one<{ status: string }>("SELECT status FROM orders WHERE id = ?1", order.id))?.status).toBe("paid");

		// Dos mensajes separados por Cloudflare Email Sending: cliente + copia admin.
		expect(mail.sent.map((m) => m.to).sort()).toEqual(["copias@example.com", email].sort());
		const link = mail.sent.find((m) => m.to === email)!.text.match(/Descargar: (\S+)/)![1]!;
		expect(link.startsWith(`${HOST}/market/descargas/`)).toBe(true);
		// Repetir el webhook no reenvía correos.
		await live("/market/webhooks/pagos", { method: "POST", headers: { "stripe-signature": await signStripePayload("whsec_prueba_live", event) }, body: event }, e);
		expect(mail.sent).toHaveLength(2);

		// Descarga: URL firmada por el Worker que transmite desde R2 privado.
		const ent = (await one<{ id: string }>("SELECT id FROM entitlements WHERE order_id = ?1", order.id))!;
		const dl = await form(`/market/descargas/${ent.id}`, s, {}, e);
		expect(dl.status).toBe(303);
		const fileUrl = new URL(dl.headers.get("location")!);
		expect(fileUrl.origin).toBe(HOST);
		const file = await live(fileUrl.pathname, {}, e);
		expect(file.status).toBe(200);
		expect(await file.text()).toBe("CONTENIDO DEL ZIP EN R2");

		// El enlace del correo también funciona (misma lógica) y suma al contador.
		const t = new URL(link).searchParams.get("t")!;
		const viaEmail = await live(`/market/descargas/${ent.id}`, { method: "POST", headers: { origin: HOST, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ t }) }, e);
		expect(viaEmail.status).toBe(303);
		expect((await one<{ download_count: number }>("SELECT download_count FROM entitlements WHERE id = ?1", ent.id))?.download_count).toBe(2);
	});

	it("con credenciales S3 de R2 la descarga usa una URL prefirmada de R2 de vida corta", async () => {
		const { e } = liveEnv({ R2_ACCESS_KEY_ID: "AKIDPRUEBA", R2_SECRET_ACCESS_KEY: "secreto-s3", R2_ACCOUNT_ID: "cuenta123", R2_BUCKET_NAME: "tonyciencia-market-files" });
		const key = `products/presign-${uid()}/guia.pdf`;
		await env.MARKET_FILES!.put(key, "%PDF-");
		const p = await createProduct({ kind: "free", fileKey: key });
		const s = await googleLogin(e, `presign-${uid()}@example.com`);
		await form(`/market/producto/${p.slug}/obtener`, s, {}, e);
		const ent = (await one<{ id: string }>("SELECT e.id FROM entitlements e JOIN users u ON u.id = e.user_id WHERE u.email = ?1", s.email))!;
		const dl = await form(`/market/descargas/${ent.id}`, s, {}, e);
		const u = new URL(dl.headers.get("location")!);
		expect(u.host).toBe("cuenta123.r2.cloudflarestorage.com");
		expect(u.pathname).toBe(`/tonyciencia-market-files/${key}`);
		expect(u.searchParams.get("X-Amz-Expires")).toBe("300");
		expect(u.searchParams.get("response-content-disposition")).toBe('attachment; filename="archivo-de-prueba.bin"');
		expect(u.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
	});

	it("el admin (solo ADMIN_EMAIL) sube el ZIP a R2 y activa el producto", async () => {
		const { e } = liveEnv();
		const noAdmin = await googleLogin(e, `curioso-${uid()}@example.com`);
		expect((await live("/market/admin", { headers: { cookie: noAdmin.cookie } }, e)).status).toBe(403);

		const admin = await googleLogin(e, "dueno@example.com");
		const fd = new FormData();
		const slug = `subido-${uid()}`;
		for (const [k, v] of Object.entries({ csrf: admin.csrf, title: "Producto subido", slug, kind: "paid", price: "77", summary: "r", description: "d", download_limit: "5", sort_order: "0", active: "1" })) fd.set(k, v);
		fd.set("file", new File(["PK-zip-real"], "Anuncios Infinitos.zip", { type: "application/zip" }));
		const res = await live("/market/admin/productos/nuevo", { method: "POST", headers: { origin: HOST, cookie: admin.cookie }, body: fd }, e);
		expect(res.status).toBe(303);
		const prod = (await one<{ file_key: string; file_name: string; price_cents: number; active: number }>("SELECT * FROM products WHERE slug = ?1", slug))!;
		expect(prod).toMatchObject({ file_name: "Anuncios-Infinitos.zip", price_cents: 7700, active: 1 });
		expect(await (await env.MARKET_FILES!.get(prod.file_key))!.text()).toBe("PK-zip-real");
	});

	it("no se puede activar un producto sin archivo", async () => {
		const { e } = liveEnv();
		const admin = await googleLogin(e, "dueno@example.com");
		const fd = new FormData();
		for (const [k, v] of Object.entries({ csrf: admin.csrf, title: "Sin archivo", slug: `sin-${uid()}`, kind: "paid", price: "10", active: "1" })) fd.set(k, v);
		const res = await live("/market/admin/productos/nuevo", { method: "POST", headers: { origin: HOST, cookie: admin.cookie }, body: fd }, e);
		expect(res.status).toBe(400);
		expect(await res.text()).toMatch(/sin archivo entregable/);
	});
});

describe("validación del id_token de Google", () => {
	const base = { iss: "https://accounts.google.com", aud: CLIENT_ID, exp: Math.floor(Date.now() / 1000) + 600, nonce: "n1", email: "A@Example.com", email_verified: true, name: "Ana" };
	it("acepta un token correcto y normaliza el correo", () => {
		expect(identityFromIdToken(jwt(base), CLIENT_ID, "n1")).toEqual({ email: "a@example.com", name: "Ana" });
	});
	it.each([
		["iss", { iss: "https://evil.example" }],
		["aud", { aud: "otro-cliente" }],
		["exp", { exp: Math.floor(Date.now() / 1000) - 5 }],
		["nonce", { nonce: "otro" }],
		["email_verified", { email_verified: false }],
		["email", { email: "no-es-correo" }],
	])("rechaza %s inválido", (_k, patch) => {
		expect(() => identityFromIdToken(jwt({ ...base, ...patch }), CLIENT_ID, "n1")).toThrow();
	});
});

describe("URL prefirmada SigV4", () => {
	it("coincide con el vector oficial de AWS (GET object, query auth)", async () => {
		const url = await presignUrl({
			host: "examplebucket.s3.amazonaws.com",
			path: "/test.txt",
			region: "us-east-1",
			accessKeyId: "AKIAIOSFODNN7EXAMPLE",
			secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
			expiresSeconds: 86400,
			date: new Date("2013-05-24T00:00:00Z"),
		});
		expect(new URL(url).searchParams.get("X-Amz-Signature")).toBe("aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404");
	});
});
