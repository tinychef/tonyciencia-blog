import type { Deps } from "./orders";
import type { EntitlementRow } from "./repo";

/**
 * Autorización de descargas. Solo hay UNA puerta: la sesión de la cuenta de Google dueña de la
 * compra. El correo de entrega lleva un enlace a /market/descargas/<id>, que pide iniciar sesión;
 * reenviar el correo no da acceso a nadie más. La URL del archivo que sale de aquí también va
 * atada a esa cuenta (ver adapters/storage/signed-url.ts).
 */
export type DownloadDecision =
	| { ok: true; url: string; productTitle: string }
	| { ok: false; status: 401 | 403 | 404 | 409 | 429; message: string };

interface EntitlementWithProduct extends EntitlementRow {
	title: string;
	file_key: string | null;
	file_name: string | null;
}

export function loadEntitlement(db: D1Database, entitlementId: string): Promise<EntitlementWithProduct | null> {
	return db
		.prepare(
			`SELECT e.*, p.title, p.file_key, p.file_name FROM entitlements e
			 JOIN products p ON p.id = e.product_id WHERE e.id = ?1`,
		)
		.bind(entitlementId)
		.first<EntitlementWithProduct>();
}

export async function authorizeDownload(deps: Deps, entitlementId: string, userId: string): Promise<DownloadDecision> {
	const { db, config, adapters } = deps;
	const ent = await loadEntitlement(db, entitlementId);
	const denied: DownloadDecision = { ok: false, status: 403, message: "No tienes acceso a este producto. Si lo compraste, inicia sesión con el mismo correo." };
	if (!ent || ent.user_id !== userId) return denied;

	if (ent.revoked_at) return { ok: false, status: 403, message: "Este acceso fue revocado (por ejemplo, por un reembolso)." };
	if (!ent.file_key) return { ok: false, status: 409, message: "El archivo de este producto aún no está disponible. Te avisaremos por correo." };
	if (!(await adapters.storage.head(ent.file_key))) {
		console.error(`[descargas] falta el archivo ${ent.file_key} (acceso ${ent.id})`);
		return { ok: false, status: 409, message: "El archivo no está disponible en este momento. Ya nos avisó el sistema; inténtalo más tarde." };
	}

	// Conteo atómico: el UPDATE solo pasa si quedan descargas.
	const res = await db
		.prepare(
			`UPDATE entitlements SET download_count = download_count + 1
			 WHERE id = ?1 AND revoked_at IS NULL AND download_count < download_limit`,
		)
		.bind(ent.id)
		.run();
	if (!res.meta.changes) {
		return {
			ok: false,
			status: 429,
			message: `Alcanzaste el límite de ${ent.download_limit} descargas para esta compra. Escríbenos a business@tonyciencia.com si necesitas más.`,
		};
	}
	await db
		.prepare("INSERT INTO downloads (id, entitlement_id, user_id, via, created_at) VALUES (?1, ?2, ?3, ?4, ?5)")
		.bind(crypto.randomUUID(), ent.id, ent.user_id, "site", Date.now())
		.run();

	const url = await adapters.storage.createDownloadUrl(ent.file_key, ent.file_name || "descarga.bin", config.downloadUrlTtlSeconds, ent.user_id);
	return { ok: true, url, productTitle: ent.title };
}
