/**
 * Carga de los archivos entregables con hash fijado en el repositorio ("content-addressed provisioning").
 *
 * Por qué existe: los ZIP de los productos salen de repositorios privados y el repositorio del market es público,
 * así que el archivo no puede viajar por git ni por el CI. Este endpoint acepta el archivo SOLO si su SHA-256 y su
 * tamaño coinciden con los publicados en `provision/manifest.json` (versionado y revisado en un PR). Quien llama no
 * necesita ninguna clave, pero tampoco puede subir nada distinto de ese archivo exacto: R2 recalcula el SHA-256 de
 * lo recibido y rechaza la escritura si no coincide. Cuando el producto ya tiene ese archivo, responde sin leer
 * el cuerpo (idempotente y sin costo).
 *
 *   curl -X PUT --data-binary @producto.zip -H 'content-type: application/zip' https://tonyciencia.com/market/provision/<slug>
 */
import type { Hono } from "hono";
import manifest from "../../provision/manifest.json";
import { clientIp, type AppEnv } from "../context";
import { hit } from "../lib/ratelimit";
import { isSlug, safeFileName } from "../lib/validate";
import { getProductBySlug } from "../services/repo";

export interface ProvisionEntry {
	slug: string;
	sha256: string;
	size: number;
	fileName: string;
	contentType: string;
	/** true = al quedar el archivo, el producto pasa a "Disponible" y activo. */
	activate: boolean;
}

/** Workers aceptan cuerpos de hasta 100 MB (plan Free/Pro). */
export const PROVISION_MAX_BYTES = 95 * 1024 * 1024;
const RULE = { name: "provision-ip", limit: 12, windowSeconds: 3600 };

/** Solo pruebas: reemplaza el manifiesto. */
export const provisionTestHooks: { entries: ProvisionEntry[] | null } = { entries: null };

export function provisionEntries(): ProvisionEntry[] {
	const list = provisionTestHooks.entries ?? (manifest as { files?: ProvisionEntry[] }).files ?? [];
	return list.filter(
		(e) =>
			isSlug(e.slug) &&
			/^[0-9a-f]{64}$/.test(e.sha256) &&
			Number.isSafeInteger(e.size) &&
			e.size > 0 &&
			e.size <= PROVISION_MAX_BYTES &&
			typeof e.fileName === "string" &&
			typeof e.contentType === "string",
	);
}

export const provisionKey = (e: ProvisionEntry) => `products/${e.slug}/${e.sha256.slice(0, 16)}/${safeFileName(e.fileName)}`;

/** Claves que puso este endpoint (products/<slug>/<16 hex>/…). Las del admin son products/<id>/<fecha>-<nombre>. */
const PROVISIONED_KEY = /^products\/[a-z0-9-]+\/[0-9a-f]{16}\//;

export function registerProvision(app: Hono<AppEnv>, entries: () => ProvisionEntry[] = provisionEntries) {
	app.put("/market/provision/:slug", async (c) => {
		const slug = c.req.param("slug");
		const entry = isSlug(slug) ? entries().find((e) => e.slug === slug) : undefined;
		if (!entry) return c.json({ error: "sin entrada en provision/manifest.json" }, 404);
		const db = c.env.MARKET_DB;
		const product = await getProductBySlug(db, slug, false);
		if (!product) return c.json({ error: "producto inexistente (¿falta aplicar la migración?)" }, 404);

		const key = provisionKey(entry);
		const storage = c.get("adapters").storage;
		if (product.file_key === key && (await storage.head(key))) {
			return c.json({ status: "already", slug, key, availability: product.availability });
		}
		if (!(await hit(db, RULE, clientIp(c)))) return c.json({ error: "demasiados intentos" }, 429);
		// El endpoint es público (basta tener el archivo, que cualquier comprador tiene): nunca reemplaza un archivo
		// subido desde el admin. Solo llena un producto sin archivo o cambia una versión aprovisionada por otra.
		if (product.file_key && !PROVISIONED_KEY.test(product.file_key) && (await storage.head(product.file_key))) {
			return c.json({ error: "el producto tiene un archivo subido desde el admin; cámbialo desde el admin" }, 409);
		}
		const declared = Number.parseInt(c.req.header("content-length") ?? "", 10);
		if (declared !== entry.size) return c.json({ error: `content-length debe ser ${entry.size}` }, 400);
		const body = c.req.raw.body;
		if (!body) return c.json({ error: "cuerpo vacío" }, 400);

		try {
			await storage.put(key, body, { contentType: entry.contentType, size: entry.size, sha256: entry.sha256 });
		} catch (err) {
			console.warn(`[provision] ${slug}: archivo rechazado: ${String(err).slice(0, 200)}`);
			return c.json({ error: "el archivo no coincide con el SHA-256 publicado" }, 400);
		}
		const stored = await storage.head(key);
		if (!stored || stored.size !== entry.size) return c.json({ error: "no se pudo verificar el archivo guardado" }, 500);

		await db
			.prepare(
				`UPDATE products SET file_key = ?2, file_name = ?3, file_size = ?4, updated_at = ?5,
				   availability = CASE WHEN ?6 = 1 AND availability = 'coming_soon' THEN 'available' ELSE availability END,
				   active = CASE WHEN ?6 = 1 AND availability = 'coming_soon' THEN 1 ELSE active END
				 WHERE slug = ?1`,
			)
			.bind(slug, key, safeFileName(entry.fileName), entry.size, Date.now(), entry.activate ? 1 : 0)
			.run();
		console.log(`[provision] ${slug}: archivo ${key} (${entry.size} bytes) guardado${entry.activate ? " y producto activado" : ""}`);
		return c.json({ status: "stored", slug, key, activated: entry.activate });
	});
}
