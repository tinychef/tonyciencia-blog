import type { Hono } from "hono";
import { verifyFileToken } from "../adapters/storage/signed-url";
import { clientIp, deps, type AppEnv } from "../context";
import { hit, RATE_RULES } from "../lib/ratelimit";
import { checkCsrf } from "../lib/session";
import { isId, safeFileName } from "../lib/validate";
import { authorizeDownload, loadEntitlement } from "../services/downloads";
import { renderMessage } from "../views/render";
import { loginRedirect } from "./shop";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function registerDownloads(app: Hono<AppEnv>) {
	/**
	 * Aterrizaje del enlace del correo. Pide iniciar sesión con Google y solo muestra la compra si la
	 * cuenta es la dueña: el correo reenviado no sirve a nadie más. NO descarga ni gasta descargas
	 * (los escáneres de enlaces de Gmail/Outlook abren los GET). Los enlaces viejos con ?t= se tratan
	 * igual: el token se ignora.
	 */
	app.get("/market/descargas/:id", async (c) => {
		const id = c.req.param("id");
		if (!isId(id)) return renderMessage(c, 404, "Enlace no válido", "Revisa el enlace o entra a Mis compras.");
		const user = c.get("user");
		if (!user) return loginRedirect(c, `/market/descargas/${id}`);
		const ent = await loadEntitlement(c.env.MARKET_DB, id);
		if (!ent || ent.user_id !== user.id) {
			return renderMessage(
				c,
				403,
				"Esta compra es de otra cuenta",
				"Las descargas solo funcionan con la cuenta de Google con la que se hizo la compra. Si la compra es tuya, cierra sesión y entra con esa cuenta.",
				{ href: "/market/mis-compras", label: "Ir a Mis compras" },
			);
		}
		return c.redirect(`/market/mis-compras#acceso-${id}`, 303);
	});

	/** Única puerta de descarga: el botón de Mis compras (sesión de la cuenta dueña + CSRF). */
	app.post("/market/descargas/:id", async (c) => {
		const id = c.req.param("id");
		const form = await c.req.formData().catch(() => null);
		if (!(await checkCsrf(c, form))) return renderMessage(c, 403, "Solicitud no válida", "Recarga la página e inténtalo de nuevo.");
		if (!isId(id)) return renderMessage(c, 404, "Enlace no válido", "Revisa el enlace.");
		const user = c.get("user");
		if (!user) return loginRedirect(c, `/market/descargas/${id}`);

		const db = c.env.MARKET_DB;
		if (!(await hit(db, RATE_RULES.downloadUser, user.id)) || !(await hit(db, RATE_RULES.downloadIp, clientIp(c)))) {
			return renderMessage(c, 429, "Demasiadas descargas seguidas", "Espera unos minutos y vuelve a intentarlo.");
		}
		const decision = await authorizeDownload(deps(c), id, user.id);
		if (!decision.ok) {
			const title = decision.status === 429 ? "Límite de descargas alcanzado" : decision.status === 409 ? "Archivo no disponible" : "No tienes acceso";
			return renderMessage(c, decision.status, title, decision.message, { href: "/market/mis-compras", label: "Ir a Mis compras" });
		}
		c.header("Referrer-Policy", "no-referrer");
		return c.redirect(decision.url, 303);
	});

	/**
	 * Entrega firmada de vida corta (token HMAC con clave, nombre, modo, cuenta y vencimiento). Solo
	 * entrega si la sesión del navegador es de la cuenta que pidió la descarga: la URL copiada,
	 * pegada en otro navegador o reenviada no sirve.
	 */
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
		if (c.get("user")?.id !== payload.u) {
			return renderMessage(c, 403, "Este enlace es personal", "Solo funciona en el navegador de la cuenta que hizo la compra. Entra a Mis compras con esa cuenta para descargar.", {
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
