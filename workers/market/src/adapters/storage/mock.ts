import type { FileStorage, StoredObject } from "../types";
import { createWorkerSignedUrl } from "./signed-url";
import { builtInTestFiles } from "./test-files";

/** Límite de fila de D1 (~2 MB) con margen. */
export const MOCK_MAX_FILE_BYTES = 1_500_000;

/**
 * Almacén de DESARROLLO para la maqueta: tabla `mock_files` en D1 + archivos de prueba del código.
 * No recibe el binding de R2 a propósito: en MODE=mock es imposible servir un archivo real de pago.
 */
export class MockFileStorage implements FileStorage {
	readonly name = "mock" as const;

	constructor(
		private readonly db: D1Database,
		private readonly secret: string,
		private readonly origin: string,
	) {}

	async put(key: string, data: ArrayBuffer | ReadableStream, opts: { contentType: string; size: number }): Promise<void> {
		const buf = data instanceof ArrayBuffer ? data : await new Response(data).arrayBuffer();
		if (buf.byteLength > MOCK_MAX_FILE_BYTES) {
			throw new Error(`En modo maqueta los archivos de prueba no pueden pasar de ${MOCK_MAX_FILE_BYTES} bytes.`);
		}
		await this.db
			.prepare(
				`INSERT INTO mock_files (key, content_type, size, data, created_at) VALUES (?1, ?2, ?3, ?4, ?5)
				 ON CONFLICT(key) DO UPDATE SET content_type = excluded.content_type, size = excluded.size, data = excluded.data`,
			)
			.bind(key, opts.contentType, buf.byteLength, buf, Date.now())
			.run();
	}

	async get(key: string): Promise<StoredObject | null> {
		const row = await this.db
			.prepare("SELECT content_type, size, data FROM mock_files WHERE key = ?1")
			.bind(key)
			.first<{ content_type: string; size: number; data: ArrayBuffer | number[] }>();
		if (row) {
			const data = row.data instanceof ArrayBuffer ? row.data : new Uint8Array(row.data).buffer;
			return { body: data, size: row.size, contentType: row.content_type };
		}
		const builtIn = builtInTestFiles().get(key);
		if (builtIn) {
			return { body: builtIn.data.slice().buffer, size: builtIn.data.length, contentType: builtIn.contentType };
		}
		return null;
	}

	async head(key: string): Promise<{ size: number; contentType: string } | null> {
		const row = await this.db
			.prepare("SELECT content_type, size FROM mock_files WHERE key = ?1")
			.bind(key)
			.first<{ content_type: string; size: number }>();
		if (row) return { size: row.size, contentType: row.content_type };
		const builtIn = builtInTestFiles().get(key);
		return builtIn ? { size: builtIn.data.length, contentType: builtIn.contentType } : null;
	}

	async delete(key: string): Promise<void> {
		await this.db.prepare("DELETE FROM mock_files WHERE key = ?1").bind(key).run();
	}

	createDownloadUrl(key: string, fileName: string, ttlSeconds: number): Promise<string> {
		return createWorkerSignedUrl(this.secret, this.origin, "mock", key, fileName, ttlSeconds);
	}
}
