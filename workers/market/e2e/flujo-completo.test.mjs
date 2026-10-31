// Prueba de punta a punta EN NAVEGADOR, en modo maqueta, contra `pnpm dev` (wrangler dev).
//
//   Terminal 1:  pnpm setup:local && pnpm dev
//   Terminal 2:  pnpm test:e2e            (BASE_URL=http://localhost:8787 por defecto)
//
// Cubre: login de maqueta → compra simulada → webhook → correo en /dev/correos (+ copia admin) →
// descarga desde Mis compras y desde el enlace del correo → producto gratis → idempotencia →
// acceso denegado a otra persona → admin → vistas móviles.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:8787";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "artifacts");
mkdirSync(OUT, { recursive: true });
const run = Date.now().toString(36);
const buyer = `comprador-${run}@maqueta.test`;
const intruder = `otra-persona-${run}@maqueta.test`;

let browser;
before(async () => {
	const real = await chromium.launch();
	// El popup de bienvenida (cupón) taparía los clics de la prueba: se marca como ya visto.
	browser = {
		close: () => real.close(),
		newContext: async (opts) => {
			const ctx = await real.newContext(opts);
			await ctx.addInitScript(() => localStorage.setItem("mk_welcome_at", String(Date.now())));
			return ctx;
		},
	};
});
after(async () => {
	await browser?.close();
});

async function inboxFor(page, to) {
	await page.goto(`${BASE}/dev/correos`);
	// Filas cuyo destinatario (columna "Para") es exactamente `to`.
	return page.locator("tbody tr").filter({ has: page.locator("td:nth-child(2)", { hasText: new RegExp(`^${to.replace(/[.+]/g, "\\$&")}$`) }) });
}

