import type { FileStorage, StoredObject } from "../types";
import { createWorkerSignedUrl } from "./signed-url";

/**
 * Archivos en R2 (bucket PRIVADO). Las descargas salen SIEMPRE por la URL firmada del Worker
 * (/market/archivo/<token>), ligada a la cuenta que la pidió. Antes existía la opción de una URL
 * prefirmada directa de R2 (credenciales S3): se quitó porque esa URL sirve a cualquiera que la
 * tenga mientras no venza y no se puede atar a la sesión.
 */
export class R2FileStorage implements FileStorage {
	readonly name = "r2" as const;

	constructor(
		private readonly bucket: R2Bucket,
		private readonly secret: string,
		private readonly origin: string,
	) {}

	async put(key: string, data: ArrayBuffer | ReadableStream, opts: { contentType: string; size: number; sha256?: string }): Promise<void> {
		let body: ArrayBuffer | ReadableStream = data;
		if (data instanceof ReadableStream) {
			// R2 exige streams de longitud conocida; así se sube sin copiar el archivo entero en memoria.
			const { readable, writable } = new FixedLengthStream(opts.size);
			void data.pipeTo(writable);
			body = readable;
		}
		// Con sha256, R2 calcula el hash de lo recibido y rechaza la escritura si no coincide (no queda nada a medias).
		await this.bucket.put(key, body, { httpMetadata: { contentType: opts.contentType }, ...(opts.sha256 ? { sha256: opts.sha256 } : {}) });
	}

	async get(key: string): Promise<StoredObject | null> {
		const obj = await this.bucket.get(key);
		if (!obj) return null;
		return { body: obj.body, size: obj.size, contentType: obj.httpMetadata?.contentType ?? "application/octet-stream" };
	}

	async head(key: string): Promise<{ size: number; contentType: string } | null> {
		const obj = await this.bucket.head(key);
		return obj ? { size: obj.size, contentType: obj.httpMetadata?.contentType ?? "application/octet-stream" } : null;
	}

	async delete(key: string): Promise<void> {
		await this.bucket.delete(key);
	}

	createDownloadUrl(key: string, fileName: string, ttlSeconds: number, userId: string): Promise<string> {
		return createWorkerSignedUrl(this.secret, this.origin, "live", key, fileName, ttlSeconds, userId);
	}
}
