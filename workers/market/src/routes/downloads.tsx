import type { Hono } from "hono";
import { verifyFileToken } from "../adapters/storage/signed-url";
import { clientIp, deps, type AppEnv } from "../context";
import { hit, RATE_RULES } from "../lib/ratelimit";
import { checkCsrf, checkOrigin } from "../lib/session";
import { isId, safeFileName } from "../lib/validate";
import { authorizeDownload, emailTokenValid, loadEntitlement } from "../services/downloads";
import { EmailDownloadPage } from "../views/account";
import { render, renderMessage } from "../views/render";
import { loginRedirect } from "./shop";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function registerDownloads(app: Hono<AppEnv>) {
	/**
	 * Aterrizaje del enlace del correo. NO descarga ni gasta descargas (los escáneres de enlaces de
	 * Gmail/Outlook abren los GET): solo muestra un botón que hace POST.
	 */
	app.get("/market/descargas/:id", async (c) => {
		const id = c.req.param("id");
		const token = c.req.query("t");
		if (!isId(id)) return renderMessage(c, 404, "Enlace no válido", "Revisa el enlace o entra a Mis compras.");
		if (!token) {
			if (!c.get("user")) return loginRedirect(c, "/market/mis-compras");
			return c.redirect(`/market/mis-compras#acceso-${id}`, 303);
		}
		// same-origin: el token de la URL no se filtra a otros sitios, y el POST conserva su Origin
		// (con no-referrer el navegador enviaría "Origin: null" y fallaría la verificación de origen).
		c.header("Referrer-Policy", "same-origin");
		const ent = await loadEntitlement(c.env.MARKET_DB, id);
		if (!ent || !(await emailTokenValid(c.get("config").sessionSecret, id, token))) {
			return renderMessage(c, 403, "Este enlace no es válido o ya venció", "Entra a Mis compras con tu cuenta de Google para descargar de nuevo.", {
				href: "/market/mis-compras",
				label: "Ir a Mis compras",
			});
		}
		return render(
			c,
			{ title: `Descargar ${ent.title}`, path: `/market/descargas/${id}`, noindex: true },
			<EmailDownloadPage entitlementId={id} token={token} title={ent.title} left={Math.max(0, ent.download_limit - ent.download_count)} limit={ent.download_limit} />,
		);
	});

	/** Única puerta de descarga: botón de Mis compras (sesión) o del correo (token). */
	app.post("/market/descargas/:id", async (c) => {
		const id = c.req.param("id");
		const form = await c.req.formData().catch(() => null);
		const token = form?.get("t");
		const viaEmail = typeof token === "string" && token.length > 0;
		// Con token del correo basta el Origin (el token es el secreto); con sesión, además CSRF.
		const okRequest = viaEmail ? checkOrigin(c) : await checkCsrf(c, form);
		if (!okRequest) return renderMessage(c, 403, "Solicitud no válida", "Recarga la página e inténtalo de nuevo.");
		if (!isId(id)) return renderMessage(c, 404, "Enlace no válido", "Revisa el enlace.");
		const user = c.get("user");
		if (!viaEmail && !user) return loginRedirect(c, "/market/mis-compras");

		const db = c.env.MARKET_DB;
		const subject = user?.id ?? `ent:${id}`;
		if (!(await hit(db, RATE_RULES.downloadUser, subject)) || !(await hit(db, RATE_RULES.downloadIp, clientIp(c)))) {
			return renderMessage(c, 429, "Demasiadas descargas seguidas", "Espera unos minutos y vuelve a intentarlo.");
		}
		const decision = await authorizeDownload(
			deps(c),
			id,
			viaEmail ? { kind: "email", token: token as string } : { kind: "session", userId: user!.id },
		);
		if (!decision.ok) {
			const title = decision.status === 429 ? "Límite de descargas alcanzado" : decision.status === 409 ? "Archivo no disponible" : "No tienes acceso";
			return renderMessage(c, decision.status, title, decision.message, { href: "/market/mis-compras", label: "Ir a Mis compras" });
		}
		c.header("Referrer-Policy", "no-referrer");
		return c.redirect(decision.url, 303);
	});

	/** Entrega firmada de vida corta (token HMAC con clave, nombre, modo y vencimiento). */
	app.get("/market/archivo/:token", async (c) => {
		if (!(await hit(c.env.MARKET_DB, RATE_RULES.fileFetch, clientIp(c)))) {
			return renderMessage(c, 429, "Demasiadas descargas seguidas", "Espera unos minutos.");
		}
		const config = c.get("config");
		const payload = await verifyFileToken(config.sessionSecret, c.req.param("token"));
		if (!payload || payload.m !== config.mode) {
			return renderMessage(c, 403, "Enlace vencido", "Este enlace de descarga duró unos minutos y ya venció. Pide uno nuevo desde Mis compras.", {
				href: "/market/mis-compras",
				label: "Ir a Mis compras",
			});
		}
		const obj = await c.get("adapters").storage.get(payload.k);
		if (!obj) return renderMessage(c, 404, "Archivo no encontrado", "Avísanos a business@tonyciencia.com.");
		const name = safeFileName(payload.f);
		return new Response(obj.body, {
			headers: {
				"content-type": "application/octet-stream",
				"content-length": String(obj.size),
				"content-disposition": `attachment; filename="${name}"`,
				"cache-control": "private, no-store",
				"x-content-type-options": "nosniff",
				"referrer-policy": "no-referrer",
				"content-security-policy": "default-src 'none'; sandbox",
			},
		});
	});

	/** Imágenes de producto subidas desde el admin (prefijo images/ del almacén privado). */
	app.get("/market/media/images/*", async (c) => {
		const key = c.req.path.slice("/market/media/".length);
		if (!/^images\/[A-Za-z0-9/_.-]{1,200}$/.test(key) || key.includes("..")) return c.notFound();
		const obj = await c.get("adapters").storage.get(key);
		if (!obj || !IMAGE_TYPES.has(obj.contentType)) return c.notFound();
		return new Response(obj.body, {
			headers: {
				"content-type": obj.contentType,
				"cache-control": "public, max-age=86400",
				"x-content-type-options": "nosniff",
				"content-security-policy": "default-src 'none'; sandbox",
			},
		});
	});
}
