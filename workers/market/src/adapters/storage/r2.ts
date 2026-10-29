import type { FileStorage, StoredObject } from "../types";
import { presignUrl } from "./presign";
import { createWorkerSignedUrl } from "./signed-url";

export interface R2PresignConfig {
	accessKeyId: string;
	secretAccessKey: string;
	accountId: string;
	bucket: string;
}

/**
 * Archivos en R2 (bucket PRIVADO). Dos formas de URL firmada de vida corta:
 *  - por defecto: firmada por el Worker (/market/archivo/<token>), sin claves extra;
 *  - si hay credenciales S3 de R2 (R2_ACCESS_KEY_ID…): URL prefirmada directa de R2.
 *
 * ⚠ LIVE: put/get/head/delete probados contra el R2 local de Miniflare; la URL prefirmada S3
 * probada solo contra el vector oficial de AWS, NO contra R2 real (sin credenciales aquí).
 */
export class R2FileStorage implements FileStorage {
	readonly name = "r2" as const;

	constructor(
		private readonly bucket: R2Bucket,
		private readonly secret: string,
		private readonly origin: string,
		private readonly presign: R2PresignConfig | null,
	) {}

	async put(key: string, data: ArrayBuffer | ReadableStream, opts: { contentType: string; size: number }): Promise<void> {
		await this.bucket.put(key, data, { httpMetadata: { contentType: opts.contentType } });
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

	async createDownloadUrl(key: string, fileName: string, ttlSeconds: number): Promise<string> {
		if (!this.presign) return createWorkerSignedUrl(this.secret, this.origin, "live", key, fileName, ttlSeconds);
		return presignUrl({
			host: `${this.presign.accountId}.r2.cloudflarestorage.com`,
			path: `/${this.presign.bucket}/${key}`,
			region: "auto",
			accessKeyId: this.presign.accessKeyId,
			secretAccessKey: this.presign.secretAccessKey,
			expiresSeconds: ttlSeconds,
			query: {
				"response-content-disposition": `attachment; filename="${fileName}"`,
				"response-content-type": "application/octet-stream",
			},
		});
	}
}