test("flujo completo en modo maqueta", { timeout: 120_000 }, async () => {
	const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
	const page = await ctx.newPage();

	// 1) Catálogo
	await page.goto(`${BASE}/market`);
	await assert.doesNotReject(page.getByRole("heading", { name: /Herramientas de IA/, level: 1 }).waitFor());
	assert.ok((await page.locator(".mk-pcard").count()) >= 5, "el catálogo muestra al menos 5 productos");
	assert.ok(await page.getByText("MODO MAQUETA").isVisible(), "la banda de maqueta debe verse");
	await page.screenshot({ path: join(OUT, "01-catalogo.png"), fullPage: true });

	// 2) Producto de pago → login de maqueta → vuelve al producto
	await page.getByRole("link", { name: /Anuncios Infinitos/ }).first().click();
	await page.waitForURL(/\/market\/producto\/anuncios-infinitos$/);
	await page.screenshot({ path: join(OUT, "02-producto.png"), fullPage: true });
	await page.getByRole("link", { name: /usuario de prueba/ }).click();
	await page.waitForURL(/\/market\/auth\/dev/);
	await page.getByLabel("Correo").fill(buyer);
	await page.getByLabel("Nombre").fill("Ana Prueba");
	await page.getByRole("button", { name: "Entrar como este usuario" }).click();
	await page.waitForURL(/\/market\/producto\/anuncios-infinitos$/);

	// 3) Comprar → checkout simulado → pagar
	await page.getByRole("button", { name: /Comprar por \$76\.90 USD/ }).click();
	await page.waitForURL(/\/market\/maqueta\/pago\/cs_mock_/);
	const mockPayUrl = page.url();
	await page.screenshot({ path: join(OUT, "03-pago-simulado.png"), fullPage: true });
	await page.getByRole("button", { name: /Pagar \$76\.90 USD \(simulado\)/ }).click();
	await page.waitForURL(/\/market\/pago\/exito/);
	await page.getByRole("heading", { name: "¡Gracias por tu compra!" }).waitFor({ timeout: 15_000 });
	await page.screenshot({ path: join(OUT, "04-exito.png"), fullPage: true });

	// 4) Mis compras → descargar el ZIP de prueba
	await page.getByRole("link", { name: /Mis compras/ }).first().click();
	await page.waitForURL(/\/market\/mis-compras/);
	const item = page.locator("li").filter({ hasText: "Anuncios Infinitos" });
	await assert.doesNotReject(item.getByText("Te quedan 5 de 5 descargas").waitFor());
	const [dl1] = await Promise.all([page.waitForEvent("download"), item.getByRole("button", { name: "Descargar" }).click()]);
	assert.equal(dl1.suggestedFilename(), "anuncios-infinitos-PRUEBA.zip");
	const zipPath = join(OUT, "descarga.zip");
	await dl1.saveAs(zipPath);
	const zip = readFileSync(zipPath);
	assert.equal(zip.subarray(0, 4).toString("hex"), "504b0304", "debe ser un ZIP");
	assert.ok(zip.includes(Buffer.from("ARCHIVO DE PRUEBA")), "en maqueta solo se sirven archivos de prueba");
	await page.reload();
	await assert.doesNotReject(item.getByText("Te quedan 4 de 5 descargas").waitFor());

	// 5) Correos en /dev/correos: uno al cliente y una copia APARTE al admin
	let rows = await inboxFor(page, buyer);
	assert.equal(await rows.count(), 1, "un correo al cliente");
	const copies = page.locator("tbody tr").filter({ hasText: "[Copia admin] Tu compra" }).filter({ hasText: buyer });
	assert.equal(await copies.count(), 1, "una copia aparte para ADMIN_COPY_EMAIL");
	await page.screenshot({ path: join(OUT, "05-correos.png"), fullPage: true });
	await rows.first().getByRole("link").click();
	await page.waitForURL(/\/dev\/correos\/[0-9a-f-]{36}$/);
	const mailId = page.url().split("/").pop();
	const html = await (await page.request.get(`${BASE}/dev/correos/${mailId}/html`)).text();
	const link = html.match(/href="([^"]*\/market\/descargas\/[^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
	assert.ok(link, "el correo trae un enlace de descarga firmado");
	assert.ok(!/attachment/i.test(html), "sin adjuntos");
	await page.screenshot({ path: join(OUT, "06-correo.png"), fullPage: true });

	// 6) Enlace del correo → página sin efectos → botón → descarga
	await page.goto(link);
	await page.getByRole("button", { name: "Descargar ahora" }).waitFor();
	const [dl2] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar ahora" }).click()]);
	assert.equal(dl2.suggestedFilename(), "anuncios-infinitos-PRUEBA.zip");

	// 7) Idempotencia: reenviar el MISMO evento al webhook no duplica nada
	await page.goto(mockPayUrl);
	await page.getByRole("button", { name: /Reenviar el mismo evento/ }).click();
	await page.getByRole("heading", { name: /idempotente/ }).waitFor();
	rows = await inboxFor(page, buyer);
	assert.equal(await rows.count(), 1, "sigue habiendo un solo correo al cliente");
	assert.equal(await page.locator("tbody tr").filter({ hasText: "[Copia admin] Tu compra" }).filter({ hasText: buyer }).count(), 1, "y una sola copia admin");

	// 8) Producto gratis: casilla opcional sin marcar por defecto, descarga en el sitio + correo
	await page.goto(`${BASE}/market/producto/guia-gratis-prueba`);
	const box = page.getByRole("checkbox", { name: /novedades/ });
	assert.equal(await box.isChecked(), false, "la casilla de marketing empieza sin marcar");
	await page.getByRole("button", { name: "Descargar gratis" }).click();
	await page.waitForURL(/\/market\/mis-compras\?listo=/);
	await page.getByText("¡Listo!").waitFor();
	const freeItem = page.locator("li").filter({ hasText: "Guía gratis de prueba" });
	const [dl3] = await Promise.all([page.waitForEvent("download"), freeItem.getByRole("button", { name: "Descargar" }).click()]);
	assert.equal(dl3.suggestedFilename(), "guia-gratis-prueba.pdf");
	const pdfPath = join(OUT, "gratis.pdf");
	await dl3.saveAs(pdfPath);
	assert.equal(readFileSync(pdfPath).subarray(0, 5).toString(), "%PDF-");
	await page.screenshot({ path: join(OUT, "07-mis-compras.png"), fullPage: true });
	assert.equal(await (await inboxFor(page, buyer)).filter({ hasText: "Tu descarga gratis" }).count(), 1);
	assert.equal(await page.locator("tbody tr").filter({ hasText: "[Copia admin] Tu descarga gratis" }).filter({ hasText: buyer }).count(), 1);

	const entitlementId = new URL(link).pathname.split("/").pop();
	await ctx.close();

	// 9) Otra persona no puede descargar lo que no compró
	const ctx2 = await browser.newContext();
	const p2 = await ctx2.newPage();
	await p2.goto(`${BASE}/market/producto/anuncios-infinitos`);
	await p2.getByRole("link", { name: /usuario de prueba/ }).click();
	await p2.getByLabel("Correo").fill(intruder);
	await p2.getByRole("button", { name: "Entrar como este usuario" }).click();
	await p2.waitForURL(/\/market\/producto\/anuncios-infinitos$/);
	await p2.goto(`${BASE}/market/mis-compras`);
	const csrf = await p2.locator('form[action="/market/salir"] input[name="csrf"]').first().inputValue();
	const res = await p2.request.post(`${BASE}/market/descargas/${entitlementId}`, {
		form: { csrf },
		headers: { origin: BASE },
		maxRedirects: 0,
	});
	assert.equal(res.status(), 403, "sin compra → 403");
	await ctx2.close();

	// 10) Admin + vistas móviles
	const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
	const p3 = await ctx3.newPage();
	await p3.goto(`${BASE}/market`);
	await p3.screenshot({ path: join(OUT, "08-movil-catalogo.png"), fullPage: true });
	// Menú móvil: se abre y se puede cerrar (antes no había cómo salir).
	await p3.locator(".mk-menu > summary").click();
	assert.ok(await p3.getByRole("link", { name: "Agentes para empresas" }).last().isVisible(), "el menú móvil se abre");
	await p3.getByRole("button", { name: "Cerrar menú" }).click();
	assert.equal(await p3.locator(".mk-menu").evaluate((d) => d.open), false, "el menú móvil se cierra con ✕");
	await p3.goto(`${BASE}/market/producto/anuncios-infinitos`);
	await p3.screenshot({ path: join(OUT, "09-movil-producto.png"), fullPage: true });
	await p3.getByRole("link", { name: /usuario de prueba/ }).click();
	await p3.getByRole("button", { name: /Entrar como admin/ }).click();
	await p3.waitForURL(/\/market\/producto\/anuncios-infinitos$/);
	await p3.goto(`${BASE}/market/admin`);
	await p3.getByRole("heading", { name: "Administración" }).waitFor();
	await p3.goto(`${BASE}/market/admin/pedidos`);
	assert.ok((await p3.locator("tbody tr").filter({ hasText: buyer }).count()) >= 2, "el admin ve los pedidos");
	await p3.screenshot({ path: join(OUT, "10-movil-admin-pedidos.png"), fullPage: true });
	await ctx3.close();
});
