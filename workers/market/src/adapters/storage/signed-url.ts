import { signToken, verifyToken } from "../../lib/crypto";

/**
 * URL de descarga firmada por el propio Worker: /market/archivo/<token>.
 * El token (HMAC con SESSION_SECRET, propósito "file") fija la clave, el nombre, el modo y el
 * vencimiento. El bucket sigue privado: el Worker lee del binding y transmite el archivo.
 */
export interface FileTokenPayload extends Record<string, unknown> {
	k: string;
	f: string;
	m: "mock" | "live";
	exp: number;
}

export async function createWorkerSignedUrl(
	secret: string,
	origin: string,
	mode: "mock" | "live",
	key: string,
	fileName: string,
	ttlSeconds: number,
): Promise<string> {
	const token = await signToken(secret, "file", {
		k: key,
		f: fileName,
		m: mode,
		exp: Math.floor(Date.now() / 1000) + ttlSeconds,
	} satisfies FileTokenPayload);
	return new URL(`/market/archivo/${token}`, origin).toString();
}

export function verifyFileToken(secret: string, token: string): Promise<FileTokenPayload | null> {
	return verifyToken<FileTokenPayload>(secret, "file", token);
}
