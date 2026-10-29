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
		const file = await call(url.pathname);
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

	it("token del correo: válido funciona; uno de OTRO acceso, falsificado o vencido → 403", async () => {
		const a = await ownerWithFreeProduct();
		const b = await ownerWithFreeProduct();
		const goodForA = await signToken(MOCK_SESSION_SECRET, "dl-email", { e: a.ent.id, exp: Math.floor(Date.now() / 1000) + 3600 });
		const expired = await signToken(MOCK_SESSION_SECRET, "dl-email", { e: a.ent.id, exp: Math.floor(Date.now() / 1000) - 10 });
		const forged = await signToken("otro-secreto", "dl-email", { e: a.ent.id, exp: Math.floor(Date.now() / 1000) + 3600 });
		const wrongPurpose = await signToken(MOCK_SESSION_SECRET, "file", { e: a.ent.id, exp: Math.floor(Date.now() / 1000) + 3600 });

		expect((await postForm(`/market/descargas/${a.ent.id}`, null, { t: goodForA })).status).toBe(303);
		expect((await postForm(`/market/descargas/${b.ent.id}`, null, { t: goodForA })).status).toBe(403);
		for (const t of [expired, forged, wrongPurpose, "basura"]) {
			expect((await postForm(`/market/descargas/${a.ent.id}`, null, { t })).status).toBe(403);
		}
	});

	it("el GET del enlace del correo no gasta descargas (escáneres de correo)", async () => {
		const { ent } = await ownerWithFreeProduct();
		const t = await signToken(MOCK_SESSION_SECRET, "dl-email", { e: ent.id, exp: Math.floor(Date.now() / 1000) + 3600 });
		for (let i = 0; i < 3; i++) expect((await call(`/market/descargas/${ent.id}?t=${t}`)).status).toBe(200);
		expect((await one<{ download_count: number }>("SELECT download_count FROM entitlements WHERE id = ?1", ent.id))?.download_count).toBe(0);
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

	it("la URL firmada de archivo vence y no se puede falsificar", async () => {
		const expired = await createWorkerSignedUrl(MOCK_SESSION_SECRET, BASE, "mock", "mock/guia-gratis-PRUEBA.pdf", "x.pdf", -5);
		expect((await call(new URL(expired).pathname)).status).toBe(403);
		const forged = await createWorkerSignedUrl("secreto-falso", BASE, "mock", "mock/guia-gratis-PRUEBA.pdf", "x.pdf", 300);
		expect((await call(new URL(forged).pathname)).status).toBe(403);
		// Un token emitido para live no sirve en mock (y viceversa).
		const liveToken = await createWorkerSignedUrl(MOCK_SESSION_SECRET, BASE, "live", "mock/guia-gratis-PRUEBA.pdf", "x.pdf", 300);
		expect((await call(new URL(liveToken).pathname)).status).toBe(403);
	});

	it("en maqueta un archivo que no es de prueba no se puede servir (no toca R2)", async () => {
		await env.MARKET_FILES!.put("products/real/anuncios-infinitos.zip", "CONTENIDO REAL DE PAGO");
		const p = await createProduct({ kind: "free", fileKey: "products/real/anuncios-infinitos.zip" });
		const s = await loginMock(`real-${uid()}@maqueta.test`);
		await postForm(`/market/producto/${p.slug}/obtener`, s);
		const ent = (await one<{ id: string }>("SELECT e.id FROM entitlements e JOIN users u ON u.id = e.user_id WHERE u.email = ?1", s.email))!;
		const res = await postForm(`/market/descargas/${ent.id}`, s);
		expect(res.status).toBe(409);
		const signed = await createWorkerSignedUrl(MOCK_SESSION_SECRET, BASE, "mock", "products/real/anuncios-infinitos.zip", "x.zip", 300);
		const direct = await call(new URL(signed).pathname);
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
		expect(safeNextPath("/market?x=1")).toBe("/market?x=1");
		for (const bad of ["/marketing-digital", "//evil.com/market", "https://evil.com/market", "/market/\\evil", "/\\evil.com", "javascript:alert(1)"]) {
			expect(safeNextPath(bad), bad).toBe("/market");
		}
	});
});
