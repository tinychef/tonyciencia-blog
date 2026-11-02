import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createWorkerSignedUrl } from "../src/adapters/storage/signed-url";
import { MOCK_SESSION_SECRET } from "../src/config";
import { signToken } from "../src/lib/crypto";
import { BASE, call, createProduct, loginMock, one, postForm, uid } from "./helpers";

async function ownerWithFreeProduct(limit = 5) {
	const p = await createProduct({ kind: "free", limit });
	const s = await loginMock(`dueno-${uid()}@maqueta.test`);
	const res = await postForm(`/market/producto/${p.slug}/obtener`, s);
	expect(res.status).toBe(303);
	const ent = (await one<{ id: string }>("SELECT e.id FROM entitlements e JOIN users u ON u.id = e.user_id WHERE u.email = ?1 AND e.product_id = ?2", s.email, p.id))!;
	return { s, p, ent };
}

describe("descargas: solo quien tiene el producto", () => {
	it("el dueño descarga: redirección a URL firmada de vida corta → archivo de prueba", async () => {
		const { s, ent } = await ownerWithFreeProduct();
		const res = await postForm(`/market/descargas/${ent.id}`, s);
		expect(res.status).toBe(303);
		const url = new URL(res.headers.get("location")!);
		expect(url.pathname).toMatch(/^\/market\/archivo\//);
		const file = await call(url.pathname, { headers: { cookie: s.cookie } });
		expect(file.status).toBe(200);
		expect(file.headers.get("content-disposition")).toMatch(/attachment; filename="archivo-de-prueba.bin"/);
		expect(file.headers.get("cache-control")).toBe("private, no-store");
		expect(new TextDecoder().decode((await file.arrayBuffer()).slice(0, 5))).toBe("%PDF-");
	});

	it("alguien SIN compra recibe 403 (sesión de otra persona)", async () => {
		const { ent } = await ownerWithFreeProduct();
		const intruso = await loginMock(`intruso-${uid()}@maqueta.test`);
		const res = await postForm(`/market/descargas/${ent.id}`, intruso);
		expect(res.status).toBe(403);
		expect(await res.text()).toMatch(/No tienes acceso/);
		expect((await one<{ download_count: number }>("SELECT download_count FROM entitlements WHERE id = ?1", ent.id))?.download_count).toBe(0);
	});

	it("sin sesión ni token → al login; acceso inexistente → 403", async () => {
		const { ent } = await ownerWithFreeProduct();
		const anon = await postForm(`/market/descargas/${ent.id}`, null);
		expect(anon.status).toBe(303);
		expect(anon.headers.get("location")).toMatch(/^\/market\/entrar/);
		const s = await loginMock(`otro-${uid()}@maqueta.test`);
		expect((await postForm(`/market/descargas/${crypto.randomUUID()}`, s)).status).toBe(403);
	});

	it("el correo reenviado NO da acceso: el enlace pide entrar con la cuenta de la compra", async () => {
		const { ent } = await ownerWithFreeProduct();
		// Sin sesión: al login, y de vuelta a la misma descarga.
		const anon = await call(`/market/descargas/${ent.id}`);
		expect(anon.status).toBe(303);
		expect(anon.headers.get("location")).toBe(`/market/entrar?next=${encodeURIComponent(`/market/descargas/${ent.id}`)}`);
		// Con la sesión de OTRA cuenta: 403, sin pistas de quién compró.
		const otro = await loginMock(`reenviado-${uid()}@maqueta.test`);
		const res = await call(`/market/descargas/${ent.id}`, { headers: { cookie: otro.cookie } });
		expect(res.status).toBe(403);
		expect(await res.text()).toMatch(/otra cuenta/);
		expect((await one<{ download_count: number }>("SELECT download_count FROM entitlements WHERE id = ?1", ent.id))?.download_count).toBe(0);
	});

	it("los enlaces viejos con token del correo ya no descargan (ni por GET ni por POST)", async () => {
		const { s, ent } = await ownerWithFreeProduct();
		const oldToken = await signToken(MOCK_SESSION_SECRET, "dl-email", { e: ent.id, exp: Math.floor(Date.now() / 1000) + 3600 });
		// GET sin sesión → login (el token se ignora).
		const get = await call(`/market/descargas/${ent.id}?t=${oldToken}`);
		expect(get.status).toBe(303);
		expect(get.headers.get("location")).toMatch(/^\/market\/entrar/);
		// POST sin sesión, solo con el token → login; nunca una URL de archivo.
		const post = await postForm(`/market/descargas/${ent.id}`, null, { t: oldToken });
		expect(post.status).toBe(303);
		expect(post.headers.get("location")).toMatch(/^\/market\/entrar/);
		// El dueño con sesión sí llega a su compra.
		const owner = await call(`/market/descargas/${ent.id}?t=${oldToken}`, { headers: { cookie: s.cookie } });
		expect(owner.status).toBe(303);
		expect(owner.headers.get("location")).toBe(`/market/mis-compras?ver=${ent.id}#acceso-${ent.id}`);
		// La compra sale resaltada, sin el aviso de «Ya tenías este producto».
		const page = await (await call(owner.headers.get("location")!, { headers: { cookie: s.cookie } })).text();
		expect(page).toContain(`id="acceso-${ent.id}" style="border-color: var(--color-success)"`);
		expect(page).not.toContain("Ya tenías este producto");
		expect((await one<{ download_count: number }>("SELECT download_count FROM entitlements WHERE id = ?1", ent.id))?.download_count).toBe(0);
	});

	it("la URL del archivo es personal: sin sesión o con la sesión de otra cuenta → 403", async () => {
		const { s, ent } = await ownerWithFreeProduct();
		const res = await postForm(`/market/descargas/${ent.id}`, s);
		const path = new URL(res.headers.get("location")!).pathname;
		const anon = await call(path);
		expect(anon.status).toBe(403);
		expect(await anon.text()).toMatch(/personal/);
		const otro = await loginMock(`copia-url-${uid()}@maqueta.test`);
		expect((await call(path, { headers: { cookie: otro.cookie } })).status).toBe(403);
		expect((await call(path, { headers: { cookie: s.cookie } })).status).toBe(200);
	});

	it("límite de descargas por compra", async () => {
		const { s, ent } = await ownerWithFreeProduct(2);
		expect((await postForm(`/market/descargas/${ent.id}`, s)).status).toBe(303);
		expect((await postForm(`/market/descargas/${ent.id}`, s)).status).toBe(303);
		const third = await postForm(`/market/descargas/${ent.id}`, s);
		expect(third.status).toBe(429);
		expect(await third.text()).toMatch(/límite de 2 descargas/);
	});

	it("acceso revocado (reembolso) → 403", async () => {
		const { s, ent } = await ownerWithFreeProduct();
		await env.MARKET_DB.prepare("UPDATE entitlements SET revoked_at = ?2 WHERE id = ?1").bind(ent.id, Date.now()).run();
		expect((await postForm(`/market/descargas/${ent.id}`, s)).status).toBe(403);
	});

	it("la URL firmada de archivo vence, no se puede falsificar y las viejas sin cuenta no valen", async () => {
		const s = await loginMock(`firmas-${uid()}@maqueta.test`);
		const userId = (await one<{ id: string }>("SELECT id FROM users WHERE email = ?1", s.email))!.id;
		const get = (url: string) => call(new URL(url).pathname, { headers: { cookie: s.cookie } });
		const ok = await createWorkerSignedUrl(MOCK_SESSION_SECRET, BASE, "mock", "mock/guia-gratis-PRUEBA.pdf", "x.pdf", 300, userId);
		expect((await get(ok)).status).toBe(200);
		const expired = await createWorkerSignedUrl(MOCK_SESSION_SECRET, BASE, "mock", "mock/guia-gratis-PRUEBA.pdf", "x.pdf", -5, userId);
		expect((await get(expired)).status).toBe(403);
		const forged = await createWorkerSignedUrl("secreto-falso", BASE, "mock", "mock/guia-gratis-PRUEBA.pdf", "x.pdf", 300, userId);
		expect((await get(forged)).status).toBe(403);
		// Un token emitido para live no sirve en mock (y viceversa).
		const liveToken = await createWorkerSignedUrl(MOCK_SESSION_SECRET, BASE, "live", "mock/guia-gratis-PRUEBA.pdf", "x.pdf", 300, userId);
		expect((await get(liveToken)).status).toBe(403);
		// Formato anterior (sin cuenta): ya no se acepta aunque la firma sea buena.
		const legacy = await signToken(MOCK_SESSION_SECRET, "file", { k: "mock/guia-gratis-PRUEBA.pdf", f: "x.pdf", m: "mock", exp: Math.floor(Date.now() / 1000) + 300 });
		expect((await call(`/market/archivo/${legacy}`, { headers: { cookie: s.cookie } })).status).toBe(403);
	});

	it("en maqueta un archivo que no es de prueba no se puede servir (no toca R2)", async () => {
		await env.MARKET_FILES!.put("products/real/anuncios-infinitos.zip", "CONTENIDO REAL DE PAGO");
		const p = await createProduct({ kind: "free", fileKey: "products/real/anuncios-infinitos.zip" });
		const s = await loginMock(`real-${uid()}@maqueta.test`);
		await postForm(`/market/producto/${p.slug}/obtener`, s);
		const ent = (await one<{ id: string }>("SELECT e.id FROM entitlements e JOIN users u ON u.id = e.user_id WHERE u.email = ?1", s.email))!;
		const res = await postForm(`/market/descargas/${ent.id}`, s);
		expect(res.status).toBe(409);
		const userId = (await one<{ id: string }>("SELECT id FROM users WHERE email = ?1", s.email))!.id;
		const signed = await createWorkerSignedUrl(MOCK_SESSION_SECRET, BASE, "mock", "products/real/anuncios-infinitos.zip", "x.zip", 300, userId);
		const direct = await call(new URL(signed).pathname, { headers: { cookie: s.cookie } });
		expect(direct.status).toBe(404);
		expect(await direct.text()).not.toContain("CONTENIDO REAL");
	});
});

describe("productos gratis", () => {
	it("sin la casilla marcada no hay consentimiento de marketing; marcada sí", async () => {
		const p = await createProduct({ kind: "free" });
		const a = await loginMock(`sinmarketing-${uid()}@maqueta.test`);
		await postForm(`/market/producto/${p.slug}/obtener`, a);
		expect((await one<{ marketing_opt_in: number }>("SELECT marketing_opt_in FROM users WHERE email = ?1", a.email))?.marketing_opt_in).toBe(0);
		const b = await loginMock(`conmarketing-${uid()}@maqueta.test`);
		await postForm(`/market/producto/${p.slug}/obtener`, b, { marketing: "1" });
		const row = await one<{ marketing_opt_in: number; marketing_opt_in_source: string }>("SELECT * FROM users WHERE email = ?1", b.email);
		expect(row).toMatchObject({ marketing_opt_in: 1, marketing_opt_in_source: `producto:${p.slug}` });
	});

	it("doble clic en «Descargar gratis» crea un solo acceso y un solo par de correos", async () => {
		const p = await createProduct({ kind: "free" });
		const s = await loginMock(`doble-${uid()}@maqueta.test`);
		await Promise.all([postForm(`/market/producto/${p.slug}/obtener`, s), postForm(`/market/producto/${p.slug}/obtener`, s)]);
		await postForm(`/market/producto/${p.slug}/obtener`, s);
		const user = (await one<{ id: string }>("SELECT id FROM users WHERE email = ?1", s.email))!;
		expect((await one<{ n: number }>("SELECT COUNT(*) AS n FROM entitlements WHERE user_id = ?1", user.id))?.n).toBe(1);
		expect((await one<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?1", user.id))?.n).toBe(1);
		expect((await one<{ n: number }>("SELECT COUNT(*) AS n FROM email_outbox o JOIN orders r ON r.id = o.order_id WHERE r.user_id = ?1", user.id))?.n).toBe(2);
	});
});

describe("redirección tras login", () => {
	it("solo acepta rutas internas del market", async () => {
		const { safeNextPath } = await import("../src/lib/validate");
		expect(safeNextPath("/market/mis-compras")).toBe("/market/mis-compras");
		// "/market?…" no llega al Worker en producción: se normaliza a "/market/?…".
		expect(safeNextPath("/market?x=1")).toBe("/market/?x=1");
		for (const bad of ["/marketing-digital", "//evil.com/market", "https://evil.com/market", "/market/\\evil", "/\\evil.com", "javascript:alert(1)"]) {
			expect(safeNextPath(bad), bad).toBe("/market");
		}
	});
});
